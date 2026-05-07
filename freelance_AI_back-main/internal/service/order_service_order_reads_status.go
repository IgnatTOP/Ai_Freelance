package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/logger"
	"github.com/ignatzorin/freelance-backend/internal/models"
	"github.com/ignatzorin/freelance-backend/internal/repository"
)

// GetOrder возвращает заказ по идентификатору.
func (s *OrderService) GetOrder(ctx context.Context, id uuid.UUID) (*models.Order, error) {
	return s.repoOrders.GetByID(ctx, id)
}

// GetOrderWithDetails возвращает заказ со всеми связанными данными (требования и вложения).
func (s *OrderService) GetOrderWithDetails(ctx context.Context, id uuid.UUID) (*models.Order, []models.OrderRequirement, []models.OrderAttachment, error) {
	return s.repoOrders.GetByIDWithDetails(ctx, id)
}

// ListMyOrders возвращает заказы пользователя (как заказчика и как исполнителя).
func (s *OrderService) ListMyOrders(ctx context.Context, userID uuid.UUID) ([]models.Order, []models.Order, error) {
	return s.repoOrders.ListMyOrders(ctx, userID)
}

// ListRequirements возвращает список требований к заказу.
func (s *OrderService) ListRequirements(ctx context.Context, orderID uuid.UUID) ([]models.OrderRequirement, error) {
	return s.repoOrders.ListRequirements(ctx, orderID)
}

// ListAttachments возвращает список вложений заказа.
func (s *OrderService) ListAttachments(ctx context.Context, orderID uuid.UUID) ([]models.OrderAttachment, error) {
	return s.repoOrders.ListAttachments(ctx, orderID)
}

// UpdateProposalStatus обновляет статус отклика.
func (s *OrderService) UpdateProposalStatus(ctx context.Context, actorID uuid.UUID, proposalID uuid.UUID, status string) (*models.Proposal, *models.Conversation, error) {
	proposal, err := s.repoProposals.GetProposalByID(ctx, proposalID)
	if err != nil {
		return nil, nil, err
	}

	order, err := s.repoOrders.GetByID(ctx, proposal.OrderID)
	if err != nil {
		return nil, nil, err
	}

	if order.ClientID != actorID {
		return nil, nil, fmt.Errorf("order service: у вас нет прав изменять статус отклика")
	}

	// Валидация статуса
	if _, ok := models.ValidProposalStatuses[status]; !ok {
		return nil, nil, fmt.Errorf("order service: некорректный статус отклика")
	}

	// Проверка, что заказ ещё не завершён или отменён
	if order.Status == models.OrderStatusCompleted || order.Status == models.OrderStatusCancelled {
		return nil, nil, fmt.Errorf("order service: нельзя изменить статус предложения для завершённого или отменённого заказа")
	}

	// При принятии предложения проверяем баланс и создаём escrow
	if status == models.ProposalStatusAccepted {
		if s.payment == nil {
			return nil, nil, fmt.Errorf("order service: платёжная система недоступна")
		}

		alreadyAccepted := proposal.Status == models.ProposalStatusAccepted

		// Определяем сумму для резервирования
		var escrowAmount float64
		if proposal.ProposedAmount != nil && *proposal.ProposedAmount > 0 {
			escrowAmount = *proposal.ProposedAmount
		} else if order.BudgetMax != nil && *order.BudgetMax > 0 {
			escrowAmount = *order.BudgetMax
		} else if order.BudgetMin != nil && *order.BudgetMin > 0 {
			escrowAmount = *order.BudgetMin
		} else {
			return nil, nil, fmt.Errorf("order service: не указана сумма заказа")
		}

		existingEscrow, escrowErr := s.payment.GetEscrowByOrderID(ctx, order.ID)
		hasReusableEscrow := escrowErr == nil &&
			existingEscrow.ClientID == order.ClientID &&
			existingEscrow.FreelancerID == proposal.FreelancerID &&
			existingEscrow.Status == models.EscrowStatusHeld
		if escrowErr != nil && !errors.Is(escrowErr, repository.ErrEscrowNotFound) {
			return nil, nil, fmt.Errorf("order service: не удалось проверить эскроу: %w", escrowErr)
		}

		if !alreadyAccepted && !hasReusableEscrow {
			// Проверяем баланс заказчика
			balance, err := s.payment.GetBalance(ctx, order.ClientID)
			if err != nil {
				return nil, nil, fmt.Errorf("order service: не удалось получить баланс: %w", err)
			}
			if balance.Available < escrowAmount {
				return nil, nil, fmt.Errorf("order service: недостаточно средств на балансе (доступно: %.2f, требуется: %.2f)", balance.Available, escrowAmount)
			}

			// Создаём escrow (резервируем средства)
			_, err = s.payment.CreateEscrow(ctx, order.ID, order.ClientID, proposal.FreelancerID, escrowAmount)
			if err != nil {
				return nil, nil, fmt.Errorf("order service: не удалось зарезервировать средства: %w", err)
			}
		}
	}

	updatedProposal, err := s.repoProposals.UpdateProposalStatus(ctx, proposalID, status)
	if err != nil {
		return nil, nil, err
	}

	var conversation *models.Conversation

	if status == models.ProposalStatusAccepted {
		// Автоматически меняем статус заказа на in_progress и назначаем фрилансера
		if order.Status == models.OrderStatusPublished {
			order.Status = models.OrderStatusInProgress
			order.FreelancerID = &proposal.FreelancerID
			// Обновляем заказ без изменения других полей
			err = s.repoOrders.Update(ctx, order, []models.OrderRequirement{}, []uuid.UUID{})
			if err != nil {
				// Логируем ошибку, но не прерываем процесс
				if logger.Log != nil {
					logger.Log.WithFields(map[string]interface{}{
						"order_id": order.ID,
						"error":    err.Error(),
					}).Warn("order service: не удалось обновить статус заказа")
				}
			}
		}

		conversation, err = s.repoConversations.GetConversationByParticipants(ctx, proposal.OrderID, order.ClientID, proposal.FreelancerID)
		if err != nil {
			if errors.Is(err, repository.ErrConversationNotFound) {
				orderID := proposal.OrderID
				conversation = &models.Conversation{
					OrderID:      &orderID,
					ClientID:     order.ClientID,
					FreelancerID: proposal.FreelancerID,
				}
				if err := s.repoConversations.CreateConversation(ctx, conversation); err != nil {
					return updatedProposal, nil, err
				}
			} else {
				return updatedProposal, nil, err
			}
		}
	}

	return updatedProposal, conversation, nil
}

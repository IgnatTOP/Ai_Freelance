package service

import (
	"strings"
	"testing"

	"github.com/ignatzorin/freelance-backend/internal/models"
)

func TestNormalizeProposalBudget_UsesProposedBudgetWithinRange(t *testing.T) {
	minBudget := 50.0
	maxBudget := 100.0
	proposedBudget := 75.0

	budget, err := normalizeProposalBudget(&models.Order{
		BudgetMin: &minBudget,
		BudgetMax: &maxBudget,
	}, ProposalInput{
		ProposedBudget: &proposedBudget,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if budget != proposedBudget {
		t.Fatalf("expected budget %v, got %v", proposedBudget, budget)
	}
}

func TestNormalizeProposalBudget_FallsBackToLegacyAmount(t *testing.T) {
	minBudget := 50.0
	maxBudget := 100.0
	legacyAmount := 90.0

	budget, err := normalizeProposalBudget(&models.Order{
		BudgetMin: &minBudget,
		BudgetMax: &maxBudget,
	}, ProposalInput{
		Amount: &legacyAmount,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if budget != legacyAmount {
		t.Fatalf("expected budget %v, got %v", legacyAmount, budget)
	}
}

func TestNormalizeProposalBudget_RejectsOutOfRangeBudget(t *testing.T) {
	minBudget := 50.0
	maxBudget := 100.0
	proposedBudget := 120.0

	_, err := normalizeProposalBudget(&models.Order{
		BudgetMin: &minBudget,
		BudgetMax: &maxBudget,
	}, ProposalInput{
		ProposedBudget: &proposedBudget,
	})
	if err == nil {
		t.Fatal("expected validation error for out-of-range proposal budget")
	}
	if !strings.Contains(err.Error(), "в диапазоне бюджета заказа") {
		t.Fatalf("expected range error, got %v", err)
	}
}

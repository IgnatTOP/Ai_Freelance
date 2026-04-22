package user

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/ignatzorin/freelance-backend/internal/domain/entity"
	"github.com/ignatzorin/freelance-backend/internal/domain/repository"
)

// UpdateProfileInput defines the input for updating a profile.
type UpdateProfileInput struct {
	UserID                uuid.UUID  `json:"-"`
	DisplayName           string     `json:"display_name"`
	Bio                   *string    `json:"bio"`
	HourlyRate            *float64   `json:"hourly_rate"`
	ExperienceLevel       string     `json:"experience_level"`
	Skills                []string   `json:"skills"`
	Location              *string    `json:"location"`
	PhotoID               *uuid.UUID `json:"photo_id"`
	Phone                 *string    `json:"phone"`
	Telegram              *string    `json:"telegram"`
	Website               *string    `json:"website"`
	CompanyName           *string    `json:"company_name"`
	INN                   *string    `json:"inn"`
	OnboardingCompletedAt *time.Time `json:"onboarding_completed_at"`
}

// UpdateProfileUseCase handles updating a user profile.
type UpdateProfileUseCase struct {
	userRepo repository.UserRepository
}

// NewUpdateProfileUseCase creates a new UpdateProfileUseCase.
func NewUpdateProfileUseCase(userRepo repository.UserRepository) *UpdateProfileUseCase {
	return &UpdateProfileUseCase{userRepo: userRepo}
}

// Run executes the use case.
func (uc *UpdateProfileUseCase) Run(ctx context.Context, input UpdateProfileInput) (*entity.Profile, error) {
	// 1. Get existing profile or create new structure
	profile, err := uc.userRepo.GetProfile(ctx, input.UserID)
	if err != nil || profile == nil {
		profile = &entity.Profile{
			UserID: input.UserID,
		}
	}

	// 2. Update fields
	if input.DisplayName != "" {
		profile.DisplayName = input.DisplayName
	}
	if input.Bio != nil {
		profile.Bio = input.Bio
	}
	if input.HourlyRate != nil {
		profile.HourlyRate = input.HourlyRate
	}
	if input.ExperienceLevel != "" {
		profile.ExperienceLevel = input.ExperienceLevel
	}
	if input.Skills != nil {
		profile.Skills = input.Skills
	}
	if input.Location != nil {
		profile.Location = input.Location
	}
	if input.PhotoID != nil {
		profile.PhotoID = input.PhotoID
	}
	if input.Phone != nil {
		profile.Phone = input.Phone
	}
	if input.Telegram != nil {
		profile.Telegram = input.Telegram
	}
	if input.Website != nil {
		profile.Website = input.Website
	}
	if input.CompanyName != nil {
		profile.CompanyName = input.CompanyName
	}
	if input.INN != nil {
		profile.INN = input.INN
	}
	if input.OnboardingCompletedAt != nil {
		profile.OnboardingCompletedAt = input.OnboardingCompletedAt
	}
	profile.UpdatedAt = time.Now()

	// 3. Save
	if err := uc.userRepo.UpdateProfile(ctx, profile); err != nil {
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	return profile, nil
}

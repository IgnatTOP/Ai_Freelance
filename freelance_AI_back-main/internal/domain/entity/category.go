package entity

import "github.com/google/uuid"

type CategoryRef struct {
	ID   uuid.UUID
	Slug string
	Name string
	Icon *string
}

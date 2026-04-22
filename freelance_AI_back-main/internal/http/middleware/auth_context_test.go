package middleware

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestUserIDFromContext_SupportsCanonicalAndLegacyKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)
	id := uuid.New()

	tests := []struct {
		name  string
		setup func(*gin.Context)
	}{
		{
			name: "canonical typed key",
			setup: func(c *gin.Context) {
				c.Set(ContextUserUUIDKey, id)
			},
		},
		{
			name: "legacy typed key user_id",
			setup: func(c *gin.Context) {
				c.Set("user_id", id)
			},
		},
		{
			name: "legacy string key userID",
			setup: func(c *gin.Context) {
				c.Set(ContextUserIDKey, id.String())
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(nil)
			tt.setup(c)

			got, err := UserIDFromContext(c)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != id {
				t.Fatalf("unexpected user id: got %s want %s", got, id)
			}
		})
	}
}

func TestSetAuthContext_PopulatesCompatibilityKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(nil)
	id := uuid.New()

	SetAuthContext(c, id, "freelancer")

	if got, err := UserIDFromContext(c); err != nil || got != id {
		t.Fatalf("UserIDFromContext mismatch: got=%v err=%v want=%v", got, err, id)
	}

	role, err := RoleFromContext(c)
	if err != nil {
		t.Fatalf("RoleFromContext error: %v", err)
	}
	if role != "freelancer" {
		t.Fatalf("unexpected role: %s", role)
	}

	if s := c.GetString(ContextUserIDKey); s != id.String() {
		t.Fatalf("legacy string key mismatch: got=%q want=%q", s, id.String())
	}
}

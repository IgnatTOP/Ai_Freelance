package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ignatzorin/freelance-backend/internal/http/handlers/common"
	"github.com/ignatzorin/freelance-backend/internal/models"
	"github.com/ignatzorin/freelance-backend/internal/repository"
)

type CatalogHandler struct {
	catalog *repository.CatalogRepository
}

func NewCatalogHandler(catalog *repository.CatalogRepository) *CatalogHandler {
	return &CatalogHandler{catalog: catalog}
}

// ListCategories GET /catalog/categories
func (h *CatalogHandler) ListCategories(c *gin.Context) {
	categories, err := h.catalog.GetCategoriesWithChildren(c.Request.Context())
	if err != nil {
		common.RespondInternalError(c, err.Error())
		return
	}
	common.RespondJSON(c, http.StatusOK, gin.H{"categories": categories})
}

// ListPopularCategories GET /catalog/categories/popular?limit=6
func (h *CatalogHandler) ListPopularCategories(c *gin.Context) {
	limit := common.ParseIntQuery(c, "limit", 6)

	categories, err := h.catalog.ListPopularCategories(c.Request.Context(), limit)
	if err != nil {
		common.RespondInternalError(c, err.Error())
		return
	}
	common.RespondJSON(c, http.StatusOK, gin.H{"categories": categories})
}

// GetCategory GET /catalog/categories/:slug
func (h *CatalogHandler) GetCategory(c *gin.Context) {
	slug := c.Param("slug")
	var (
		category *models.Category
		err      error
	)
	if id, parseErr := uuid.Parse(slug); parseErr == nil {
		category, err = h.catalog.GetCategoryByID(c.Request.Context(), id)
	} else {
		category, err = h.catalog.GetCategoryBySlug(c.Request.Context(), slug)
	}
	if err != nil || category == nil {
		common.RespondNotFound(c, "категория не найдена")
		return
	}

	// Получаем подкатегории
	children, _ := h.catalog.ListSubcategories(c.Request.Context(), category.ID)
	category.Children = children

	// Получаем навыки категории
	skills, _ := h.catalog.ListSkillsByCategory(c.Request.Context(), category.ID)

	common.RespondJSON(c, http.StatusOK, gin.H{
		"category": category,
		"skills":   skills,
	})
}

// ListSkills GET /catalog/skills
func (h *CatalogHandler) ListSkills(c *gin.Context) {
	categoryID := c.Query("category_id")

	var skills interface{}
	var err error

	if categoryID != "" {
		id, parseErr := uuid.Parse(categoryID)
		if parseErr != nil {
			common.RespondBadRequest(c, "неверный category_id")
			return
		}
		skills, err = h.catalog.ListSkillsByCategory(c.Request.Context(), id)
	} else {
		skills, err = h.catalog.ListSkills(c.Request.Context())
	}

	if err != nil {
		common.RespondInternalError(c, err.Error())
		return
	}

	common.RespondJSON(c, http.StatusOK, gin.H{"skills": skills})
}

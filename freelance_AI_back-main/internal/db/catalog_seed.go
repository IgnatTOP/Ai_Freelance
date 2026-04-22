package db

import (
	"context"

	"github.com/jmoiron/sqlx"
)

func EnsureCatalogSeeded(ctx context.Context, conn *sqlx.DB) error {
	_, err := conn.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS categories (
			id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			slug            TEXT UNIQUE NOT NULL,
			name            TEXT NOT NULL,
			description     TEXT,
			icon            TEXT,
			parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
			sort_order      INT NOT NULL DEFAULT 0,
			is_active       BOOLEAN NOT NULL DEFAULT TRUE,
			created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS skills (
			id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			slug            TEXT UNIQUE NOT NULL,
			name            TEXT NOT NULL,
			category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
			is_active       BOOLEAN NOT NULL DEFAULT TRUE,
			created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		ALTER TABLE orders ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

		CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
		CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
		CREATE INDEX IF NOT EXISTS idx_skills_category_id ON skills(category_id);
		CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
		CREATE INDEX IF NOT EXISTS idx_orders_category_id ON orders(category_id);

		INSERT INTO categories (slug, name, description, icon, sort_order) VALUES
		('web-development', 'Веб-разработка', 'Создание сайтов и веб-приложений', '🌐', 1),
		('mobile-development', 'Мобильная разработка', 'iOS и Android приложения', '📱', 2),
		('design', 'Дизайн', 'Графический и UI/UX дизайн', '🎨', 3),
		('marketing', 'Маркетинг', 'SMM, SEO, реклама', '📈', 4),
		('writing', 'Копирайтинг', 'Тексты, статьи, контент', '✍️', 5),
		('video', 'Видео и анимация', 'Монтаж, моушн-дизайн', '🎬', 6),
		('data', 'Данные и аналитика', 'Data Science, ML, аналитика', '📊', 7),
		('admin', 'Администрирование', 'DevOps, системное администрирование', '⚙️', 8),
		('other', 'Другое', 'Прочие услуги', '📦', 99)
		ON CONFLICT (slug) DO NOTHING;

		INSERT INTO categories (slug, name, parent_id, sort_order)
		SELECT 'frontend', 'Frontend разработка', id, 1 FROM categories WHERE slug = 'web-development'
		ON CONFLICT (slug) DO NOTHING;

		INSERT INTO categories (slug, name, parent_id, sort_order)
		SELECT 'backend', 'Backend разработка', id, 2 FROM categories WHERE slug = 'web-development'
		ON CONFLICT (slug) DO NOTHING;

		INSERT INTO categories (slug, name, parent_id, sort_order)
		SELECT 'fullstack', 'Fullstack разработка', id, 3 FROM categories WHERE slug = 'web-development'
		ON CONFLICT (slug) DO NOTHING;

		INSERT INTO skills (slug, name, category_id) 
		SELECT 'javascript', 'JavaScript', id FROM categories WHERE slug = 'web-development'
		ON CONFLICT (slug) DO NOTHING;
		INSERT INTO skills (slug, name, category_id) 
		SELECT 'typescript', 'TypeScript', id FROM categories WHERE slug = 'web-development'
		ON CONFLICT (slug) DO NOTHING;
		INSERT INTO skills (slug, name, category_id) 
		SELECT 'react', 'React', id FROM categories WHERE slug = 'web-development'
		ON CONFLICT (slug) DO NOTHING;
		INSERT INTO skills (slug, name, category_id) 
		SELECT 'vue', 'Vue.js', id FROM categories WHERE slug = 'web-development'
		ON CONFLICT (slug) DO NOTHING;
		INSERT INTO skills (slug, name, category_id) 
		SELECT 'nodejs', 'Node.js', id FROM categories WHERE slug = 'web-development'
		ON CONFLICT (slug) DO NOTHING;
		INSERT INTO skills (slug, name, category_id) 
		SELECT 'go', 'Go', id FROM categories WHERE slug = 'web-development'
		ON CONFLICT (slug) DO NOTHING;

		INSERT INTO skills (slug, name, category_id) 
		SELECT 'figma', 'Figma', id FROM categories WHERE slug = 'design'
		ON CONFLICT (slug) DO NOTHING;
		INSERT INTO skills (slug, name, category_id) 
		SELECT 'uiux', 'UI/UX', id FROM categories WHERE slug = 'design'
		ON CONFLICT (slug) DO NOTHING;

		INSERT INTO skills (slug, name, category_id) 
		SELECT 'seo', 'SEO', id FROM categories WHERE slug = 'marketing'
		ON CONFLICT (slug) DO NOTHING;
		INSERT INTO skills (slug, name, category_id) 
		SELECT 'smm', 'SMM', id FROM categories WHERE slug = 'marketing'
		ON CONFLICT (slug) DO NOTHING;
	`)
	return err
}

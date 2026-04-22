package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

type dsnAttempt struct {
	name string
	dsn  string
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	var attempts []dsnAttempt
	if v := strings.TrimSpace(os.Getenv("DATABASE_URL")); v != "" {
		attempts = append(attempts, dsnAttempt{name: "DATABASE_URL", dsn: v})
	}
	attempts = append(attempts,
		dsnAttempt{name: "localhost:5432", dsn: "postgres://postgres:123@localhost:5432/freelance_ai?sslmode=disable"},
		dsnAttempt{name: "localhost:5432 (alt)", dsn: "postgres://postgres:32211@localhost:5432/freelance_ai?sslmode=disable"},
		dsnAttempt{name: "localhost:5433", dsn: "postgres://postgres:123@localhost:5433/freelance_ai?sslmode=disable"},
		dsnAttempt{name: "localhost:5433 (alt)", dsn: "postgres://postgres:32211@localhost:5433/freelance_ai?sslmode=disable"},
		dsnAttempt{name: "127.0.0.1:5432", dsn: "postgres://postgres:123@127.0.0.1:5432/freelance_ai?sslmode=disable"},
		dsnAttempt{name: "127.0.0.1:5432 (alt)", dsn: "postgres://postgres:32211@127.0.0.1:5432/freelance_ai?sslmode=disable"},
		dsnAttempt{name: "127.0.0.1:5433", dsn: "postgres://postgres:123@127.0.0.1:5433/freelance_ai?sslmode=disable"},
		dsnAttempt{name: "127.0.0.1:5433 (alt)", dsn: "postgres://postgres:32211@127.0.0.1:5433/freelance_ai?sslmode=disable"},
	)

	var (
		db  *sql.DB
		err error
	)
	for _, a := range attempts {
		db, err = sql.Open("postgres", a.dsn)
		if err != nil {
			continue
		}
		if pingErr := db.PingContext(ctx); pingErr != nil {
			_ = db.Close()
			db = nil
			err = pingErr
			continue
		}
		fmt.Printf("Connected via: %s\n", a.name)
		break
	}
	if db == nil {
		fmt.Printf("Failed to connect. Last error: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	var dbName string
	_ = db.QueryRowContext(ctx, `select current_database()`).Scan(&dbName)
	fmt.Printf("Database: %s\n", dbName)

	printCount(ctx, db, "schema_migrations", "select count(*) from schema_migrations")
	printCount(ctx, db, "categories", "select count(*) from categories")
	printCount(ctx, db, "skills", "select count(*) from skills")
	printCount(ctx, db, "users", "select count(*) from users")
	printCount(ctx, db, "profiles", "select count(*) from profiles")
	printCount(ctx, db, "orders", "select count(*) from orders")
	printCount(ctx, db, "proposals", "select count(*) from proposals")
	printCount(ctx, db, "conversations", "select count(*) from conversations")
	printCount(ctx, db, "messages", "select count(*) from messages")
	printCount(ctx, db, "portfolio_items", "select count(*) from portfolio_items")
	printCount(ctx, db, "media_files", "select count(*) from media_files")
	printCount(ctx, db, "notifications", "select count(*) from notifications")
	printCount(ctx, db, "escrow", "select count(*) from escrow")
	printCount(ctx, db, "transactions", "select count(*) from transactions")
	printCount(ctx, db, "withdrawals", "select count(*) from withdrawals")
	printCount(ctx, db, "disputes", "select count(*) from disputes")
	printCount(ctx, db, "reports", "select count(*) from reports")
	printCount(ctx, db, "verification_codes", "select count(*) from verification_codes")

	fmt.Println()
	printUsersByRole(ctx, db)
	fmt.Println()
	printOrdersByStatus(ctx, db)
	fmt.Println()
	printSampleCategories(ctx, db)
	fmt.Println()
	printTables(ctx, db)
}

func printCount(ctx context.Context, db *sql.DB, name, query string) {
	var n int64
	if err := db.QueryRowContext(ctx, query).Scan(&n); err != nil {
		fmt.Printf("%-18s: error: %v\n", name, err)
		return
	}
	fmt.Printf("%-18s: %d\n", name, n)
}

func printUsersByRole(ctx context.Context, db *sql.DB) {
	rows, err := db.QueryContext(ctx, `select role, count(*) from users group by role order by role`)
	if err != nil {
		fmt.Printf("users by role: error: %v\n", err)
		return
	}
	defer rows.Close()
	fmt.Println("Users by role:")
	for rows.Next() {
		var role string
		var cnt int64
		if err := rows.Scan(&role, &cnt); err != nil {
			fmt.Printf("users by role: scan error: %v\n", err)
			return
		}
		fmt.Printf("- %s: %d\n", role, cnt)
	}
}

func printOrdersByStatus(ctx context.Context, db *sql.DB) {
	rows, err := db.QueryContext(ctx, `select status, count(*) from orders group by status order by status`)
	if err != nil {
		fmt.Printf("orders by status: error: %v\n", err)
		return
	}
	defer rows.Close()
	fmt.Println("Orders by status:")
	for rows.Next() {
		var status string
		var cnt int64
		if err := rows.Scan(&status, &cnt); err != nil {
			fmt.Printf("orders by status: scan error: %v\n", err)
			return
		}
		fmt.Printf("- %s: %d\n", status, cnt)
	}
}

func printSampleCategories(ctx context.Context, db *sql.DB) {
	rows, err := db.QueryContext(ctx, `select id::text, slug, name from categories where is_active = true order by sort_order, name limit 10`)
	if err != nil {
		fmt.Printf("categories sample: error: %v\n", err)
		return
	}
	defer rows.Close()
	fmt.Println("Sample categories:")
	for rows.Next() {
		var id, slug, name string
		if err := rows.Scan(&id, &slug, &name); err != nil {
			fmt.Printf("categories sample: scan error: %v\n", err)
			return
		}
		fmt.Printf("- %s | %s | %s\n", id, slug, name)
	}
}

func printTables(ctx context.Context, db *sql.DB) {
	rows, err := db.QueryContext(ctx, `
		select table_name
		from information_schema.tables
		where table_schema = 'public' and table_type = 'BASE TABLE'
	`)
	if err != nil {
		fmt.Printf("tables: error: %v\n", err)
		return
	}
	defer rows.Close()
	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			fmt.Printf("tables: scan error: %v\n", err)
			return
		}
		tables = append(tables, name)
	}
	sort.Strings(tables)
	fmt.Printf("Tables (%d):\n", len(tables))
	fmt.Println(strings.Join(tables, ", "))
}

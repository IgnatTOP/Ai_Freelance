package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := "postgres://postgres:32211@localhost:5433/freelance_ai?sslmode=disable"
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer pool.Close()

	rows, err := pool.Query(context.Background(), "SELECT id, phone, role FROM users LIMIT 10")
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}
	defer rows.Close()

	fmt.Println("Users in DB:")
	for rows.Next() {
		var id, phone, role string
		if err := rows.Scan(&id, &phone, &role); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("ID: %s | Phone: %s | Role: %s\n", id, phone, role)
	}
}

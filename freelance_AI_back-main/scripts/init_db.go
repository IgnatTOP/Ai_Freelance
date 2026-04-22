package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	connStr := "postgres://postgres:32211@127.0.0.1:5432/postgres?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = 'freelance_ai')").Scan(&exists)
	if err != nil {
		log.Fatal(err)
	}

	if !exists {
		_, err = db.Exec("CREATE DATABASE freelance_ai")
		if err != nil {
			log.Fatal(err)
		}
		fmt.Println("Database 'freelance_ai' created.")
	} else {
		fmt.Println("Database 'freelance_ai' already exists.")
	}
}

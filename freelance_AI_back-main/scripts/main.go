package main

import (
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: go run ./scripts <init-db|get-users>")
		os.Exit(2)
	}

	switch os.Args[1] {
	case "init-db":
		runInitDB()
	case "get-users":
		runGetUsers()
	default:
		fmt.Fprintf(os.Stderr, "unknown command %q\n", os.Args[1])
		os.Exit(2)
	}
}

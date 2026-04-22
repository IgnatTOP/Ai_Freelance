const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://postgres:32211@localhost:5433/freelance_ai?sslmode=disable'
});

async function main() {
    try {
        await client.connect();

        console.log("--- Users Schema ---");
        const users = await client.query('SELECT * FROM users LIMIT 1');
        console.table(users.rows);

        console.log("--- Verification Codes ---");
        const codes = await client.query('SELECT * FROM verification_codes ORDER BY created_at DESC LIMIT 5');
        console.table(codes.rows);

    } catch (err) {
        console.error("Database error:", err);
    } finally {
        await client.end();
    }
}

main();

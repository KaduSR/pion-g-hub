"use strict";
// PionG Blueprint: Database Connection
// Interface abstrata para conexao com banco de dados
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresDatabase = void 0;
exports.getDatabase = getDatabase;
exports.setDatabase = setDatabase;
const pg_1 = require("pg");
// Implementacao PostgreSQL usando Supabase
class PostgresDatabase {
    pool;
    constructor(connectionString) {
        this.pool = new pg_1.Pool({
            connectionString: connectionString || process.env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        });
        this.pool.on('error', (err) => {
            console.error('Unexpected database error:', err);
        });
    }
    async query(sql, params) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    async getClient() {
        return this.pool.connect();
    }
    async close() {
        await this.pool.end();
    }
}
exports.PostgresDatabase = PostgresDatabase;
// Instancia singleton
let dbInstance = null;
function getDatabase() {
    if (!dbInstance) {
        dbInstance = new PostgresDatabase();
    }
    return dbInstance;
}
function setDatabase(db) {
    dbInstance = db;
}
//# sourceMappingURL=database.js.map
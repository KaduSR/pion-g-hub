// PionG Blueprint: Database Connection
// Interface abstrata para conexao com banco de dados

import { Pool, PoolClient, QueryResult } from 'pg';

export interface Database {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getClient(): Promise<PoolClient>;
}

// Implementacao PostgreSQL usando Supabase
export class PostgresDatabase implements Database {
  private pool: Pool;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Instancia singleton
let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = new PostgresDatabase();
  }
  return dbInstance;
}

export function setDatabase(db: Database): void {
  dbInstance = db;
}
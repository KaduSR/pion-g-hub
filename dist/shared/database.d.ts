import { PoolClient } from 'pg';
export interface Database {
    query<T>(sql: string, params?: unknown[]): Promise<T[]>;
    getClient(): Promise<PoolClient>;
}
export declare class PostgresDatabase implements Database {
    private pool;
    constructor(connectionString?: string);
    query<T>(sql: string, params?: unknown[]): Promise<T[]>;
    getClient(): Promise<PoolClient>;
    close(): Promise<void>;
}
export declare function getDatabase(): Database;
export declare function setDatabase(db: Database): void;
//# sourceMappingURL=database.d.ts.map
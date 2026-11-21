import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

// Load both root .env and backend/.env so either works seamlessly
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { Pool } = pg;

function normalizeDatabaseUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/^["']|["']$/g, '');
}

export function isValidDatabaseUrl(rawUrl: string): boolean {
  const cleaned = normalizeDatabaseUrl(rawUrl);
  if (!cleaned || !/^postgres(ql)?:\/\//i.test(cleaned)) {
    return false;
  }
  try {
    const parsed = new URL(cleaned);
    const host = (parsed.hostname || '').trim().toLowerCase();
    if (!host || host === 'base' || host === 'host' || host === 'your_host') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function cleanDatabaseUrl(rawUrl: string): { url: string; useSsl: boolean } {
  const cleaned = normalizeDatabaseUrl(rawUrl);
  try {
    const parsed = new URL(cleaned);
    const hasSslParam = parsed.searchParams.has('sslmode') || parsed.searchParams.has('ssl');
    const isCloudHost =
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1' &&
      !parsed.hostname.endsWith('.local');

    // Strip sslmode so pg-connection-string does not force verify-full rejection
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('ssl');

    return {
      url: parsed.toString(),
      useSsl: hasSslParam || isCloudHost,
    };
  } catch {
    const isCloud = !cleaned.includes('localhost') && !cleaned.includes('127.0.0.1');
    return {
      url: cleaned.replace(/[?&]sslmode=[^&]+/g, '').replace(/[?&]ssl=[^&]+/g, ''),
      useSsl: isCloud || cleaned.includes('sslmode'),
    };
  }
}

function buildPoolConfig(): pg.PoolConfig {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl && isValidDatabaseUrl(databaseUrl)) {
    const { url, useSsl } = cleanDatabaseUrl(databaseUrl);
    const disableSsl = process.env.DATABASE_SSL === 'false';

    return {
      connectionString: url,
      ssl: useSsl && !disableSsl ? { rejectUnauthorized: false } : false,
      max: Number(process.env.PG_MAX_POOL) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    };
  }

  // Standard individual PG environment variables fallback
  const pgHost = (process.env.PGHOST || '').trim();
  const isCloudHost =
    pgHost &&
    pgHost !== 'localhost' &&
    pgHost !== '127.0.0.1';

  return {
    host: pgHost || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'findkart',
    ssl: (isCloudHost || process.env.DATABASE_SSL === 'true') ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PG_MAX_POOL) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  };
}

export function isPostgresConfigured(): boolean {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (rawUrl) {
    return isValidDatabaseUrl(rawUrl);
  }
  const pgHost = (process.env.PGHOST || '').trim().toLowerCase();
  return Boolean(
    pgHost &&
    pgHost !== 'base' &&
    process.env.PGDATABASE &&
    process.env.PGUSER
  );
}

let poolInstance: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool(buildPoolConfig());

    poolInstance.on('error', (err) => {
      console.log('[Database] PostgreSQL pool notice:', err.message);
    });
  }
  return poolInstance;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}

export async function testConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  serverTime?: string;
  error?: string;
}> {
  if (!isPostgresConfigured()) {
    return {
      connected: false,
      error: 'PostgreSQL not configured or URL invalid',
    };
  }
  const start = Date.now();
  try {
    const res = await query<{ now: string }>('SELECT NOW() as now');
    const latencyMs = Date.now() - start;
    return {
      connected: true,
      latencyMs,
      serverTime: res.rows[0]?.now,
    };
  } catch (err: unknown) {
    const errorObj = err as Record<string, unknown>;
    const message =
      err instanceof Error && err.message
        ? err.message
        : (typeof errorObj?.code === 'string'
            ? `Connection error: ${errorObj.code}`
            : 'Unable to reach PostgreSQL server');
    return {
      connected: false,
      error: message,
    };
  }
}

export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

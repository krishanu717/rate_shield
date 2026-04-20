import { Pool } from 'pg';

export const pool = new Pool({
  host: 'postgres',
  user: 'postgres',
  password: 'postgres',
  database: 'analytics',
  port: 5432,
});
-- PostgreSQL Initialization Script
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Verification log
DO $$
BEGIN
   RAISE NOTICE 'Database extensions (uuid-ossp, pg_trgm, vector) initialized successfully.';
END $$;
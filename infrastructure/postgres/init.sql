-- PostgreSQL Initialization Script
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verification log
DO $$
BEGIN
   RAISE NOTICE 'Database extensions initialized successfully.';
END $$;
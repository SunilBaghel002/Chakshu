-- 001_extensions.sql
-- Enable PostGIS spatial operations and pgvector vector similarity search
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- Optional performance index for catalog search.
--
-- Why this is a .sql file and not part of schema.prisma: Prisma has no model
-- syntax for a Postgres GIN index using the pg_trgm extension, and the app
-- searches with a leading-wildcard LIKE ('%alice%'), which a B-tree index can
-- never serve. Every search was therefore a sequential scan of the books
-- table — twice per search, because the catalog page runs a COUNT(*) with the
-- same predicate before the list query.
--
-- This is safe to run more than once. It is NOT run by `prisma db push`, so
-- apply it once per database:
--
--   psql "$DATABASE_URL" -f prisma/search-index.sql
--
-- or paste it into Supabase → SQL Editor and press Run.
--
-- To check it is being used:
--
--   EXPLAIN ANALYZE SELECT id FROM books WHERE "searchText" LIKE '%alice%';

-- Trigram matching is what makes '%...%' indexable.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS books_search_text_trgm_idx
  ON books USING GIN (searchText gin_trgm_ops);

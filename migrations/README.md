# Database Migrations

This directory contains SQL migration files that need to be applied to the database when schema changes are required.

## Skip Compensation Columns Migration

The migration file `add_skip_compensation_columns.sql` adds the missing skip compensation columns to the `user_weight_changes` table, which are required for proper weight synchronization.

### How to Apply the Migration

To apply this migration, run the following command in the Supabase dashboard SQL Editor:

```sql
-- Migration to add skip compensation columns to user_weight_changes table
ALTER TABLE public.user_weight_changes 
ADD COLUMN IF NOT EXISTS skip_compensation_applied boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS skip_compensation_topic float DEFAULT 0,
ADD COLUMN IF NOT EXISTS skip_compensation_subtopic float DEFAULT 0,
ADD COLUMN IF NOT EXISTS skip_compensation_branch float DEFAULT 0;
```

### Alternative: Use the Supabase CLI

If you have the Supabase CLI configured, you can apply the migration by running:

```bash
psql $(supabase db remote connection-string) -f migrations/add_skip_compensation_columns.sql
```

## Temporary Workaround

As a temporary workaround, the application code has been modified to function without these columns. The `syncWeightChanges` and `fetchWeightChanges` functions in `src/lib/syncService.ts` have been updated to exclude these fields until the migration is applied. 
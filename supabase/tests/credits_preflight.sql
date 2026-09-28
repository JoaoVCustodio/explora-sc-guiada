SELECT (SELECT jsonb_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations) AS migrations,
 (SELECT jsonb_agg(column_name) FROM information_schema.columns WHERE table_schema='supabase_migrations' AND table_name='schema_migrations') AS migration_columns,
 to_regclass('public.generation_wallets') AS credits_table;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM auth.users u LEFT JOIN public.generation_wallets w ON w.user_id=u.id WHERE w.user_id IS NULL) THEN
    RAISE EXCEPTION 'User missing initial wallet';
  END IF;
  IF EXISTS (SELECT 1 FROM public.generation_wallets WHERE initial_credits <> 3) THEN RAISE EXCEPTION 'Incorrect initial grant'; END IF;
  IF NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260919000100') THEN RAISE EXCEPTION 'Migration history missing'; END IF;
END $$;
SELECT 'PASS: all existing users have one wallet and initial grant 3; migration recorded' AS result;

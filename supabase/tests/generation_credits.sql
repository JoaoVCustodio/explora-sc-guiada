-- All test users and mutations are rolled back, including when testing on the linked project.
BEGIN;
SELECT set_config('test.credit_user', gen_random_uuid()::text, true);
SELECT set_config('test.credit_other', gen_random_uuid()::text, true);
INSERT INTO auth.users(id) VALUES (current_setting('test.credit_user')::uuid), (current_setting('test.credit_other')::uuid);

DO $$
DECLARE u uuid := current_setting('test.credit_user')::uuid; a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  result jsonb := '{"days":[{"day":1,"locations":[{"name":"Test"}]}],"locations":[{"name":"Test"}]}';
BEGIN
  IF (SELECT balance FROM public.generation_wallets WHERE user_id = u) <> 3 THEN RAISE EXCEPTION 'new user balance'; END IF;
  INSERT INTO public.generation_wallets(user_id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;
  IF (SELECT balance FROM public.generation_wallets WHERE user_id = u) <> 3 THEN RAISE EXCEPTION 'duplicate initial grant'; END IF;
  IF public.reserve_generation_credit(u, a, repeat('a',64))->>'status' <> 'acquired' THEN RAISE EXCEPTION 'reserve'; END IF;
  IF public.reserve_generation_credit(u, a, repeat('a',64))->>'status' <> 'reserved' THEN RAISE EXCEPTION 'retry starts generation'; END IF;
  IF public.reserve_generation_credit(u, a, repeat('b',64))->>'status' <> 'conflict' THEN RAISE EXCEPTION 'id reused with new input'; END IF;
  IF public.reserve_generation_credit(u, b, repeat('a',64))->>'status' <> 'busy' THEN RAISE EXCEPTION 'parallel generation allowed'; END IF;
  PERFORM public.finish_generation_credit(u, a, result);
  PERFORM public.finish_generation_credit(u, a, result);
  PERFORM public.finish_generation_credit(u, a, NULL);
  IF (SELECT balance FROM public.generation_wallets WHERE user_id = u) <> 2 THEN RAISE EXCEPTION 'success did not consume exactly one'; END IF;
  IF public.reserve_generation_credit(u, a, repeat('a',64))->'result' <> result THEN RAISE EXCEPTION 'lost response not replayable'; END IF;
  PERFORM public.reserve_generation_credit(u, b, repeat('a',64));
  PERFORM public.finish_generation_credit(u, b, NULL);
  PERFORM public.finish_generation_credit(u, b, NULL);
  IF (SELECT balance FROM public.generation_wallets WHERE user_id = u) <> 2 THEN RAISE EXCEPTION 'failure refund not idempotent'; END IF;
  a := gen_random_uuid();
  PERFORM public.reserve_generation_credit(u, a, repeat('a',64));
  UPDATE public.generation_requests SET expires_at = clock_timestamp() - interval '1 second' WHERE user_id=u AND id=a;
  IF public.finish_generation_credit(u, a, result)->>'status' <> 'failed' THEN RAISE EXCEPTION 'late completion accepted'; END IF;
  IF (SELECT balance FROM public.generation_wallets WHERE user_id = u) <> 2 THEN RAISE EXCEPTION 'abandoned reservation not refunded'; END IF;
  FOR i IN 1..2 LOOP
    a := gen_random_uuid();
    PERFORM public.reserve_generation_credit(u, a, repeat('a',64));
    PERFORM public.finish_generation_credit(u, a, result);
  END LOOP;
  IF public.reserve_generation_credit(u, gen_random_uuid(), repeat('a',64))->>'status' <> 'no_credits' THEN RAISE EXCEPTION 'zero balance bypass'; END IF;
  IF public.reserve_generation_credit(u, a, repeat('a',64))->>'status' <> 'completed' THEN RAISE EXCEPTION 'zero balance blocks replay'; END IF;
  INSERT INTO public.generation_wallets(user_id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;
  IF (SELECT balance FROM public.generation_wallets WHERE user_id = u) <> 0 THEN RAISE EXCEPTION 'backfill restored spent credits'; END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.credit_user'), true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.credit_user'), 'role', 'authenticated')::text, true);
DO $$
BEGIN
  IF (public.generation_credit_summary()->>'balance')::integer <> 0 THEN RAISE EXCEPTION 'balance not persistent'; END IF;
  IF EXISTS(SELECT 1 FROM public.generation_wallets WHERE user_id = current_setting('test.credit_other')::uuid) THEN RAISE EXCEPTION 'cross-user wallet leak'; END IF;
  BEGIN
    UPDATE public.generation_wallets SET balance = 100;
    RAISE EXCEPTION 'self balance update allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.generation_wallets(user_id) VALUES (gen_random_uuid());
    RAISE EXCEPTION 'wallet insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.generation_wallets;
    RAISE EXCEPTION 'wallet delete allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.reserve_generation_credit(auth.uid(), gen_random_uuid(), repeat('a',64));
    RAISE EXCEPTION 'client reserve allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.finish_generation_credit(auth.uid(), gen_random_uuid(), NULL);
    RAISE EXCEPTION 'client refund allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.expire_generation_reservations(current_setting('test.credit_other')::uuid);
    RAISE EXCEPTION 'client can expire others';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM * FROM public.generation_requests;
    RAISE EXCEPTION 'client reads internal requests';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  -- No credit gate on saving/reading itineraries or on the community.
  INSERT INTO public.itineraries(title, description, regions, days_count, itinerary_data)
  VALUES ('Credits test','Credits test',ARRAY['Grande Florianópolis'],1,'{"days":[{"day":1,"locations":[]}],"locations":[{}]}');
  IF NOT EXISTS(SELECT 1 FROM public.itineraries WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'zero credits blocks saved itineraries'; END IF;
  PERFORM id FROM public.community_itineraries LIMIT 1;
  PERFORM itinerary_id FROM public.community_reviews LIMIT 1;
  PERFORM id FROM public.partners LIMIT 1;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
DO $$ BEGIN
  BEGIN PERFORM public.generation_credit_summary(); RAISE EXCEPTION 'anon summary allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM * FROM public.generation_wallets; RAISE EXCEPTION 'anon read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.reserve_generation_credit(gen_random_uuid(),gen_random_uuid(),repeat('a',64)); RAISE EXCEPTION 'anon reserve allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$
DECLARE u uuid := current_setting('test.credit_other')::uuid; a uuid;
BEGIN
  FOR i IN 1..10 LOOP
    a := gen_random_uuid();
    IF public.reserve_generation_credit(u,a,repeat('a',64))->>'status' <> 'acquired' THEN RAISE EXCEPTION 'rate limit too early'; END IF;
    PERFORM public.finish_generation_credit(u,a,NULL);
  END LOOP;
  IF public.reserve_generation_credit(u,gen_random_uuid(),repeat('a',64))->>'status' <> 'rate_limited' THEN RAISE EXCEPTION 'rate limit missing'; END IF;
  IF (SELECT balance FROM public.generation_wallets WHERE user_id=u) <> 3 THEN RAISE EXCEPTION 'technical errors consume credits'; END IF;
  IF NOT (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('public.generation_wallets'::regclass,'public.generation_requests'::regclass)) THEN RAISE EXCEPTION 'RLS disabled'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: initial grant, backfill idempotency, reservation, replay, refund, expiration, zero balance, isolation, grants/RLS, saved access and rate limit' AS result;

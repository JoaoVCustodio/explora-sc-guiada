-- Execute as the database administrator. All fixtures and writes are rolled back.
BEGIN;

SELECT set_config('test.itinerary_owner', gen_random_uuid()::text, true);
SELECT set_config('test.itinerary_other', gen_random_uuid()::text, true);
SELECT set_config('test.itinerary_id', gen_random_uuid()::text, true);

INSERT INTO auth.users (id) VALUES
  (current_setting('test.itinerary_owner')::uuid),
  (current_setting('test.itinerary_other')::uuid);

DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.itineraries'::regclass) THEN
    RAISE EXCEPTION 'FAIL: RLS disabled';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'itineraries'
      AND policyname IN ('itineraries_insert_own', 'itineraries_select_own', 'itineraries_delete_own')) <> 3 THEN
    RAISE EXCEPTION 'FAIL: unexpected policies';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.itinerary_owner'), true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.itinerary_owner'), 'role', 'authenticated')::text, true);

INSERT INTO public.itineraries (id, title, description, regions, interests, days_count, itinerary_data)
VALUES (current_setting('test.itinerary_id')::uuid, 'RLS test', 'RLS test', ARRAY['Grande Florianópolis'], ARRAY['praias'], 1,
  '{"title":"RLS test","description":"RLS test","days":[{"day":1,"locations":[{"order":1,"period":"manha","estimatedDuration":"1h","name":"Fixture","description":"Fixture","latitude":-27,"longitude":-48}]}],"locations":[{"name":"Fixture","description":"Fixture","latitude":-27,"longitude":-48}]}');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.itineraries WHERE id = current_setting('test.itinerary_id')::uuid) <> 1 THEN
    RAISE EXCEPTION 'FAIL: owner cannot read saved itinerary';
  END IF;
  IF (SELECT itinerary_data #>> '{days,0,locations,0,period}' FROM public.itineraries WHERE id = current_setting('test.itinerary_id')::uuid) <> 'manha' THEN
    RAISE EXCEPTION 'FAIL: complete JSON not preserved';
  END IF;
  BEGIN
    INSERT INTO public.itineraries (user_id, title, description, regions, days_count, itinerary_data)
    VALUES (current_setting('test.itinerary_other')::uuid, 'Forged', 'Forged', ARRAY['Grande Florianópolis'], 1, '{"days":[{}],"locations":[{}]}');
    RAISE EXCEPTION 'FAIL: insert for another user allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.itineraries SET title = 'Changed' WHERE id = current_setting('test.itinerary_id')::uuid;
    RAISE EXCEPTION 'FAIL: update allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.itineraries (title, description, regions, days_count, itinerary_data)
    VALUES ('Invalid days', 'Invalid days', ARRAY['Grande Florianópolis'], 2, '{"days":[{}],"locations":[{}]}');
    RAISE EXCEPTION 'FAIL: inconsistent days accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', current_setting('test.itinerary_other'), true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.itinerary_other'), 'role', 'authenticated')::text, true);

DO $$
DECLARE affected integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.itineraries WHERE id = current_setting('test.itinerary_id')::uuid) THEN
    RAISE EXCEPTION 'FAIL: another user can open itinerary';
  END IF;
  IF EXISTS (SELECT 1 FROM public.itineraries WHERE user_id = current_setting('test.itinerary_owner')::uuid) THEN
    RAISE EXCEPTION 'FAIL: another user can list owner itineraries';
  END IF;
  DELETE FROM public.itineraries WHERE id = current_setting('test.itinerary_id')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: another user can delete itinerary'; END IF;
END $$;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

DO $$
BEGIN
  BEGIN
    PERFORM id FROM public.itineraries;
    RAISE EXCEPTION 'FAIL: anonymous SELECT allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.itineraries (user_id, title, description, regions, days_count, itinerary_data)
    VALUES (current_setting('test.itinerary_owner')::uuid, 'Anon', 'Anon', ARRAY['Grande Florianópolis'], 1, '{"days":[{}],"locations":[{}]}');
    RAISE EXCEPTION 'FAIL: anonymous INSERT allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.itineraries WHERE id = current_setting('test.itinerary_id')::uuid;
    RAISE EXCEPTION 'FAIL: anonymous DELETE allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.itinerary_owner'), true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.itinerary_owner'), 'role', 'authenticated')::text, true);

DO $$
DECLARE affected integer;
BEGIN
  DELETE FROM public.itineraries WHERE id = current_setting('test.itinerary_id')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'FAIL: owner cannot delete itinerary'; END IF;
  IF EXISTS (SELECT 1 FROM public.itineraries WHERE id = current_setting('test.itinerary_id')::uuid) THEN
    RAISE EXCEPTION 'FAIL: deleted itinerary still exists';
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
SELECT 'PASS: owner insert/read/delete, cross-user isolation, anonymous denial, update denial, JSON and days validation; fixtures rolled back' AS result;

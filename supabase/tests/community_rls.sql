-- Run as administrator. Users, publications, reviews and writes are rolled back.
BEGIN;
SELECT set_config('test.author', gen_random_uuid()::text, true);
SELECT set_config('test.reviewer', gen_random_uuid()::text, true);
SELECT set_config('test.other', gen_random_uuid()::text, true);
SELECT set_config('test.route', gen_random_uuid()::text, true);
SELECT set_config('test.private_route', gen_random_uuid()::text, true);
INSERT INTO auth.users (id, raw_user_meta_data) VALUES
  (current_setting('test.author')::uuid, '{"full_name":"Public Author"}'),
  (current_setting('test.reviewer')::uuid, '{"full_name":"Reviewer"}'),
  (current_setting('test.other')::uuid, '{"full_name":"member@example.test"}');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.author'), true);
INSERT INTO public.itineraries (id, title, description, regions, days_count, itinerary_data) VALUES
  (current_setting('test.route')::uuid, 'Community fixture', 'Fixture', ARRAY['Grande Florianópolis'], 1, '{"days":[{}],"locations":[{}]}'),
  (current_setting('test.private_route')::uuid, 'Private fixture', 'Fixture', ARRAY['Vale Europeu'], 1, '{"days":[{}],"locations":[{}]}');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.itineraries WHERE user_id = auth.uid() AND (is_public OR published_at IS NOT NULL)) THEN RAISE EXCEPTION 'FAIL: not private by default'; END IF;
  IF public.community_author_name(auth.uid()) <> 'Public Author' THEN RAISE EXCEPTION 'FAIL: own name preview'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', current_setting('test.reviewer'), true);
DO $$ DECLARE affected integer; BEGIN
  IF EXISTS (SELECT 1 FROM public.itineraries WHERE user_id = current_setting('test.author')::uuid) THEN RAISE EXCEPTION 'FAIL: private itinerary leaked'; END IF;
  IF public.community_author_name(current_setting('test.author')::uuid) IS NOT NULL THEN RAISE EXCEPTION 'FAIL: private profile name leaked'; END IF;
  UPDATE public.itineraries SET is_public = true WHERE id = current_setting('test.route')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: nonowner publication'; END IF;
  BEGIN
    INSERT INTO public.itinerary_reviews (itinerary_id, rating) VALUES (current_setting('test.route')::uuid, 4);
    RAISE EXCEPTION 'FAIL: private review allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub', current_setting('test.author'), true);
UPDATE public.itineraries SET is_public = true WHERE id = current_setting('test.route')::uuid;
SELECT set_config('test.published_at', published_at::text, true) FROM public.itineraries WHERE id = current_setting('test.route')::uuid;
UPDATE public.itineraries SET is_public = true WHERE id = current_setting('test.route')::uuid;
DO $$ BEGIN
  IF (SELECT published_at FROM public.itineraries WHERE id = current_setting('test.route')::uuid) IS DISTINCT FROM current_setting('test.published_at')::timestamptz THEN RAISE EXCEPTION 'FAIL: retry changed publication date'; END IF;
  BEGIN
    UPDATE public.itineraries SET published_at = now() WHERE id = current_setting('test.route')::uuid;
    RAISE EXCEPTION 'FAIL: client can forge publication date';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.itineraries SET user_id = current_setting('test.other')::uuid WHERE id = current_setting('test.route')::uuid;
    RAISE EXCEPTION 'FAIL: ownership transfer';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.itinerary_reviews (itinerary_id, rating) VALUES (current_setting('test.route')::uuid, 5);
    RAISE EXCEPTION 'FAIL: self review';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub', current_setting('test.reviewer'), true);
DO $$ DECLARE affected integer; BEGIN
  IF (SELECT count(*) FROM public.community_itineraries WHERE id = current_setting('test.route')::uuid) <> 1 THEN RAISE EXCEPTION 'FAIL: published route not visible'; END IF;
  IF EXISTS (SELECT 1 FROM public.community_itineraries WHERE id = current_setting('test.private_route')::uuid) THEN RAISE EXCEPTION 'FAIL: private route in community'; END IF;
  IF (SELECT author_name FROM public.community_itineraries WHERE id = current_setting('test.route')::uuid) <> 'Public Author' THEN RAISE EXCEPTION 'FAIL: public author name'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = current_setting('test.author')::uuid) THEN RAISE EXCEPTION 'FAIL: profile table opened'; END IF;
  IF (SELECT reviews_count FROM public.community_itineraries WHERE id = current_setting('test.route')::uuid) <> 0 THEN RAISE EXCEPTION 'FAIL: initial review count'; END IF;
  UPDATE public.itineraries SET is_public = false WHERE id = current_setting('test.route')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: nonowner unpublication'; END IF;
END $$;
INSERT INTO public.itinerary_reviews (itinerary_id, rating, comment) VALUES (current_setting('test.route')::uuid, 4, ' Nice! ');
SELECT set_config('test.review_created', created_at::text, true) FROM public.itinerary_reviews WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = auth.uid();
DO $$ BEGIN
  BEGIN
    INSERT INTO public.itinerary_reviews (itinerary_id, rating) VALUES (current_setting('test.route')::uuid, 3);
    RAISE EXCEPTION 'FAIL: duplicate review';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.itinerary_reviews (itinerary_id, user_id, rating) VALUES (current_setting('test.route')::uuid, current_setting('test.other')::uuid, 3);
    RAISE EXCEPTION 'FAIL: forged review user';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.itinerary_reviews SET rating = 0 WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = auth.uid();
    RAISE EXCEPTION 'FAIL: rating zero';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.itinerary_reviews SET rating = 6 WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = auth.uid();
    RAISE EXCEPTION 'FAIL: rating six';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.itinerary_reviews SET comment = repeat('a', 501) WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = auth.uid();
    RAISE EXCEPTION 'FAIL: long comment';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.itinerary_reviews SET user_id = current_setting('test.other')::uuid WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = auth.uid();
    RAISE EXCEPTION 'FAIL: review ownership transfer';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.itinerary_reviews SET itinerary_id = current_setting('test.private_route')::uuid WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = auth.uid();
    RAISE EXCEPTION 'FAIL: move review to private route';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE public.itinerary_reviews SET rating = 5, comment = ' Updated ' WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = auth.uid();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.itinerary_reviews WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = auth.uid()
    AND rating = 5 AND comment = 'Updated' AND created_at = current_setting('test.review_created')::timestamptz AND updated_at > created_at) THEN RAISE EXCEPTION 'FAIL: review edit timestamps'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', current_setting('test.other'), true);
DO $$ DECLARE affected integer; BEGIN
  UPDATE public.itinerary_reviews SET rating = 1 WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = current_setting('test.reviewer')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: editing another review'; END IF;
  DELETE FROM public.itinerary_reviews WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = current_setting('test.reviewer')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: deleting another review'; END IF;
END $$;
INSERT INTO public.itinerary_reviews (itinerary_id, rating) VALUES (current_setting('test.route')::uuid, 3);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.community_itineraries WHERE id = current_setting('test.route')::uuid AND rating_average = 4 AND reviews_count = 2) THEN RAISE EXCEPTION 'FAIL: aggregate not accurate'; END IF;
  IF (SELECT author_name FROM public.community_reviews WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = auth.uid()) <> 'Viajante' THEN RAISE EXCEPTION 'FAIL: email exposed as author'; END IF;
  UPDATE public.profiles SET full_name = E'\n\t' WHERE id = auth.uid();
  IF public.community_author_name(auth.uid()) <> 'Viajante' THEN RAISE EXCEPTION 'FAIL: blank public name'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', current_setting('test.author'), true);
DO $$ DECLARE affected integer; BEGIN
  DELETE FROM public.itinerary_reviews WHERE itinerary_id = current_setting('test.route')::uuid;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: itinerary owner deleted reviews'; END IF;
END $$;
UPDATE public.itineraries SET is_public = false WHERE id = current_setting('test.route')::uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.itineraries WHERE id = current_setting('test.route')::uuid AND NOT is_public AND published_at IS NULL) THEN RAISE EXCEPTION 'FAIL: unpublication deleted itinerary'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', current_setting('test.reviewer'), true);
DO $$ DECLARE affected integer; BEGIN
  IF EXISTS (SELECT 1 FROM public.community_itineraries WHERE id = current_setting('test.route')::uuid) THEN RAISE EXCEPTION 'FAIL: withdrawn itinerary visible'; END IF;
  IF EXISTS (SELECT 1 FROM public.community_reviews WHERE itinerary_id = current_setting('test.route')::uuid) THEN RAISE EXCEPTION 'FAIL: withdrawn reviews visible'; END IF;
  IF EXISTS (SELECT 1 FROM public.itineraries WHERE id = current_setting('test.route')::uuid) THEN RAISE EXCEPTION 'FAIL: direct private read'; END IF;
  UPDATE public.itinerary_reviews SET rating = 1 WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = auth.uid();
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'FAIL: private review edit'; END IF;
  DELETE FROM public.itinerary_reviews WHERE itinerary_id = current_setting('test.route')::uuid AND user_id = auth.uid();
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'FAIL: cannot delete own review'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', current_setting('test.author'), true);
UPDATE public.itineraries SET is_public = true WHERE id = current_setting('test.route')::uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.community_itineraries WHERE id = current_setting('test.route')::uuid AND rating_average = 3 AND reviews_count = 1) THEN RAISE EXCEPTION 'FAIL: republish review persistence or delete aggregate'; END IF;
END $$;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
DO $$ BEGIN
  BEGIN PERFORM id FROM public.community_itineraries; RAISE EXCEPTION 'FAIL: anonymous community'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM itinerary_id FROM public.community_reviews; RAISE EXCEPTION 'FAIL: anonymous reviews'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.community_author_name(current_setting('test.author')::uuid); RAISE EXCEPTION 'FAIL: anonymous profile name'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.itinerary_reviews (itinerary_id, rating) VALUES (current_setting('test.route')::uuid, 5); RAISE EXCEPTION 'FAIL: anonymous review write'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('test.author'), true);
DELETE FROM public.itineraries WHERE id = current_setting('test.route')::uuid;
SELECT set_config('request.jwt.claim.sub', current_setting('test.other'), true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.itinerary_reviews WHERE itinerary_id = current_setting('test.route')::uuid) THEN RAISE EXCEPTION 'FAIL: cascade left reviews'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: publication, private/public RLS, profiles privacy, review CRUD/uniqueness/bounds/ownership, aggregates, withdrawal, cascade and anonymous denial; rolled back' AS result;

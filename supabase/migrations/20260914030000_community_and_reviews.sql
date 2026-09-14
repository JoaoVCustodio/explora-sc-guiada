ALTER TABLE public.itineraries
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at timestamptz;

ALTER TABLE public.itineraries ADD CONSTRAINT itineraries_publication_consistent
  CHECK ((is_public AND published_at IS NOT NULL) OR (NOT is_public AND published_at IS NULL));

CREATE INDEX itineraries_publication_idx ON public.itineraries (published_at DESC, id DESC) WHERE is_public;

CREATE FUNCTION public.set_itinerary_publication() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT NEW.is_public THEN
    NEW.published_at := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.published_at := clock_timestamp();
  ELSIF NOT OLD.is_public THEN
    NEW.published_at := clock_timestamp();
  ELSE
    NEW.published_at := OLD.published_at;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER set_itinerary_publication BEFORE INSERT OR UPDATE ON public.itineraries
  FOR EACH ROW EXECUTE FUNCTION public.set_itinerary_publication();
REVOKE ALL ON FUNCTION public.set_itinerary_publication() FROM PUBLIC, anon, authenticated;

CREATE POLICY itineraries_select_public ON public.itineraries FOR SELECT TO authenticated
  USING (is_public);
CREATE POLICY itineraries_publish_own ON public.itineraries FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT UPDATE (is_public) ON public.itineraries TO authenticated;

CREATE TABLE public.itinerary_reviews (
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (char_length(comment) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (itinerary_id, user_id)
);
CREATE INDEX itinerary_reviews_user_idx ON public.itinerary_reviews (user_id);
CREATE INDEX itinerary_reviews_recent_idx ON public.itinerary_reviews (itinerary_id, created_at DESC, user_id);
ALTER TABLE public.itinerary_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.itinerary_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.itinerary_reviews TO authenticated;
GRANT INSERT (itinerary_id, user_id, rating, comment) ON public.itinerary_reviews TO authenticated;
GRANT UPDATE (rating, comment) ON public.itinerary_reviews TO authenticated;

CREATE POLICY reviews_select_visible ON public.itinerary_reviews FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR EXISTS (
    SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_id AND i.is_public
  ));
CREATE POLICY reviews_insert_own_public ON public.itinerary_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_id AND i.is_public AND i.user_id <> (SELECT auth.uid())
  ));
CREATE POLICY reviews_update_own_public ON public.itinerary_reviews FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_id AND i.is_public AND i.user_id <> (SELECT auth.uid())
  ))
  WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_id AND i.is_public AND i.user_id <> (SELECT auth.uid())
  ));
CREATE POLICY reviews_delete_own ON public.itinerary_reviews FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Lock the parent against simultaneous unpublication while accepting a review.
-- Definer privileges are limited to this check; RLS still applies to the review write.
CREATE FUNCTION public.guard_itinerary_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE itinerary_owner uuid; published boolean;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Review owner mismatch' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.itinerary_id IS DISTINCT FROM OLD.itinerary_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Review identity is immutable' USING ERRCODE = '42501';
    END IF;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.created_at := clock_timestamp();
  END IF;
  SELECT i.user_id, i.is_public INTO itinerary_owner, published
    FROM public.itineraries i WHERE i.id = NEW.itinerary_id FOR SHARE;
  IF NOT FOUND OR NOT published OR itinerary_owner = auth.uid() THEN
    RAISE EXCEPTION 'Only public itineraries from another author can be reviewed' USING ERRCODE = '42501';
  END IF;
  NEW.comment := nullif(btrim(NEW.comment), '');
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_itinerary_review() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_itinerary_review BEFORE INSERT OR UPDATE ON public.itinerary_reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_itinerary_review();

-- Keep profiles RLS private. Only a sanitized display name is exposed, never auth email.
CREATE FUNCTION public.community_author_name(author_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN auth.uid() IS NOT NULL AND (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.itineraries i WHERE i.user_id = author_id AND i.is_public)
    OR EXISTS (SELECT 1 FROM public.itinerary_reviews r JOIN public.itineraries i ON i.id = r.itinerary_id
      WHERE r.user_id = author_id AND i.is_public)
  ) THEN COALESCE((
    SELECT CASE WHEN p.full_name NOT LIKE '%@%'
      THEN coalesce(nullif(left(btrim(regexp_replace(p.full_name, '[[:cntrl:]]', '', 'g')), 80), ''), 'Viajante')
      ELSE 'Viajante' END FROM public.profiles p WHERE p.id = author_id
  ), 'Viajante') ELSE NULL END
$$;
REVOKE ALL ON FUNCTION public.community_author_name(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_author_name(uuid) TO authenticated;

CREATE VIEW public.community_itineraries WITH (security_invoker = true) AS
SELECT i.id, i.user_id, i.title, i.description, i.regions, i.interests, i.days_count,
  i.itinerary_data, i.published_at,
  jsonb_array_length(i.itinerary_data -> 'locations') AS locations_count,
  public.community_author_name(i.user_id) AS author_name,
  stats.rating_average, stats.reviews_count
FROM public.itineraries i
LEFT JOIN LATERAL (
  SELECT round(avg(r.rating), 1) AS rating_average, count(*)::integer AS reviews_count
  FROM public.itinerary_reviews r WHERE r.itinerary_id = i.id
) stats ON true
WHERE i.is_public;

CREATE VIEW public.community_reviews WITH (security_invoker = true) AS
SELECT r.itinerary_id, r.user_id, r.rating, r.comment, r.created_at, r.updated_at,
  public.community_author_name(r.user_id) AS author_name
FROM public.itinerary_reviews r JOIN public.itineraries i ON i.id = r.itinerary_id
WHERE i.is_public;

REVOKE ALL ON public.community_itineraries, public.community_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_itineraries, public.community_reviews TO authenticated;

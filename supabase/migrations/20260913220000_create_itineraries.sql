CREATE TABLE public.itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 180),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 2500),
  regions text[] NOT NULL,
  interests text[] NOT NULL DEFAULT '{}',
  days_count integer NOT NULL CHECK (days_count BETWEEN 1 AND 7),
  itinerary_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT itineraries_data_object CHECK (jsonb_typeof(itinerary_data) = 'object'),
  CONSTRAINT itineraries_data_days CHECK (
    jsonb_typeof(itinerary_data -> 'days') = 'array'
    AND jsonb_array_length(itinerary_data -> 'days') = days_count
    AND itinerary_data ? 'days'
  ),
  CONSTRAINT itineraries_data_locations CHECK (
    jsonb_typeof(itinerary_data -> 'locations') = 'array'
    AND jsonb_array_length(itinerary_data -> 'locations') BETWEEN 1 AND 140
    AND itinerary_data ? 'locations'
  ),
  CONSTRAINT itineraries_data_size CHECK (octet_length(itinerary_data::text) <= 500000)
);

CREATE INDEX itineraries_user_created_idx ON public.itineraries (user_id, created_at DESC, id DESC);

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.itineraries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.itineraries TO authenticated;

CREATE POLICY itineraries_insert_own ON public.itineraries
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY itineraries_select_own ON public.itineraries
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY itineraries_delete_own ON public.itineraries
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

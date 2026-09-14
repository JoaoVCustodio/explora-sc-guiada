CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 300),
  image_url text CHECK (image_url IS NULL OR image_url ~ '^https://[^[:space:]]+$'),
  region text NOT NULL CHECK (region IN (
    'Grande Florianópolis', 'Serra Catarinense', 'Litoral Norte', 'Vale Europeu',
    'Oeste Catarinense', 'Sul Catarinense', 'Planalto Norte'
  )),
  city text NOT NULL CHECK (char_length(btrim(city)) BETWEEN 1 AND 120),
  neighborhood text CHECK (neighborhood IS NULL OR char_length(btrim(neighborhood)) BETWEEN 1 AND 120),
  whatsapp_url text CHECK (whatsapp_url IS NULL OR whatsapp_url ~ '^https://(wa\.me|api\.whatsapp\.com|www\.whatsapp\.com)/[^[:space:]]*$'),
  instagram_url text CHECK (instagram_url IS NULL OR instagram_url ~ '^https://(www\.)?instagram\.com/[^[:space:]]*$'),
  active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX partners_active_region_idx ON public.partners (region, created_at, id) WHERE active;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partners FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
CREATE POLICY partners_read_active ON public.partners
  FOR SELECT TO authenticated USING (active = true);

COMMENT ON TABLE public.partners IS 'Parceiros regionais administrados exclusivamente pelo Supabase. Sem seed de empresas.';

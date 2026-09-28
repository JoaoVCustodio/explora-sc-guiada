-- Credits are independent of saved itineraries. Only trusted server RPCs mutate them.
CREATE TABLE public.generation_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 3 CHECK (balance >= 0),
  initial_credits integer NOT NULL DEFAULT 3 CHECK (initial_credits = 3),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.generation_requests (
  user_id uuid NOT NULL REFERENCES public.generation_wallets(user_id) ON DELETE CASCADE,
  id uuid NOT NULL,
  input_hash text NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL DEFAULT (clock_timestamp() + interval '120 seconds'),
  result jsonb,
  PRIMARY KEY (user_id, id),
  CHECK ((status = 'completed') = (result IS NOT NULL))
);
CREATE UNIQUE INDEX generation_one_active_per_user ON public.generation_requests(user_id) WHERE status = 'reserved';
CREATE INDEX generation_requests_recent ON public.generation_requests(user_id, created_at DESC);
ALTER TABLE public.generation_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.generation_wallets, public.generation_requests FROM anon, authenticated;
GRANT SELECT ON public.generation_wallets TO authenticated;
CREATE POLICY generation_wallet_read_own ON public.generation_wallets FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
-- Requests include cached generated content; expose only via the authenticated Edge Function.

CREATE FUNCTION public.grant_initial_generation_credits() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.generation_wallets(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER grant_generation_credits AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_initial_generation_credits();
INSERT INTO public.generation_wallets(user_id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;

-- Caller holds the wallet row lock. Lazy reclamation needs neither a cron nor an Edge worker.
CREATE FUNCTION public.expire_generation_reservations(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE reclaimed integer;
BEGIN
  PERFORM 1 FROM public.generation_wallets WHERE user_id = p_user FOR UPDATE;
  UPDATE public.generation_requests SET status = 'failed'
    WHERE user_id = p_user AND status = 'reserved' AND expires_at <= clock_timestamp();
  GET DIAGNOSTICS reclaimed = ROW_COUNT;
  UPDATE public.generation_wallets SET balance = balance + reclaimed WHERE user_id = p_user;
END $$;

CREATE FUNCTION public.generation_credit_summary() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE wallet public.generation_wallets;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  PERFORM public.expire_generation_reservations(auth.uid());
  SELECT * INTO STRICT wallet FROM public.generation_wallets WHERE user_id = auth.uid();
  RETURN jsonb_build_object('balance', wallet.balance, 'initialCredits', wallet.initial_credits,
    'pending', EXISTS (SELECT 1 FROM public.generation_requests WHERE user_id = auth.uid() AND status = 'reserved'));
END $$;

CREATE FUNCTION public.reserve_generation_credit(p_user uuid, p_id uuid, p_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE wallet public.generation_wallets; previous public.generation_requests;
BEGIN
  IF p_id IS NULL OR p_hash IS NULL OR length(p_hash) <> 64 THEN RAISE EXCEPTION 'invalid request'; END IF;
  SELECT * INTO STRICT wallet FROM public.generation_wallets WHERE user_id = p_user FOR UPDATE;
  PERFORM public.expire_generation_reservations(p_user);
  SELECT * INTO previous FROM public.generation_requests WHERE user_id = p_user AND id = p_id;
  IF FOUND THEN
    IF previous.input_hash <> p_hash THEN RETURN jsonb_build_object('status', 'conflict'); END IF;
    RETURN jsonb_build_object('status', previous.status, 'result', previous.result);
  END IF;
  IF EXISTS (SELECT 1 FROM public.generation_requests WHERE user_id = p_user AND status = 'reserved') THEN
    RETURN jsonb_build_object('status', 'busy');
  END IF;
  IF (SELECT balance FROM public.generation_wallets WHERE user_id = p_user) < 1 THEN
    RETURN jsonb_build_object('status', 'no_credits');
  END IF;
  IF (SELECT count(*) FROM public.generation_requests WHERE user_id = p_user AND created_at > clock_timestamp() - interval '1 hour') >= 10 THEN
    RETURN jsonb_build_object('status', 'rate_limited');
  END IF;
  UPDATE public.generation_wallets SET balance = balance - 1 WHERE user_id = p_user;
  INSERT INTO public.generation_requests(user_id, id, input_hash) VALUES (p_user, p_id, p_hash);
  RETURN jsonb_build_object('status', 'acquired');
END $$;

CREATE FUNCTION public.finish_generation_credit(p_user uuid, p_id uuid, p_result jsonb DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attempt public.generation_requests;
BEGIN
  PERFORM 1 FROM public.generation_wallets WHERE user_id = p_user FOR UPDATE;
  PERFORM public.expire_generation_reservations(p_user);
  SELECT * INTO STRICT attempt FROM public.generation_requests WHERE user_id = p_user AND id = p_id;
  IF attempt.status = 'reserved' THEN
    IF p_result IS NULL THEN
      UPDATE public.generation_wallets SET balance = balance + 1 WHERE user_id = p_user;
      UPDATE public.generation_requests SET status = 'failed' WHERE user_id = p_user AND id = p_id;
    ELSE
      IF jsonb_typeof(p_result) <> 'object' OR jsonb_array_length(p_result->'days') NOT BETWEEN 1 AND 7
        OR jsonb_array_length(p_result->'locations') < 1 THEN RAISE EXCEPTION 'invalid result'; END IF;
      UPDATE public.generation_requests SET status = 'completed', result = p_result WHERE user_id = p_user AND id = p_id;
    END IF;
  END IF;
  SELECT * INTO attempt FROM public.generation_requests WHERE user_id = p_user AND id = p_id;
  RETURN jsonb_build_object('status', attempt.status, 'result', attempt.result);
END $$;

REVOKE ALL ON FUNCTION public.grant_initial_generation_credits(), public.expire_generation_reservations(uuid),
  public.generation_credit_summary(), public.reserve_generation_credit(uuid, uuid, text),
  public.finish_generation_credit(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generation_credit_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_generation_credit(uuid, uuid, text), public.finish_generation_credit(uuid, uuid, jsonb) TO service_role;

-- Run as postgres; fixtures and all changes roll back.
BEGIN;
INSERT INTO public.partners (id, name, description, region, city) VALUES
 ('00000000-0000-4000-8000-000000000301', 'Fixture ativo', 'Teste temporário', 'Grande Florianópolis', 'Teste');
INSERT INTO public.partners (id, name, description, region, city, active, is_demo) VALUES
 ('00000000-0000-4000-8000-000000000302', 'Fixture inativo', 'Teste temporário', 'Vale Europeu', 'Teste', false, true);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = '00000000-0000-4000-8000-000000000301' AND active AND NOT is_demo) THEN
  RAISE EXCEPTION 'Defaults incorretos';
 END IF;
 BEGIN
  INSERT INTO public.partners (name, description, region, city) VALUES ('Fixture', 'Teste', 'Região inválida', 'Teste');
  RAISE EXCEPTION 'Aceitou região inválida';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.partners (name, description, region, city) VALUES ('Fixture', repeat('x',301), 'Vale Europeu', 'Teste');
  RAISE EXCEPTION 'Aceitou descrição longa';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.partners WHERE id IN ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000302')) <> 1 THEN
  RAISE EXCEPTION 'RLS leitura incorreta';
 END IF;
 IF EXISTS (SELECT 1 FROM public.partners WHERE id='00000000-0000-4000-8000-000000000302') THEN RAISE EXCEPTION 'Inativo visível'; END IF;
 BEGIN
  INSERT INTO public.partners (name, description, region, city) VALUES ('Fixture', 'Teste', 'Vale Europeu', 'Teste');
  RAISE EXCEPTION 'Usuário conseguiu inserir';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.partners SET active=false WHERE id='00000000-0000-4000-8000-000000000301';
  RAISE EXCEPTION 'Usuário conseguiu editar';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  DELETE FROM public.partners WHERE id='00000000-0000-4000-8000-000000000301';
  RAISE EXCEPTION 'Usuário conseguiu excluir';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM id FROM public.partners;
  RAISE EXCEPTION 'Anônimo conseguiu ler';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'PASS: defaults, constraints, active-only RLS, authenticated writes denied, anonymous read denied' AS result;
ROLLBACK;

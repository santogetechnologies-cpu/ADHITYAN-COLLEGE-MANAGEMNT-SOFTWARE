-- Step 35: defence in depth for visitors who are not signed in.
-- Row level security already hides every row from them, except the three tables with a deliberate public rule
-- (departments, sections, fee_structures). This removes their table privileges as well, so even a future
-- policy mistake cannot expose a table to the public internet. Signed-in users are not affected.
SET search_path = public, extensions;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
GRANT SELECT ON public.departments, public.sections, public.fee_structures TO anon;

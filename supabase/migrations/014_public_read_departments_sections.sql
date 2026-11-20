-- Allow anon and authenticated read access to departments and sections
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'Public can view departments') THEN
        CREATE POLICY "Public can view departments" ON public.departments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sections' AND policyname = 'Public can view sections') THEN
        CREATE POLICY "Public can view sections" ON public.sections FOR SELECT USING (true);
    END IF;
END $$;


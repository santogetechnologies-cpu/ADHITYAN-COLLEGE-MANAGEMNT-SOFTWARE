-- Migration 010: Allow public read on store products catalog
DROP POLICY IF EXISTS "Public can view store products" ON public.store_products;
CREATE POLICY "Public can view store products"
    ON public.store_products FOR SELECT TO public
    USING (true);

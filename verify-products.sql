-- Verify remaining tables
SELECT COUNT(*) AS products_count FROM public.products;
SELECT COUNT(*) AS tiers_count FROM public.product_tiers;

-- Check products detail
SELECT id, title, COUNT(t.id) as tier_count 
FROM products p 
LEFT JOIN product_tiers t ON p.id = t.product_id
GROUP BY p.id, p.title;


CREATE TABLE public.customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'consumer',
  signup_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  cost NUMERIC(10,2) NOT NULL
);

CREATE TABLE public.orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  channel TEXT NOT NULL DEFAULT 'web'
);

CREATE TABLE public.order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE public.inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse TEXT NOT NULL,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 20
);

GRANT SELECT ON public.customers, public.products, public.orders, public.order_items, public.inventory TO anon, authenticated;
GRANT ALL ON public.customers, public.products, public.orders, public.order_items, public.inventory TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo data is publicly readable" ON public.customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo data is publicly readable" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo data is publicly readable" ON public.orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo data is publicly readable" ON public.order_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo data is publicly readable" ON public.inventory FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.products (name, category, price, cost) VALUES
  ('Aurora Wireless Headphones','Audio',199.00,88.00),
  ('Aurora Earbuds Pro','Audio',129.00,52.00),
  ('Nimbus Bluetooth Speaker','Audio',89.00,34.00),
  ('Vertex 14 Laptop','Computers',1299.00,890.00),
  ('Vertex 16 Pro Laptop','Computers',1899.00,1310.00),
  ('Orbit Mechanical Keyboard','Accessories',149.00,61.00),
  ('Orbit Wireless Mouse','Accessories',59.00,21.00),
  ('Lumen 27" 4K Monitor','Displays',449.00,290.00),
  ('Lumen 32" Ultrawide','Displays',699.00,470.00),
  ('Pulse Smartwatch',	'Wearables',249.00,110.00),
  ('Pulse Fitness Band','Wearables',99.00,38.00),
  ('Cobalt USB-C Hub','Accessories',79.00,26.00),
  ('Cobalt Fast Charger 100W','Accessories',49.00,15.00),
  ('Drift Ergonomic Chair','Furniture',549.00,320.00),
  ('Drift Standing Desk','Furniture',749.00,430.00),
  ('Beacon Webcam 4K','Video',159.00,64.00),
  ('Beacon Ring Light','Video',69.00,22.00),
  ('Atlas Portable SSD 2TB','Storage',219.00,132.00),
  ('Atlas NAS 8TB','Storage',899.00,610.00),
  ('Signal Wi-Fi 7 Router','Networking',329.00,190.00);

INSERT INTO public.customers (name, email, country, segment, signup_date)
SELECT
  'Customer ' || g,
  'customer' || g || '@example.com',
  (ARRAY['United States','India','Germany','United Kingdom','Canada','Australia','Brazil','Japan'])[1 + (g % 8)],
  (ARRAY['consumer','business','enterprise'])[1 + (g % 3)],
  CURRENT_DATE - ((random() * 900)::int)
FROM generate_series(1, 120) g;

INSERT INTO public.orders (customer_id, order_date, status, channel)
SELECT
  1 + (random() * 119)::int,
  CURRENT_DATE - ((random() * 450)::int),
  (ARRAY['completed','completed','completed','completed','pending','cancelled','refunded'])[1 + (g % 7)],
  (ARRAY['web','mobile','marketplace','retail'])[1 + (g % 4)]
FROM generate_series(1, 900) g;

INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
SELECT
  o.id,
  p.id,
  1 + (random() * 3)::int,
  p.price
FROM public.orders o
CROSS JOIN LATERAL (
  SELECT id, price FROM public.products ORDER BY random() LIMIT 1 + (random() * 2)::int
) p;

INSERT INTO public.inventory (product_id, warehouse, quantity_on_hand, reorder_level)
SELECT p.id, w.warehouse, (random() * 300)::int, 25
FROM public.products p
CROSS JOIN (VALUES ('US-East'),('EU-Central'),('APAC-South')) AS w(warehouse);

CREATE OR REPLACE FUNCTION public.execute_readonly_sql(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  cleaned TEXT;
  result JSONB;
BEGIN
  cleaned := btrim(regexp_replace(query_text, ';\s*$', ''));

  IF cleaned !~* '^(select|with)\s' THEN
    RAISE EXCEPTION 'Only SELECT/WITH queries are allowed.';
  END IF;

  IF cleaned ~* '(^|[^a-z_])(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|call|do)([^a-z_]|$)' THEN
    RAISE EXCEPTION 'Data-modifying statements are not allowed.';
  END IF;

  IF position(';' IN cleaned) > 0 THEN
    RAISE EXCEPTION 'Multiple statements are not allowed.';
  END IF;

  EXECUTE format('SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (%s LIMIT 500) t', cleaned) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(TEXT) TO anon, authenticated, service_role;

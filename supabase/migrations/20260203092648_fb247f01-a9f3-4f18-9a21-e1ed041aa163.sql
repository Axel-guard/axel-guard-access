-- Temporarily disable FK constraints by dropping and recreating them
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_order_id_fkey;
ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS payment_history_order_id_fkey;

-- Update conflicting ORD records to new unique IDs
UPDATE sales SET order_id = '2020534' WHERE order_id = 'ORD2019954';
UPDATE sales SET order_id = '2020535' WHERE order_id = 'ORD2019960';

UPDATE sale_items SET order_id = '2020534' WHERE order_id = 'ORD2019954';
UPDATE sale_items SET order_id = '2020535' WHERE order_id = 'ORD2019960';

UPDATE payment_history SET order_id = '2020534' WHERE order_id = 'ORD2019954';
UPDATE payment_history SET order_id = '2020535' WHERE order_id = 'ORD2019960';

UPDATE inventory SET order_id = '2020534' WHERE order_id = 'ORD2019954';
UPDATE inventory SET order_id = '2020535' WHERE order_id = 'ORD2019960';

UPDATE shipments SET order_id = '2020534' WHERE order_id = 'ORD2019954';
UPDATE shipments SET order_id = '2020535' WHERE order_id = 'ORD2019960';

-- Now update any remaining ORD-prefixed records
UPDATE sales SET order_id = REPLACE(order_id, 'ORD', '') WHERE order_id LIKE 'ORD%';
UPDATE sale_items SET order_id = REPLACE(order_id, 'ORD', '') WHERE order_id LIKE 'ORD%';
UPDATE payment_history SET order_id = REPLACE(order_id, 'ORD', '') WHERE order_id LIKE 'ORD%';
UPDATE inventory SET order_id = REPLACE(order_id, 'ORD', '') WHERE order_id LIKE 'ORD%';
UPDATE shipments SET order_id = REPLACE(order_id, 'ORD', '') WHERE order_id LIKE 'ORD%';

-- Re-add foreign key constraints
ALTER TABLE sale_items ADD CONSTRAINT sale_items_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES sales(order_id) ON DELETE CASCADE;
ALTER TABLE payment_history ADD CONSTRAINT payment_history_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES sales(order_id) ON DELETE CASCADE;
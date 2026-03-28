-- Add sequential ticket_number column starting from 201310
CREATE SEQUENCE IF NOT EXISTS tasks_ticket_number_seq
  START WITH 201310
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ticket_number BIGINT;
ALTER TABLE tasks ALTER COLUMN ticket_number SET DEFAULT nextval('tasks_ticket_number_seq');
ALTER SEQUENCE tasks_ticket_number_seq OWNED BY tasks.ticket_number;

-- Backfill existing rows in creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
  FROM tasks
  WHERE ticket_number IS NULL
)
UPDATE tasks t
SET ticket_number = 201310 + n.rn
FROM numbered n
WHERE t.id = n.id;

-- Advance sequence past all existing values so next insert continues correctly
DO $$
DECLARE
  max_num BIGINT;
BEGIN
  SELECT COALESCE(MAX(ticket_number), 201309) INTO max_num FROM tasks;
  PERFORM setval('tasks_ticket_number_seq', max_num + 1, false);
END $$;

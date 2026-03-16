
-- Update existing tasks with old statuses to new ones
UPDATE public.tasks SET status = 'WIP' WHERE status IN ('Pending', 'In Progress', 'Waiting for Customer');
UPDATE public.tasks SET status = 'Closed' WHERE status IN ('Completed');

-- Change the default status for new tasks from 'Pending' to 'WIP'
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'WIP';

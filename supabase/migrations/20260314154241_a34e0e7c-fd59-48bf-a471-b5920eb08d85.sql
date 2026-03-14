
-- Add user_id column to employees table for direct auth user linking
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id uuid;

-- Populate user_id for known employees based on actual auth emails
UPDATE public.employees SET user_id = 'e64ab0a6-3e6b-4606-bb3d-2e28c3310b7f' WHERE LOWER(email) = 'info@axel-guard.com' AND user_id IS NULL;
UPDATE public.employees SET user_id = 'a9006172-f4a9-4cea-9bf2-46673d4b4d61' WHERE LOWER(email) = 'mani@axel-guard.com' AND user_id IS NULL;
UPDATE public.employees SET user_id = '9bf9e8a2-f676-4144-91c5-9ae407863ea2' WHERE LOWER(email) = 'support@axel-guard.com' AND user_id IS NULL;
UPDATE public.employees SET user_id = '3d531d3a-c53f-49da-94a3-088db7598f53' WHERE LOWER(email) = 'admin@axel-guard.com' AND user_id IS NULL;
UPDATE public.employees SET user_id = 'b1e2a12f-b407-4440-bf8c-47d005c94674' WHERE LOWER(email) = 'sales.realtrack@gmail.com' AND user_id IS NULL;

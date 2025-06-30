-- Check current task status values and fix if needed
-- Run this script to ensure the task status enum is correct

-- First, let's see what values currently exist
SELECT DISTINCT status FROM public.tasks;

-- Drop the existing constraint if it exists
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the correct constraint with proper values
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('todo', 'in_progress', 'done'));

-- Update any existing invalid status values
UPDATE public.tasks SET status = 'todo' WHERE status NOT IN ('todo', 'in_progress', 'done');

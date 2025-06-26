-- Alternative approach: Recreate the tasks table with proper constraints
-- Use this if the enum approach doesn't work

-- First, let's see the current table structure
\d public.tasks;

-- Drop the existing constraint if it exists
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Change the column type to TEXT and add a proper check constraint
ALTER TABLE public.tasks ALTER COLUMN status TYPE TEXT;

-- Add the correct constraint
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('todo', 'in_progress', 'done'));

-- Update any existing invalid status values to 'todo'
UPDATE public.tasks 
SET status = 'todo' 
WHERE status NOT IN ('todo', 'in_progress', 'done');

-- Verify the changes
SELECT DISTINCT status FROM public.tasks;

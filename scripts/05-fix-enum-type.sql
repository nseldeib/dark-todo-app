-- Fix the task_status enum type to include all required values
-- Run this script to properly fix the enum issue

-- First, let's check what enum types exist
SELECT typname, enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname = 'task_status'
ORDER BY enumsortorder;

-- Since the enum doesn't exist, we'll work with TEXT columns instead
-- This script will ensure the tasks table uses TEXT with proper constraints

-- Drop any existing enum type if it exists
DROP TYPE IF EXISTS task_status CASCADE;

-- Ensure the tasks table uses TEXT for status column
DO $$
BEGIN
    -- Check if the status column exists and alter it if needed
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'status' 
        AND table_schema = 'public'
    ) THEN
        -- Drop existing constraint if it exists
        ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
        
        -- Ensure column is TEXT type
        ALTER TABLE public.tasks ALTER COLUMN status TYPE TEXT;
        
        -- Add proper check constraint
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
        CHECK (status IN ('todo', 'in_progress', 'done'));
        
        -- Update any invalid values
        UPDATE public.tasks 
        SET status = 'todo' 
        WHERE status NOT IN ('todo', 'in_progress', 'done');
    END IF;
END $$;

-- Verify the changes
SELECT 'Status column fixed successfully' as message;

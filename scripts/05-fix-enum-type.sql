-- Fix the task_status enum type to include all required values
-- Run this script to properly fix the enum issue

-- First, let's check what enum types exist
SELECT typname, enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname = 'task_status'
ORDER BY enumsortorder;

-- If the enum exists but is missing values, we need to add them
-- Add 'done' to the enum if it doesn't exist
DO $$
BEGIN
    -- Check if 'done' value exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'task_status' AND e.enumlabel = 'done'
    ) THEN
        -- Add 'done' to the enum
        ALTER TYPE task_status ADD VALUE 'done';
    END IF;
    
    -- Check if 'in_progress' value exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'task_status' AND e.enumlabel = 'in_progress'
    ) THEN
        -- Add 'in_progress' to the enum
        ALTER TYPE task_status ADD VALUE 'in_progress';
    END IF;
    
    -- Check if 'todo' value exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'task_status' AND e.enumlabel = 'todo'
    ) THEN
        -- Add 'todo' to the enum
        ALTER TYPE task_status ADD VALUE 'todo';
    END IF;
END $$;

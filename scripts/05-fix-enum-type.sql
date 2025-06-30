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
    -- Try to add the missing enum values if they don't exist
    BEGIN
        ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'done';
    EXCEPTION
        WHEN duplicate_object THEN
            -- Value already exists, do nothing
            NULL;
    END;
    
    -- Check if 'in_progress' value exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'task_status' AND e.enumlabel = 'in_progress'
    ) THEN
        -- Add 'in_progress' to the enum
        ALTER TYPE task_status ADD VALUE 'in_progress';
    END IF;
    
    -- Add 'todo' to the enum if it doesn't exist
    BEGIN
        ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'todo';
    EXCEPTION
        WHEN duplicate_object THEN
            -- Value already exists, do nothing
            NULL;
    END;
    
    -- If the above doesn't work, we'll need to recreate the enum
    -- This is a more aggressive approach
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'task_status' AND e.enumlabel = 'done'
    ) THEN
        -- Drop and recreate the enum
        ALTER TABLE tasks ALTER COLUMN status TYPE text;
        DROP TYPE IF EXISTS task_status;
        CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
        ALTER TABLE tasks ALTER COLUMN status TYPE task_status USING status::task_status;
    END IF;
END $$;

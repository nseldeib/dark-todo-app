-- Alternative approach: Convert enum to TEXT with CHECK constraint
-- This is safer and more flexible

-- First, convert the column to TEXT
ALTER TABLE tasks ALTER COLUMN status TYPE TEXT;

-- Drop the enum type if it exists
DROP TYPE IF EXISTS task_status CASCADE;

-- Add a CHECK constraint to ensure valid values
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('todo', 'in_progress', 'done'));

-- Update any invalid statuses to 'todo'
UPDATE tasks SET status = 'todo' WHERE status NOT IN ('todo', 'in_progress', 'done');

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

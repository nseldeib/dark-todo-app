-- Enable RLS and create policies
-- Run this as a separate script after the tables are created

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can view checklist items for their tasks" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can insert checklist items for their tasks" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can update checklist items for their tasks" ON public.checklist_items;
DROP POLICY IF EXISTS "Users can delete checklist items for their tasks" ON public.checklist_items;

-- Create policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create policies for projects table
CREATE POLICY "Users can view their own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for tasks table
CREATE POLICY "Users can view their own tasks" ON public.tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON public.tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for checklist_items table
CREATE POLICY "Users can view checklist items for their tasks" ON public.checklist_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks 
            WHERE tasks.id = checklist_items.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert checklist items for their tasks" ON public.checklist_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks 
            WHERE tasks.id = checklist_items.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update checklist items for their tasks" ON public.checklist_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.tasks 
            WHERE tasks.id = checklist_items.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete checklist items for their tasks" ON public.checklist_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.tasks 
            WHERE tasks.id = checklist_items.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

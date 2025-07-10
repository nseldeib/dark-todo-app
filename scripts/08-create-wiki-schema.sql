-- Create wiki categories table
CREATE TABLE IF NOT EXISTS wiki_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wiki entries table
CREATE TABLE IF NOT EXISTS wiki_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES wiki_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_public BOOLEAN DEFAULT FALSE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  related_links JSONB DEFAULT '[]',
  file_attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wiki_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wiki_categories
CREATE POLICY "Users can view their own wiki categories" ON wiki_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wiki categories" ON wiki_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wiki categories" ON wiki_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wiki categories" ON wiki_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for wiki_entries
CREATE POLICY "Users can view their own wiki entries" ON wiki_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public wiki entries" ON wiki_entries
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can insert their own wiki entries" ON wiki_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wiki entries" ON wiki_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wiki entries" ON wiki_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wiki_categories_user_id ON wiki_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_entries_user_id ON wiki_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_entries_category_id ON wiki_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_wiki_entries_status ON wiki_entries(status);
CREATE INDEX IF NOT EXISTS idx_wiki_entries_is_public ON wiki_entries(is_public);
CREATE INDEX IF NOT EXISTS idx_wiki_entries_tags ON wiki_entries USING GIN(tags);

-- Create some default categories
INSERT INTO wiki_categories (user_id, name, description, color)
SELECT 
  auth.uid(),
  'General',
  'General knowledge and notes',
  '#6366f1'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO wiki_categories (user_id, name, description, color)
SELECT 
  auth.uid(),
  'Work',
  'Work-related knowledge and documentation',
  '#059669'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO wiki_categories (user_id, name, description, color)
SELECT 
  auth.uid(),
  'Personal',
  'Personal notes and ideas',
  '#dc2626'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO wiki_categories (user_id, name, description, color)
SELECT 
  auth.uid(),
  'Learning',
  'Learning materials and study notes',
  '#7c3aed'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

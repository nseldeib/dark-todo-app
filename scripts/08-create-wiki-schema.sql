-- Create wiki_categories table
CREATE TABLE IF NOT EXISTS wiki_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create wiki_entries table
CREATE TABLE IF NOT EXISTS wiki_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES wiki_categories(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_public BOOLEAN DEFAULT FALSE,
  rating INTEGER DEFAULT NULL CHECK (rating >= 1 AND rating <= 5),
  related_links JSONB DEFAULT '[]',
  file_attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wiki_entries_user_id ON wiki_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_wiki_entries_status ON wiki_entries(status);
CREATE INDEX IF NOT EXISTS idx_wiki_entries_category_id ON wiki_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_wiki_entries_tags ON wiki_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_wiki_entries_updated_at ON wiki_entries(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_wiki_categories_user_id ON wiki_categories(user_id);

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

CREATE POLICY "Users can insert their own wiki entries" ON wiki_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wiki entries" ON wiki_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wiki entries" ON wiki_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wiki_categories_updated_at BEFORE UPDATE ON wiki_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wiki_entries_updated_at BEFORE UPDATE ON wiki_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO wiki_categories (user_id, name, color) 
SELECT auth.uid(), 'General', '#6B7280'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO wiki_categories (user_id, name, color) 
SELECT auth.uid(), 'Work', '#3B82F6'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO wiki_categories (user_id, name, color) 
SELECT auth.uid(), 'Personal', '#10B981'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO wiki_categories (user_id, name, color) 
SELECT auth.uid(), 'Learning', '#8B5CF6'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Task {
  id: string
  user_id: string
  project_id: string
  title: string
  description?: string
  status: "todo" | "in_progress" | "done" | "canceled"
  priority: "low" | "medium" | "high"
  due_date?: string
  is_important: boolean
  emoji?: string
  created_at: string
  updated_at: string
  completed_at?: string
  projects?: {
    name: string
    emoji: string
  }
}

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  emoji?: string
  color?: string
  created_at: string
  updated_at: string
}

export interface WikiCategory {
  id: string
  user_id: string
  name: string
  description?: string
  color: string
  created_at: string
  updated_at: string
}

export interface WikiEntry {
  id: string
  user_id: string
  category_id?: string
  title: string
  summary?: string
  content?: string
  tags?: string[]
  status: "draft" | "published" | "archived"
  priority: "low" | "medium" | "high"
  is_public: boolean
  rating?: number
  related_links?: Array<{ url: string; title: string }>
  file_attachments?: Array<{ url: string; name: string; size: number }>
  created_at: string
  updated_at: string
  wiki_categories?: {
    id: string
    name: string
    color: string
  }
}

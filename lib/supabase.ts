import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Task = {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string | null
  emoji: string | null
  status: string
  priority: string
  is_important: boolean
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  projects?: {
    name: string
    emoji: string | null
  }
}

export type Project = {
  id: string
  user_id: string
  name: string
  description: string | null
  emoji: string | null
  created_at: string
  updated_at: string
}

export type ChecklistItem = {
  id: string
  task_id: string
  text: string
  is_completed: boolean
  created_at: string
}

export type User = {
  id: string
  email: string
  username: string | null
  high_score: number
  challenges_completed: string[]
  created_at: string
  updated_at: string
}

export type WikiCategory = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export type WikiEntry = {
  id: string
  user_id: string
  title: string
  summary: string | null
  content: string | null
  tags: string[]
  category_id: string | null
  status: "draft" | "published" | "archived"
  priority: "low" | "medium" | "high"
  is_public: boolean
  rating: number | null
  related_links: Array<{ url: string; title: string }>
  file_attachments: Array<{ name: string; url: string; size: number }>
  created_at: string
  updated_at: string
  wiki_categories?: WikiCategory
}

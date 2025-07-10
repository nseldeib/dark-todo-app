"use client"

import { useState, useEffect } from "react"
import { supabase, type WikiEntry, type WikiCategory } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit3,
  Save,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Globe,
  Lock,
  Tag,
  Link,
  Calendar,
  CheckCircle,
  Archive,
  Zap,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react"

interface WikiWidgetProps {
  userId: string
}

export function WikiWidget({ userId }: WikiWidgetProps) {
  const [entries, setEntries] = useState<WikiEntry[]>([])
  const [categories, setCategories] = useState<WikiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterVisibility, setFilterVisibility] = useState<string>("all")
  const [filterTag, setFilterTag] = useState("")

  // Form state for editing/creating
  const [editForm, setEditForm] = useState<Partial<WikiEntry>>({
    title: "",
    summary: "",
    content: "",
    tags: [],
    category_id: undefined,
    status: "draft",
    priority: "medium",
    is_public: false,
    rating: undefined,
    related_links: [],
  })

  useEffect(() => {
    fetchCategories()
    fetchEntries()
  }, [userId])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("wiki_categories").select("*").eq("user_id", userId).order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error: any) {
      console.error("Error fetching categories:", error)
      setError("Failed to load categories")
    }
  }

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("wiki_entries")
        .select(`
          *,
          wiki_categories (
            id,
            name,
            color
          )
        `)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })

      if (error) throw error
      setEntries(data || [])
      setLoading(false)
    } catch (error: any) {
      console.error("Error fetching entries:", error)
      setError("Failed to load wiki entries")
      setLoading(false)
    }
  }

  const createEntry = async () => {
    try {
      const { data, error } = await supabase
        .from("wiki_entries")
        .insert({
          user_id: userId,
          title: editForm.title || "Untitled Entry",
          summary: editForm.summary,
          content: editForm.content,
          tags: editForm.tags || [],
          category_id: editForm.category_id || null,
          status: editForm.status || "draft",
          priority: editForm.priority || "medium",
          is_public: editForm.is_public || false,
          rating: editForm.rating,
          related_links: editForm.related_links || [],
        })
        .select(`
          *,
          wiki_categories (
            id,
            name,
            color
          )
        `)
        .single()

      if (error) throw error

      setEntries([data, ...entries])
      setIsCreating(false)
      setEditForm({
        title: "",
        summary: "",
        content: "",
        tags: [],
        category_id: undefined,
        status: "draft",
        priority: "medium",
        is_public: false,
        rating: undefined,
        related_links: [],
      })
      setError("")
    } catch (error: any) {
      console.error("Error creating entry:", error)
      setError("Failed to create entry")
    }
  }

  const updateEntry = async (entryId: string) => {
    try {
      const { data, error } = await supabase
        .from("wiki_entries")
        .update({
          title: editForm.title,
          summary: editForm.summary,
          content: editForm.content,
          tags: editForm.tags,
          category_id: editForm.category_id || null,
          status: editForm.status,
          priority: editForm.priority,
          is_public: editForm.is_public,
          rating: editForm.rating,
          related_links: editForm.related_links,
        })
        .eq("id", entryId)
        .select(`
          *,
          wiki_categories (
            id,
            name,
            color
          )
        `)
        .single()

      if (error) throw error

      setEntries(entries.map((entry) => (entry.id === entryId ? data : entry)))
      setEditingEntry(null)
      setError("")
    } catch (error: any) {
      console.error("Error updating entry:", error)
      setError("Failed to update entry")
    }
  }

  const deleteEntry = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return

    try {
      const { error } = await supabase.from("wiki_entries").delete().eq("id", entryId)

      if (error) throw error

      setEntries(entries.filter((entry) => entry.id !== entryId))
      setExpandedEntry(null)
      setEditingEntry(null)
      setError("")
    } catch (error: any) {
      console.error("Error deleting entry:", error)
      setError("Failed to delete entry")
    }
  }

  const startEditing = (entry: WikiEntry) => {
    setEditingEntry(entry.id)
    setEditForm({
      title: entry.title,
      summary: entry.summary || "",
      content: entry.content || "",
      tags: entry.tags || [],
      category_id: entry.category_id || undefined,
      status: entry.status,
      priority: entry.priority,
      is_public: entry.is_public,
      rating: entry.rating,
      related_links: entry.related_links || [],
    })
  }

  const cancelEditing = () => {
    setEditingEntry(null)
    setIsCreating(false)
    setEditForm({
      title: "",
      summary: "",
      content: "",
      tags: [],
      category_id: undefined,
      status: "draft",
      priority: "medium",
      is_public: false,
      rating: undefined,
      related_links: [],
    })
  }

  const addRelatedLink = () => {
    setEditForm({
      ...editForm,
      related_links: [...(editForm.related_links || []), { url: "", title: "" }],
    })
  }

  const updateRelatedLink = (index: number, field: "url" | "title", value: string) => {
    const links = [...(editForm.related_links || [])]
    links[index] = { ...links[index], [field]: value }
    setEditForm({ ...editForm, related_links: links })
  }

  const removeRelatedLink = (index: number) => {
    const links = [...(editForm.related_links || [])]
    links.splice(index, 1)
    setEditForm({ ...editForm, related_links: links })
  }

  const addTag = (tag: string) => {
    if (tag && !editForm.tags?.includes(tag)) {
      setEditForm({
        ...editForm,
        tags: [...(editForm.tags || []), tag],
      })
    }
  }

  const removeTag = (tagToRemove: string) => {
    setEditForm({
      ...editForm,
      tags: editForm.tags?.filter((tag) => tag !== tagToRemove) || [],
    })
  }

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      !searchTerm ||
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = filterCategory === "all" || entry.category_id === filterCategory

    const matchesStatus = filterStatus === "all" || entry.status === filterStatus

    const matchesVisibility =
      filterVisibility === "all" ||
      (filterVisibility === "public" && entry.is_public) ||
      (filterVisibility === "private" && !entry.is_public)

    const matchesTag = !filterTag || entry.tags?.some((tag) => tag.toLowerCase().includes(filterTag.toLowerCase()))

    return matchesSearch && matchesCategory && matchesStatus && matchesVisibility && matchesTag
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <CheckCircle className="h-3 w-3" />
      case "archived":
        return <Archive className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-400 border-red-900/50 bg-red-900/20"
      case "medium":
        return "text-yellow-400 border-yellow-900/50 bg-yellow-900/20"
      default:
        return "text-gray-400 border-gray-700 bg-gray-900/20"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "text-green-400 border-green-900/50 bg-green-900/20"
      case "archived":
        return "text-gray-400 border-gray-700 bg-gray-900/20"
      default:
        return "text-blue-400 border-blue-900/50 bg-blue-900/20"
    }
  }

  if (loading) {
    return (
      <Card className="bg-black/40 border-gray-700/30">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-purple-400" />
            Personal Wiki
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-black/40 border-gray-700/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-purple-400" />
            Personal Wiki
            <Badge className="ml-2 bg-purple-900/20 text-purple-400 border-purple-900/50">
              {filteredEntries.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {showFilters ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
            <Button
              onClick={() => setIsCreating(true)}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-gray-700/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-600 text-white text-sm"
              />
            </div>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-600">
                <SelectItem value="all" className="text-gray-300">
                  All Categories
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id} className="text-gray-300">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }}></div>
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-600">
                <SelectItem value="all" className="text-gray-300">
                  All Status
                </SelectItem>
                <SelectItem value="draft" className="text-gray-300">
                  Draft
                </SelectItem>
                <SelectItem value="published" className="text-gray-300">
                  Published
                </SelectItem>
                <SelectItem value="archived" className="text-gray-300">
                  Archived
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterVisibility} onValueChange={setFilterVisibility}>
              <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white text-sm">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-600">
                <SelectItem value="all" className="text-gray-300">
                  All
                </SelectItem>
                <SelectItem value="public" className="text-gray-300">
                  Public
                </SelectItem>
                <SelectItem value="private" className="text-gray-300">
                  Private
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Filter by tag..."
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-600 text-white text-sm"
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <Alert className="border-red-900/50 bg-red-950/20">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Create New Entry Form */}
        {isCreating && (
          <Card className="bg-gray-800/50 border-gray-600">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium flex items-center">
                  <Plus className="h-4 w-4 mr-2 text-purple-400" />
                  Create New Entry
                </h3>
                <Button onClick={cancelEditing} variant="ghost" size="sm" className="text-gray-400 hover:bg-gray-700">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-2 block">Title *</label>
                  <Input
                    value={editForm.title || ""}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="bg-gray-900/50 border-gray-600 text-white"
                    placeholder="Entry title..."
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-sm font-medium mb-2 block">Category</label>
                  <Select
                    value={editForm.category_id || "none"}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, category_id: value === "none" ? undefined : value })
                    }
                  >
                    <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-600">
                      <SelectItem value="none" className="text-gray-300">
                        No Category
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="text-gray-300">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: category.color }}
                            ></div>
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium mb-2 block">Summary</label>
                <Input
                  value={editForm.summary || ""}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  className="bg-gray-900/50 border-gray-600 text-white"
                  placeholder="Brief summary..."
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium mb-2 block">Content</label>
                <Textarea
                  value={editForm.content || ""}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="bg-gray-900/50 border-gray-600 text-white min-h-[120px]"
                  placeholder="Entry content..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={editForm.status || "draft"}
                    onValueChange={(value) => setEditForm({ ...editForm, status: value as any })}
                  >
                    <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-600">
                      <SelectItem value="draft" className="text-gray-300">
                        Draft
                      </SelectItem>
                      <SelectItem value="published" className="text-gray-300">
                        Published
                      </SelectItem>
                      <SelectItem value="archived" className="text-gray-300">
                        Archived
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-gray-300 text-sm font-medium mb-2 block">Priority</label>
                  <Select
                    value={editForm.priority || "medium"}
                    onValueChange={(value) => setEditForm({ ...editForm, priority: value as any })}
                  >
                    <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-600">
                      <SelectItem value="low" className="text-gray-300">
                        Low
                      </SelectItem>
                      <SelectItem value="medium" className="text-gray-300">
                        Medium
                      </SelectItem>
                      <SelectItem value="high" className="text-gray-300">
                        High
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-gray-300 text-sm font-medium mb-2 block">Rating</label>
                  <Select
                    value={editForm.rating?.toString() || "none"}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, rating: value === "none" ? undefined : Number.parseInt(value) })
                    }
                  >
                    <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                      <SelectValue placeholder="No rating" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-600">
                      <SelectItem value="none" className="text-gray-300">
                        No rating
                      </SelectItem>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <SelectItem key={rating} value={rating.toString()} className="text-gray-300">
                          {"★".repeat(rating)} ({rating})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_public || false}
                    onChange={(e) => setEditForm({ ...editForm, is_public: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-900/50 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-gray-300 text-sm">Make public</span>
                  {editForm.is_public ? (
                    <Globe className="h-4 w-4 text-green-400" />
                  ) : (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={createEntry} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Save className="h-3 w-3 mr-1" />
                  Create Entry
                </Button>
                <Button
                  onClick={cancelEditing}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entries List */}
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-gray-400 text-lg font-medium mb-2">No wiki entries found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {entries.length === 0 ? "Create your first knowledge entry" : "Try adjusting your filters"}
            </p>
            {entries.length === 0 && (
              <Button onClick={() => setIsCreating(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create First Entry
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <Card key={entry.id} className="bg-gray-800/50 border-gray-600 hover:border-gray-500 transition-colors">
                <CardContent className="p-4">
                  {editingEntry === entry.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium flex items-center">
                          <Edit3 className="h-4 w-4 mr-2 text-blue-400" />
                          Editing Entry
                        </h3>
                        <Button
                          onClick={cancelEditing}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:bg-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-300 text-sm font-medium mb-2 block">Title *</label>
                          <Input
                            value={editForm.title || ""}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="bg-gray-900/50 border-gray-600 text-white"
                          />
                        </div>

                        <div>
                          <label className="text-gray-300 text-sm font-medium mb-2 block">Category</label>
                          <Select
                            value={editForm.category_id || "none"}
                            onValueChange={(value) =>
                              setEditForm({ ...editForm, category_id: value === "none" ? undefined : value })
                            }
                          >
                            <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-600">
                              <SelectItem value="none" className="text-gray-300">
                                No Category
                              </SelectItem>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id} className="text-gray-300">
                                  <div className="flex items-center">
                                    <div
                                      className="w-3 h-3 rounded-full mr-2"
                                      style={{ backgroundColor: category.color }}
                                    ></div>
                                    {category.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-gray-300 text-sm font-medium mb-2 block">Summary</label>
                        <Input
                          value={editForm.summary || ""}
                          onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                          className="bg-gray-900/50 border-gray-600 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-gray-300 text-sm font-medium mb-2 block">Content</label>
                        <Textarea
                          value={editForm.content || ""}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                          className="bg-gray-900/50 border-gray-600 text-white min-h-[120px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-gray-300 text-sm font-medium mb-2 block">Status</label>
                          <Select
                            value={editForm.status || "draft"}
                            onValueChange={(value) => setEditForm({ ...editForm, status: value as any })}
                          >
                            <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-600">
                              <SelectItem value="draft" className="text-gray-300">
                                Draft
                              </SelectItem>
                              <SelectItem value="published" className="text-gray-300">
                                Published
                              </SelectItem>
                              <SelectItem value="archived" className="text-gray-300">
                                Archived
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-gray-300 text-sm font-medium mb-2 block">Priority</label>
                          <Select
                            value={editForm.priority || "medium"}
                            onValueChange={(value) => setEditForm({ ...editForm, priority: value as any })}
                          >
                            <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-600">
                              <SelectItem value="low" className="text-gray-300">
                                Low
                              </SelectItem>
                              <SelectItem value="medium" className="text-gray-300">
                                Medium
                              </SelectItem>
                              <SelectItem value="high" className="text-gray-300">
                                High
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-gray-300 text-sm font-medium mb-2 block">Rating</label>
                          <Select
                            value={editForm.rating?.toString() || "none"}
                            onValueChange={(value) =>
                              setEditForm({
                                ...editForm,
                                rating: value === "none" ? undefined : Number.parseInt(value),
                              })
                            }
                          >
                            <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                              <SelectValue placeholder="No rating" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-600">
                              <SelectItem value="none" className="text-gray-300">
                                No rating
                              </SelectItem>
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <SelectItem key={rating} value={rating.toString()} className="text-gray-300">
                                  {"★".repeat(rating)} ({rating})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.is_public || false}
                            onChange={(e) => setEditForm({ ...editForm, is_public: e.target.checked })}
                            className="rounded border-gray-600 bg-gray-900/50 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-gray-300 text-sm">Make public</span>
                          {editForm.is_public ? (
                            <Globe className="h-4 w-4 text-green-400" />
                          ) : (
                            <Lock className="h-4 w-4 text-gray-400" />
                          )}
                        </label>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => updateEntry(entry.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save Changes
                        </Button>
                        <Button
                          onClick={cancelEditing}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      {/* Entry Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-white font-medium text-lg truncate">{entry.title}</h3>
                            {entry.is_public ? (
                              <Globe className="h-4 w-4 text-green-400 flex-shrink-0" />
                            ) : (
                              <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            )}
                            {entry.rating && (
                              <div className="flex items-center text-yellow-400">{"★".repeat(entry.rating)}</div>
                            )}
                          </div>

                          {entry.summary && <p className="text-gray-400 text-sm mb-3">{entry.summary}</p>}

                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge className={`${getStatusColor(entry.status)} text-xs`}>
                              {getStatusIcon(entry.status)}
                              <span className="ml-1">{entry.status}</span>
                            </Badge>

                            <Badge className={`${getPriorityColor(entry.priority)} text-xs`}>
                              <Zap className="h-3 w-3 mr-1" />
                              {entry.priority}
                            </Badge>

                            {entry.wiki_categories && (
                              <Badge className="bg-blue-900/20 text-blue-400 border-blue-900/50 text-xs">
                                <div
                                  className="w-2 h-2 rounded-full mr-1"
                                  style={{ backgroundColor: entry.wiki_categories.color }}
                                ></div>
                                {entry.wiki_categories.name}
                              </Badge>
                            )}

                            <Badge className="bg-gray-900/20 text-gray-400 border-gray-700 text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(entry.updated_at).toLocaleDateString()}
                            </Badge>
                          </div>

                          {/* Tags */}
                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {entry.tags.map((tag, index) => (
                                <Badge
                                  key={index}
                                  className="bg-purple-900/20 text-purple-400 border-purple-900/50 text-xs"
                                >
                                  <Tag className="h-2 w-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                          <Button
                            onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:bg-gray-700"
                          >
                            {expandedEntry === entry.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            onClick={() => startEditing(entry)}
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:bg-gray-700"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => deleteEntry(entry.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:bg-gray-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedEntry === entry.id && (
                        <div className="border-t border-gray-700/50 pt-4 mt-4 space-y-4">
                          {entry.content && (
                            <div>
                              <h4 className="text-gray-300 font-medium mb-2">Content</h4>
                              <div className="bg-gray-900/50 rounded-lg p-3 text-gray-300 text-sm whitespace-pre-wrap">
                                {entry.content}
                              </div>
                            </div>
                          )}

                          {entry.related_links && entry.related_links.length > 0 && (
                            <div>
                              <h4 className="text-gray-300 font-medium mb-2 flex items-center">
                                <Link className="h-4 w-4 mr-1" />
                                Related Links
                              </h4>
                              <div className="space-y-2">
                                {entry.related_links.map((link, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <Link className="h-3 w-3 text-blue-400" />
                                    <a
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 text-sm underline"
                                    >
                                      {link.title || link.url}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

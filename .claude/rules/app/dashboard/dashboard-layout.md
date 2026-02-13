---
paths:
  - 'app/dashboard/page.tsx'
---

# Dashboard Layout Patterns

- **4 Visual Modes System**: Dashboard auto-switches themes based on data state — Crisis Mode (5+ overdue → red pulsing), Multi-Project Mode (projects.length > 1 → blue/purple), Victory Mode (all done → green), Editing Mode (forceEditingTaskId set → form UI)
- **Stats Grid Structure**: Always `grid-cols-2 lg:grid-cols-4`, each card follows pattern: large number → icon + label → percentage/context. Color-coded by category (red=active, green=completed, yellow=in-progress, purple=important)
- **Responsive Layout Toggles**: Mobile uses collapsible sections (`showStatsDetails`, `showMobileMenu`) with ChevronUp/Down icons; desktop shows everything by default
- **CodeYam Simulation Props**: Use `initial*` props (initialTasks, initialProjects, initialUser) to bypass Supabase for simulations; `force*` props (forceLoading, forceError, forceEditingTaskId, forceShowMobileMenu) control UI state directly
- **Styling Convention**: Crisis cards use `border-red-500 shadow-red-500/50`, multi-project uses `border-blue-500/50`, standard cards use `bg-black/40 border-gray-700/30`, all hover states use `transition-all duration-200`

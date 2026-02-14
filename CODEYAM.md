# CodeYam Setup - Dark Todo App

## Setup Complete ✅

CodeYam is configured and working for this project. All simulations capture successfully.

## Quick Start

### Initial Setup

```bash
# Clean slate
rm -rf /tmp/codeyam && rm -rf .codeyam

# Initialize CodeYam
codeyam init

# Install dependencies (REQUIRED!)
pnpm install

# Ready to use
codeyam suggest --limit 5
```

## Configuration

### `.codeyam/config.json`

```json
{
  "projectSlug": "nseldeib-dark-todo-app",
  "packageManager": "pnpm",
  "webapps": [
    {
      "path": ".",
      "framework": "Next",
      "packageManager": "pnpm",
      "appDirectory": "app",
      "startCommand": {
        "command": "pnpm",
        "args": ["dev", "--port", "$PORT"]
      }
    }
  ],
  "environmentVariables": [
    {
      "key": "NEXT_PUBLIC_SUPABASE_URL",
      "value": "http://localhost:54321"
    },
    {
      "key": "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "value": "mock-anon-key"
    }
  ]
}
```

### Universal Mocks

**Location:** `.codeyam/universal-mocks/lib/supabase.ts`

Mocks the Supabase client to avoid database requirements:
- Returns empty arrays for queries
- Returns null for auth checks
- Prevents database connection requirements during simulations

To validate a mock:
```bash
codeyam validate-mock .codeyam/universal-mocks/lib/supabase.ts
```

## Common Commands

### Analyze Components

```bash
# Get suggestions for what to analyze
codeyam suggest --limit 5

# Analyze a specific component
codeyam analyze --entity Dashboard app/dashboard/page.tsx

# Open the CodeYam dashboard
codeyam
```

### Debug Issues

```bash
# Debug a scenario or analysis
codeyam debug <ANALYSIS_ID>

# Recapture screenshots (after fixing issues)
codeyam recapture <SCENARIO_ID>

# Recapture entire analysis
codeyam recapture <ANALYSIS_ID>
```

### View Results

```bash
# Open CodeYam dashboard
open http://localhost:3111

# View specific analysis
open http://localhost:3111/analysis/<ANALYSIS_ID>
```

## Important Notes

### Dependencies Are Required!

**Always ensure `node_modules` exists in your project before running CodeYam commands.**

CodeYam creates temporary copies of your project at `/tmp/codeyam/local-dev/{slug}/project/`. These copies need dependencies to run the dev server. While `node_modules` is gitignored, CodeYam still needs them in your original project to copy to temp directories.

```bash
# If you see "command not found" errors:
pnpm install  # Run this in your project root
```

### Environment Variables

The environment variables in `.codeyam/config.json` are dummy values for testing:
- `NEXT_PUBLIC_SUPABASE_URL`: Points to localhost (mock)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Fake key (mock)

These are used when CodeYam runs simulations. They're safe dummy values that work with the Supabase universal mock.

### Universal Mocks

Universal mocks replace real dependencies during simulations:
- Located in `.codeyam/universal-mocks/`
- Match the directory structure of your actual code
- Export the same names as the original files
- Return simple mock data (empty arrays, null, etc.)

## Troubleshooting

### "sh: next: command not found"
**Solution:** Run `pnpm install` in your project root

### "Server failed to start"
**Solution:**
1. Check that `node_modules` exists
2. Verify `.codeyam/config.json` has correct `startCommand`
3. Run `codeyam debug <ANALYSIS_ID>` to see detailed logs

### Scenarios don't capture
**Solution:**
1. Run `codeyam debug <ANALYSIS_ID>`
2. Fix any errors in the temporary project directory
3. Recapture with `codeyam recapture <ANALYSIS_ID>`

### Need to reset everything
```bash
rm -rf /tmp/codeyam && rm -rf .codeyam
codeyam init
pnpm install
```

## Dashboard Component Simulations

The Dashboard component (`app/dashboard/page.tsx`) supports 4 visual modes for CodeYam simulations:

1. **Crisis Mode** - Triggered when 5+ tasks are overdue
2. **Multi-Project Mode** - Triggered when projects.length > 1
3. **Victory Mode** - Triggered when all tasks are done
4. **Editing Mode** - Triggered by forceEditingTaskId prop

See the component's JSDoc for detailed scenario examples and prop documentation.

## Next Steps

1. **Explore simulations**: Run `codeyam suggest --limit 5`
2. **Analyze components**: Use CodeYam to generate visual simulations
3. **Write tests**: Use generated data structures for realistic test mocks
4. **Share results**: Screenshots are captured in `.codeyam/captures/screenshots/`

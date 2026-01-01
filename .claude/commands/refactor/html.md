---
description: Refactor HTML/TSX files using refactor-html skill
allowed-tools: Bash, Read, Edit, Glob, Grep, Skill
argument-hint: [file-path]
---

# Refactor HTML/TSX Command

## Target File

Determine the target file:

1. **If `$ARGUMENTS` is provided**: Use that path
2. **If no arguments**: Find the most recently modified `.tsx` file in `packages/ui/src/components/`:
   ```bash
   find packages/ui/src/components -name "*.tsx" -type f -exec stat -f "%m %N" {} \; | sort -rn | head -1 | cut -d' ' -f2-
   ```

## Execution

1. Read the target file
2. Invoke the `refactor-html` skill to apply refactoring rules
3. Report what was changed

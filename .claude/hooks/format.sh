#!/bin/bash

# Extract file path from hook input JSON
file_path=$(jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null)

# Check if file exists
if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

# Run oxlint with auto-fix
oxlint --fix "$file_path" 2>/dev/null
exit 0

#!/bin/bash
# Replace all imports from basic_memory to nova_memory
find . -name "*.py" -type f -exec sed -i 's/from basic_memory/from nova_memory/g' {} +
find . -name "*.py" -type f -exec sed -i 's/import basic_memory/import nova_memory/g' {} +

# Also update any references in config files
find . -name "*.json" -type f -exec sed -i 's/basic_memory/nova_memory/g' {} +
find . -name "*.yaml" -type f -exec sed -i 's/basic_memory/nova_memory/g' {} +
find . -name "*.yml" -type f -exec sed -i 's/basic_memory/nova_memory/g' {} +

# Update references to Basic Memory in strings and comments
find . -name "*.py" -type f -exec sed -i 's/Basic Memory/Nova Memory/g' {} +
find . -name "*.md" -type f -exec sed -i 's/Basic Memory/Nova Memory/g' {} +

echo "Renamed all references from basic_memory to nova_memory"
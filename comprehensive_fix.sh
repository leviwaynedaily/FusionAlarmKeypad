#!/bin/bash

FILE="src/app/page.tsx"

echo "Making comprehensive design 2.0 changes..."

# Remove useDesign2 state declaration
sed -i '' '/const \[useDesign2, setUseDesign2\] = useState(false);/d' "$FILE"

# Remove useDesign2 localStorage handling
sed -i '' '/const savedUseDesign2 = localStorage.getItem/d' "$FILE"
sed -i '' '/if (savedUseDesign2 !== null) {/,/}/d' "$FILE"

# Remove design 2.0 toggle from settings (multi-line)
sed -i '' '/\/\* Design 2\.0 \*\//,/^[[:space:]]*<\/div>$/d' "$FILE"

# Simple replacements for basic styling
sed -i '' 's/\${useDesign2 ? '\''rounded-xl'\'' : '\''rounded-lg'\''}/rounded-xl/g' "$FILE"
sed -i '' 's/\${useDesign2 ? '\''gap-1'\'' : '\''gap-2'\''}/gap-1/g' "$FILE"
sed -i '' 's/\${useDesign2 ? '\''gap-4'\'' : '\''gap-8'\''}/gap-4/g' "$FILE"
sed -i '' 's/\${useDesign2 ? '\''gap-2 mt-2'\'' : '\''gap-3'\''}/gap-2 mt-2/g' "$FILE"
sed -i '' 's/\${useDesign2 ? '\''text-2xl'\'' : '\''text-xl'\''}/text-2xl/g' "$FILE"
sed -i '' 's/\${useDesign2 ? '\''text-base'\'' : '\''text-sm'\''}/text-base/g' "$FILE"
sed -i '' 's/\${useDesign2 ? '\''text-lg'\'' : '\''text-lg'\''}/text-lg/g' "$FILE"
sed -i '' 's/\${useDesign2 ? '\''h-16'\'' : '\''h-16'\''}/h-16/g' "$FILE"
sed -i '' 's/\${useDesign2 ? '\''py-6 px-8'\'' : '\''py-6 px-8'\''}/py-6 px-8/g' "$FILE"
sed -i '' 's/\${useDesign2 ? '\''border border-gray-600 dark:border-gray-700'\'' : '\''border'\''}/border border-gray-600 dark:border-gray-700/g' "$FILE"
sed -i '' 's/\${useDesign2 ? '\''pt-4 px-4 pb-0'\'' : '\''p-10'\''}/pt-4 px-4 pb-0/g' "$FILE"
sed -i '' 's/\${useDesign2 ? '\''border-transparent'\'' : '\''border border-gray-200 dark:border-gray-800'\''}/border-transparent/g' "$FILE"

# Replace button state styles (choose design 2.0 style)
sed -i '' 's/: useDesign2[[:space:]]*?[[:space:]]*'\''bg-\[#0f0f0f\][^}]*'\''[[:space:]]*:[[:space:]]*'\''bg-gray-100[^}]*'\''/: '\''bg-[#0f0f0f] active:bg-gray-800 dark:bg-[#0f0f0f] dark:active:bg-gray-900 text-gray-400 dark:text-gray-500'\''/g' "$FILE"

# Remove negated conditions (!useDesign2 && (...))
sed -i '' '/!useDesign2 &&/,/^[[:space:]]*})/d' "$FILE"

# Convert useDesign2 ? (...) : (...) to just the first option for circles vs squares PIN display
sed -i '' 's/useDesign2 ? (/(/g' "$FILE"

# Handle weather conditionals - convert useDesign2 && weather to just weather
sed -i '' 's/useDesign2 && weather/weather/g' "$FILE"

# Handle area timestamp display - convert useDesign2 && area.updatedAt to just area.updatedAt
sed -i '' 's/useDesign2 && area\.updatedAt/area.updatedAt/g' "$FILE"

# Remove any remaining standalone useDesign2 references in ternary expressions
sed -i '' 's/useDesign2[[:space:]]*?[[:space:]]*//g' "$FILE"

echo "Fixed design 2.0 styling. Checking for remaining references..."
grep -c "useDesign2" "$FILE" || echo "No more useDesign2 references found!" 
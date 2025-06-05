#!/bin/bash

# Fix design 2.0 to be default by replacing all useDesign2 conditional styling

FILE="src/app/page.tsx"

# Replace rounded corners
sed -i '' 's/${useDesign2 ? '\''rounded-xl'\'' : '\''rounded-lg'\''}/rounded-xl/g' "$FILE"

# Replace gaps
sed -i '' 's/${useDesign2 ? '\''gap-1'\'' : '\''gap-2'\''}/gap-1/g' "$FILE"
sed -i '' 's/${useDesign2 ? '\''gap-4'\'' : '\''gap-8'\''}/gap-4/g' "$FILE"

# Replace text sizes
sed -i '' 's/${useDesign2 ? '\''text-2xl'\'' : '\''text-xl'\''}/text-2xl/g' "$FILE"
sed -i '' 's/${useDesign2 ? '\''text-base'\'' : '\''text-sm'\''}/text-base/g' "$FILE"

# Replace heights (these are the same, so just remove the conditional)
sed -i '' 's/${useDesign2 ? '\''h-16'\'' : '\''h-16'\''}/h-16/g' "$FILE"

# Replace borders
sed -i '' 's/${useDesign2 ? '\''border border-gray-600 dark:border-gray-700'\'' : '\''border'\''}/border border-gray-600 dark:border-gray-700/g' "$FILE"

# Replace button styles (use design 2.0 styles)
sed -i '' 's/: useDesign2[[:space:]]*? '\''bg-\[#0f0f0f\] active:bg-gray-800 dark:bg-\[#0f0f0f\] dark:active:bg-gray-900 text-gray-400 dark:text-gray-500'\''[[:space:]]*: '\''bg-gray-100 active:bg-gray-200 dark:bg-\[#161c25\] dark:active:bg-\[#1f2937\] border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-200'\''/: '\''bg-[#0f0f0f] active:bg-gray-800 dark:bg-[#0f0f0f] dark:active:bg-gray-900 text-gray-400 dark:text-gray-500'\''/g' "$FILE"

# Remove simple useDesign2 conditionals for pressed buttons  
sed -i '' 's/(useDesign2 ? '\'' border-\[#22c55f\]'\'' : '\'' border-\[#22c55f\]'\'')/'\'' border-[#22c55f]'\''/g' "$FILE"

echo "Replaced simple conditionals. Now need to handle complex conditionals manually..." 
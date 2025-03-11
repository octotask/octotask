#!/bin/bash

# Directory to search for markdown files
SEARCH_DIR="."

# Temporary file to save the list of links
LINKS_FILE=$(mktemp)

# Find all markdown files and extract links
find "$SEARCH_DIR" -name "*.md" -exec grep -oP '(http|https)://[^\)\s]+' {} \; > "$LINKS_FILE"

# Function to check if a link is valid
check_link() {
    local url=$1
    if curl --output /dev/null --silent --head --fail "$url"; then
        echo "VALID: $url"
    else
    
        echo "BROKEN: $url"
    fi
}

# Check each link
while IFS= read -r link; do
    check_link "$link"
done < "$LINKS_FILE"

# Cleanup
rm "$LINKS_FILE"

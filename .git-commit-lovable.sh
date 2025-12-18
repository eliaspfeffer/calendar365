#!/bin/bash

# Git commit helper following Lovable pattern
# Usage: ./git-commit-lovable.sh "Feature title" "Detailed description"

set -e

FEATURE_TITLE="$1"
DESCRIPTION="$2"

if [ -z "$FEATURE_TITLE" ]; then
    echo "Usage: ./git-commit-lovable.sh \"Feature title\" \"Detailed description\""
    echo "Example: ./git-commit-lovable.sh \"Fix drag and drop\" \"Fixed drag and drop functionality by preventing panning interference...\""
    exit 1
fi

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" = "main" ]; then
    # Create a feature branch
    BRANCH_NAME="changes-$(date +%s)"
    echo "Creating feature branch: $BRANCH_NAME"
    git checkout -b "$BRANCH_NAME"
else
    BRANCH_NAME="$CURRENT_BRANCH"
    echo "Using existing branch: $BRANCH_NAME"
fi

# Check if there are uncommitted changes
if [ -z "$(git status --porcelain)" ]; then
    echo "No changes to commit"
    exit 0
fi

# Stage all changes
echo "Staging changes..."
git add -A

# Commit with "Changes" message
echo "Committing changes..."
git commit -m "Changes"

# Switch back to main
echo "Switching to main branch..."
git checkout main

# Merge with descriptive message
echo "Merging with descriptive commit..."
if [ -z "$DESCRIPTION" ]; then
    git merge --no-ff "$BRANCH_NAME" -m "$FEATURE_TITLE"
else
    git merge --no-ff "$BRANCH_NAME" -m "$FEATURE_TITLE

$DESCRIPTION"
fi

# Delete feature branch
echo "Deleting feature branch..."
git branch -d "$BRANCH_NAME"

echo "✓ Done! Changes committed following Lovable pattern."


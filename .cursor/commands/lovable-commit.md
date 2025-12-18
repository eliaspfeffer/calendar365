# Lovable Commit Pattern

Follow the Lovable git workflow pattern for committing changes.

## Description
This command follows the exact git workflow pattern used by Lovable:
1. Creates a feature branch (if on main)
2. Commits changes with message "Changes"
3. Merges to main with a descriptive merge commit

## When invoked with `/lovable-commit`:
1. Check current git status to see what files have changed
2. Analyze the changes to create an appropriate commit message
3. Create a feature branch if not on one (or use existing branch)
4. Stage and commit changes with message "Changes"
5. Merge to main with a descriptive merge commit that includes:
   - Clear title summarizing the changes
   - Detailed body explaining what/why/how
   - Key files/components affected

## Example Output:
The AI will analyze your changes and create commits like:
```
Fix pan offset in connections

Adjust ConnectionLines positioning to account for zoom/pan transforms by moving the overlay inside the transformed calendar container and syncing coordinates, so arrows stay aligned when dragging.
```


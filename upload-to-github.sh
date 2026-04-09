#!/bin/bash

# CC-StatusLine GitHub Upload Script
# This script will initialize a git repository and push it to GitHub.

PLUGIN_DIR="$HOME/.claude/plugins/CC-StatusLine"

echo "Changing directory to $PLUGIN_DIR..."
cd "$PLUGIN_DIR" || { echo "Error: Could not find plugin directory."; exit 1; }

# Initialize Git if not already done
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
    git branch -M main
fi

# Create a basic README if it doesn't exist
if [ ! -f "README.md" ]; then
    echo "# CC-StatusLine" > README.md
    echo "Custom status bar for Claude Code showing token usage from a private API." >> README.md
fi

# Add all plugin files (ignoring those in .gitignore)
echo "Adding files..."
git add .

# Initial commit
echo "Committing files..."
git commit -m "Initialize CC-StatusLine plugin" || echo "Nothing to commit or commit failed."

# Set remote origin (using the provided URL)
echo "Setting remote origin..."
git remote remove origin 2>/dev/null
git remote add origin https://github.com/EthanShenjj/cc-StatusLine.git

# Push to GitHub
echo "Pushing to GitHub (main)..."
echo "Note: You might be prompted for your GitHub credentials."
git push -u origin main

echo ""
echo "Done! If the push was successful, check your repository at:"
echo "https://github.com/EthanShenjj/cc-StatusLine.git"

#!/bin/bash

# Release script wrapper for dom-element-to-component-source
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Check if NPM_TOKEN is set
if [ -z "$NPM_TOKEN" ]; then
    print_color $RED "Error: NPM_TOKEN environment variable is not set"
    print_color $YELLOW "Please set your npm token:"
    print_color $YELLOW "export NPM_TOKEN=your_npm_token_here"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_color $RED "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Get release type from argument or default to patch
RELEASE_TYPE=${1:-patch}

print_color $BOLD$CYAN "🚀 Starting release process for $RELEASE_TYPE release..."

# Run the Node.js release script
node scripts/release.js "$RELEASE_TYPE"

print_color $BOLD$GREEN "✅ Release process completed!"

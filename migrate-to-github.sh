#!/bin/bash

# GitHub Actions Migration Script
# This script helps with the final migration from GitLab CI to GitHub Actions

set -e

echo "🚀 Home Server: GitLab CI to GitHub Actions Migration"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f ".gitlab-ci.yml" ]; then
    print_error "No .gitlab-ci.yml found. Please run this script from the project root."
    exit 1
fi

# Backup GitLab CI configuration
print_status "Backing up GitLab CI configuration..."
cp .gitlab-ci.yml .gitlab-ci.yml.backup
print_success "GitLab CI backed up to .gitlab-ci.yml.backup"

# Verify GitHub Actions workflows exist
print_status "Verifying GitHub Actions workflows..."
WORKFLOWS=(
    ".github/workflows/ci.yml"
    ".github/workflows/security.yml"
    ".github/workflows/build.yml"
    ".github/workflows/frontend.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    if [ -f "$workflow" ]; then
        print_success "✓ $workflow exists"
    else
        print_error "✗ $workflow missing"
        exit 1
    fi
done

# Check supporting files
print_status "Checking supporting configuration files..."
SUPPORT_FILES=(
    "backend/dependency-check-suppressions.xml"
    "frontend/lighthouserc.js"
    ".github/ACTIONS_MIGRATION.md"
)

for file in "${SUPPORT_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file exists"
    else
        print_warning "? $file missing (optional)"
    fi
done

# Check if type-check script exists in package.json
if grep -q '"type-check"' frontend/package.json; then
    print_success "✓ frontend/package.json has type-check script"
else
    print_warning "? frontend/package.json missing type-check script"
fi

# Show migration summary
echo ""
echo "📋 Migration Summary"
echo "===================="
echo ""
echo "GitLab CI Jobs → GitHub Actions Workflows:"
echo ""
echo "  test              → .github/workflows/ci.yml"
echo "  secret_detection  → .github/workflows/security.yml (secret-detection job)"
echo "  sast              → .github/workflows/security.yml (codeql job)"
echo "  (new)             → .github/workflows/build.yml"
echo "  (new)             → .github/workflows/frontend.yml"
echo ""
echo "Enhanced Features Added:"
echo "  🔒 CodeQL security analysis"
echo "  🐳 Multi-platform Docker builds"
echo "  📦 GitHub Container Registry"
echo "  🧪 Integration testing"
echo "  🎯 Frontend-specific testing"
echo "  🚀 Performance auditing"
echo "  📊 Enhanced test reporting"
echo ""

# Recommend next steps
echo "🎯 Next Steps"
echo "============="
echo ""
echo "1. Remove GitLab CI file:"
echo "   rm .gitlab-ci.yml"
echo ""
echo "2. Update Git remote (if needed):"
echo "   git remote set-url origin https://github.com/USERNAME/REPO.git"
echo ""
echo "3. Push to GitHub:"
echo "   git add -A"
echo "   git commit -m 'Migrate from GitLab CI to GitHub Actions'"
echo "   git push -u origin main"
echo ""
echo "4. Configure GitHub repository:"
echo "   - Enable Actions in repository settings"
echo "   - Enable security features"
echo "   - Set up branch protection rules"
echo ""
echo "5. Review workflow runs:"
echo "   - Check Actions tab after first push"
echo "   - Review security scan results"
echo "   - Verify test reports"
echo ""

# Ask for confirmation to remove GitLab CI file
echo ""
read -p "Remove .gitlab-ci.yml now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm .gitlab-ci.yml
    print_success "Removed .gitlab-ci.yml"
    print_status "Backup still available at .gitlab-ci.yml.backup"
else
    print_status "GitLab CI file preserved. You can remove it manually later."
fi

echo ""
print_success "Migration preparation complete! 🎉"
print_status "See .github/ACTIONS_MIGRATION.md for detailed information"
echo "" 

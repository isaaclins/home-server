# Security Setup Guide

## NVD API Key Setup

To significantly speed up the OWASP dependency check (from ~30 minutes to ~2-3 minutes), you need to add an NVD API key to your GitHub repository secrets.

### Step 1: Get an NVD API Key

1. Visit the [NVD API Key Request Form](https://nvd.nist.gov/developers/request-an-api-key)
2. Fill out the form with your information
3. You'll receive an API key via email

### Step 2: Add to GitHub Secrets

**Option A: Using GitHub CLI (Recommended)**
```bash
# Install GitHub CLI if you haven't already
# https://cli.github.com/

# Login to GitHub
gh auth login

# Add the secret (replace YOUR_API_KEY with the actual key)
gh secret set NVD_API_KEY --body "YOUR_API_KEY"
```

**Option B: Using GitHub Web Interface**
1. Go to your repository on GitHub
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Name: `NVD_API_KEY`
5. Value: Your NVD API key
6. Click **Add secret**

### Step 3: Verify Setup

The next time the security workflow runs, it will:
- Use the NVD API key for faster vulnerability lookups
- Cache dependency check data for subsequent runs
- Complete in ~2-3 minutes instead of ~30 minutes

### Security Notes

- ✅ The API key is stored securely in GitHub secrets
- ✅ The key is never exposed in the code or logs
- ✅ Only authorized users can access the secrets
- ✅ The key is encrypted at rest

### Performance Impact

- **Without API Key**: Downloads entire NVD database (~303,407 records)
- **With API Key**: Uses real-time API lookups
- **Speed Improvement**: 90%+ reduction in scan time

## Other Security Features

### Dependency Vulnerability Scanning
- OWASP Dependency Check runs on every push/PR
- CVSS threshold set to 7.0 (high severity)
- Automatic suppression of false positives
- Detailed HTML reports generated

### Code Security Scanning
- CodeQL analysis for Java and JavaScript
- Secret detection with Trivy
- Docker image vulnerability scanning
- Weekly scheduled security scans

### Vulnerability Suppressions
- Documented suppressions in `backend/dependency-check-suppressions.xml`
- Each suppression includes rationale
- Regular review of suppressions recommended 
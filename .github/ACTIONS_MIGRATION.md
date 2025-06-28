# GitHub Actions Migration Guide

This document explains the migration from GitLab CI/CD to GitHub Actions for the Home Server project.

## 🔄 Migration Overview

The GitLab CI configuration has been successfully migrated to GitHub Actions with enhanced functionality and better integration with GitHub's ecosystem.

### Original GitLab CI Structure

- **3 stages**: test, secret-detection, sast
- **3 jobs**: test (with MySQL service), secret_detection, sast
- **GitLab-specific features**: Security templates, service containers, artifacts

### New GitHub Actions Structure

- **4 workflows**: CI, Security, Build, Frontend
- **Enhanced functionality**: Multi-platform Docker builds, comprehensive security scanning, frontend-specific testing
- **GitHub-native features**: CodeQL, dependency scanning, container registry integration

## 📋 Workflow Breakdown

### 1. CI Pipeline (`.github/workflows/ci.yml`)

**Replaces**: GitLab CI `test` job  
**Triggers**: Push to main/develop, PRs to main

**Key Features**:

- ✅ MySQL 8.0 service container with health checks
- ✅ Java 17 setup with Temurin distribution
- ✅ Maven dependency caching
- ✅ Database initialization from `db/init.sql`
- ✅ JUnit test reporting with `dorny/test-reporter`
- ✅ Test artifact upload

**Environment Variables**: All Spring Boot and MySQL configuration preserved

### 2. Security Scanning (`.github/workflows/security.yml`)

**Replaces**: GitLab CI `secret_detection` and `sast` jobs  
**Triggers**: Push to main/develop, PRs to main, weekly schedule

**Enhanced Security Features**:

- 🔒 **CodeQL Analysis**: GitHub's native SAST for Java and JavaScript
- 🔍 **Secret Detection**: Trivy-based secret scanning with SARIF reports
- 🛡️ **Dependency Scanning**: OWASP Dependency Check with suppression support
- 🐳 **Container Security**: Docker image vulnerability scanning

### 3. Build Pipeline (`.github/workflows/build.yml`)

**New Addition**: Not present in original GitLab CI  
**Triggers**: Push to main, tags (v\*), PRs to main

**Features**:

- 🏗️ **Multi-platform builds**: linux/amd64, linux/arm64
- 📦 **GitHub Container Registry**: Automated image publishing
- 🔄 **Build caching**: GitHub Actions cache for faster builds
- 🧪 **Integration testing**: Full stack testing with Docker Compose
- 🏷️ **Automated releases**: Tag-based release creation

### 4. Frontend Pipeline (`.github/workflows/frontend.yml`)

**New Addition**: Frontend-specific testing  
**Triggers**: Changes to frontend/ directory

**Features**:

- 🎨 **ESLint**: Code quality and style checking
- 📘 **TypeScript**: Type checking with `tsc --noEmit`
- 🏗️ **Build verification**: Next.js build testing
- 🎭 **E2E Testing**: Playwright integration (when configured)
- 🚀 **Performance**: Lighthouse CI audits

## 🔧 Key Differences from GitLab CI

### Service Containers

```yaml
# GitLab CI
services:
  - mysql:8.0

# GitHub Actions
services:
  mysql:
    image: mysql:8.0
    env:
      MYSQL_DATABASE: homeserver_test
    ports:
      - 3306:3306
    options: >-
      --health-cmd="mysqladmin ping"
      --health-interval=10s
```

### Security Scanning

| GitLab CI                                 | GitHub Actions              |
| ----------------------------------------- | --------------------------- |
| `Security/SAST.gitlab-ci.yml`             | CodeQL Analysis             |
| `Security/Secret-Detection.gitlab-ci.yml` | Trivy Secret Scanner        |
| Built-in templates                        | Custom workflows with SARIF |

### Artifacts and Caching

```yaml
# GitLab CI
artifacts:
  reports:
    junit: backend/target/surefire-reports/TEST-*.xml

# GitHub Actions
- name: Publish Test Results
  uses: dorny/test-reporter@v1
  with:
    path: backend/target/surefire-reports/TEST-*.xml
    reporter: java-junit
```

## 🚀 Setup Instructions

### 1. Repository Settings

Enable the following in your GitHub repository:

1. **Actions**: Settings → Actions → General → Allow all actions and reusable workflows
2. **Security**: Settings → Security & analysis → Enable all security features
3. **Packages**: Settings → General → Package creation (for container registry)

### 2. Required Permissions

The workflows need these permissions (automatically configured):

- `contents: read` - Repository access
- `packages: write` - Container registry
- `security-events: write` - Security tab integration

### 3. Branch Protection

Recommended branch protection rules for `main`:

- Require status checks: All workflow jobs
- Require up-to-date branches
- Require conversation resolution before merging

## 📊 Monitoring and Reports

### Test Results

- **JUnit Reports**: Visible in PR checks and Actions summary
- **Coverage**: Upload coverage reports to GitHub Actions artifacts
- **Test History**: Tracked in Actions tab

### Security Reports

- **Code Scanning**: GitHub Security tab
- **Dependency Alerts**: Dependabot integration
- **Secret Scanning**: GitHub Advanced Security features

### Performance

- **Lighthouse**: Performance scores in PR comments
- **Build Times**: Cached builds for faster execution
- **Docker Layers**: Multi-stage builds with layer caching

## 🔄 Migration Benefits

### Improved Features

1. **Better Integration**: Native GitHub features
2. **Enhanced Security**: More comprehensive scanning
3. **Multi-platform**: ARM64 and AMD64 support
4. **Caching**: Faster builds with GitHub Actions cache
5. **Visibility**: Rich PR integration and status checks

### Cost Optimization

- **Efficient Caching**: Reduced build times
- **Conditional Execution**: Path-based triggers
- **Matrix Builds**: Parallel execution where beneficial

## 🐛 Troubleshooting

### Common Issues

#### MySQL Connection Issues

```bash
# Check if MySQL service is ready
mysql -h 127.0.0.1 -u homeserver_test -ptest_password -e "SELECT 1"
```

#### Cache Issues

```bash
# Clear workflow cache in Actions tab
# Or update cache key in workflow file
```

#### Permission Issues

```bash
# Ensure GITHUB_TOKEN has required permissions
# Check repository settings for package access
```

### Debug Mode

Enable debug logging by setting repository secrets:

- `ACTIONS_STEP_DEBUG`: `true`
- `ACTIONS_RUNNER_DEBUG`: `true`

## 📈 Future Enhancements

### Planned Additions

1. **Deployment Workflows**: Automated deployment to staging/production
2. **Notification Integration**: Slack/Teams notifications
3. **Performance Monitoring**: APM integration
4. **Database Migrations**: Automated schema updates

### Extensibility

The workflow structure supports easy addition of:

- New testing frameworks
- Additional security scanners
- Custom deployment targets
- Environment-specific configurations

## 📞 Support

For issues with the GitHub Actions workflows:

1. Check the Actions tab for detailed logs
2. Review this migration guide
3. Consult [GitHub Actions documentation](https://docs.github.com/en/actions)
4. Open an issue with workflow logs attached

---

_Last updated: $(date)_  
_Migration completed from GitLab CI to GitHub Actions_

# CI/CD Testing Guide

This document explains how the test pipeline works in both local and CI/CD environments.

## 🚀 Quick Start

### Local Development

```bash
# Automatically detects environment and uses Docker
./run-test.sh
```

### CI/CD Pipeline

The pipeline automatically:

1. **Detects CI environment** (GitLab CI, GitHub Actions, etc.)
2. **Uses MySQL service** instead of Docker containers
3. **Runs Spring Boot directly** with Maven
4. **Executes all tests** against the running application

## 🏗️ Architecture

### Local Environment (Docker)

```
run-test.sh → start.sh → Docker Compose → MySQL + Backend + Frontend
                                      ↓
                                   Test Suite
```

### CI Environment (Services)

```
run-test.sh → run-test-ci.sh → Maven Spring Boot + MySQL Service
                                              ↓
                                          Test Suite
```

## 📋 Configuration

### GitLab CI Configuration

The `.gitlab-ci.yml` includes:

#### Services

- **MySQL 8.0**: Database service for testing
- **Automatic initialization**: Runs `db/init.sql` on startup

#### Environment Variables

```yaml
# Database Configuration
MYSQL_DATABASE: homeserver_test
MYSQL_USER: homeserver_test
MYSQL_PASSWORD: test_password
MYSQL_ROOT_PASSWORD: root_password

# Application Configuration
SPRING_PROFILES_ACTIVE: test
SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/homeserver_test
SPRING_DATASOURCE_USERNAME: homeserver_test
SPRING_DATASOURCE_PASSWORD: test_password
```

#### Test Execution

- **Maven**: Builds and runs Spring Boot application
- **Health Check**: Waits for application to be ready
- **Test Suite**: Runs all tests in `tests/` directory

## 🔧 Test Scripts

### Primary Test Runner (`run-test.sh`)

**Smart environment detection:**

- Automatically detects CI vs local environments
- Uses Docker for local development
- Delegates to CI runner in pipeline environments

**Features:**

- Environment auto-detection
- Graceful fallback to CI mode
- Consistent interface across environments

### CI Test Runner (`run-test-ci.sh`)

**Optimized for CI/CD:**

- Starts Spring Boot with Maven directly
- Uses external MySQL service
- Enhanced logging and error reporting
- Process management for clean startup/shutdown

**Features:**

- Direct Maven execution
- Service health monitoring
- Detailed error logging
- Graceful process cleanup

## 🧪 Test Configuration

### Spring Boot Profiles

#### Test Profile (`application-test.properties`)

```properties
# Uses MySQL service from CI
spring.datasource.url=jdbc:mysql://mysql:3306/homeserver_test
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=true
```

#### Docker Profile (`application-docker.properties`)

```properties
# Uses Docker Compose environment variables
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.jpa.hibernate.ddl-auto=${SPRING_JPA_HIBERNATE_DDL_AUTO}
```

### Test Database

- **Name**: `homeserver_test`
- **Schema**: Auto-created from `db/init.sql`
- **Data**: Fresh database per test run
- **Cleanup**: Automatic via `create-drop`

## 🛠️ Troubleshooting

### Common CI Issues

#### 1. "docker: command not found"

**Problem**: Pipeline trying to use Docker in CI environment

**Solution**: The updated pipeline should auto-detect CI and use the CI runner. If you see this error, ensure:

- `.gitlab-ci.yml` is updated to call `run-test-ci.sh`
- `run-test-ci.sh` exists and is executable

#### 2. "MySQL connection failed"

**Problem**: Database service not ready

**Solutions**:

- Pipeline waits up to 60 seconds for MySQL
- Check MySQL service configuration in `.gitlab-ci.yml`
- Verify database credentials match in all configs

#### 3. "Backend failed to start"

**Problem**: Spring Boot application startup issues

**Debug steps**:

```bash
# Check backend logs in CI
cat backend.log

# Verify Maven build
cd backend && mvn compile

# Test database connection
mysql -h mysql -u homeserver_test -ptest_password -e "SELECT 1"
```

#### 4. "Tests timing out"

**Problem**: Application taking too long to start

**Solutions**:

- Increase `MAX_WAIT_SECONDS` in CI variables
- Check for database connection issues
- Verify all required dependencies are installed

### Environment Detection Issues

The test runner detects CI environments by checking:

1. **CI environment variables**: `CI`, `GITLAB_CI`, `GITHUB_ACTIONS`, `CI_ENVIRONMENT`
2. **Docker availability**: Command exists and daemon running
3. **Fallback**: Assumes CI if Docker unavailable

Force CI mode:

```bash
export CI_ENVIRONMENT=true
./run-test.sh
```

Force local mode:

```bash
# Ensure Docker is available and running
./run-test.sh
```

## 📊 Pipeline Performance

### Typical CI Run Times

- **Setup**: 30-60 seconds (Maven + MySQL)
- **Backend Start**: 20-40 seconds
- **Test Execution**: 10-30 seconds
- **Total**: 60-130 seconds

### Optimization Tips

1. **Cache Maven dependencies** in CI configuration
2. **Use smaller base images** for faster startup
3. **Parallel test execution** for larger test suites
4. **Health check optimization** with faster polling

## 🔍 Monitoring & Debugging

### CI Logs Structure

```
[07:05:20] 🚀 Starting CI test pipeline...
[07:05:21] Environment: CI=true
[07:05:22] Java version: openjdk 17.0.2 2022-01-18
[07:05:23] Maven version: Apache Maven 3.9.10
[07:05:24] Starting Spring Boot application directly for CI...
[07:05:45] ✅ Server up and responding!
[07:05:46] Running tests...
[07:05:50] ✅ All tests passed!
```

### Key Log Indicators

- **🚀**: Pipeline start
- **✅**: Successful steps
- **❌**: Errors requiring attention
- **⚠️**: Warnings (environment detection)

### Debugging Commands

```bash
# Local testing
./run-test.sh

# Force CI mode locally
CI_ENVIRONMENT=true ./run-test.sh

# Check Docker availability
docker info

# Test MySQL connection
mysql -h localhost -u root -p
```

## 🔄 Migration Guide

### From Docker-only to Hybrid

If migrating from a Docker-only test setup:

1. **Update `.gitlab-ci.yml`** with services configuration
2. **Add `run-test-ci.sh`** script to repository
3. **Create `application-test.properties`** for CI configuration
4. **Update `run-test.sh`** with environment detection
5. **Test locally** with both modes

### Rollback Strategy

If issues arise, temporary rollback:

```yaml
# In .gitlab-ci.yml, force old behavior
script:
  - CI_ENVIRONMENT=false ./run-test.sh
```

## 📚 Best Practices

### Test Design

- **Idempotent tests**: Each test should work independently
- **Unique data**: Use timestamps or UUIDs to avoid conflicts
- **Cleanup**: Tests should clean up after themselves
- **Fast execution**: Optimize for CI environment constraints

### Configuration Management

- **Environment-specific configs**: Separate local and CI settings
- **Secret handling**: Use CI variables for sensitive data
- **Default values**: Provide sensible defaults for all configurations
- **Documentation**: Keep this guide updated with changes

### Monitoring

- **Test metrics**: Track pass/fail rates over time
- **Performance**: Monitor CI execution times
- **Alerts**: Set up notifications for pipeline failures
- **Reviews**: Regular pipeline health reviews

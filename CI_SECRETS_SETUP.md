# GitHub Actions CI Configuration

## Overview

The Backend CI Pipeline (`ci.yml`) runs automated tests for the Spring Boot backend application. It sets up a MySQL database service and runs integration tests.

## Required GitHub Secrets

To run the CI pipeline successfully, configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Database Configuration
- `MYSQL_DATABASE` - Database name (default: `homeserver`)
- `MYSQL_USER` - Database user (default: `homeserver_app`) 
- `MYSQL_PASSWORD` - Database password (default: `test_password_123`)
- `MYSQL_ROOT_PASSWORD` - MySQL root password (default: `root_password_123`)

### Security Configuration  
- `JWT_SECRET` - JWT signing secret (minimum 256 bits, default provided)
- `JWT_EXPIRATION` - JWT token expiration in milliseconds (default: `86400000` = 24 hours)

## Default Values

If secrets are not configured, the CI will use default values suitable for testing:

```bash
MYSQL_DATABASE=homeserver
MYSQL_USER=homeserver_app  
MYSQL_PASSWORD=test_password_123
MYSQL_ROOT_PASSWORD=root_password_123
JWT_SECRET=test_jwt_secret_for_ci_must_be_at_least_256_bits_long_abcdefghijklmnopqrstuvwxyz123456
JWT_EXPIRATION=86400000
```

## Setting Up Secrets

1. Go to your GitHub repository
2. Click `Settings` > `Secrets and variables` > `Actions`
3. Click `New repository secret`
4. Add each secret with its corresponding value

Example secure values:
```bash
MYSQL_DATABASE=homeserver_ci
MYSQL_USER=ci_user
MYSQL_PASSWORD=SecureRandomPassword123!
MYSQL_ROOT_PASSWORD=SecureRootPassword456!  
JWT_SECRET=your_super_secure_jwt_secret_key_that_is_at_least_256_bits_long_for_production_use
JWT_EXPIRATION=86400000
```

## Local Testing

To test the CI configuration locally:

1. Set up environment variables:
```bash
export SPRING_PROFILES_ACTIVE=ci
export SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/homeserver
export SPRING_DATASOURCE_USERNAME=homeserver_app
export SPRING_DATASOURCE_PASSWORD=test_password_123
# ... other variables
```

2. Run tests:
```bash
./run-test-ci.sh
```

## Profiles

- **`test`** - Unit tests with H2 in-memory database (used by `mvn test`)
- **`ci`** - Integration tests with MySQL database (used by CI pipeline)
- **`docker`** - Production-like setup with external MySQL (used by Docker Compose)

## Troubleshooting

### CI Pipeline Fails with Database Connection Error
- Check that MySQL service is running in the workflow
- Verify database credentials are correct
- Ensure database name matches in all configuration

### Tests Fail with JWT Errors  
- Verify JWT_SECRET is at least 256 bits (32 characters)
- Check JWT_EXPIRATION is a valid number

### Integration Tests Timeout
- Increase MAX_WAIT_SECONDS in the CI environment
- Check that Spring Boot application starts successfully
- Verify all dependencies are available
# Home Server Security Quick Start Guide

This guide helps you quickly implement the most critical security improvements for your home server.

## 🚨 Immediate Actions (Complete Within 1 Hour)

### 1. Generate Secure Secrets
```bash
# Generate cryptographically secure passwords and secrets
./setup-secrets.sh

# Verify .secrets file permissions are correct (600)
ls -la .secrets
```

### 2. Review Security Configuration
```bash
# Check the generated credentials (passwords are now 32+ characters)
cat .secrets | grep -E "(PASSWORD|SECRET)" | head -5

# Ensure no secrets are committed to git
git status
git check-ignore .secrets  # Should show .secrets is ignored
```

### 3. Test Security Headers
```bash
# Start the application
./start.sh

# Test security headers (in another terminal)
curl -I http://localhost:8080/api/users
# Look for headers like X-Content-Type-Options, X-Frame-Options, etc.
```

### 4. Verify Rate Limiting
```bash
# Test rate limiting on auth endpoints
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/auth/login
  sleep 1
done
# Should see 429 (Too Many Requests) after 10 requests
```

## 🔒 Security Enhancements Implemented

### Backend Security
- ✅ **Security Headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- ✅ **Rate Limiting**: 10 requests/minute for auth endpoints, 50/hour global limit
- ✅ **CORS Hardening**: Removed wildcard origins, specific allowed origins only
- ✅ **Enhanced Password Generation**: 32+ character passwords with complexity validation
- ✅ **JWT Security**: 64-character secure secret, proper token handling

### Infrastructure Security
- ✅ **Container Hardening**: Non-root users, read-only filesystems, resource limits
- ✅ **Network Segmentation**: Separate backend and frontend networks
- ✅ **Database Security**: Connection pooling, prepared statements, audit logging
- ✅ **SSL/TLS Ready**: Nginx configuration for SSL termination
- ✅ **Security Monitoring**: Automated security check script

### CI/CD Security
- ✅ **Multi-layer Scanning**: Vulnerability scanning, dependency checks, secret detection
- ✅ **Container Security**: Image scanning before deployment
- ✅ **Code Analysis**: Static analysis (SAST) and dynamic testing
- ✅ **Security Gates**: Prevent deployment if security issues found

## 📋 Next Steps (Complete Within 1 Week)

### 1. SSL/TLS Setup
```bash
# Option A: Let's Encrypt (Recommended for public deployments)
sudo apt install certbot nginx
sudo certbot --nginx -d your-domain.com

# Option B: Self-signed (Development only)
mkdir -p ssl/live/localhost
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/live/localhost/privkey.pem \
  -out ssl/live/localhost/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Update nginx.conf with your domain
sed -i 's/your-domain.com/localhost/g' nginx.conf
```

### 2. Production Deployment
```bash
# Use production compose file with enhanced security
docker-compose -f compose.yml -f compose.prod.yml up -d

# Verify all containers are running as non-root
docker ps --format "table {{.Names}}\t{{.Image}}" | while read container image; do
  echo "$container: $(docker exec $container whoami 2>/dev/null || echo 'not running')"
done
```

### 3. Security Monitoring
```bash
# Run security monitoring
./security-monitor.sh

# Set up continuous monitoring (optional)
./security-monitor.sh --continuous --interval 300 &

# Check security status
./security-monitor.sh --help
```

### 4. Backup Setup
```bash
# Set up automated backups
./backup-restore.sh backup

# List available backups
./backup-restore.sh list

# Test restore (optional)
# ./backup-restore.sh restore <timestamp>
```

## 🔧 Configuration Files Overview

### Key Security Files Added
- `SECURITY_IMPROVEMENTS.md` - Comprehensive security improvement plan
- `backend/src/main/java/com/isaaclins/homeserver/config/SecurityHeadersFilter.java` - Security headers
- `backend/src/main/java/com/isaaclins/homeserver/config/RateLimitingFilter.java` - Rate limiting
- `backend/src/main/java/com/isaaclins/homeserver/config/CorsConfig.java` - Enhanced CORS
- `compose.prod.yml` - Production Docker configuration with security
- `nginx.conf` - SSL termination and security headers
- `security-monitor.sh` - Security monitoring and alerting
- `backup-restore.sh` - Encrypted backup and recovery
- `db/security-config.sh` - Database security hardening
- `.github/workflows/security-enhanced-ci.yml` - Enhanced CI/CD with security scanning

### Updated Files
- `setup-secrets.sh` - Enhanced password generation and validation
- `backend/Dockerfile` - Security hardening with non-root user
- `backend/src/main/resources/application-docker.properties` - Security configurations

## 🚨 Security Checklist

### Before Going to Production
- [ ] Generate secure secrets with `./setup-secrets.sh`
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules (only allow ports 80, 443, 22)
- [ ] Set up monitoring and alerting
- [ ] Test backup and restore procedures
- [ ] Review and update default passwords
- [ ] Configure email notifications for security alerts
- [ ] Run security scan: `./security-monitor.sh`
- [ ] Test rate limiting and security headers
- [ ] Review container security settings

### Ongoing Security Maintenance
- [ ] Weekly security monitoring: `./security-monitor.sh`
- [ ] Daily automated backups: `./backup-restore.sh backup`
- [ ] Monthly security updates for containers
- [ ] Quarterly disaster recovery testing
- [ ] Monitor CI/CD security pipeline results
- [ ] Review and rotate secrets every 90 days
- [ ] Monitor application logs for security events

## 🆘 Incident Response

### If Security Issue Detected
1. **Immediate**: Stop the affected containers
   ```bash
   docker-compose down
   ```

2. **Assess**: Check logs for security events
   ```bash
   ./security-monitor.sh
   docker logs homeserver-backend | grep -i "error\|warn\|fail"
   ```

3. **Contain**: Block suspicious IPs if needed
   ```bash
   # Add to nginx.conf or firewall
   deny <suspicious-ip>;
   ```

4. **Recover**: Restore from clean backup if compromised
   ```bash
   ./backup-restore.sh list
   ./backup-restore.sh restore <clean-backup-timestamp>
   ```

5. **Learn**: Update security measures based on incident

## 📞 Support

- Review `SECURITY_IMPROVEMENTS.md` for detailed security analysis
- Check logs in `/var/log/homeserver-*.log`
- Run `./security-monitor.sh --help` for monitoring options
- Test backup with `./backup-restore.sh --help`

---

**⚠️ Important**: This setup significantly improves security but ongoing maintenance is required. Security is a continuous process, not a one-time setup.
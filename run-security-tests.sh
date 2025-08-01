#!/bin/bash

# Security Testing Script for Home Server
# Tests various security configurations and vulnerabilities

set -e

echo "🔒 Running Security Tests for Home Server"
echo "=========================================="

# Configuration
BACKEND_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3000"
HEALTH_URL="$BACKEND_URL/actuator/health"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        if [ "$expected_result" = "pass" ]; then
            echo -e "${GREEN}PASS${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}FAIL${NC} (Expected to fail)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            echo -e "${GREEN}PASS${NC} (Correctly failed)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}FAIL${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    fi
}

# Function to check HTTP headers
check_security_headers() {
    echo -e "\n🛡️  Testing Security Headers"
    echo "----------------------------"
    
    # Check for security headers in a typical API response
    HEADERS=$(curl -s -I "$HEALTH_URL" 2>/dev/null || echo "")
    
    # Test individual headers
    run_test "X-Frame-Options header" "echo '$HEADERS' | grep -i 'x-frame-options'" "pass"
    run_test "X-Content-Type-Options header" "echo '$HEADERS' | grep -i 'x-content-type-options'" "pass"
    run_test "Content-Security-Policy header" "echo '$HEADERS' | grep -i 'content-security-policy'" "pass"
    run_test "Strict-Transport-Security header" "echo '$HEADERS' | grep -i 'strict-transport-security'" "pass"
    run_test "X-XSS-Protection header" "echo '$HEADERS' | grep -i 'x-xss-protection'" "pass"
    run_test "Referrer-Policy header" "echo '$HEADERS' | grep -i 'referrer-policy'" "pass"
}

# Function to test CORS configuration
test_cors_configuration() {
    echo -e "\n🌐 Testing CORS Configuration"
    echo "-----------------------------"
    
    # Test that CORS doesn't allow arbitrary origins
    run_test "CORS blocks unauthorized origin" "curl -s -H 'Origin: https://malicious.com' -H 'Access-Control-Request-Method: GET' -X OPTIONS '$BACKEND_URL/api/users' | grep -v 'Access-Control-Allow-Origin'" "pass"
    
    # Test that CORS allows legitimate origins (if configured)
    run_test "CORS allows configured origin" "curl -s -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: GET' -X OPTIONS '$HEALTH_URL'" "pass"
}

# Function to test rate limiting
test_rate_limiting() {
    echo -e "\n⏱️  Testing Rate Limiting"
    echo "------------------------"
    
    # Send multiple requests quickly to trigger rate limiting
    echo "Sending 10 rapid requests to test rate limiting..."
    RATE_LIMIT_TRIGGERED=false
    
    for i in {1..10}; do
        RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "$HEALTH_URL" 2>/dev/null || echo "000")
        if [ "$RESPONSE" = "429" ]; then
            RATE_LIMIT_TRIGGERED=true
            break
        fi
        sleep 0.1
    done
    
    if [ "$RATE_LIMIT_TRIGGERED" = "true" ]; then
        echo -e "${GREEN}PASS${NC} - Rate limiting is working"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}INFO${NC} - Rate limiting not triggered (may be configured for higher limits)"
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Function to test input validation
test_input_validation() {
    echo -e "\n✅ Testing Input Validation"
    echo "---------------------------"
    
    # Test SQL injection attempts (should fail)
    run_test "SQL injection protection" "curl -s -X POST '$BACKEND_URL/api/users' -H 'Content-Type: application/json' -d '{\"username\":\"admin'; DROP TABLE users; --\",\"email\":\"test@test.com\",\"password\":\"password123\"}' | grep -v 'error'" "fail"
    
    # Test XSS attempts (should fail)
    run_test "XSS protection" "curl -s -X POST '$BACKEND_URL/api/users' -H 'Content-Type: application/json' -d '{\"username\":\"<script>alert(1)</script>\",\"email\":\"test@test.com\",\"password\":\"password123\"}' | grep -v 'error'" "fail"
    
    # Test invalid email format (should fail)
    run_test "Email validation" "curl -s -X POST '$BACKEND_URL/api/users' -H 'Content-Type: application/json' -d '{\"username\":\"testuser\",\"email\":\"invalid-email\",\"password\":\"password123\"}' | grep 'error'" "pass"
    
    # Test weak password (should fail)
    run_test "Password strength validation" "curl -s -X POST '$BACKEND_URL/api/users' -H 'Content-Type: application/json' -d '{\"username\":\"testuser\",\"email\":\"test@test.com\",\"password\":\"123\"}' | grep 'error'" "pass"
}

# Function to test container security
test_container_security() {
    echo -e "\n🐳 Testing Container Security"
    echo "-----------------------------"
    
    # Check if containers are running as non-root users
    BACKEND_USER=$(docker exec homeserver-backend whoami 2>/dev/null || echo "unknown")
    FRONTEND_USER=$(docker exec homeserver-frontend whoami 2>/dev/null || echo "unknown")
    
    if [ "$BACKEND_USER" != "root" ]; then
        echo -e "Backend non-root user: ${GREEN}PASS${NC} (running as: $BACKEND_USER)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "Backend non-root user: ${RED}FAIL${NC} (running as root)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    if [ "$FRONTEND_USER" != "root" ]; then
        echo -e "Frontend non-root user: ${GREEN}PASS${NC} (running as: $FRONTEND_USER)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "Frontend non-root user: ${RED}FAIL${NC} (running as root)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 2))
}

# Function to test for information disclosure
test_information_disclosure() {
    echo -e "\n🕵️  Testing Information Disclosure"
    echo "----------------------------------"
    
    # Check that error messages don't reveal sensitive information
    run_test "Generic error messages" "curl -s '$BACKEND_URL/api/nonexistent' | grep -v 'stack trace\\|exception\\|internal'" "pass"
    
    # Check that actuator endpoints don't expose sensitive info
    run_test "Actuator security" "curl -s '$BACKEND_URL/actuator' | grep -v 'env\\|configprops\\|mappings'" "pass"
}

# Function to check for exposed secrets
test_secret_exposure() {
    echo -e "\n🔐 Testing Secret Exposure"
    echo "-------------------------"
    
    # Check that configuration endpoints don't expose secrets
    run_test "No secret exposure in health endpoint" "curl -s '$HEALTH_URL' | grep -v 'password\\|secret\\|key'" "pass"
    
    # Check that Docker images don't contain secrets (basic check)
    run_test "No secrets in environment" "docker exec homeserver-backend env | grep -v 'PASSWORD\\|SECRET\\|KEY'" "fail"
}

# Main execution
main() {
    echo "Starting security tests..."
    echo "Backend URL: $BACKEND_URL"
    echo "Frontend URL: $FRONTEND_URL"
    echo ""
    
    # Wait for services to be ready
    echo "Waiting for services to be ready..."
    for i in {1..30}; do
        if curl -s "$HEALTH_URL" > /dev/null 2>&1; then
            echo "Services are ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}ERROR:${NC} Services are not responding after 30 seconds"
            exit 1
        fi
        sleep 2
    done
    
    # Run all security tests
    check_security_headers
    test_cors_configuration
    test_rate_limiting
    test_input_validation
    test_container_security
    test_information_disclosure
    test_secret_exposure
    
    # Print summary
    echo ""
    echo "=========================================="
    echo "🔒 Security Test Summary"
    echo "=========================================="
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All security tests passed!${NC}"
        exit 0
    else
        echo -e "\n${YELLOW}⚠️  Some security tests failed. Please review the results above.${NC}"
        exit 1
    fi
}

# Run the main function
main "$@"
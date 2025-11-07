#!/bin/bash

# ==============================================
# Docker Setup Validation Script
# Validates Docker configuration and environment
# ==============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Print functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check functions
check_command() {
    if command -v "$1" &> /dev/null; then
        local version=$($1 --version 2>&1 | head -n 1)
        print_success "$1 is installed: $version"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

check_file() {
    if [ -f "$1" ]; then
        print_success "File exists: $1"
        return 0
    else
        print_error "File missing: $1"
        return 1
    fi
}

check_directory() {
    if [ -d "$1" ]; then
        print_success "Directory exists: $1"
        return 0
    else
        print_error "Directory missing: $1"
        return 1
    fi
}

check_env_var() {
    local file=$1
    local var=$2

    if [ -f "$file" ]; then
        if grep -q "^${var}=" "$file" || grep -q "^# ${var}=" "$file"; then
            print_success "Variable defined in $file: $var"
            return 0
        else
            print_warning "Variable missing in $file: $var"
            return 1
        fi
    else
        print_error "File not found: $file"
        return 1
    fi
}

# Main validation
print_header "Docker Setup Validation"

# 1. Check required software
print_header "1. Checking Required Software"
check_command "docker"
check_command "docker-compose"
check_command "git"
check_command "make"

# 2. Check Docker is running
print_header "2. Checking Docker Status"
if docker ps &> /dev/null; then
    print_success "Docker daemon is running"
else
    print_error "Docker daemon is not running. Please start Docker."
fi

# 3. Check required files
print_header "3. Checking Required Files"
check_file "docker-compose.yml"
check_file "docker-compose.prod.yml"
check_file ".env.example"
check_file "Makefile"
check_file "DOCKER-SETUP.md"

# 4. Check Dockerfiles
print_header "4. Checking Dockerfiles"
check_file "docker/frontend.Dockerfile"
check_file "docker/backend.Dockerfile"
check_file "docker/nginx/nginx.conf"

# 5. Check .dockerignore files
print_header "5. Checking .dockerignore Files"
check_file "frontend/.dockerignore"
check_file "backend/.dockerignore"

# 6. Check environment files
print_header "6. Checking Environment Files"
check_file "frontend/.env.local.example"
check_file "backend/.env.example"

if [ -f ".env" ]; then
    print_success "Root .env file exists"
else
    print_warning "Root .env file not found. Run: make setup"
fi

if [ -f "frontend/.env.local" ]; then
    print_success "Frontend .env.local exists"
else
    print_warning "Frontend .env.local not found. Run: cp frontend/.env.local.example frontend/.env.local"
fi

if [ -f "backend/.env" ]; then
    print_success "Backend .env exists"
else
    print_warning "Backend .env not found. Run: cp backend/.env.example backend/.env"
fi

# 7. Check required directories
print_header "7. Checking Required Directories"
check_directory "frontend"
check_directory "backend"
check_directory "docker"
check_directory "docker/nginx"

# 8. Validate critical environment variables
print_header "8. Validating Environment Variables"
if [ -f ".env" ]; then
    check_env_var ".env" "NODE_ENV"
    check_env_var ".env" "MONGODB_URI"
    check_env_var ".env" "REDIS_HOST"
    check_env_var ".env" "JWT_SECRET"
    check_env_var ".env" "FRONTEND_URL"

    # Check for default/insecure values
    if grep -q "JWT_SECRET=your-super-secret-jwt-key-change-in-production" ".env" 2>/dev/null; then
        print_warning "JWT_SECRET is using default value. Change it for security!"
    fi

    if grep -q "MONGO_PASSWORD=admin123" ".env" 2>/dev/null; then
        print_warning "MongoDB password is using default value. Change it for production!"
    fi
else
    print_warning "Cannot validate .env variables - file not found"
fi

# 9. Check Docker Compose syntax
print_header "9. Validating Docker Compose Files"
if docker-compose config &> /dev/null; then
    print_success "docker-compose.yml syntax is valid"
else
    print_error "docker-compose.yml has syntax errors"
fi

if docker-compose -f docker-compose.prod.yml config &> /dev/null; then
    print_success "docker-compose.prod.yml syntax is valid"
else
    print_error "docker-compose.prod.yml has syntax errors"
fi

# 10. Check port availability
print_header "10. Checking Port Availability"
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $port is already in use"
        return 1
    else
        print_success "Port $port is available"
        return 0
    fi
}

check_port 3000  # Frontend
check_port 5000  # Backend
check_port 27017 # MongoDB
check_port 6379  # Redis
check_port 80    # Nginx

# 11. Check disk space
print_header "11. Checking Disk Space"
if command -v df &> /dev/null; then
    available_space=$(df -h . | awk 'NR==2 {print $4}')
    print_info "Available disk space: $available_space"

    # Convert to GB for comparison (simplified)
    available_gb=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_gb" -lt 5 ]; then
        print_warning "Low disk space. At least 5GB recommended."
    else
        print_success "Sufficient disk space available"
    fi
fi

# 12. Check Docker resources
print_header "12. Checking Docker Resources"
if command -v docker &> /dev/null && docker info &> /dev/null; then
    total_mem=$(docker info 2>/dev/null | grep "Total Memory" | awk '{print $3, $4}')
    print_info "Docker total memory: $total_mem"

    cpus=$(docker info 2>/dev/null | grep "CPUs" | awk '{print $2}')
    print_info "Docker CPUs: $cpus"
fi

# Summary
print_header "Validation Summary"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"

echo -e "\n"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Docker setup validation passed!${NC}"
    echo -e "${GREEN}You can proceed with: make build && make up${NC}"
    exit 0
else
    echo -e "${RED}✗ Docker setup validation failed!${NC}"
    echo -e "${YELLOW}Please fix the errors above before proceeding.${NC}"
    exit 1
fi

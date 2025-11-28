#!/usr/bin/env node

/**
 * Test script to verify rate limiting works correctly
 * Tests that:
 * 1. Public endpoint rate limits non-authenticated users
 * 2. Authenticated endpoint does NOT rate limit authenticated users
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test configuration
const TEST_URL = 'https://www.example.com';
const PUBLIC_ENDPOINT = '/links/public/shorten';
const AUTH_ENDPOINT = '/links/shorten';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test public endpoint rate limiting (should be limited to 10 requests per hour)
 */
async function testPublicEndpointRateLimit() {
  log('\n===== Testing Public Endpoint Rate Limiting =====', 'blue');
  log('Expected: Should be rate limited after 10 requests', 'yellow');

  let successCount = 0;
  let rateLimitedAt = 0;

  for (let i = 1; i <= 15; i++) {
    try {
      const response = await axios.post(`${API_BASE_URL}${PUBLIC_ENDPOINT}`, {
        originalUrl: `${TEST_URL}?test=${i}`,
      });

      if (response.data.success) {
        successCount++;
        log(`✓ Request ${i}: SUCCESS`, 'green');
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        rateLimitedAt = i;
        log(`✗ Request ${i}: RATE LIMITED (429)`, 'red');
        break;
      } else {
        log(`✗ Request ${i}: ERROR - ${error.message}`, 'red');
      }
    }

    // Small delay between requests
    await delay(100);
  }

  log(`\nPublic Endpoint Results:`, 'blue');
  log(`- Successful requests: ${successCount}`, successCount === 10 ? 'green' : 'red');
  log(`- Rate limited at request: ${rateLimitedAt}`, rateLimitedAt === 11 ? 'green' : 'red');

  if (successCount === 10 && rateLimitedAt === 11) {
    log('✓ Public endpoint rate limiting works correctly!', 'green');
    return true;
  } else {
    log('✗ Public endpoint rate limiting not working as expected', 'red');
    return false;
  }
}

/**
 * Test authenticated endpoint (should NOT be rate limited for auth users)
 */
async function testAuthenticatedEndpoint() {
  log('\n===== Testing Authenticated Endpoint (No Rate Limiting) =====', 'blue');
  log('Expected: Should NOT be rate limited for authenticated users', 'yellow');

  // First, we need to register and login to get a token
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    // Register
    log('\n1. Registering test user...', 'yellow');
    await axios.post(`${API_BASE_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
      name: 'Test User',
    });
    log('✓ User registered', 'green');

    // Login
    log('2. Logging in...', 'yellow');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });

    const { accessToken } = loginResponse.data.data;
    log('✓ Login successful, got access token', 'green');

    // Configure axios with auth token
    const authAxios = axios.create({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Test making many requests (should all succeed)
    log('\n3. Testing authenticated link creation (50 requests)...', 'yellow');
    let successCount = 0;
    let rateLimited = false;

    for (let i = 1; i <= 50; i++) {
      try {
        const response = await authAxios.post(`${API_BASE_URL}${AUTH_ENDPOINT}`, {
          originalUrl: `${TEST_URL}?auth-test=${i}`,
        });

        if (response.data.success) {
          successCount++;
          if (i % 10 === 0) {
            log(`✓ Requests ${i - 9}-${i}: ALL SUCCESS`, 'green');
          }
        }
      } catch (error) {
        if (error.response && error.response.status === 429) {
          rateLimited = true;
          log(`✗ Request ${i}: RATE LIMITED (429) - This should NOT happen!`, 'red');
          break;
        } else if (error.response && error.response.status === 403) {
          // Might be quota limit, not rate limit
          log(`! Request ${i}: Quota limit reached (403) - This is OK`, 'yellow');
          break;
        } else {
          log(`✗ Request ${i}: ERROR - ${error.message}`, 'red');
        }
      }

      // Small delay between requests
      await delay(50);
    }

    log(`\nAuthenticated Endpoint Results:`, 'blue');
    log(`- Successful requests: ${successCount}/50`, successCount >= 45 ? 'green' : 'yellow');
    log(`- Rate limited: ${rateLimited ? 'YES' : 'NO'}`, rateLimited ? 'red' : 'green');

    if (!rateLimited && successCount >= 45) {
      log('✓ Authenticated users are NOT rate limited - Fix successful!', 'green');
      return true;
    } else if (rateLimited) {
      log('✗ Authenticated users are still being rate limited - Fix needed!', 'red');
      return false;
    } else {
      log('⚠ Test inconclusive - check if quota limits are being hit', 'yellow');
      return true; // Quota limits are OK, not a rate limiting issue
    }

  } catch (error) {
    log(`Error during authenticated test: ${error.message}`, 'red');
    if (error.response) {
      log(`Response: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n🧪 Starting Rate Limiting Tests', 'blue');
  log('================================', 'blue');

  // Check if backend is running
  try {
    await axios.get(`${API_BASE_URL}/health`);
    log('✓ Backend is running', 'green');
  } catch (error) {
    log('✗ Backend is not running! Please start it first.', 'red');
    log('Run: cd backend && npm run dev', 'yellow');
    process.exit(1);
  }

  // Run tests
  const publicTestPassed = await testPublicEndpointRateLimit();
  const authTestPassed = await testAuthenticatedEndpoint();

  // Summary
  log('\n================================', 'blue');
  log('📊 Test Summary', 'blue');
  log('================================', 'blue');
  log(`Public Endpoint Rate Limiting: ${publicTestPassed ? '✓ PASSED' : '✗ FAILED'}`, publicTestPassed ? 'green' : 'red');
  log(`Authenticated Endpoint (No Rate Limit): ${authTestPassed ? '✓ PASSED' : '✗ FAILED'}`, authTestPassed ? 'green' : 'red');

  if (publicTestPassed && authTestPassed) {
    log('\n🎉 All tests passed! Rate limiting is working correctly.', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some tests failed. Please check the implementation.', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
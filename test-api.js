// Simple API testing script
const baseUrl = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🚀 Testing Authentication API\n');
  console.log('=' .repeat(60));

  // Test 1: Register a new user
  console.log('\n1️⃣  Testing User Registration...');
  try {
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test@1234',
        first_name: 'Test',
        last_name: 'User'
      })
    });
    const registerData = await registerResponse.json();
    console.log(`   Status: ${registerResponse.status}`);
    console.log(`   Response:`, registerData);
    if (registerResponse.status === 201) {
      console.log('   ✅ Registration successful');
    } else if (registerResponse.status === 409) {
      console.log('   ⚠️  User already exists (expected on re-run)');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 2: Login with the user
  console.log('\n2️⃣  Testing User Login...');
  let accessToken = null;
  let refreshToken = null;
  try {
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test@1234'
      })
    });
    const loginData = await loginResponse.json();
    console.log(`   Status: ${loginResponse.status}`);
    if (loginResponse.status === 200) {
      accessToken = loginData.accessToken;
      refreshToken = loginData.refreshToken;
      console.log(`   ✅ Login successful`);
      console.log(`   User:`, loginData.user);
      console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);
    } else {
      console.log(`   Response:`, loginData);
      console.log(`   ⚠️  Login failed:`, loginData.error);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 3: Access protected route
  if (accessToken) {
    console.log('\n3️⃣  Testing Protected Route (Get Profile)...');
    try {
      const profileResponse = await fetch(`${baseUrl}/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const profileData = await profileResponse.json();
      console.log(`   Status: ${profileResponse.status}`);
      if (profileResponse.status === 200) {
        console.log(`   ✅ Profile retrieved successfully`);
        console.log(`   Profile:`, profileData);
      } else {
        console.log(`   Response:`, profileData);
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
  }

  // Test 4: Test invalid token
  console.log('\n4️⃣  Testing Invalid Token...');
  try {
    const invalidResponse = await fetch(`${baseUrl}/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer invalid_token_here`,
        'Content-Type': 'application/json'
      }
    });
    const invalidData = await invalidResponse.json();
    console.log(`   Status: ${invalidResponse.status}`);
    if (invalidResponse.status === 401) {
      console.log(`   ✅ Correctly rejected invalid token`);
      console.log(`   Response:`, invalidData);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 5: Refresh token
  if (refreshToken) {
    console.log('\n5️⃣  Testing Token Refresh...');
    try {
      const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const refreshData = await refreshResponse.json();
      console.log(`   Status: ${refreshResponse.status}`);
      if (refreshResponse.status === 200) {
        console.log(`   ✅ Token refresh successful`);
        console.log(`   New Access Token: ${refreshData.accessToken.substring(0, 20)}...`);
      } else {
        console.log(`   Response:`, refreshData);
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
  }

  // Test 6: Test non-existent route
  console.log('\n6️⃣  Testing Non-Existent Route...');
  try {
    const notFoundResponse = await fetch(`${baseUrl}/nonexistent`, {
      method: 'GET'
    });
    const notFoundData = await notFoundResponse.json();
    console.log(`   Status: ${notFoundResponse.status}`);
    if (notFoundResponse.status === 404) {
      console.log(`   ✅ Correctly returned 404`);
      console.log(`   Response:`, notFoundData);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ API Testing Complete!\n');
}

// Run the tests
testAPI().catch(console.error);

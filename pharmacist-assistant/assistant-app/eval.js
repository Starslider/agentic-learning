// Simple evaluation script to test the fixes
// Uses built-in fetch (Node 18+)

const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'eval-test-user-' + Date.now();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEndpoint(name, method, path, body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${name}: PASSED`);
      return { success: true, data };
    } else {
      console.log(`❌ ${name}: FAILED - ${data.error || response.statusText}`);
      return { success: false, error: data.error || response.statusText };
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runEvaluations() {
  console.log('🧪 Starting Evaluations...\n');
  console.log(`Test User ID: ${TEST_USER_ID}\n`);
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Health check
  console.log('Test 1: Health Check');
  const health = await testEndpoint('Health Check', 'GET', '/api/health');
  results.tests.push(health);
  if (health.success) results.passed++; else results.failed++;
  await sleep(500);
  
  // Test 2: Send a chat message (tests medication API and memory storage)
  console.log('\nTest 2: Chat Message (Medication Query)');
  const chat1 = await testEndpoint(
    'Chat - Medication Query',
    'POST',
    '/api/chat',
    { message: 'Tell me about Ibuprofen', userId: TEST_USER_ID }
  );
  results.tests.push(chat1);
  if (chat1.success && chat1.data.response) {
    results.passed++;
    console.log(`   Response preview: ${chat1.data.response.substring(0, 100)}...`);
  } else {
    results.failed++;
  }
  await sleep(1000);
  
  // Test 3: Check memory storage (history)
  console.log('\nTest 3: Memory Storage (History)');
  const history1 = await testEndpoint(
    'History Retrieval',
    'GET',
    `/api/history?userId=${TEST_USER_ID}`
  );
  results.tests.push(history1);
  if (history1.success && Array.isArray(history1.data.conversations)) {
    if (history1.data.conversations.length > 0) {
      results.passed++;
      console.log(`   Found ${history1.data.conversations.length} conversation(s) in history`);
    } else {
      results.failed++;
      console.log('   ⚠️  No conversations found in history (memory may not be storing)');
    }
  } else {
    results.failed++;
  }
  await sleep(500);
  
  // Test 4: Send another message to test memory retrieval
  console.log('\nTest 4: Follow-up Message (Memory Retrieval)');
  const chat2 = await testEndpoint(
    'Chat - Follow-up',
    'POST',
    '/api/chat',
    { message: 'What about Aspirin?', userId: TEST_USER_ID }
  );
  results.tests.push(chat2);
  if (chat2.success && chat2.data.response) {
    results.passed++;
    console.log(`   Response preview: ${chat2.data.response.substring(0, 100)}...`);
  } else {
    results.failed++;
  }
  await sleep(1000);
  
  // Test 5: Verify both conversations are in history
  console.log('\nTest 5: Memory Persistence');
  const history2 = await testEndpoint(
    'History - Multiple Conversations',
    'GET',
    `/api/history?userId=${TEST_USER_ID}`
  );
  results.tests.push(history2);
  if (history2.success && history2.data.conversations.length >= 2) {
    results.passed++;
    console.log(`   ✅ Found ${history2.data.conversations.length} conversations (expected at least 2)`);
  } else {
    results.failed++;
    console.log(`   ❌ Found ${history2.data.conversations?.length || 0} conversations (expected at least 2)`);
  }
  await sleep(500);
  
  // Test 6: Test medication API error handling (non-existent medication)
  console.log('\nTest 6: Error Handling (Non-existent Medication)');
  const chat3 = await testEndpoint(
    'Chat - Non-existent Medication',
    'POST',
    '/api/chat',
    { message: 'Tell me about Zyloxin', userId: TEST_USER_ID }
  );
  results.tests.push(chat3);
  if (chat3.success && chat3.data.response) {
    results.passed++;
    console.log(`   Response preview: ${chat3.data.response.substring(0, 100)}...`);
  } else {
    results.failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Evaluation Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Check if server is running
fetch(`${BASE_URL}/api/health`)
  .then(() => {
    console.log('✅ Server is running\n');
    runEvaluations();
  })
  .catch(() => {
    console.error('❌ Server is not running. Please start it with: npm start');
    process.exit(1);
  });


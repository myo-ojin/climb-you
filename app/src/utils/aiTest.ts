/**
 * AI Function Manual Test
 * 
 * Test OpenAI API integration with the stored API key
 */

import { OpenAITestUtils } from './openaiTest';

export async function testAIFunctionality() {
  console.log('🤖 Testing AI Functionality...\n');

  // Test 1: API Key availability
  console.log('1. Checking API Key...');
  try {
    const hasKey = await OpenAITestUtils.hasAPIKey();
    if (hasKey) {
      console.log('   ✅ API Key is stored');
    } else {
      console.log('   ❌ No API Key found');
      return { success: false, error: 'No API Key' };
    }
  } catch (error) {
    console.log('   ❌ API Key check failed:', (error as any).message);
    return { success: false, error: 'API Key check failed' };
  }

  // Test 2: Basic connection test
  console.log('\n2. Testing OpenAI connection...');
  try {
    const testResult = await OpenAITestUtils.testConnection();
    if (testResult.success) {
      console.log('   ✅ Connection successful');
      console.log('   📝 Response length:', testResult.response?.length || 0);
    } else {
      console.log('   ❌ Connection failed:', testResult.error);
      return { success: false, error: testResult.error };
    }
  } catch (error) {
    console.log('   ❌ Connection test failed:', (error as any).message);
    return { success: false, error: 'Connection test failed' };
  }

  // Test 3: Profiling analysis test
  console.log('\n3. Testing AI profiling analysis...');
  try {
    const profilingResult = await OpenAITestUtils.testProfileAnalysis();
    if (profilingResult.success) {
      console.log('   ✅ Profiling analysis successful');
      console.log('   🧠 Analysis confidence:', profilingResult.analysis?.confidence || 'N/A');
      console.log('   📋 Strategies count:', profilingResult.analysis?.learningStrategy?.length || 0);
    } else {
      console.log('   ❌ Profiling analysis failed:', profilingResult.error);
      return { success: false, error: profilingResult.error };
    }
  } catch (error) {
    console.log('   ❌ Profiling test failed:', (error as any).message);
    return { success: false, error: 'Profiling test failed' };
  }

  // Test 4: Quest generation test
  console.log('\n4. Testing AI quest generation...');
  try {
    const questResult = await OpenAITestUtils.testQuestGeneration();
    if (questResult.success) {
      console.log('   ✅ Quest generation successful');
      console.log('   🎯 Quests generated:', questResult.quests?.length || 0);
      if (questResult.quests && questResult.quests.length > 0) {
        console.log('   📝 First quest:', questResult.quests[0].title);
      }
    } else {
      console.log('   ❌ Quest generation failed:', questResult.error);
      return { success: false, error: questResult.error };
    }
  } catch (error) {
    console.log('   ❌ Quest generation test failed:', (error as any).message);
    return { success: false, error: 'Quest generation test failed' };
  }

  console.log('\n🎉 All AI functionality tests passed!');
  return { success: true };
}

// Main function for direct execution
if (require.main === module) {
  testAIFunctionality()
    .then(result => {
      if (result.success) {
        console.log('\n✅ AI Integration Test: PASSED');
        process.exit(0);
      } else {
        console.log('\n❌ AI Integration Test: FAILED -', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 AI Integration Test: ERROR -', error);
      process.exit(1);
    });
}
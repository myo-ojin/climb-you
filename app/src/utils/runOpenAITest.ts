import { OpenAITestUtils } from './openaiTest';

/**
 * Run OpenAI service tests and log results
 */
export async function runOpenAITests(): Promise<void> {
  console.log('🧪 Starting OpenAI Service Tests...\n');

  try {
    // Test with mock service first
    console.log('📝 Testing Mock Service...');
    const mockBasicTest = await OpenAITestUtils.runBasicTest(true);
    console.log('Mock Service Results:', mockBasicTest.results);

    // Test API key management
    console.log('\n🔐 Testing API Key Management...');
    const apiKeyTest = await OpenAITestUtils.testApiKeyManagement();
    console.log('API Key Management Results:', apiKeyTest.results);

    // Generate and display report
    const report = OpenAITestUtils.generateTestReport(mockBasicTest, apiKeyTest);
    console.log('\n' + report);

    // Test real service if API key is available
    console.log('\n🌐 Testing Real OpenAI Service...');
    try {
      const realBasicTest = await OpenAITestUtils.runBasicTest(false);
      console.log('Real Service Results:', realBasicTest.results);
    } catch (error) {
      console.log('Real service test skipped (likely no API key):', error);
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Export for easy import in other files
export default runOpenAITests;
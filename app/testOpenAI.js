// Simple Node.js script to test OpenAI API setup
const { setupOpenAIApiKey, testChatCompletion, testStructuredResponse } = require('./dist/src/utils/setupOpenAI');

const API_KEY = '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';

async function main() {
  console.log('🚀 Starting OpenAI API test...\n');
  
  try {
    // Setup API key and run tests
    const setupResult = await setupOpenAIApiKey(API_KEY);
    
    if (setupResult.success) {
      console.log('\n🎉 Setup successful! Running additional tests...\n');
      
      // Test basic chat completion
      await testChatCompletion();
      
      console.log('\n');
      
      // Test structured response
      await testStructuredResponse();
      
    } else {
      console.log('\n❌ Setup failed:', setupResult.message);
    }
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
  }
}

main();
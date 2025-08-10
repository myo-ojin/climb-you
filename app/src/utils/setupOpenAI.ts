import { SecureStorageService } from '../services/secureStorage';
import { OpenAIService } from '../services/openaiService';
import { OpenAITestUtils } from './openaiTest';

/**
 * Setup OpenAI API key and run connection test
 */
export async function setupOpenAIApiKey(apiKey: string): Promise<{
  success: boolean;
  message: string;
  testResults?: any;
}> {
  try {
    console.log('🔐 Setting up OpenAI API key...');
    
    // Validate API key format
    if (!SecureStorageService.validateApiKey(apiKey)) {
      return {
        success: false,
        message: 'Invalid API key format. OpenAI API keys should start with "sk-" and be 51 characters long.'
      };
    }

    // Store API key securely
    await SecureStorageService.setOpenAIApiKey(apiKey);
    console.log('✅ API key stored securely');

    // Verify storage
    const hasKey = await SecureStorageService.hasOpenAIApiKey();
    if (!hasKey) {
      return {
        success: false,
        message: 'Failed to store API key'
      };
    }

    console.log('🧪 Running connection tests...');
    
    // Run comprehensive tests
    const basicTest = await OpenAITestUtils.runBasicTest(false); // false = use real service
    const apiKeyTest = await OpenAITestUtils.testApiKeyManagement();
    
    const report = OpenAITestUtils.generateTestReport(basicTest, apiKeyTest);
    console.log('\n' + report);

    if (basicTest.success && apiKeyTest.success) {
      return {
        success: true,
        message: 'OpenAI API setup completed successfully! All tests passed.',
        testResults: { basicTest, apiKeyTest, report }
      };
    } else {
      return {
        success: false,
        message: 'Setup completed but some tests failed. Check the test results.',
        testResults: { basicTest, apiKeyTest, report }
      };
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return {
      success: false,
      message: `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Test a simple chat completion
 */
export async function testChatCompletion(): Promise<void> {
  try {
    console.log('💬 Testing chat completion...');
    
    const service = new OpenAIService();
    await service.initialize();
    
    const response = await service.chatCompletion([
      { 
        role: 'user', 
        content: 'こんにちは！あなたは「Climb You」という学習支援アプリのAIアシスタントです。簡単に自己紹介してください。' 
      }
    ]);
    
    console.log('🤖 AI Response:', response);
    console.log('✅ Chat completion test successful!');
    
  } catch (error) {
    console.error('❌ Chat completion test failed:', error);
  }
}

/**
 * Test structured response generation
 */
export async function testStructuredResponse(): Promise<void> {
  try {
    console.log('📋 Testing structured response generation...');
    
    const service = new OpenAIService();
    await service.initialize();
    
    // Import the schema
    const { ProfileAnalysisSchema } = await import('../types/openai');
    
    const response = await service.generateStructuredResponse(
      [
        {
          role: 'system',
          content: 'あなたは学習支援AIです。ユーザーのプロファイルを分析して、JSON形式で結果を返してください。'
        },
        {
          role: 'user',
          content: JSON.stringify({
            age: '20代',
            availableTime: 60,
            goals: ['TOEIC 800点取得'],
            learningStyle: {
              motivation: 'achievement',
              pace: 'moderate',
              obstacles: ['時間不足', '継続困難']
            }
          })
        }
      ],
      ProfileAnalysisSchema
    );
    
    console.log('📊 Structured Response:', JSON.stringify(response, null, 2));
    console.log('✅ Structured response test successful!');
    
  } catch (error) {
    console.error('❌ Structured response test failed:', error);
  }
}
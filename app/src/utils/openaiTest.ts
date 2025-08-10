import { OpenAIService } from '../services/openaiService';
import { MockOpenAIService } from '../services/openaiService.mock';
import { SecureStorageService } from '../services/secureStorage';

/**
 * Test utilities for OpenAI service
 */
export class OpenAITestUtils {
  /**
   * Test OpenAI service connection and basic functionality
   */
  static async runBasicTest(useMock: boolean = false): Promise<{
    success: boolean;
    results: Array<{ test: string; passed: boolean; error?: string }>;
  }> {
    const results: Array<{ test: string; passed: boolean; error?: string }> = [];
    let service: OpenAIService | MockOpenAIService;

    if (useMock) {
      service = new MockOpenAIService();
    } else {
      service = new OpenAIService();
    }

    // Test 1: Service initialization
    try {
      await service.initialize();
      results.push({ test: 'Service initialization', passed: true });
    } catch (error) {
      results.push({ 
        test: 'Service initialization', 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Connection test
    try {
      const connected = await service.testConnection();
      results.push({ 
        test: 'Connection test', 
        passed: connected,
        error: connected ? undefined : 'Connection failed'
      });
    } catch (error) {
      results.push({ 
        test: 'Connection test', 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Basic chat completion
    try {
      const response = await service.chatCompletion([
        { role: 'user', content: 'Respond with "TEST PASSED" if you can understand this message.' }
      ]);
      const passed = response.toLowerCase().includes('test passed') || response.length > 0;
      results.push({ 
        test: 'Chat completion', 
        passed,
        error: passed ? undefined : 'Unexpected response format'
      });
    } catch (error) {
      results.push({ 
        test: 'Chat completion', 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const allPassed = results.every(result => result.passed);
    return { success: allPassed, results };
  }

  /**
   * Test API key management
   */
  static async testApiKeyManagement(): Promise<{
    success: boolean;
    results: Array<{ test: string; passed: boolean; error?: string }>;
  }> {
    const results: Array<{ test: string; passed: boolean; error?: string }> = [];
    const testApiKey = 'sk-test1234567890123456789012345678901234567890123456';

    // Test 1: API key validation
    try {
      const isValid = SecureStorageService.validateApiKey(testApiKey);
      results.push({ 
        test: 'API key validation', 
        passed: isValid,
        error: isValid ? undefined : 'Valid API key format rejected'
      });
    } catch (error) {
      results.push({ 
        test: 'API key validation', 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Store API key
    try {
      await SecureStorageService.setOpenAIApiKey(testApiKey);
      results.push({ test: 'Store API key', passed: true });
    } catch (error) {
      results.push({ 
        test: 'Store API key', 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Retrieve API key
    try {
      const retrievedKey = await SecureStorageService.getOpenAIApiKey();
      const passed = retrievedKey === testApiKey;
      results.push({ 
        test: 'Retrieve API key', 
        passed,
        error: passed ? undefined : 'Retrieved key does not match stored key'
      });
    } catch (error) {
      results.push({ 
        test: 'Retrieve API key', 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 4: Check API key exists
    try {
      const exists = await SecureStorageService.hasOpenAIApiKey();
      results.push({ 
        test: 'Check API key exists', 
        passed: exists,
        error: exists ? undefined : 'API key should exist but was not found'
      });
    } catch (error) {
      results.push({ 
        test: 'Check API key exists', 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 5: Remove API key
    try {
      await SecureStorageService.removeOpenAIApiKey();
      const stillExists = await SecureStorageService.hasOpenAIApiKey();
      const passed = !stillExists;
      results.push({ 
        test: 'Remove API key', 
        passed,
        error: passed ? undefined : 'API key should be removed but still exists'
      });
    } catch (error) {
      results.push({ 
        test: 'Remove API key', 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const allPassed = results.every(result => result.passed);
    return { success: allPassed, results };
  }

  /**
   * Generate test report
   */
  static generateTestReport(
    basicTest: { success: boolean; results: Array<{ test: string; passed: boolean; error?: string }> },
    apiKeyTest: { success: boolean; results: Array<{ test: string; passed: boolean; error?: string }> }
  ): string {
    let report = '=== OpenAI Service Test Report ===\n\n';
    
    report += `Overall Status: ${basicTest.success && apiKeyTest.success ? 'PASSED' : 'FAILED'}\n\n`;
    
    report += '--- Basic Service Tests ---\n';
    basicTest.results.forEach(result => {
      report += `${result.passed ? '✅' : '❌'} ${result.test}`;
      if (result.error) {
        report += ` - Error: ${result.error}`;
      }
      report += '\n';
    });
    
    report += '\n--- API Key Management Tests ---\n';
    apiKeyTest.results.forEach(result => {
      report += `${result.passed ? '✅' : '❌'} ${result.test}`;
      if (result.error) {
        report += ` - Error: ${result.error}`;
      }
      report += '\n';
    });
    
    report += '\n=== End Report ===';
    return report;
  }
}
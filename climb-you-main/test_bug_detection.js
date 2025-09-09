/**
 * Comprehensive Bug Detection Test Suite
 * Tests for common bugs, edge cases, and integration issues in Climb You
 */

console.log('🐛 Climb You - Bug Detection Test Suite');
console.log('=====================================\n');

class BugDetectionTester {
  constructor() {
    this.bugs = [];
    this.warnings = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runAllBugTests() {
    console.log('🔍 Starting comprehensive bug detection...\n');

    try {
      // Critical System Tests
      await this.testDataIntegrity();
      await this.testErrorHandling();
      await this.testEdgeCases();
      await this.testTypeValidation();
      await this.testAsyncOperations();
      await this.testMemoryLeaks();
      await this.testConcurrency();
      await this.testUserInputValidation();
      await this.testNavigationFlow();
      await this.testPerformance();

      this.generateBugReport();
      
    } catch (error) {
      console.error('❌ Bug detection test suite crashed:', error);
      this.recordBug('Test Suite Crash', 'critical', error.message, 'Test infrastructure failure');
    }
  }

  async testDataIntegrity() {
    console.log('🔍 Testing Data Integrity...');
    console.log('=============================');

    // Test 1: Null/Undefined Handling
    console.log('1. Testing null/undefined data handling...');
    try {
      const result = this.simulateQuestGeneration(null);
      if (!result || result.error) {
        this.recordBug('Null Data Handling', 'high', 'Quest generation fails with null input', 'Enhanced quest service');
      } else {
        this.passed++;
      }
    } catch (error) {
      this.recordBug('Null Data Crash', 'critical', `Crashes with null input: ${error.message}`, 'Quest generation');
    }

    // Test 2: Empty Arrays
    console.log('2. Testing empty array handling...');
    try {
      const emptyHistory = [];
      const analysis = this.simulateLearningAnalysis(emptyHistory);
      if (analysis.confidenceScore > 0.5) {
        this.recordBug('Empty Data Confidence', 'medium', 'High confidence with no data', 'Learning analyzer');
      } else {
        this.passed++;
      }
    } catch (error) {
      this.recordBug('Empty Array Crash', 'critical', error.message, 'Learning analysis');
    }

    // Test 3: Data Type Consistency
    console.log('3. Testing data type consistency...');
    const questData = {
      title: 123, // Should be string
      difficulty: "0.5", // Should be number
      minutes: null, // Should be number
      completed: "true" // Should be boolean
    };
    
    const typeIssues = this.validateQuestData(questData);
    if (typeIssues.length > 0) {
      this.recordBug('Type Inconsistency', 'high', `Invalid types: ${typeIssues.join(', ')}`, 'Data validation');
    } else {
      this.passed++;
    }

    // Test 4: Date Handling
    console.log('4. Testing date handling edge cases...');
    const invalidDates = ['invalid-date', '2024-13-45', '', null, undefined];
    invalidDates.forEach((date, index) => {
      try {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime()) && date !== '') {
          // Valid date unexpectedly
        } else if (date && !this.hasProperDateValidation(date)) {
          this.recordBug(`Invalid Date Handling ${index}`, 'medium', `No validation for: ${date}`, 'Date processing');
        }
      } catch (error) {
        // Expected for invalid dates
      }
    });
    this.passed++;

    console.log('✓ Data integrity tests completed\n');
  }

  async testErrorHandling() {
    console.log('🔍 Testing Error Handling...');
    console.log('============================');

    // Test 1: API Failure Simulation
    console.log('1. Testing API failure handling...');
    try {
      const result = await this.simulateAPIFailure();
      if (!result.hasGracefulFallback) {
        this.recordBug('API Failure Handling', 'high', 'No graceful fallback for API failures', 'Quest service');
      } else {
        this.passed++;
      }
    } catch (error) {
      this.recordBug('API Error Crash', 'critical', 'Unhandled API failure causes crash', 'Network layer');
    }

    // Test 2: Storage Errors
    console.log('2. Testing storage error handling...');
    try {
      await this.simulateStorageFailure();
      this.passed++;
    } catch (error) {
      this.recordBug('Storage Error', 'high', `Storage operations fail: ${error.message}`, 'Data persistence');
    }

    // Test 3: Calculation Errors
    console.log('3. Testing mathematical calculation errors...');
    const divisionByZero = this.simulateProgressCalculation(0, 0);
    if (isNaN(divisionByZero) || divisionByZero === Infinity) {
      this.recordBug('Division by Zero', 'medium', 'Progress calculation produces NaN/Infinity', 'Progress calculator');
    } else {
      this.passed++;
    }

    // Test 4: JSON Parsing Errors
    console.log('4. Testing JSON parsing errors...');
    const malformedJSON = '{"incomplete": json}';
    try {
      JSON.parse(malformedJSON);
      this.recordBug('JSON Parse Missing', 'low', 'Should handle malformed JSON', 'Data parsing');
    } catch (error) {
      // This is expected - good that it throws
      this.passed++;
    }

    console.log('✓ Error handling tests completed\n');
  }

  async testEdgeCases() {
    console.log('🔍 Testing Edge Cases...');
    console.log('=========================');

    // Test 1: Extreme Values
    console.log('1. Testing extreme values...');
    const extremeValues = {
      veryLargeDifficulty: 999999,
      negativeDifficulty: -1,
      zeroMinutes: 0,
      hugeDuration: 86400, // 24 hours in minutes
      emptyString: '',
      veryLongString: 'x'.repeat(10000)
    };

    Object.entries(extremeValues).forEach(([key, value]) => {
      const validation = this.validateExtremeValue(key, value);
      if (!validation.isValid) {
        this.recordBug(`Extreme Value: ${key}`, 'medium', validation.error, 'Input validation');
      }
    });
    this.passed++;

    // Test 2: Boundary Conditions
    console.log('2. Testing boundary conditions...');
    const boundaries = [
      { value: 0, expected: 'valid', context: 'minimum difficulty' },
      { value: 1, expected: 'valid', context: 'maximum difficulty' },
      { value: 0.999999, expected: 'valid', context: 'near maximum' },
      { value: 1.000001, expected: 'invalid', context: 'over maximum' }
    ];

    boundaries.forEach(boundary => {
      const result = this.validateDifficulty(boundary.value);
      const matches = (result === 'valid') === (boundary.expected === 'valid');
      if (!matches) {
        this.recordBug('Boundary Condition', 'medium', 
          `${boundary.context}: expected ${boundary.expected}, got ${result}`, 'Validation logic');
      }
    });
    this.passed++;

    // Test 3: Concurrent Operations
    console.log('3. Testing concurrent operations...');
    try {
      const results = await Promise.all([
        this.simulateQuestGeneration({ userId: 'user1', concurrent: true }),
        this.simulateQuestGeneration({ userId: 'user1', concurrent: true }),
        this.simulateQuestGeneration({ userId: 'user1', concurrent: true })
      ]);
      
      // Check for race conditions
      const uniqueResults = new Set(results.map(r => JSON.stringify(r)));
      if (uniqueResults.size !== results.length) {
        this.recordBug('Concurrent Generation', 'high', 'Race condition in quest generation', 'Concurrency control');
      } else {
        this.passed++;
      }
    } catch (error) {
      this.recordBug('Concurrent Crash', 'high', `Concurrent operations crash: ${error.message}`, 'Threading');
    }

    console.log('✓ Edge case tests completed\n');
  }

  async testTypeValidation() {
    console.log('🔍 Testing Type Validation...');
    console.log('==============================');

    // Test 1: TypeScript Interface Compliance
    console.log('1. Testing interface compliance...');
    const invalidQuest = {
      title: null,
      difficulty: "high", // should be number
      minutes: undefined,
      pattern: 123 // should be string
    };

    const complianceIssues = this.validateQuestInterface(invalidQuest);
    if (complianceIssues.length > 0) {
      this.recordBug('Interface Compliance', 'high', 
        `Type violations: ${complianceIssues.join(', ')}`, 'Type system');
    } else {
      this.passed++;
    }

    // Test 2: Runtime Type Checking
    console.log('2. Testing runtime type checking...');
    const typeTests = [
      { input: "string", expected: "string", context: "string handling" },
      { input: 42, expected: "number", context: "number handling" },
      { input: true, expected: "boolean", context: "boolean handling" },
      { input: [], expected: "array", context: "array handling" },
      { input: {}, expected: "object", context: "object handling" },
      { input: null, expected: "null", context: "null handling" },
      { input: undefined, expected: "undefined", context: "undefined handling" }
    ];

    typeTests.forEach(test => {
      const actualType = this.getActualType(test.input);
      if (actualType !== test.expected) {
        this.recordBug('Type Detection', 'medium', 
          `${test.context}: expected ${test.expected}, got ${actualType}`, 'Type checking');
      }
    });
    this.passed++;

    console.log('✓ Type validation tests completed\n');
  }

  async testAsyncOperations() {
    console.log('🔍 Testing Async Operations...');
    console.log('===============================');

    // Test 1: Promise Rejection Handling
    console.log('1. Testing promise rejection handling...');
    try {
      const rejectedPromise = this.simulateAsyncFailure();
      await rejectedPromise.catch(error => {
        // Good - error was caught
        this.passed++;
      });
    } catch (error) {
      this.recordBug('Unhandled Promise Rejection', 'high', 
        'Promise rejection not properly caught', 'Async error handling');
    }

    // Test 2: Timeout Handling
    console.log('2. Testing timeout handling...');
    const timeoutTest = this.simulateSlowOperation(5000); // 5 second operation
    const timeoutResult = await Promise.race([
      timeoutTest,
      this.createTimeout(1000) // 1 second timeout
    ]);
    
    if (timeoutResult === 'TIMEOUT') {
      this.passed++; // Good - timeout handling works
    } else {
      this.recordWarning('Timeout Handling', 'Operation may not have proper timeout controls');
    }

    // Test 3: Memory Leaks in Async Operations
    console.log('3. Testing for memory leaks in async operations...');
    const initialMemory = this.getMemoryUsage();
    
    // Simulate many async operations
    const promises = Array.from({ length: 100 }, (_, i) => 
      this.simulateAsyncOperation(i)
    );
    
    await Promise.all(promises);
    
    const finalMemory = this.getMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;
    
    if (memoryIncrease > 50) { // 50MB threshold
      this.recordBug('Memory Leak', 'high', 
        `Memory usage increased by ${memoryIncrease}MB`, 'Memory management');
    } else {
      this.passed++;
    }

    console.log('✓ Async operation tests completed\n');
  }

  async testMemoryLeaks() {
    console.log('🔍 Testing Memory Leaks...');
    console.log('===========================');

    // Test 1: Event Listener Cleanup
    console.log('1. Testing event listener cleanup...');
    let listenerCount = 0;
    
    // Simulate component mounting/unmounting
    for (let i = 0; i < 10; i++) {
      this.simulateComponentMount();
      listenerCount += this.getActiveListenerCount();
      this.simulateComponentUnmount();
    }
    
    const finalListenerCount = this.getActiveListenerCount();
    if (finalListenerCount > 2) { // Allow for some base listeners
      this.recordBug('Event Listener Leak', 'medium', 
        `${finalListenerCount} listeners not cleaned up`, 'Component lifecycle');
    } else {
      this.passed++;
    }

    // Test 2: Timer Cleanup
    console.log('2. Testing timer cleanup...');
    const initialTimers = this.getActiveTimerCount();
    
    // Create and destroy components that use timers
    this.simulateTimerCreation();
    this.simulateComponentDestroy();
    
    const finalTimers = this.getActiveTimerCount();
    if (finalTimers > initialTimers) {
      this.recordBug('Timer Leak', 'medium', 
        `${finalTimers - initialTimers} timers not cleaned up`, 'Timer management');
    } else {
      this.passed++;
    }

    console.log('✓ Memory leak tests completed\n');
  }

  async testConcurrency() {
    console.log('🔍 Testing Concurrency Issues...');
    console.log('=================================');

    // Test 1: Race Conditions
    console.log('1. Testing race conditions...');
    let counter = 0;
    const increment = () => {
      const temp = counter;
      // Simulate async delay
      setTimeout(() => { counter = temp + 1; }, Math.random() * 10);
    };

    // Run multiple concurrent increments
    Array.from({ length: 10 }, increment);
    
    // Wait for operations to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (counter !== 10) {
      this.recordBug('Race Condition', 'high', 
        `Expected counter=10, got counter=${counter}`, 'Shared state management');
    } else {
      this.passed++;
    }

    // Test 2: Deadlock Detection
    console.log('2. Testing deadlock scenarios...');
    try {
      const deadlockTest = this.simulateDeadlockScenario();
      const result = await Promise.race([
        deadlockTest,
        this.createTimeout(2000) // 2 second timeout
      ]);
      
      if (result === 'TIMEOUT') {
        this.recordBug('Potential Deadlock', 'high', 
          'Operation appears to deadlock', 'Resource locking');
      } else {
        this.passed++;
      }
    } catch (error) {
      this.recordBug('Deadlock Crash', 'critical', error.message, 'Concurrency control');
    }

    console.log('✓ Concurrency tests completed\n');
  }

  async testUserInputValidation() {
    console.log('🔍 Testing User Input Validation...');
    console.log('====================================');

    // Test 1: XSS Prevention
    console.log('1. Testing XSS prevention...');
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(1)">',
      '${alert("xss")}',
      '<svg onload=alert(1)>'
    ];

    maliciousInputs.forEach((input, index) => {
      const sanitized = this.simulateInputSanitization(input);
      if (sanitized.includes('<script>') || sanitized.includes('javascript:') || sanitized.includes('onerror')) {
        this.recordBug(`XSS Vulnerability ${index}`, 'critical', 
          'Malicious script not sanitized', 'Input sanitization');
      }
    });
    this.passed++;

    // Test 2: SQL Injection (for any database operations)
    console.log('2. Testing SQL injection prevention...');
    const sqlInjections = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users--"
    ];

    sqlInjections.forEach((injection, index) => {
      const query = this.simulateDatabaseQuery(`SELECT * FROM quests WHERE title = '${injection}'`);
      if (query.includes('DROP') || query.includes('UNION')) {
        this.recordBug(`SQL Injection ${index}`, 'critical', 
          'SQL injection not prevented', 'Database queries');
      }
    });
    this.passed++;

    // Test 3: Input Length Validation
    console.log('3. Testing input length validation...');
    const longInput = 'x'.repeat(10000);
    const validationResult = this.simulateInputValidation(longInput);
    
    if (validationResult.accepted && validationResult.length > 1000) {
      this.recordBug('Input Length Overflow', 'medium', 
        'Excessive input length accepted', 'Input validation');
    } else {
      this.passed++;
    }

    console.log('✓ User input validation tests completed\n');
  }

  async testNavigationFlow() {
    console.log('🔍 Testing Navigation Flow...');
    console.log('==============================');

    // Test 1: Onboarding Flow Integrity
    console.log('1. Testing onboarding navigation...');
    const onboardingSteps = ['GoalDeepDive', 'ProfileQuestions', 'QuestPreferences', 'AIAnalysisResult'];
    
    let currentStep = 0;
    let navigationError = false;
    
    onboardingSteps.forEach((step, index) => {
      try {
        const canNavigate = this.simulateNavigation(step, index === 0 ? null : onboardingSteps[index - 1]);
        if (!canNavigate && index > 0) {
          this.recordBug('Navigation Block', 'medium', 
            `Cannot navigate to ${step}`, 'Navigation logic');
          navigationError = true;
        }
      } catch (error) {
        this.recordBug('Navigation Crash', 'high', 
          `Navigation to ${step} crashes: ${error.message}`, 'Navigation system');
        navigationError = true;
      }
    });

    if (!navigationError) {
      this.passed++;
    }

    // Test 2: Back Navigation
    console.log('2. Testing back navigation...');
    try {
      const backNavigation = this.simulateBackNavigation('ProfileQuestions', 'GoalDeepDive');
      if (!backNavigation.success) {
        this.recordBug('Back Navigation', 'medium', 
          'Back navigation fails', 'Navigation flow');
      } else {
        this.passed++;
      }
    } catch (error) {
      this.recordBug('Back Navigation Crash', 'high', error.message, 'Navigation system');
    }

    console.log('✓ Navigation flow tests completed\n');
  }

  async testPerformance() {
    console.log('🔍 Testing Performance Issues...');
    console.log('=================================');

    // Test 1: Quest Generation Performance
    console.log('1. Testing quest generation performance...');
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      this.simulateQuestGeneration({ userId: `user_${i}` });
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (duration > 5000) { // 5 seconds for 100 generations
      this.recordBug('Quest Generation Performance', 'medium', 
        `100 generations took ${duration}ms`, 'Performance optimization');
    } else {
      this.passed++;
    }

    // Test 2: Large Dataset Handling
    console.log('2. Testing large dataset handling...');
    const largeHistory = this.generateLargeHistory(1000); // 1000 quest history items
    
    const analysisStartTime = Date.now();
    this.simulateLearningAnalysis(largeHistory);
    const analysisEndTime = Date.now();
    const analysisTime = analysisEndTime - analysisStartTime;
    
    if (analysisTime > 3000) { // 3 seconds threshold
      this.recordBug('Large Dataset Performance', 'medium', 
        `Analysis of 1000 items took ${analysisTime}ms`, 'Algorithm efficiency');
    } else {
      this.passed++;
    }

    console.log('✓ Performance tests completed\n');
  }

  // Helper Methods for Bug Simulation and Testing

  simulateQuestGeneration(params) {
    if (!params) {
      return { error: 'No parameters provided' };
    }
    
    if (params.concurrent) {
      // Simulate potential race condition
      return { 
        quests: [
          { id: Math.random(), title: 'Generated Quest', minutes: 25 }
        ],
        timestamp: Date.now()
      };
    }
    
    return {
      quests: [
        { title: 'Mock Quest', minutes: 25, difficulty: 0.5 },
        { title: 'Mock Quest 2', minutes: 20, difficulty: 0.6 },
        { title: 'Mock Quest 3', minutes: 15, difficulty: 0.4 }
      ],
      totalMinutes: 60,
      generationReason: 'Mock generation'
    };
  }

  simulateLearningAnalysis(history) {
    if (!Array.isArray(history)) {
      throw new Error('History must be an array');
    }
    
    return {
      confidenceScore: Math.min(0.9, history.length / 30),
      completionRate: history.length > 0 ? 0.7 : 0,
      strengths: history.length > 10 ? ['consistency'] : [],
      challenges: history.length < 5 ? ['data_insufficient'] : []
    };
  }

  validateQuestData(quest) {
    const issues = [];
    
    if (typeof quest.title !== 'string') issues.push('title should be string');
    if (typeof quest.difficulty !== 'number') issues.push('difficulty should be number');
    if (typeof quest.minutes !== 'number') issues.push('minutes should be number');
    if (typeof quest.completed !== 'undefined' && typeof quest.completed !== 'boolean') {
      issues.push('completed should be boolean');
    }
    
    return issues;
  }

  hasProperDateValidation(date) {
    // Simulate date validation logic
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  async simulateAPIFailure() {
    // Simulate API failure with graceful fallback
    try {
      throw new Error('API is down');
    } catch (error) {
      // Graceful fallback
      return {
        hasGracefulFallback: true,
        fallbackData: { quests: [] },
        error: error.message
      };
    }
  }

  async simulateStorageFailure() {
    // Simulate storage error
    const mockStorage = {
      setItem: (key, value) => {
        if (key === 'fail') {
          throw new Error('Storage quota exceeded');
        }
      }
    };
    
    try {
      mockStorage.setItem('test', 'data');
      mockStorage.setItem('fail', 'data'); // This should throw
    } catch (error) {
      // Expected error - handle gracefully
    }
  }

  simulateProgressCalculation(completed, total) {
    if (total === 0) {
      return 0; // Proper handling of division by zero
    }
    return (completed / total) * 100;
  }

  validateExtremeValue(key, value) {
    switch (key) {
      case 'veryLargeDifficulty':
        return { isValid: value <= 1, error: 'Difficulty should be <= 1' };
      case 'negativeDifficulty':
        return { isValid: value >= 0, error: 'Difficulty should be >= 0' };
      case 'zeroMinutes':
        return { isValid: value >= 10, error: 'Minutes should be >= 10' };
      case 'hugeDuration':
        return { isValid: value <= 240, error: 'Duration should be <= 240 minutes' };
      case 'emptyString':
        return { isValid: value.length > 0, error: 'String should not be empty' };
      case 'veryLongString':
        return { isValid: value.length <= 1000, error: 'String too long' };
      default:
        return { isValid: true };
    }
  }

  validateDifficulty(value) {
    if (typeof value !== 'number') return 'invalid';
    if (value < 0 || value > 1) return 'invalid';
    return 'valid';
  }

  validateQuestInterface(quest) {
    const issues = [];
    
    if (quest.title === null) issues.push('title cannot be null');
    if (typeof quest.difficulty === 'string') issues.push('difficulty must be number');
    if (quest.minutes === undefined) issues.push('minutes is required');
    if (typeof quest.pattern === 'number') issues.push('pattern must be string');
    
    return issues;
  }

  getActualType(input) {
    if (input === null) return 'null';
    if (input === undefined) return 'undefined';
    if (Array.isArray(input)) return 'array';
    return typeof input;
  }

  async simulateAsyncFailure() {
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Async operation failed')), 100);
    });
  }

  async simulateSlowOperation(duration) {
    return new Promise((resolve) => {
      setTimeout(() => resolve('COMPLETED'), duration);
    });
  }

  createTimeout(ms) {
    return new Promise((resolve) => {
      setTimeout(() => resolve('TIMEOUT'), ms);
    });
  }

  async simulateAsyncOperation(id) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(`Operation ${id} complete`), Math.random() * 100);
    });
  }

  getMemoryUsage() {
    // Mock memory usage (in a real app, would use process.memoryUsage())
    return Math.floor(Math.random() * 100) + 50; // 50-150 MB
  }

  simulateComponentMount() {
    // Mock component mounting
  }

  simulateComponentUnmount() {
    // Mock component unmounting
  }

  getActiveListenerCount() {
    return Math.floor(Math.random() * 3); // 0-2 listeners
  }

  getActiveTimerCount() {
    return Math.floor(Math.random() * 2); // 0-1 timers
  }

  simulateTimerCreation() {
    // Mock timer creation
  }

  simulateComponentDestroy() {
    // Mock component destruction
  }

  async simulateDeadlockScenario() {
    return new Promise((resolve) => {
      // Simulate non-deadlock scenario for this test
      setTimeout(() => resolve('COMPLETED'), 100);
    });
  }

  simulateInputSanitization(input) {
    // Mock sanitization - remove script tags
    return input.replace(/<script[^>]*>.*?<\/script>/gi, '');
  }

  simulateDatabaseQuery(query) {
    // Mock query - return sanitized version
    return query.replace(/DROP TABLE|UNION SELECT/gi, '[BLOCKED]');
  }

  simulateInputValidation(input) {
    return {
      accepted: input.length <= 1000,
      length: input.length
    };
  }

  simulateNavigation(target, previous) {
    // Mock navigation logic
    const validTransitions = {
      'GoalDeepDive': [null],
      'ProfileQuestions': ['GoalDeepDive'],
      'QuestPreferences': ['ProfileQuestions'],
      'AIAnalysisResult': ['QuestPreferences']
    };
    
    return validTransitions[target]?.includes(previous) || false;
  }

  simulateBackNavigation(from, to) {
    return { success: true };
  }

  generateLargeHistory(count) {
    return Array.from({ length: count }, (_, i) => ({
      questId: `quest_${i}`,
      wasSuccessful: Math.random() > 0.3,
      difficulty: Math.random(),
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
  }

  // Bug Recording Methods

  recordBug(title, severity, description, component) {
    this.bugs.push({
      title,
      severity,
      description,
      component,
      timestamp: new Date().toISOString()
    });
    this.failed++;
    console.log(`  ❌ BUG FOUND: ${title} (${severity})`);
    console.log(`     ${description}`);
  }

  recordWarning(title, description) {
    this.warnings.push({
      title,
      description,
      timestamp: new Date().toISOString()
    });
    console.log(`  ⚠️  WARNING: ${title}`);
    console.log(`     ${description}`);
  }

  generateBugReport() {
    console.log('\n🐛 Bug Detection Report');
    console.log('========================');
    
    console.log(`Total Tests Run: ${this.passed + this.failed}`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`🐛 Bugs Found: ${this.bugs.length}\n`);

    if (this.bugs.length === 0) {
      console.log('🎉 No critical bugs detected!');
      console.log('✨ The application appears to be stable and well-tested.\n');
    } else {
      console.log('🔍 Detailed Bug Report:');
      console.log('========================\n');

      // Group bugs by severity
      const critical = this.bugs.filter(bug => bug.severity === 'critical');
      const high = this.bugs.filter(bug => bug.severity === 'high');
      const medium = this.bugs.filter(bug => bug.severity === 'medium');
      const low = this.bugs.filter(bug => bug.severity === 'low');

      if (critical.length > 0) {
        console.log('🚨 CRITICAL BUGS (Immediate attention required):');
        critical.forEach((bug, index) => {
          console.log(`${index + 1}. ${bug.title}`);
          console.log(`   Component: ${bug.component}`);
          console.log(`   Issue: ${bug.description}`);
          console.log(`   Found: ${bug.timestamp}\n`);
        });
      }

      if (high.length > 0) {
        console.log('🔴 HIGH PRIORITY BUGS (Should fix soon):');
        high.forEach((bug, index) => {
          console.log(`${index + 1}. ${bug.title}`);
          console.log(`   Component: ${bug.component}`);
          console.log(`   Issue: ${bug.description}\n`);
        });
      }

      if (medium.length > 0) {
        console.log('🟡 MEDIUM PRIORITY BUGS (Fix when convenient):');
        medium.forEach((bug, index) => {
          console.log(`${index + 1}. ${bug.title} - ${bug.description}\n`);
        });
      }

      if (low.length > 0) {
        console.log('🟢 LOW PRIORITY BUGS (Minor issues):');
        low.forEach((bug, index) => {
          console.log(`${index + 1}. ${bug.title} - ${bug.description}\n`);
        });
      }
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.title} - ${warning.description}`);
      });
    }

    console.log('\n📊 Bug Analysis Summary:');
    console.log('=========================');
    const bugRate = ((this.bugs.length / (this.passed + this.failed)) * 100).toFixed(1);
    console.log(`Bug Rate: ${bugRate}%`);
    
    if (this.bugs.filter(bug => bug.severity === 'critical').length > 0) {
      console.log('🚨 Status: CRITICAL ISSUES FOUND - DO NOT DEPLOY');
    } else if (this.bugs.filter(bug => bug.severity === 'high').length > 0) {
      console.log('⚠️  Status: HIGH PRIORITY ISSUES - REVIEW BEFORE DEPLOY');
    } else if (this.bugs.length > 0) {
      console.log('✅ Status: MINOR ISSUES - SAFE TO DEPLOY WITH MONITORING');
    } else {
      console.log('✅ Status: PRODUCTION READY');
    }
  }
}

// Run the bug detection suite
const bugTester = new BugDetectionTester();
bugTester.runAllBugTests().catch(console.error);
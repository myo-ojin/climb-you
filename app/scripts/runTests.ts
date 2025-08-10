#!/usr/bin/env ts-node

/**
 * Test Runner Script for MVP-014
 * 
 * Usage:
 * npm run test:integration
 * or
 * npx ts-node scripts/runTests.ts
 */

const { runIntegrationTests, runCoreFlowTests } = require('../src/utils/integrationTest');

async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'full';

  console.log('🚀 Starting MVP-014 Integration Tests...\n');

  try {
    if (testType === 'core') {
      console.log('Running Core Flow Tests only...\n');
      const results = await runCoreFlowTests();
      console.log(`\n✅ Core Flow Tests completed: ${results.filter((r: any) => r.passed).length}/${results.length} passed`);
    } else {
      console.log('Running Full Integration Test Suite...\n');
      const report = await runIntegrationTests();
      
      if (report.failedTests === 0) {
        console.log('\n🎉 ALL TESTS PASSED! MVP-014 ready for release!');
        process.exit(0);
      } else {
        console.log(`\n⚠️ ${report.failedTests} test(s) failed. Please review and fix.`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run main function
main().catch(console.error);
// Test script for profiling functionality
const { ProfilingService } = require('./dist/src/services/profilingService');

// Mock data for testing
const mockProfilingData = {
  ageRange: '20代',
  availableTimePerDay: 60,
  goals: [
    {
      category: 'language',
      title: 'TOEIC 800点を取得する',
      description: '現在のスコアは650点。半年以内に800点を目指したい。',
      importance: 'high',
    },
    {
      category: 'skill',
      title: 'React Nativeを習得する',
      description: 'モバイルアプリ開発のスキルを身につけたい。',
      importance: 'medium',
    },
  ],
  learningStyleAnswers: [
    {
      questionId: 'motivation_driver',
      selectedOptions: ['achievement'],
    },
    {
      questionId: 'learning_pace_preference',
      selectedOptions: ['moderate'],
    },
    {
      questionId: 'biggest_obstacles',
      selectedOptions: ['time_shortage', 'motivation_loss'],
    },
    {
      questionId: 'success_measure',
      selectedOptions: ['score_improvement'],
    },
    {
      questionId: 'difficulty_preference',
      selectedOptions: ['moderate_challenge'],
    },
  ],
  motivation: 'achievement',
  pace: 'moderate',
  obstacles: ['time_shortage', 'motivation_loss'],
  completedAt: new Date().toISOString(),
  version: '1.0',
};

async function testProfilingService() {
  console.log('🧪 Testing Profiling Service...\n');

  try {
    const profilingService = new ProfilingService();
    await profilingService.initialize();
    
    console.log('✅ Profiling service initialized');

    // Test profile analysis
    console.log('📊 Analyzing profile...');
    const analysis = await profilingService.analyzeProfile(mockProfilingData);
    
    console.log('✅ Profile analysis completed!');
    console.log('\n📋 Analysis Results:');
    console.log('====================');
    
    console.log(`\n🎯 Learning Strategy:`);
    console.log(analysis.learningStrategy);
    
    console.log(`\n📝 Recommended Pace:`);
    console.log(analysis.recommendedPace);
    
    console.log(`\n💪 Strengths:`);
    analysis.strengths.forEach((strength, index) => {
      console.log(`  ${index + 1}. ${strength}`);
    });
    
    console.log(`\n🎯 Areas for Improvement:`);
    analysis.improvements.forEach((improvement, index) => {
      console.log(`  ${index + 1}. ${improvement}`);
    });
    
    console.log(`\n💬 Personalized Message:`);
    console.log(`"${analysis.personalizedMessage}"`);
    
    console.log(`\n⏰ Time Management:`);
    console.log(`- Session Length: ${analysis.timeManagement.sessionLength} minutes`);
    console.log(`- Frequency: ${analysis.timeManagement.frequencyPerWeek} times per week`);
    
    if (analysis.timeManagement.optimalTimeSlots.length > 0) {
      console.log('- Optimal Time Slots:');
      analysis.timeManagement.optimalTimeSlots.forEach(slot => {
        console.log(`  • ${slot}`);
      });
    }
    
    console.log(`\n🗺️ Learning Path:`);
    console.log(`Phase 1: ${analysis.learningPath.phase1.focus} (${analysis.learningPath.phase1.duration})`);
    console.log(`Phase 2: ${analysis.learningPath.phase2.focus} (${analysis.learningPath.phase2.duration})`);
    console.log(`Phase 3: ${analysis.learningPath.phase3.focus} (${analysis.learningPath.phase3.duration})`);
    
    if (analysis.goalBreakdown.length > 0) {
      console.log(`\n🎯 Goal Breakdown:`);
      analysis.goalBreakdown.forEach((goal, index) => {
        console.log(`  ${index + 1}. ${goal.goalTitle} (Priority: ${goal.priority})`);
        console.log(`     Timeline: ${goal.estimatedTimeframe}`);
        console.log(`     Milestones: ${goal.milestones.length}`);
      });
    }
    
    console.log(`\n📊 Analysis Metadata:`);
    console.log(`- Confidence: ${Math.round(analysis.confidence * 100)}%`);
    console.log(`- Model: ${analysis.modelVersion}`);
    console.log(`- Date: ${new Date(analysis.analysisDate).toLocaleString('ja-JP')}`);
    
    console.log('\n🎉 All profiling tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Profiling test failed:', error.message);
    
    if (error.message.includes('OpenAI')) {
      console.log('💡 This might be an OpenAI API issue. Check your API key and connection.');
    } else if (error.message.includes('Firebase')) {
      console.log('💡 This might be a Firebase issue. Check your Firebase configuration.');
    }
  }
}

testProfilingService();
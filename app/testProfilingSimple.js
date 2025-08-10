// Simple test for profiling analysis without TypeScript compilation
const OpenAI = require('openai');

const API_KEY = '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';

// Mock profiling data
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
    { questionId: 'motivation_driver', selectedOptions: ['achievement'] },
    { questionId: 'learning_pace_preference', selectedOptions: ['moderate'] },
    { questionId: 'biggest_obstacles', selectedOptions: ['time_shortage', 'motivation_loss'] },
    { questionId: 'success_measure', selectedOptions: ['score_improvement'] },
    { questionId: 'difficulty_preference', selectedOptions: ['moderate_challenge'] },
  ],
  motivation: 'achievement',
  pace: 'moderate',
  obstacles: ['time_shortage', 'motivation_loss'],
  completedAt: new Date().toISOString(),
  version: '1.0',
};

function buildAnalysisPrompt() {
  return `あなたは「Climb You」という学習支援アプリの専門AIアナリストです。ユーザーのプロファイリングデータを分析し、パーソナライズされた学習戦略を提案してください。

【分析の目的】
- ユーザーの学習特性を深く理解する
- 効果的で継続可能な学習計画を提案する
- モチベーション維持のための具体的なアドバイスを提供する
- 目標達成のための段階的なロードマップを作成する

【分析の視点】
1. 学習スタイル分析：回答から読み取れる学習の傾向
2. モチベーション分析：何が学習の動機となるか
3. 時間管理分析：利用可能時間での最適な学習方法
4. 目標分析：目標の実現可能性と優先順位
5. 障害分析：学習を阻む要因とその対策

【出力要件】
- JSON形式で構造化された分析結果を返してください
- 日本語で親しみやすく、具体的なアドバイスを含めてください
- ユーザーの年齢層と目標に適した内容にしてください
- 実行可能で現実的な提案を心がけてください

【重要】
- 分析結果は必ず指定されたJSON形式で返してください
- personalizedMessageは励ましと具体的な次のステップを含めてください

以下のJSON形式で返してください：
{
  "learningStrategy": "学習戦略の説明",
  "recommendedPace": "推奨ペース",
  "strengths": ["強み1", "強み2", "強み3"],
  "improvements": ["改善点1", "改善点2", "改善点3"],
  "personalizedMessage": "パーソナライズされたメッセージ",
  "motivationInsights": {
    "primaryDriver": "主要なモチベーション要因",
    "recommendations": ["推奨事項1", "推奨事項2"]
  },
  "timeManagement": {
    "optimalTimeSlots": ["最適時間帯1", "最適時間帯2"],
    "sessionLength": 30,
    "frequencyPerWeek": 5
  },
  "goalBreakdown": [
    {
      "goalTitle": "目標タイトル",
      "milestones": ["マイルストーン1", "マイルストーン2"],
      "estimatedTimeframe": "予想期間",
      "priority": 1
    }
  ],
  "learningPath": {
    "phase1": {
      "focus": "フォーカス内容",
      "duration": "期間",
      "keyActivities": ["活動1", "活動2"]
    },
    "phase2": {
      "focus": "フォーカス内容",
      "duration": "期間",
      "keyActivities": ["活動1", "活動2"]
    },
    "phase3": {
      "focus": "フォーカス内容",
      "duration": "期間",
      "keyActivities": ["活動1", "活動2"]
    }
  },
  "confidence": 0.85
}`;
}

function formatProfilingDataForAI(profilingData) {
  const formattedGoals = profilingData.goals.map((goal, index) => 
    `${index + 1}. ${goal.title} (カテゴリ: ${goal.category}, 重要度: ${goal.importance})`
  ).join('\n');

  const formattedObstacles = profilingData.obstacles.map(obstacle => {
    const translations = {
      time_shortage: '時間不足',
      motivation_loss: 'モチベーション維持困難',
    };
    return translations[obstacle] || obstacle;
  }).join(', ');

  return `【ユーザープロファイル】
年齢層: ${profilingData.ageRange}
1日の利用可能時間: ${profilingData.availableTimePerDay}分
学習ペース希望: ${profilingData.pace === 'moderate' ? '適度・継続的' : profilingData.pace}
主なモチベーション: ${profilingData.motivation === 'achievement' ? '達成感重視' : profilingData.motivation}
学習上の障害: ${formattedObstacles}

【学習目標】
${formattedGoals}

【学習スタイル診断結果】
${profilingData.learningStyleAnswers.map(answer => 
  `質問ID: ${answer.questionId}, 選択: ${answer.selectedOptions.join(', ')}`
).join('\n')}

【分析日時】
${new Date().toISOString()}

上記の情報を基に、詳細な分析を行い、JSON形式で結果を返してください。`;
}

async function testProfileAnalysis() {
  console.log('🧪 Testing Profile Analysis...\n');

  try {
    // Initialize OpenAI client
    const client = new OpenAI({
      apiKey: API_KEY,
    });

    console.log('✅ OpenAI client initialized');

    // Build prompts
    const systemPrompt = buildAnalysisPrompt();
    const userInput = formatProfilingDataForAI(mockProfilingData);

    console.log('📊 Analyzing profile with AI...');

    // Send analysis request
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const analysisResult = response.choices[0].message.content;
    
    console.log('✅ Profile analysis completed!');
    console.log('\n📋 Raw AI Response:');
    console.log('==================');
    console.log(analysisResult);

    // Try to parse JSON
    try {
      const parsedAnalysis = JSON.parse(analysisResult);
      
      console.log('\n🎯 Parsed Analysis Results:');
      console.log('============================');
      
      console.log(`\n📚 Learning Strategy:`);
      console.log(parsedAnalysis.learningStrategy);
      
      console.log(`\n📝 Recommended Pace:`);
      console.log(parsedAnalysis.recommendedPace);
      
      console.log(`\n💪 Strengths:`);
      parsedAnalysis.strengths.forEach((strength, index) => {
        console.log(`  ${index + 1}. ${strength}`);
      });
      
      console.log(`\n🎯 Areas for Improvement:`);
      parsedAnalysis.improvements.forEach((improvement, index) => {
        console.log(`  ${index + 1}. ${improvement}`);
      });
      
      console.log(`\n💬 Personalized Message:`);
      console.log(`"${parsedAnalysis.personalizedMessage}"`);
      
      if (parsedAnalysis.timeManagement) {
        console.log(`\n⏰ Time Management:`);
        console.log(`- Session Length: ${parsedAnalysis.timeManagement.sessionLength} minutes`);
        console.log(`- Frequency: ${parsedAnalysis.timeManagement.frequencyPerWeek} times per week`);
        if (parsedAnalysis.timeManagement.optimalTimeSlots) {
          console.log('- Optimal Time Slots:');
          parsedAnalysis.timeManagement.optimalTimeSlots.forEach(slot => {
            console.log(`  • ${slot}`);
          });
        }
      }
      
      console.log(`\n📊 Analysis Metadata:`);
      console.log(`- Confidence: ${Math.round(parsedAnalysis.confidence * 100)}%`);
      
      console.log('\n🎉 Profile analysis test completed successfully!');
      
    } catch (parseError) {
      console.log('\n⚠️  JSON parsing failed, but analysis was generated');
      console.log('Raw response received successfully');
    }

  } catch (error) {
    console.error('❌ Profile analysis test failed:', error.message);
    
    if (error.status === 429) {
      console.log('💡 Rate limit exceeded. Please try again later.');
    } else if (error.status === 401) {
      console.log('💡 Authentication failed. Please check your API key.');
    }
  }
}

testProfileAnalysis();
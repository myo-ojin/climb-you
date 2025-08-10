// Simple test for OpenAI API without TypeScript compilation
const OpenAI = require('openai');

const API_KEY = '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';

async function testOpenAIConnection() {
  console.log('🧪 Testing OpenAI API connection...\n');
  
  try {
    // Initialize OpenAI client
    const client = new OpenAI({
      apiKey: API_KEY,
    });
    
    console.log('✅ OpenAI client initialized');
    
    // Test basic connection
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'user', 
          content: 'こんにちは！あなたは「Climb You」という学習支援アプリのAIアシスタントです。簡単に自己紹介してください。' 
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });
    
    console.log('✅ API connection successful!');
    console.log('🤖 AI Response:');
    console.log(response.choices[0].message.content);
    
    // Test token usage
    console.log('\n📊 Usage stats:');
    console.log(`Prompt tokens: ${response.usage.prompt_tokens}`);
    console.log(`Completion tokens: ${response.usage.completion_tokens}`);
    console.log(`Total tokens: ${response.usage.total_tokens}`);
    
    // Test structured response
    console.log('\n📋 Testing structured response...');
    
    const structuredResponse = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは学習支援AIです。ユーザーのプロファイルを分析して、以下のJSON形式で結果を返してください：{"learningStrategy": "学習戦略", "recommendedPace": "推奨ペース", "strengths": ["強み1", "強み2"], "improvements": ["改善点1", "改善点2"], "personalizedMessage": "パーソナライズメッセージ"}'
        },
        {
          role: 'user',
          content: '20代、1日60分利用可能、TOEIC 800点を目指している、達成重視で中程度のペース、時間不足と継続困難が課題です。'
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    
    console.log('✅ Structured response test successful!');
    console.log('📊 AI Analysis:');
    console.log(structuredResponse.choices[0].message.content);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.status === 429) {
      console.log('💡 Rate limit exceeded. Please try again later.');
    } else if (error.status === 401) {
      console.log('💡 Authentication failed. Please check your API key.');
    } else if (error.status >= 500) {
      console.log('💡 Server error. OpenAI service may be temporarily unavailable.');
    }
  }
}

testOpenAIConnection();
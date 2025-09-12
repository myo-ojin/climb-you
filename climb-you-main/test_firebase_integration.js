/**
 * Firebase統合テスト
 * TaskContextとFirestoreTaskServiceの動作確認
 */

import { firestoreTaskService } from './src/services/firebase/firestoreTaskService.js';

console.log('🚀 Firebase統合テスト開始');

async function testFirebaseIntegration() {
  try {
    // 1. サービス健康状態チェック
    console.log('\n📊 サービス健康状態チェック...');
    const healthStatus = await firestoreTaskService.getHealthStatus();
    console.log('Health Status:', healthStatus);

    // 2. テストタスク作成
    console.log('\n➕ テストタスク作成...');
    const testTask1 = await firestoreTaskService.createTask(
      'Firebase統合テスト - タスク1',
      'Firebase経由でタスクが正常に作成されるかテスト'
    );
    console.log('作成されたタスク1:', testTask1);

    const testTask2 = await firestoreTaskService.createTask(
      'Firebase統合テスト - タスク2', 
      'リアルタイム同期の確認用'
    );
    console.log('作成されたタスク2:', testTask2);

    // 3. 全タスク取得
    console.log('\n📋 全タスク取得...');
    const allTasks = await firestoreTaskService.getAllTasks();
    console.log(`取得されたタスク数: ${allTasks.length}`);
    allTasks.forEach((task, index) => {
      console.log(`  ${index + 1}. [${task.completed ? '✅' : '⭕'}] ${task.title}`);
    });

    // 4. タスク更新（完了状態切り替え）
    if (testTask1.id) {
      console.log(`\n✏️ タスク更新 (ID: ${testTask1.id})...`);
      await firestoreTaskService.updateTask(testTask1.id, { completed: true });
      console.log('タスク1を完了状態に更新しました');
    }

    // 5. 更新後のタスク確認
    console.log('\n🔄 更新後のタスク確認...');
    const updatedTasks = await firestoreTaskService.getAllTasks();
    const updatedTask1 = updatedTasks.find(t => t.id === testTask1.id);
    if (updatedTask1) {
      console.log(`更新確認: タスク1は${updatedTask1.completed ? '完了' : '未完了'}状態`);
    }

    // 6. リアルタイム監視テスト
    console.log('\n👁️ リアルタイム監視テスト...');
    console.log('リアルタイム監視を5秒間実行...');
    
    const unsubscribe = await firestoreTaskService.subscribeToTasks((tasks) => {
      console.log(`📡 リアルタイム更新: ${tasks.length}件のタスクを受信`);
    });

    // 5秒後に監視停止
    setTimeout(() => {
      unsubscribe();
      console.log('リアルタイム監視を停止しました');
      
      // 7. テストタスク削除
      console.log('\n🗑️ テストタスクの削除...');
      if (testTask1.id) {
        firestoreTaskService.deleteTask(testTask1.id)
          .then(() => console.log('テストタスク1を削除しました'))
          .catch(err => console.error('削除エラー:', err));
      }
      if (testTask2.id) {
        firestoreTaskService.deleteTask(testTask2.id)
          .then(() => console.log('テストタスク2を削除しました'))
          .catch(err => console.error('削除エラー:', err));
      }

      console.log('\n✅ Firebase統合テスト完了！');
    }, 5000);

  } catch (error) {
    console.error('❌ テスト実行エラー:', error);
  }
}

// テスト実行
testFirebaseIntegration();
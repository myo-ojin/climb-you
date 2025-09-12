import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Task } from '../types';
import { useTask } from '../contexts/TaskContext';

export default function TasksScreen() {
  const { tasks, toggleTask, deleteTask } = useTask();
  const navigation = useNavigation();

  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      'クエストを削除',
      'このクエストを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => deleteTask(taskId) }
      ]
    );
  };

  const renderTask = ({ item }: { item: Task }) => {
    return (
      <TouchableOpacity 
        style={[styles.taskItem, item.completed && styles.completedTask]}
        onPress={() => toggleTask(item.id)}
        onLongPress={() => handleDeleteTask(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.taskHeader}>
          <View style={[styles.checkbox, item.completed && styles.checkedBox]}>
            {item.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </View>
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, item.completed && styles.completedText]}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={[styles.taskDescription, item.completed && styles.completedText]}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.taskFooter}>
          <View style={styles.taskStatusContainer}>
            <Text style={[styles.taskStatus, item.completed && styles.taskStatusCompleted]}>
              {item.completed ? '✅ 完了' : '🎯 進行中'}
            </Text>
            {item.completed && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>DONE</Text>
              </View>
            )}
          </View>
          <Text style={styles.taskHint}>
            {item.completed ? 'お疲れ様でした！' : '長押しで削除'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const completedCount = tasks.filter(task => task.completed).length;
  const progressPercentage = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>今日のクエスト</Text>
        <Text style={styles.subtitle}>あなたの冒険が始まります</Text>
        
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {completedCount} / {tasks.length} 完了
            </Text>
            <Text style={styles.progressPercentage}>
              {progressPercentage}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Quest List */}
      <View style={styles.questSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>クエスト一覧</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddTask' as never)}
          >
            <Text style={styles.addButtonText}>+ 追加</Text>
          </TouchableOpacity>
        </View>

        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>クエストがありません</Text>
            <Text style={styles.emptyDescription}>
              新しいクエストを追加して、冒険を始めましょう！
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddTask' as never)}
            >
              <Text style={styles.emptyButtonText}>最初のクエストを作成</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={tasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            style={styles.taskList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2A44',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F3E7C9',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#B9C3CF',
    opacity: 0.9,
    marginBottom: 20,
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.3)',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A4B',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3E7C9',
    backgroundColor: '#0F2A44',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(185, 195, 207, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F3E7C9',
    borderRadius: 4,
  },
  questSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3E7C9',
  },
  addButton: {
    backgroundColor: '#F3E7C9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#0F2A44',
    fontWeight: 'bold',
    fontSize: 14,
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.2)',
  },
  completedTask: {
    opacity: 0.75,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  taskContent: {
    flex: 1,
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A4B',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  taskFooter: {
    alignItems: 'flex-start',
  },
  taskStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B9C3CF',
  },
  taskStatusCompleted: {
    color: '#4CAF50',
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  completedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskHint: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#B9C3CF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#F3E7C9',
    borderColor: '#F3E7C9',
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  checkmark: {
    color: '#0F2A44',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F3E7C9',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#B9C3CF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#F3E7C9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: '#0F2A44',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
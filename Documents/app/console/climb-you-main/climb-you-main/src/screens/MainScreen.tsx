import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, Dimensions, SafeAreaView } from 'react-native';
import MountainAnimation from '../components/MountainAnimation';
import EnhancedMountainAnimation from '../components/EnhancedMountainAnimation';
import { Task } from '../types';

const { height: screenHeight } = Dimensions.get('window');

export default function MainScreen() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: '朝のジョギング', description: '朝のジョギング', completed: false, createdAt: new Date() },
    { id: '2', title: '英語の勉強', description: '英語の勉強', completed: true, createdAt: new Date() },
    { id: '3', title: 'プロジェクトの企画書作成', description: 'プロジェクトの企画書作成', completed: false, createdAt: new Date() },
    { id: '4', title: 'プロジェクトの企画書作成', description: 'プロジェクトの企画書作成', completed: false, createdAt: new Date() },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [progress, setProgress] = useState(0);
  const [useEnhancedAnimation, setUseEnhancedAnimation] = useState(true); // テスト用切り替え

  useEffect(() => {
    const completedTasks = tasks.filter(task => task.completed).length;
    const totalTasks = tasks.length;
    const calculatedProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    setProgress(Math.min(calculatedProgress, 100));
  }, [tasks]);

  const addTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        description: '',
        completed: false,
        createdAt: new Date(),
      };
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    Alert.alert(
      'タスクを削除',
      'このタスクを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => {
          setTasks(tasks.filter(task => task.id !== id));
        }},
      ]
    );
  };

  const renderTask = ({ item }: { item: Task }) => {
    if (item.isDummy) {
      return (
        <View style={styles.dummyTask} />
      );
    }

    return (
      <TouchableOpacity 
        style={styles.taskItem}
        onPress={() => toggleTask(item.id)}
        onLongPress={() => deleteTask(item.id)}
      >
        <View style={styles.taskCardHeader}>
          <TouchableOpacity
            style={[styles.taskCheckbox, item.completed && styles.taskCheckboxCompleted]}
            onPress={() => toggleTask(item.id)}
          >
            {item.completed && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        </View>
        
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const completedTasksCount = tasks.filter(task => task.completed).length;

  // Add invisible dummy task if odd number of tasks
  const tasksWithDummy = [...tasks];
  if (tasks.length % 2 === 1) {
    tasksWithDummy.push({
      id: 'dummy',
      title: '',
      description: '',
      completed: false,
      createdAt: new Date(),
      isDummy: true
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Mountain Animation Section - 1/3 of screen */}
      <View style={styles.mountainSection}>
        <View style={styles.mountainCard}>
          {useEnhancedAnimation ? (
            <EnhancedMountainAnimation 
              progress={progress / 100} 
              checkpoints={[0.25, 0.5, 0.75, 1.0]}
            />
          ) : (
            <MountainAnimation progress={progress} />
          )}
        </View>
        
        {/* テスト用切り替えボタン */}
        <TouchableOpacity
          style={styles.animationToggleButton}
          onPress={() => setUseEnhancedAnimation(!useEnhancedAnimation)}
        >
          <Text style={styles.animationToggleText}>
            {useEnhancedAnimation ? '🎬 Enhanced' : '⚡ Classic'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task Management Section - 2/3 of screen */}
      <View style={styles.taskSection}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskHeaderTitle}>Daily Quest</Text>
          <Text style={styles.taskHeaderSubtitle}>
            {completedTasksCount}/{tasks.length} Completed
          </Text>
        </View>
        
        {/* Task List */}
        <FlatList
          data={tasksWithDummy}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          style={styles.taskList}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.row}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2A44',
  },
  mountainSection: {
    height: screenHeight * 0.33, // 1/3 of screen
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  mountainCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.3)',
  },
  statusOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentStationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF5722',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  taskSection: {
    flex: 1, // Takes remaining 2/3 of screen
    paddingTop: 20,
    marginHorizontal: 16,
    borderRadius: 20,
  },
  taskHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 231, 201, 0.3)',
    backgroundColor: '#0F2A44',
    color: '#F3E7C9',
  },
  taskHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3E7C9',
    marginBottom: 4,
  },
  taskHeaderSubtitle: {
    fontSize: 16,
    color: '#B9C3CF',
    opacity: 0.9,
  },

  taskList: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  row: {
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
  taskItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    flex: 1,
    aspectRatio: 1,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.2)',
  },
  dummyTask: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    flex: 1,
    aspectRatio: 1,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  taskContent: {
    flex: 1,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#B9C3CF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckboxCompleted: {
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    color: '#1E3A4B',
    fontWeight: '500',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#B9C3CF',
  },
  animationToggleButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(243, 231, 201, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 10,
  },
  animationToggleText: {
    color: '#0F2A44',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
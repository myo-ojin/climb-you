import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, Dimensions } from 'react-native';
import MountainAnimation from '../components/MountainAnimation';
import { Task } from '../types';

const { height: screenHeight } = Dimensions.get('window');

export default function MainScreen() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: '朝のジョギング', description: '朝のジョギング', completed: false },
    { id: '2', title: '英語の勉強', description: '英語の勉強', completed: true },
    { id: '3', title: 'プロジェクトの企画書作成', description: 'プロジェクトの企画書作成', completed: false },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [progress, setProgress] = useState(0);

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

  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskItem}>
      <TouchableOpacity
        style={[styles.taskCheckbox, item.completed && styles.taskCheckboxCompleted]}
        onPress={() => toggleTask(item.id)}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      
      <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
        {item.title}
      </Text>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteTask(item.id)}
      >
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const completedTasksCount = tasks.filter(task => task.completed).length;

  return (
    <View style={styles.container}>
      {/* Mountain Animation Section - 1/3 of screen */}
      <View style={styles.mountainSection}>
        <MountainAnimation progress={progress} />
        
        {/* Current Status Overlay */}
        <View style={styles.statusOverlay}>
          <Text style={styles.currentStationText}>
            {Math.floor(progress / 10) + 1}合目
          </Text>
          <Text style={styles.progressText}>
            {Math.round(progress)}% 完了
          </Text>
        </View>
      </View>

      {/* Task Management Section - 2/3 of screen */}
      <View style={styles.taskSection}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskHeaderTitle}>今日のタスク</Text>
          <Text style={styles.taskHeaderSubtitle}>
            {completedTasksCount}/{tasks.length} 完了
          </Text>
        </View>

        {/* Add New Task */}
        <View style={styles.addTaskContainer}>
          <TextInput
            style={styles.taskInput}
            placeholder="新しいタスクを追加..."
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            onSubmitEditing={addTask}
          />
          <TouchableOpacity style={styles.addButton} onPress={addTask}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Task List */}
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          style={styles.taskList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mountainSection: {
    height: screenHeight * 0.33, // 1/3 of screen
    position: 'relative',
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
    backgroundColor: 'white',
    paddingTop: 20,
  },
  taskHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  taskHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  taskHeaderSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  addTaskContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  taskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  taskList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
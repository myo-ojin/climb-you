import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Task } from '../types';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Read 30 minutes',
      description: 'Read a technical book or article',
      completed: false,
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'Exercise 20 minutes',
      description: 'Do some physical exercise',
      completed: true,
      createdAt: new Date(),
      completedAt: new Date(),
    },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const addTask = () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      completed: false,
      createdAt: new Date(),
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskDescription('');
  };

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            completed: !task.completed,
            completedAt: !task.completed ? new Date() : undefined
          }
        : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const renderTask = ({ item }: { item: Task }) => {
    if (item.isDummy) {
      return (
        <View style={styles.dummyTask} />
      );
    }

    return (
      <TouchableOpacity 
        style={[styles.taskItem, item.completed && styles.completedTask]}
        onPress={() => toggleTask(item.id)}
        onLongPress={() => {
          Alert.alert(
            'Delete Task',
            'Are you sure you want to delete this task?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteTask(item.id) }
            ]
          );
        }}
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
          <Text style={[styles.taskDescription, item.completed && styles.completedText]}>
            {item.description}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const completedCount = tasks.filter(task => task.completed).length;

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
    <View style={styles.container}>
      <Text style={styles.title}>Daily Tasks</Text>
      <Text style={styles.progress}>
        {completedCount} / {tasks.length} completed
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Task title"
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Task description (optional)"
          value={newTaskDescription}
          onChangeText={setNewTaskDescription}
        />
        <TouchableOpacity style={styles.addButton} onPress={addTask}>
          <Text style={styles.addButtonText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasksWithDummy}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        style={styles.taskList}
        numColumns={2}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(26,72,108)',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  progress: {
    fontSize: 16,
    color: '#E0E0E0',
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'column',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
    marginHorizontal: 4,
    aspectRatio: 1,
  },
  dummyTask: {
    backgroundColor: 'rgb(26,72,108)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    flex: 1,
    aspectRatio: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  completedTask: {
    opacity: 0.7,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontWeight: 'bold',
  },
  row: {
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
});
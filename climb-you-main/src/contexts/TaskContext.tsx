import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types';

interface TaskContextType {
  tasks: Task[];
  addTask: (title: string, description?: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTasks: (newTasks: Task[]) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const TASKS_STORAGE_KEY = 'climb_you_tasks';

interface TaskProviderProps {
  children: ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const savedTasks = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        setTasks(parsedTasks);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const saveTasks = async (newTasks: Task[]) => {
    try {
      await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(newTasks));
    } catch (error) {
      console.error('Failed to save tasks:', error);
    }
  };

  const addTask = (title: string, description: string = '') => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      completed: false,
      createdAt: new Date(),
    };
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const toggleTask = (id: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const deleteTask = (id: string) => {
    const updatedTasks = tasks.filter(task => task.id !== id);
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const updateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    saveTasks(newTasks);
  };

  return (
    <TaskContext.Provider value={{
      tasks,
      addTask,
      toggleTask,
      deleteTask,
      updateTasks,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTask() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
}
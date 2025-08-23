# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
```bash
npm install       # Install dependencies
npm start         # Start Expo development server
npm run android   # Start on Android emulator/device
npm run ios       # Start on iOS simulator/device
npm run web       # Start web development server
```

### Project Management
- Use `expo start` as the primary development command
- The app uses Expo CLI and React Native with the new architecture enabled
- TypeScript is configured with strict mode enabled

## Architecture Overview

### Core Structure
This is a React Native Expo application with a bottom tab navigation structure:

**Navigation Architecture:**
- `App.tsx` - Root component that renders `AppNavigator` and `StatusBar`
- `src/navigation/AppNavigator.tsx` - Bottom tab navigator with two main screens
- Navigation uses React Navigation v7 with TypeScript support

**Screen Architecture:**
- `TasksScreen` - Task management with CRUD operations, uses local state
- `MountainScreen` - Progress visualization with animated mountain climbing

**Component Architecture:**
- `MountainAnimation` - Complex animated component using `Animated.Value` and `LinearGradient`
- Uses React Native's built-in animation system with interpolation
- Responsive design based on screen dimensions

### State Management
- **Local State Only**: Uses React's `useState` and `useEffect` hooks
- No external state management (Redux, Zustand, etc.)
- Task data is managed locally in `TasksScreen` component
- Progress data is managed locally in `MountainScreen` component

### Key Dependencies
- **Navigation**: `@react-navigation/native` + `@react-navigation/bottom-tabs`
- **UI**: Native React Native components + `expo-linear-gradient`
- **Graphics**: `react-native-svg` for vector graphics
- **Platform**: Expo SDK ~53.0

### Data Models
Core TypeScript interfaces in `src/types/index.ts`:
- `Task` - Task management with completion tracking
- `User` - User progression with level and progress
- `RootStackParamList` - Navigation type safety

### Animation System
`MountainAnimation` component features:
- Progress-based climber position animation using `Animated.Value`
- Interpolated positioning for realistic climbing path
- Visual progress indicators with path dots
- Success state with flag animation at 100% completion

### Styling Patterns
- Uses `StyleSheet.create()` consistently
- Color scheme: Primary blue (#007AFF), success green (#4CAF50)
- Shadow/elevation patterns for card-like components
- Responsive sizing using `Dimensions.get('window')`

## Development Guidelines

### File Organization
- Screens go in `src/screens/`
- Reusable components in `src/components/`
- Navigation config in `src/navigation/`
- Type definitions in `src/types/`

### Naming Conventions
- Components use PascalCase (e.g., `TasksScreen`, `MountainAnimation`)
- Files match component names
- Interfaces use PascalCase with descriptive names

### TypeScript Usage
- Strict mode enabled in `tsconfig.json`
- Interface definitions for all data structures
- Navigation params properly typed with `RootStackParamList`
- Component props interfaces defined inline or separately

### Animation Patterns
- Use `useRef` with `Animated.Value` for smooth animations
- Implement proper cleanup in `useEffect` for animations
- Use `interpolate` for complex value transformations
- Leverage `useNativeDriver: true` when possible for performance
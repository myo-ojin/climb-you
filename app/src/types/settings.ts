import { z } from 'zod';

// User settings schema
export const UserSettingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  notifications: z.object({
    enabled: z.boolean().default(true),
    dailyReminder: z.object({
      enabled: z.boolean().default(true),
      time: z.string().default('09:00'), // HH:MM format
    }),
    questCompletion: z.object({
      enabled: z.boolean().default(true),
    }),
    weeklyReport: z.object({
      enabled: z.boolean().default(true),
      day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).default('sunday'),
    }),
  }),
  appearance: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.enum(['ja', 'en']).default('ja'),
  }),
  privacy: z.object({
    dataCollection: z.boolean().default(true),
    analyticsEnabled: z.boolean().default(true),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

// Settings update payload (partial updates)
export const SettingsUpdateSchema = z.object({
  notifications: z.object({
    enabled: z.boolean(),
    dailyReminder: z.object({
      enabled: z.boolean(),
      time: z.string(),
    }).partial(),
    questCompletion: z.object({
      enabled: z.boolean(),
    }).partial(),
    weeklyReport: z.object({
      enabled: z.boolean(),
      day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    }).partial(),
  }).partial(),
  appearance: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.enum(['ja', 'en']),
  }).partial(),
  privacy: z.object({
    dataCollection: z.boolean(),
    analyticsEnabled: z.boolean(),
  }).partial(),
}).partial();

export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>;

// App info for version display
export interface AppInfo {
  version: string;
  buildNumber: string;
  releaseDate: string;
  platform: 'ios' | 'android' | 'web';
}

// Settings section definitions for UI
export interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  items: SettingsItem[];
}

export interface SettingsItem {
  id: string;
  type: 'toggle' | 'select' | 'button' | 'info' | 'navigation';
  title: string;
  description?: string;
  icon?: string;
  value?: any;
  options?: Array<{ label: string; value: any }>;
  onPress?: () => void;
  disabled?: boolean;
}

// Settings error types
export interface SettingsError {
  type: 'load' | 'save' | 'validation' | 'network' | 'unknown';
  message: string;
  field?: string;
  details?: any;
}

// Default settings values
export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  notifications: {
    enabled: true,
    dailyReminder: {
      enabled: true,
      time: '09:00',
    },
    questCompletion: {
      enabled: true,
    },
    weeklyReport: {
      enabled: true,
      day: 'sunday',
    },
  },
  appearance: {
    theme: 'system',
    language: 'ja',
  },
  privacy: {
    dataCollection: true,
    analyticsEnabled: true,
  },
};
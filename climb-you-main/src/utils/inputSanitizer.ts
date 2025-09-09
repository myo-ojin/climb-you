/**
 * Input Sanitization and Validation Utilities
 * Prevents XSS attacks and validates user inputs
 */

export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHTML(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/script/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/data:/gi, '')
      .replace(/eval\(/gi, '')
      .replace(/expression\(/gi, '');
  }

  /**
   * Sanitize text input for safe storage and display
   */
  static sanitizeText(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') return '';
    
    let sanitized = input.trim();
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return this.sanitizeHTML(sanitized);
  }

  /**
   * Validate and sanitize goal text - returns validation result instead of throwing
   */
  static validateAndSanitizeGoalText(goalText: string): {
    isValid: boolean;
    sanitized?: string;
    errorType?: 'empty' | 'too_short' | 'invalid_type';
    userMessage?: string;
  } {
    if (!goalText || typeof goalText !== 'string') {
      return {
        isValid: false,
        errorType: 'empty',
        userMessage: '目標を入力してください'
      };
    }

    const sanitized = this.sanitizeText(goalText, 500);
    
    if (sanitized.length < 5) {
      return {
        isValid: false,
        sanitized,
        errorType: 'too_short',
        userMessage: '目標をもう少し詳しく教えてください（例：「英語を話せるようになりたい」「プログラミングを学びたい」など）'
      };
    }

    return {
      isValid: true,
      sanitized
    };
  }

  /**
   * Legacy method for backward compatibility - now returns sanitized text or throws
   */
  static sanitizeGoalText(goalText: string): string {
    const result = this.validateAndSanitizeGoalText(goalText);
    if (!result.isValid) {
      throw new Error(result.userMessage || 'Invalid goal text');
    }
    return result.sanitized!;
  }

  /**
   * Validate and sanitize user profile data
   */
  static sanitizeProfileData(profile: any): any {
    if (!profile || typeof profile !== 'object') {
      throw new Error('Profile data is required');
    }

    const sanitized: any = {};

    // Sanitize strings
    const stringFields = ['name', 'goal_text', 'goal_motivation', 'goal_category'];
    stringFields.forEach(field => {
      if (profile[field]) {
        sanitized[field] = this.sanitizeText(String(profile[field]));
      }
    });

    // Validate numbers
    const numberFields = ['daily_time_budget', 'goal_importance'];
    numberFields.forEach(field => {
      if (profile[field] !== undefined) {
        const num = Number(profile[field]);
        if (isNaN(num) || num < 0) {
          throw new Error(`${field} must be a positive number`);
        }
        sanitized[field] = num;
      }
    });

    // Validate dates
    if (profile.goal_deadline) {
      const date = new Date(profile.goal_deadline);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid goal deadline date');
      }
      if (date < new Date()) {
        throw new Error('Goal deadline must be in the future');
      }
      sanitized.goal_deadline = date.toISOString();
    }

    return sanitized;
  }

  /**
   * Validate quest data integrity with comprehensive boundary checks
   */
  static validateQuestData(quest: any): boolean {
    if (!quest || typeof quest !== 'object') {
      return false;
    }

    // Required fields
    const requiredFields = ['title', 'description', 'difficulty', 'minutes', 'pattern'];
    for (const field of requiredFields) {
      if (quest[field] === null || quest[field] === undefined) {
        return false;
      }
    }

    // Type validation with null checks
    if (typeof quest.title !== 'string' || quest.title.trim().length === 0) return false;
    if (typeof quest.description !== 'string' || quest.description.trim().length === 0) return false;
    if (typeof quest.pattern !== 'string' || quest.pattern.trim().length === 0) return false;
    if (typeof quest.difficulty !== 'number' || isNaN(quest.difficulty)) return false;
    if (typeof quest.minutes !== 'number' || isNaN(quest.minutes) || !isFinite(quest.minutes)) return false;

    // Comprehensive boundary validation
    if (quest.difficulty < 0 || quest.difficulty > 1) return false;
    if (quest.minutes < 10 || quest.minutes > 240) return false;
    if (quest.title.length > 200) return false;
    if (quest.description.length > 1000) return false;

    // Array validation with size limits
    if (quest.criteria) {
      if (!Array.isArray(quest.criteria) || quest.criteria.length > 10) return false;
      if (!quest.criteria.every(c => typeof c === 'string' && c.length <= 200)) return false;
    }
    
    if (quest.steps) {
      if (!Array.isArray(quest.steps) || quest.steps.length > 20) return false;
      if (!quest.steps.every(s => typeof s === 'string' && s.length <= 300)) return false;
    }
    
    if (quest.tags) {
      if (!Array.isArray(quest.tags) || quest.tags.length > 15) return false;
      if (!quest.tags.every(t => typeof t === 'string' && t.length <= 50)) return false;
    }

    // Additional safety checks
    if (quest.deliverable && (typeof quest.deliverable !== 'string' || quest.deliverable.length > 500)) return false;

    return true;
  }

  /**
   * Sanitize quest data
   */
  static sanitizeQuestData(quest: any): any {
    if (!quest || typeof quest !== 'object') {
      throw new Error('Quest data is required');
    }

    const sanitized: any = {
      title: this.sanitizeText(String(quest.title || ''), 200),
      description: this.sanitizeText(String(quest.description || ''), 1000),
      pattern: this.sanitizeText(String(quest.pattern || '')),
      difficulty: Math.max(0, Math.min(1, Number(quest.difficulty) || 0.5)),
      minutes: Math.max(10, Math.min(240, Math.round(Number(quest.minutes) || 30))),
      deliverable: this.sanitizeText(String(quest.deliverable || ''), 500),
    };

    // Sanitize arrays
    if (quest.criteria && Array.isArray(quest.criteria)) {
      sanitized.criteria = quest.criteria
        .filter(c => typeof c === 'string')
        .map(c => this.sanitizeText(c, 200))
        .filter(c => c.length > 0);
    }

    if (quest.steps && Array.isArray(quest.steps)) {
      sanitized.steps = quest.steps
        .filter(s => typeof s === 'string')
        .map(s => this.sanitizeText(s, 300))
        .filter(s => s.length > 0);
    }

    if (quest.tags && Array.isArray(quest.tags)) {
      sanitized.tags = quest.tags
        .filter(t => typeof t === 'string')
        .map(t => this.sanitizeText(t, 50))
        .filter(t => t.length > 0);
    }

    return sanitized;
  }

  /**
   * Remove null and undefined values from object
   */
  static removeNullValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return {};
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj
        .filter(item => item !== null && item !== undefined)
        .map(item => this.removeNullValues(item));
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        cleaned[key] = this.removeNullValues(value);
      }
    }

    return cleaned;
  }

  /**
   * Validate date string
   */
  static validateDate(dateString: string): boolean {
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }

    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Escape special characters for safe JSON stringification
   */
  static escapeJSON(str: string): string {
    if (typeof str !== 'string') return '';
    
    return str.replace(/[\\"]/g, '\\$&').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  }
}
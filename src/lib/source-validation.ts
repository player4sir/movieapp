/**
 * Video source form validation utilities
 * Requirements: 2.2, 2.3
 */

import type { SourceCategory } from '@/types/admin';

/**
 * Form data for video source creation/editing
 */
export interface SourceFormData {
  name: string;
  category: SourceCategory;
  apiUrl: string;
  timeout: number;
  retries: number;
}

/**
 * Validation error result
 */
export interface ValidationError {
  field: keyof SourceFormData;
  message: string;
}

/**
 * Validates a URL string to ensure it's a valid HTTP/HTTPS URL
 * @param url - The URL string to validate
 * @returns true if valid HTTP/HTTPS URL, false otherwise
 */
export function isValidHttpUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }
  
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates the video source form data
 * @param data - The form data to validate
 * @returns null if valid, or an error message string if invalid
 */
export function validateSourceForm(data: SourceFormData): string | null {
  // Validate name (required, non-empty)
  if (!data.name || !data.name.trim()) {
    return '名称不能为空';
  }
  
  // Validate API URL (required, non-empty)
  if (!data.apiUrl || !data.apiUrl.trim()) {
    return 'API地址不能为空';
  }
  
  // Validate URL format (must be valid HTTP/HTTPS)
  if (!isValidHttpUrl(data.apiUrl)) {
    return '请输入有效的HTTP/HTTPS地址';
  }
  
  return null;
}

/**
 * Validates the video source form data and returns field-specific errors
 * @param data - The form data to validate
 * @returns Array of validation errors, empty if valid
 */
export function validateSourceFormFields(data: SourceFormData): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Validate name
  if (!data.name || !data.name.trim()) {
    errors.push({ field: 'name', message: '名称不能为空' });
  }
  
  // Validate API URL
  if (!data.apiUrl || !data.apiUrl.trim()) {
    errors.push({ field: 'apiUrl', message: 'API地址不能为空' });
  } else if (!isValidHttpUrl(data.apiUrl)) {
    errors.push({ field: 'apiUrl', message: '请输入有效的HTTP/HTTPS地址' });
  }
  
  return errors;
}

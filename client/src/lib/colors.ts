// Centralized color configuration
// This will be replaced by API data in the future

export interface ColorConfig {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: string;
  success: string;
  warning: string;
  error: string;
  // Restaurant specific colors
  food: {
    deal: string;
    recommended: string;
    category: string;
  };
}

// Default color configuration (will be replaced by API)
export const defaultColors: ColorConfig = {
  primary: '#16a34a', // green-600
  primaryHover: '#15803d', // green-700
  secondary: '#f3f4f6', // gray-100
  accent: '#fbbf24', // amber-400
  background: '#f9fafb', // gray-50
  surface: '#ffffff', // white
  text: {
    primary: '#111827', // gray-900
    secondary: '#374151', // gray-700
    muted: '#6b7280', // gray-500
  },
  border: '#e5e7eb', // gray-200
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  error: '#ef4444', // red-500
  food: {
    deal: '#dc2626', // red-600
    recommended: '#16a34a', // green-600
    category: '#8b5cf6', // violet-500
  },
};

// Function to get current colors from mock data
export const getColors = async (theme: string = 'default'): Promise<ColorConfig> => {
  try {
    // Import mock storage dynamically to avoid circular dependencies
    const { mockStorage } = await import('./mock-data');
    return await mockStorage.getColors(theme);
  } catch (error) {
    console.warn('Failed to fetch colors, using defaults:', error);
    return defaultColors;
  }
};

// Function to apply colors to CSS variables
export const applyColors = (colors: ColorConfig) => {
  if (!colors || typeof colors !== 'object') {
    console.warn('Invalid colors object, using defaults');
    colors = defaultColors;
  }
  
  const root = document.documentElement;
  
  // Primary colors
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-primary-hover', colors.primaryHover);
  root.style.setProperty('--color-secondary', colors.secondary);
  root.style.setProperty('--color-accent', colors.accent);
  
  // Update focus ring color to match theme
  root.style.setProperty('--ring', colors.primary);
  
  // Background colors
  root.style.setProperty('--color-background', colors.background);
  root.style.setProperty('--color-surface', colors.surface);
  
  // Text colors
  root.style.setProperty('--color-text-primary', colors.text.primary);
  root.style.setProperty('--color-text-secondary', colors.text.secondary);
  root.style.setProperty('--color-text-muted', colors.text.muted);
  
  // Border colors
  root.style.setProperty('--color-border', colors.border);
  
  // Status colors
  root.style.setProperty('--color-success', colors.success);
  root.style.setProperty('--color-warning', colors.warning);
  root.style.setProperty('--color-error', colors.error);
  
  // Food specific colors
  root.style.setProperty('--color-food-deal', colors.food.deal);
  root.style.setProperty('--color-food-recommended', colors.food.recommended);
  root.style.setProperty('--color-food-category', colors.food.category);
};

// Initialize colors on app start
export const initializeColors = async (theme: string = 'default') => {
  const colors = await getColors(theme);
  applyColors(colors);
};

// Function to change theme dynamically
export const changeTheme = async (theme: string) => {
  const colors = await getColors(theme);
  applyColors(colors);
};
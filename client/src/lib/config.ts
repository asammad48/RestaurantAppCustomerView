// Environment Configuration
export type Environment = 'development' | 'qa' | 'production';

export interface EnvironmentConfig {
  apiBaseUrl: string;
  signalRHubUrl: string;
}

const environments: Record<Environment, EnvironmentConfig> = {
  development: {
    apiBaseUrl: 'https://5dtrtpzg-7261.inc1.devtunnels.ms',
    signalRHubUrl: 'wss://5dtrtpzg-7261.inc1.devtunnels.ms/orderHub',
  },
  qa: {
    apiBaseUrl: 'https://restaurant-app-web-qa-001-eecdfsadcfgxevc9.centralindia-01.azurewebsites.net',
    signalRHubUrl: 'wss://restaurant-app-web-qa-001-eecdfsadcfgxevc9.centralindia-01.azurewebsites.net/orderHub',
  },
  production: {
    // Production URLs - to be configured when production environment is ready
    // For now, fail fast if production is used without proper URLs configured
    apiBaseUrl: import.meta.env.VITE_PRODUCTION_API_URL || 'PRODUCTION_NOT_CONFIGURED',
    signalRHubUrl: import.meta.env.VITE_PRODUCTION_SIGNALR_URL || 'PRODUCTION_NOT_CONFIGURED',
  },
};

// Get current environment from environment variables
function getCurrentEnvironment(): Environment {
  const env = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development';
  
  // For Replit, always use development
  if (import.meta.env.VITE_REPLIT || typeof window !== 'undefined' && window.location.hostname.includes('replit')) {
    return 'development';
  }
  
  // Validate environment
  if (env === 'qa' || env === 'production' || env === 'development') {
    return env;
  }
  
  // Default to development for unknown environments
  return 'development';
}

// Helper function to normalize URL (remove trailing slash)
function normalizeUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

// Helper function to derive SignalR URL from HTTP URL
function deriveSignalRUrl(httpUrl: string): string {
  const url = new URL(httpUrl);
  const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${url.host}/orderHub`;
}

// Get current environment configuration
export function getEnvironmentConfig(): EnvironmentConfig {
  const currentEnv = getCurrentEnvironment();
  const envConfig = environments[currentEnv];
  
  // Fail fast if production is not properly configured
  if (currentEnv === 'production' && envConfig.apiBaseUrl === 'PRODUCTION_NOT_CONFIGURED') {
    throw new Error('Production environment is not properly configured. Please set VITE_PRODUCTION_API_URL and VITE_PRODUCTION_SIGNALR_URL environment variables.');
  }
  
  return envConfig;
}

// Get resolved configuration with environment variable overrides
export function getResolvedConfig(): EnvironmentConfig {
  const envConfig = getEnvironmentConfig();
  
  // Apply environment variable overrides
  const resolvedApiBaseUrl = normalizeUrl(
    import.meta.env.VITE_API_BASE_URL || envConfig.apiBaseUrl
  );
  
  const resolvedSignalRUrl = normalizeUrl(
    import.meta.env.VITE_SIGNALR_HUB_URL || 
    import.meta.env.VITE_API_BASE_URL ? deriveSignalRUrl(import.meta.env.VITE_API_BASE_URL) :
    envConfig.signalRHubUrl
  );
  
  return {
    apiBaseUrl: resolvedApiBaseUrl,
    signalRHubUrl: resolvedSignalRUrl,
  };
}

// Export resolved config values for consistency across the app
export const config = getResolvedConfig();

// Export environment name for debugging
export const currentEnvironment = getCurrentEnvironment();

// Legacy API configuration for backward compatibility
export const API_CONFIG = {
  BASE_URL: config.apiBaseUrl,
  ENDPOINTS: {
    CUSTOMER_SEARCH: '/api/customer-search/branch',
  }
} as const;

// Helper function to build full image URLs
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) {
    // Return a default fallback image
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200';
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Use resolved config for consistency with API client
  const path = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${config.apiBaseUrl}/${path}`;
}

// Console log the current environment for debugging (development only)
if (currentEnvironment === 'development') {
  console.log(`🌍 Environment: ${currentEnvironment}`);
  console.log(`🔗 API Base URL: ${config.apiBaseUrl}`);
  console.log(`📡 SignalR Hub URL: ${config.signalRHubUrl}`);
}
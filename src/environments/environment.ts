export interface Environment {
  production: boolean;
  apiUrl: string;
}

// Use EMPTY string for development (proxy will handle it)
export const environment: Environment = {
  production: false,
  apiUrl: '' // Empty string - proxy will route to backend
};
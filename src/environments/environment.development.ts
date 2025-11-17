export interface Environment {
    production: boolean;
    apiUrl: string;
}


export const environment: Environment = {
  production: false,
  // Using proxy: API requests to /api will be forwarded to http://coms.q4globalltd.com
  // This prevents conflict between routes and API endpoints
  apiUrl: 'api'
};
export interface Environment {
  production: boolean;
  apiUrl: string;
}

export const environment: Environment = {
  production: false,
  apiUrl: 'https://coms.q4iltd.com'
};
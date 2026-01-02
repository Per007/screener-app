const AUTH_TOKEN_KEY = 'esg_auth_token';
const USER_DATA_KEY = 'esg_user_data';

export const setAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
};

export const setUserData = (userData: any): void => {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
};

export const getUserData = (): any | null => {
  const userData = localStorage.getItem(USER_DATA_KEY);
  return userData ? JSON.parse(userData) : null;
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const getUserRole = (): 'admin' | 'user' | null => {
  const userData = getUserData();
  return userData?.role || null;
};

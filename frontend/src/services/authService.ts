import { apiService } from './api';
import { LoginCredentials, RegisterData, AuthResponse, User } from '../types/auth';

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/register', data);
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiService.post<AuthResponse>('/auth/login', credentials);
  },

  async logout(): Promise<void> {
    return apiService.post<void>('/auth/logout');
  },

  async getProfile(): Promise<{ user: User }> {
    return apiService.get<{ user: User }>('/auth/profile');
  },
};

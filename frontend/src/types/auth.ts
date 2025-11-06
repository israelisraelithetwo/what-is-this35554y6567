export interface User {
  id: string;
  email: string;
  name: string;
  role: 'creator' | 'signer';
  createdAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'creator' | 'signer';
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

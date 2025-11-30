import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

interface LoginResponse {
  user: User;
  token: string;
}

interface MeResponse {
  user: User;
}

export const useAuth = create<AuthState>((set, _get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      await SecureStore.setItemAsync('token', response.token);
      await SecureStore.setItemAsync('user', JSON.stringify(response.user));

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      // Try to call logout endpoint
      await api.post('/auth/logout').catch(() => {});
    } finally {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userJson = await SecureStore.getItemAsync('user');

      if (!token || !userJson) {
        set({ isLoading: false });
        return;
      }

      // Validate token by calling /auth/me
      try {
        const response = await api.get<MeResponse>('/auth/me');
        set({
          user: response.user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Token is invalid, clear storage
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

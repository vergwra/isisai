import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
}

// Dados mockados para desenvolvimento
const mockUsers: Record<string, User & { password: string }> = {
  admin: {
    id: '1',
    name: 'Administrador',
    email: 'admin@logipredict.com',
    password: '123456',
    role: 'admin',
  },
  user: {
    id: '2',
    name: 'Usuário',
    email: 'user@logipredict.com',
    password: '123456',
    role: 'user',
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        // Simula uma chamada de API
        const user = Object.values(mockUsers).find(u => u.email === email);
        if (!user) {
          throw new Error('Usuário não encontrado');
        }
        if (user.password !== password) {
          throw new Error('Senha incorreta');
        }
        
        // Remove a senha antes de salvar no estado
        const { password: _, ...userWithoutPassword } = user;
        set({ user: userWithoutPassword, isAuthenticated: true });
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
      isAdmin: () => {
        const user = get().user;
        return user?.role === 'admin';
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

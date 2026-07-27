import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserInfo } from "@/types/api";

interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (user: UserInfo, accessToken: string, refreshToken: string) => void;
  updateProfile: (user: UserInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      login: (user, accessToken, refreshToken) => {
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", refreshToken);
        set({
          isAuthenticated: true,
          user,
          accessToken,
          refreshToken,
        });
      },
      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
        });
      },
      updateProfile: (user) => {
        set({ user });
      },
    }),
    {
      name: "auth-storage",
    }
  )
);

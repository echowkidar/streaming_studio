import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Workspace } from "@/types";

interface AuthState {
  user: User | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setToken: (token: string | null) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      currentWorkspace: null,
      workspaces: [],
      token: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      setToken: (token) => {
        if (typeof window !== "undefined") {
          if (token) {
            localStorage.setItem("livestudio_token", token);
          } else {
            localStorage.removeItem("livestudio_token");
          }
        }
        set({ token });
      },
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("livestudio_token");
          localStorage.removeItem("livestudio_auth");
        }
        set({ user: null, token: null, currentWorkspace: null, workspaces: [] });
      },
    }),
    {
      name: "livestudio_auth",
    }
  )
);


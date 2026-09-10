import { create } from "zustand";
import { User, Workspace } from "@/types";

interface AuthState {
  user: User | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: "user-1",
    email: "creator@livestudio.io",
    name: "Salar (Host)",
    role: "SUPER_ADMIN",
    createdAt: new Date().toISOString(),
  },
  currentWorkspace: {
    id: "ws-1",
    name: "Main Production Studio",
    slug: "main-production",
    ownerId: "user-1",
    createdAt: new Date().toISOString(),
  },
  workspaces: [
    {
      id: "ws-1",
      name: "Main Production Studio",
      slug: "main-production",
      ownerId: "user-1",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ws-2",
      name: "Podcast Studio",
      slug: "podcast-studio",
      ownerId: "user-1",
      createdAt: new Date().toISOString(),
    }
  ],
  token: typeof window !== "undefined" ? localStorage.getItem("livestudio_token") || "mock-jwt-token" : "mock-jwt-token",
  isLoading: false,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("livestudio_token", token);
      else localStorage.removeItem("livestudio_token");
    }
    set({ token });
  },
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("livestudio_token");
    }
    set({ user: null, token: null });
  },
}));

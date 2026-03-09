import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthClient } from "@icp-sdk/auth/client";
import type { Identity } from "@icp-sdk/core/agent";

const II_PROVIDER = "https://id.ai";

interface AuthState {
  isAuthenticated: boolean;
  identity: Identity | null;
  authClient: AuthClient | null;
  isInitialized: boolean;
}

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    identity: null,
    authClient: null,
    isInitialized: false,
  });

  useEffect(() => {
    AuthClient.create().then((authClient) => {
      authClient.isAuthenticated().then((isAuth) => {
        setState({
          isAuthenticated: isAuth,
          identity: isAuth ? authClient.getIdentity() : null,
          authClient,
          isInitialized: true,
        });
      });
    });
  }, []);

  const login = async () => {
    const authClient = state.authClient;
    if (!authClient) return;
    await authClient.login({
      identityProvider: II_PROVIDER,
      onSuccess: () => {
        const identity = authClient.getIdentity();
        setState((s) => ({
          ...s,
          isAuthenticated: true,
          identity,
        }));
      },
      onError: (err) => {
        console.error("Login failed:", err);
      },
    });
  };

  const logout = async () => {
    if (!state.authClient) return;
    await state.authClient.logout();
    setState((s) => ({
      ...s,
      isAuthenticated: false,
      identity: null,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

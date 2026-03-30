import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthClient } from "@icp-sdk/auth/client";
import type { Identity } from "@icp-sdk/core/agent";
import { Ed25519KeyIdentity } from "@icp-sdk/core/identity";

const II_PROVIDER = import.meta.env.VITE_II_PROVIDER || "https://id.ai";
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || "ii";
const DFX_NETWORK = import.meta.env.VITE_DFX_NETWORK || import.meta.env.DFX_NETWORK || "local";
const DEV_IDENTITY_STORAGE_KEY = "aseed.dev.identity";

function loadDevIdentity(): Ed25519KeyIdentity | null {
  if (typeof window === "undefined") return null;
  const serialized = window.localStorage.getItem(DEV_IDENTITY_STORAGE_KEY);
  if (!serialized) return null;
  try {
    return Ed25519KeyIdentity.fromJSON(serialized);
  } catch (err) {
    console.warn("Invalid stored dev identity. Clearing and regenerating.", err);
    window.localStorage.removeItem(DEV_IDENTITY_STORAGE_KEY);
    return null;
  }
}

function saveDevIdentity(identity: Ed25519KeyIdentity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEV_IDENTITY_STORAGE_KEY, JSON.stringify(identity.toJSON()));
}

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
    if (AUTH_MODE === "dev_key" && DFX_NETWORK === "ic") {
      console.error(
        "Blocked unsafe auth mode: VITE_AUTH_MODE=dev_key cannot be used with VITE_DFX_NETWORK=ic."
      );
      setState({
        isAuthenticated: false,
        identity: null,
        authClient: null,
        isInitialized: true,
      });
      return;
    }

    if (AUTH_MODE === "dev_key") {
      console.warn("DEV AUTH MODE ACTIVE: using a local Ed25519 identity for localhost testing.");
      const identity = loadDevIdentity();
      setState({
        isAuthenticated: identity !== null,
        identity,
        authClient: null,
        isInitialized: true,
      });
      return;
    }

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
    if (AUTH_MODE === "dev_key") {
      if (DFX_NETWORK === "ic") {
        console.error(
          "Refusing dev_key login on ic network. Set VITE_AUTH_MODE=ii for staging/mainnet."
        );
        return;
      }
      const identity = loadDevIdentity() ?? Ed25519KeyIdentity.generate();
      saveDevIdentity(identity);
      setState((s) => ({
        ...s,
        isAuthenticated: true,
        identity,
      }));
      return;
    }

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
    if (AUTH_MODE === "dev_key") {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DEV_IDENTITY_STORAGE_KEY);
      }
      setState((s) => ({
        ...s,
        isAuthenticated: false,
        identity: null,
      }));
      return;
    }

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

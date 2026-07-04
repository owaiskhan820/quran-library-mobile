"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { FirebaseAuthentication, User as FirebaseUser } from "@capacitor-firebase/authentication";

interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthUser(user: FirebaseUser | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoUrl: user.photoUrl,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let removeListener: (() => void) | undefined;

    (async () => {
      try {
        const { user: currentUser } = await FirebaseAuthentication.getCurrentUser();
        setUser(toAuthUser(currentUser));
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }

      const listener = await FirebaseAuthentication.addListener("authStateChange", (change) => {
        setUser(toAuthUser(change.user));
      });
      removeListener = () => listener.remove();
    })();

    return () => {
      removeListener?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await FirebaseAuthentication.signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setAuthError(message);
      // No adb/logcat access during on-device testing yet — surface the
      // real error visibly instead of it failing silently as a rejected promise.
      alert(`Sign-in failed: ${message}`);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    try {
      await FirebaseAuthentication.signOut();
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setAuthError(message);
      alert(`Sign-out failed: ${message}`);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, authError, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

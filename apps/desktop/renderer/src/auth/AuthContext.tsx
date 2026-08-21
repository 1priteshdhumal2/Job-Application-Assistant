import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  getSupabaseBrowserClient,
  SupabaseClient,
  User,
  Session,
  AuthChangeEvent,
} from "@jobpilot/database";
import { AuthStatus } from "@jobpilot/types";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  supabase: SupabaseClient | null;
  error: string | null;
  pendingVerificationEmail: string | null;
  signInWithPassword: (email: string, pass: string) => Promise<void>;
  signUpWithPassword: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resendVerificationEmail: (email?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [status, setStatus] = useState<AuthStatus>("INITIALIZING");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
    string | null
  >(null);

  // Initialize Supabase Client
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const envUrl =
        (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env
          ?.VITE_SUPABASE_URL || "";
      const envKey =
        (
          import.meta as unknown as {
            env?: { VITE_SUPABASE_ANON_KEY?: string };
          }
        ).env?.VITE_SUPABASE_ANON_KEY || "";

      if (!envUrl || !envKey) {
        setError(
          "Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing.",
        );
        setStatus("ERROR");
      } else {
        const client = getSupabaseBrowserClient({
          supabaseUrl: envUrl,
          supabaseAnonKey: envKey,
        });
        setSupabase(client);

        // Check initial active session
        client.auth
          .getSession()
          .then(
            ({ data: { session: initialSession }, error: sessionError }) => {
              if (sessionError) {
                setError(sessionError.message);
                setStatus("UNAUTHENTICATED");
                return;
              }

              if (initialSession && initialSession.user) {
                const isConfirmed = Boolean(
                  initialSession.user.email_confirmed_at ||
                  (initialSession.user as unknown as { confirmed_at?: string })
                    .confirmed_at,
                );

                setSession(initialSession);
                setUser(initialSession.user);

                // Require email verification for email provider accounts
                if (
                  initialSession.user.app_metadata?.provider === "email" &&
                  !isConfirmed
                ) {
                  setPendingVerificationEmail(
                    initialSession.user.email ?? null,
                  );
                  setStatus("VERIFICATION_REQUIRED");
                } else {
                  setStatus("AUTHENTICATED");
                }
              } else {
                setStatus("UNAUTHENTICATED");
              }
            },
          )
          .catch((err: unknown) => {
            setError(
              err instanceof Error
                ? err.message
                : "Session initialization error",
            );
            setStatus("UNAUTHENTICATED");
          });

        // Subscribe to auth state updates
        const { data } = client.auth.onAuthStateChange(
          (_event: AuthChangeEvent, currentSession: Session | null) => {
            if (currentSession && currentSession.user) {
              const isConfirmed = Boolean(
                currentSession.user.email_confirmed_at ||
                (currentSession.user as unknown as { confirmed_at?: string })
                  .confirmed_at,
              );

              setSession(currentSession);
              setUser(currentSession.user);

              if (
                currentSession.user.app_metadata?.provider === "email" &&
                !isConfirmed
              ) {
                setPendingVerificationEmail(currentSession.user.email ?? null);
                setStatus("VERIFICATION_REQUIRED");
              } else {
                setStatus("AUTHENTICATED");
              }
            } else {
              setSession(null);
              setUser(null);
              setStatus("UNAUTHENTICATED");
            }
          },
        );

        subscription = data.subscription;
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Supabase client initialization failed",
      );
      setStatus("ERROR");
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, pass: string) => {
      if (!supabase) throw new Error("Supabase client not initialized");
      setError(null);

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });

      if (signInError) {
        throw signInError;
      }

      const isConfirmed = Boolean(
        data.user?.email_confirmed_at ||
        (data.user as unknown as { confirmed_at?: string })?.confirmed_at,
      );

      if (data.user?.app_metadata?.provider === "email" && !isConfirmed) {
        setPendingVerificationEmail(email);
        setStatus("VERIFICATION_REQUIRED");
        return;
      }

      setUser(data.user);
      setSession(data.session);
      setStatus("AUTHENTICATED");
    },
    [supabase],
  );

  const signUpWithPassword = useCallback(
    async (email: string, pass: string) => {
      if (!supabase) throw new Error("Supabase client not initialized");
      setError(null);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: pass,
      });

      if (signUpError) {
        throw signUpError;
      }

      setPendingVerificationEmail(email);
      const isConfirmed = Boolean(
        data.user?.email_confirmed_at ||
        (data.user as unknown as { confirmed_at?: string })?.confirmed_at,
      );

      if (!isConfirmed) {
        setStatus("VERIFICATION_REQUIRED");
      } else {
        setUser(data.user);
        setSession(data.session);
        setStatus("AUTHENTICATED");
      }
    },
    [supabase],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error("Supabase client not initialized");
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (oauthError) {
      throw oauthError;
    }
  }, [supabase]);

  const resendVerificationEmail = useCallback(
    async (targetEmail?: string) => {
      if (!supabase) throw new Error("Supabase client not initialized");
      const emailToSend =
        targetEmail || pendingVerificationEmail || user?.email;

      if (!emailToSend) {
        throw new Error("No email address provided for verification resend");
      }

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: emailToSend,
      });

      if (resendError) {
        throw resendError;
      }
    },
    [supabase, pendingVerificationEmail, user],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPendingVerificationEmail(null);
    setStatus("UNAUTHENTICATED");
  }, [supabase]);

  const refreshSession = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (refreshError) {
      setStatus("UNAUTHENTICATED");
      return;
    }

    if (refreshedSession && refreshedSession.user) {
      const isConfirmed = Boolean(
        refreshedSession.user.email_confirmed_at ||
        (refreshedSession.user as unknown as { confirmed_at?: string })
          ?.confirmed_at,
      );

      setSession(refreshedSession);
      setUser(refreshedSession.user);

      if (
        refreshedSession.user.app_metadata?.provider === "email" &&
        !isConfirmed
      ) {
        setStatus("VERIFICATION_REQUIRED");
      } else {
        setStatus("AUTHENTICATED");
      }
    }
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      session,
      supabase,
      error,
      pendingVerificationEmail,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      resendVerificationEmail,
      signOut,
      refreshSession,
    }),
    [
      status,
      user,
      session,
      supabase,
      error,
      pendingVerificationEmail,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      resendVerificationEmail,
      signOut,
      refreshSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

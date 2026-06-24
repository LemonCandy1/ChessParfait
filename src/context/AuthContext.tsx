import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface User {
    username: string;
    email?: string;
}

export interface Remembered {
    username: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    remembered: Remembered | null;
    login: (username: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; message: string }>;
    register: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
    logout: () => Promise<void>;
    linkEmail: (email: string) => Promise<{ success: boolean; message: string }>;
    forgotPassword: (usernameOrEmail: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const [remembered, setRemembered] = useState<Remembered | null>(() => {
        try {
            const stored = localStorage.getItem('chessparfait_remembered');
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.error('Failed to parse remembered credentials:', e);
            return null;
        }
    });

    // Check active session on mount and listen for auth redirects/state updates (like email confirmation)
    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                }
            } catch (e) {
                console.error('Session check failed:', e);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // Listen for redirects from email change confirmations, password recovery, etc.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                if (session?.access_token) {
                    try {
                        // Sync token with HTTP-only cookie
                        await fetch('/api/auth/session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                accessToken: session.access_token,
                                refreshToken: session.refresh_token
                            })
                        });

                        // Fetch updated user info
                        const res = await fetch('/api/auth/me');
                        if (res.ok) {
                            const data = await res.json();
                            setUser(data.user);
                        }
                    } catch (err) {
                        console.error('Error syncing auth state with cookie:', err);
                    }
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (username: string, password: string, rememberMe: boolean) => {
        const trimmedUsername = username.trim();
        if (!trimmedUsername) {
            return { success: false, message: 'Username cannot be empty.' };
        }
        if (!password) {
            return { success: false, message: 'Password cannot be empty.' };
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: trimmedUsername, password })
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, message: data.message || 'Login failed.' };
            }

            setUser(data.user);

            // Handle Remember Me caching (username only)
            if (rememberMe) {
                const creds = { username: trimmedUsername };
                setRemembered(creds);
                localStorage.setItem('chessparfait_remembered', JSON.stringify(creds));
            } else {
                setRemembered(null);
                localStorage.removeItem('chessparfait_remembered');
            }

            return { success: true, message: 'Logged in successfully!' };
        } catch (e: any) {
            console.error('Login error:', e);
            return { success: false, message: 'Could not connect to authentication server.' };
        }
    };

    const register = async (username: string, password: string) => {
        const trimmedUsername = username.trim();
        if (!trimmedUsername) {
            return { success: false, message: 'Username cannot be empty.' };
        }
        if (!password) {
            return { success: false, message: 'Password cannot be empty.' };
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: trimmedUsername, password })
            });

            const data = await res.json();

            if (!res.ok) {
                return { success: false, message: data.message || 'Registration failed.' };
            }

            // Auto-login upon successful registration
            const loginRes = await login(trimmedUsername, password, false);
            if (!loginRes.success) {
                return { success: true, message: 'Account created! Please sign in manually.' };
            }

            return { success: true, message: 'Account registered successfully!' };
        } catch (e: any) {
            console.error('Registration error:', e);
            return { success: false, message: 'Could not connect to authentication server.' };
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Logout request failed:', e);
        }
        setUser(null);
    };

    const linkEmail = async (email: string) => {
        try {
            const res = await fetch('/api/auth/link-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            return { success: res.ok, message: data.message || (res.ok ? 'Email linked!' : 'Failed to link email.') };
        } catch {
            return { success: false, message: 'Could not connect to server.' };
        }
    };

    const forgotPassword = async (usernameOrEmail: string) => {
        const trimmed = usernameOrEmail.trim();
        const isEmail = trimmed.includes('@');
        const body = isEmail ? { email: trimmed } : { username: trimmed };
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            return { success: res.ok, message: data.message || (res.ok ? 'Reset email sent!' : 'Failed.') };
        } catch {
            return { success: false, message: 'Could not connect to server.' };
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, remembered, login, register, logout, linkEmail, forgotPassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

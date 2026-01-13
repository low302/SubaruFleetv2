import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check authentication status on mount
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await auth.checkAuth();
            if (response.authenticated) {
                setUser({ username: response.username });
            } else {
                setUser(null);
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (username, password) => {
        try {
            setError(null);
            setIsLoading(true);
            const response = await auth.login(username, password);
            if (response.success) {
                setUser({ username: response.username });
                return { success: true };
            } else {
                setError(response.error || 'Login failed');
                return { success: false, error: response.error };
            }
        } catch (err) {
            const errorMessage = err.message || 'Login failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await auth.logout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
        }
    }, []);

    const value = {
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        logout,
        checkAuthStatus,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;

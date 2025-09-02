import { Navigate } from "react-router-dom"
import { checkAuthSync } from "../utils/authUtils"
import { useState, useEffect } from "react"

export const AdminPrivateRoute = ({children}) => {
    const [authChecked, setAuthChecked] = useState(false);
    const [authState, setAuthState] = useState({ isLoggedIn: false, role: null });

    useEffect(() => {
        // Perform auth check with a small delay to ensure localStorage is ready
        const checkAuth = () => {
            try {
                const authResult = checkAuthSync();
                setAuthState(authResult);
                setAuthChecked(true);
                
                console.log('AdminPrivateRoute auth check:', authResult);
            } catch (error) {
                console.error('AdminPrivateRoute auth check failed:', error);
                setAuthState({ isLoggedIn: false, role: null });
                setAuthChecked(true);
            }
        };

        // Small delay to ensure localStorage is properly loaded
        const timeout = setTimeout(checkAuth, 100);
        return () => clearTimeout(timeout);
    }, []);

    // Show loading while checking auth
    if (!authChecked) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }
    
    // Allow both ADMIN and SUPER_ADMIN roles to access admin routes
    const isAdmin = authState.role === 'ADMIN' || authState.role === 'SUPER_ADMIN';
    
    return (authState.isLoggedIn && isAdmin) ? children : <Navigate to="/" replace />
}
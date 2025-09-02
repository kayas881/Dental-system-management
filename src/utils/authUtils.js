import { supabase } from '../supabase/supabaseClient';

// Utility to check if user is logged in synchronously
export const checkAuthSync = () => {
    try {
        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('user_role');
        const userId = localStorage.getItem('user_id');
        
        // Check if we have both token and user info
        if (!token || !userId) {
            return { isLoggedIn: false, role: null };
        }
        
        // Basic token validation (check if it looks like a JWT)
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            return { isLoggedIn: false, role: null };
        }
        
        // Additional check: try to decode the token to see if it's expired
        try {
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Math.floor(Date.now() / 1000);
            
            // If token is expired, clear storage and return false
            if (payload.exp && payload.exp < now) {
                console.warn('Token expired, clearing auth state');
                localStorage.clear();
                return { isLoggedIn: false, role: null };
            }
        } catch (tokenError) {
            console.warn('Token decode error:', tokenError);
            // If we can't decode the token, assume it's invalid
            localStorage.clear();
            return { isLoggedIn: false, role: null };
        }
        
        return { isLoggedIn: true, role: userRole };
    } catch (error) {
        console.error('Auth check error:', error);
        return { isLoggedIn: false, role: null };
    }
};

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            localStorage.clear();
            callback({ isLoggedIn: false, session: null });
        } else {
            callback({ isLoggedIn: true, session });
        }
    });
};
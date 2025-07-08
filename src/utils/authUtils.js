import { supabase } from '../supabase/supabaseClient';

// Utility to check if user is logged in synchronously
export const checkAuthSync = () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('user_role');
    const userId = localStorage.getItem('user_id');
    
    console.log('checkAuthSync - localStorage check:', { 
        hasToken: !!token, 
        userRole, 
        hasUserId: !!userId 
    });
    
    // Check if we have both token and user info
    if (!token || !userId) {
        console.log('checkAuthSync - Missing token or userId');
        return { isLoggedIn: false, role: null };
    }
    
    // Basic token validation (check if it looks like a JWT)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
        console.log('checkAuthSync - Invalid token format');
        return { isLoggedIn: false, role: null };
    }
    
    console.log('checkAuthSync - Auth valid:', { isLoggedIn: true, role: userRole });
    return { isLoggedIn: true, role: userRole };
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
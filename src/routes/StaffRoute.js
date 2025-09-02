import { Navigate } from "react-router-dom"
import { checkAuthSync } from "../utils/authUtils"

export const StaffRoute = ({children}) => {
    const { isLoggedIn, role } = checkAuthSync();
    
    console.log('StaffRoute auth check:', { isLoggedIn, role });
    
    if (!isLoggedIn) {
        console.log('StaffRoute: User not logged in, redirecting to login');
        return <Navigate to="/" />;
    }
    
    // Allow USER, ADMIN, and SUPER_ADMIN roles to access staff routes
    // Admins should have access to everything that staff can access
    const allowedRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(role)) {
        console.log('StaffRoute: User role not allowed, current role:', role);
        return <Navigate to="/" />;
    }
    
    console.log('StaffRoute: Access granted for role:', role);
    return children;
}

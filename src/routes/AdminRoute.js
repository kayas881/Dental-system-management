import { Navigate } from "react-router-dom"
import { checkAuthSync } from "../utils/authUtils"

export const AdminPrivateRoute = ({children}) => {
    const { isLoggedIn, role } = checkAuthSync();
    
    // Allow both ADMIN and SUPER_ADMIN roles to access admin routes
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    
    console.log('AdminPrivateRoute auth check:', { isLoggedIn, role, isAdmin });
    
    return (isLoggedIn && isAdmin) ? children : <Navigate to="/" />
}
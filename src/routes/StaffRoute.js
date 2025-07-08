import { Navigate } from "react-router-dom"
import { checkAuthSync } from "../utils/authUtils"

export const StaffRoute = ({children}) => {
    const { isLoggedIn, role } = checkAuthSync();
    
    console.log('StaffRoute auth check:', { isLoggedIn, role });
    
    if (!isLoggedIn) {
        console.log('StaffRoute: User not logged in, redirecting to login');
        return <Navigate to="/" />;
    }
    
    if (role !== 'USER') {
        console.log('StaffRoute: User role is not USER, current role:', role);
        return <Navigate to="/" />;
    }
    
    console.log('StaffRoute: Access granted');
    return children;
}

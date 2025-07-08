import { Navigate } from "react-router-dom"
import { checkAuthSync } from "../utils/authUtils"

export const AdminPrivateRoute = ({children}) => {
    const { isLoggedIn, role } = checkAuthSync();
    
    return (isLoggedIn && role === 'ADMIN') ? children : <Navigate to="/" />
}
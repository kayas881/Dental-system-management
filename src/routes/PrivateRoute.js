import { Navigate } from "react-router-dom"
import { checkAuthSync } from "../utils/authUtils"

export const PrivateRoute = ({children}) => {
    const { isLoggedIn } = checkAuthSync();
    
    return isLoggedIn ? children : <Navigate to="/" />
}
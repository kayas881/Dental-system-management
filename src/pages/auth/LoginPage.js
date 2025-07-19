import { useState } from "react";
import { authService } from "../../services/supabaseAuthService";
import { useNavigate } from "react-router-dom";
import './LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState(""); 
    const [password, setPassword] = useState(""); 
    const navigate =  useNavigate();
    
    const submitForm = async(event) => {
        event.preventDefault();
        const userData = { email, password}
        const response =  await authService.login(userData);
        console.log(response?.data);
        
        if(response?.data?.accessToken){
            authService.setToken(response?.data?.accessToken);
            
            // Role-based redirect
            const userRole = response?.data?.role;
            console.log('User role for redirect:', userRole);
            
            if (userRole === 'ADMIN') {
                navigate('/admin-dashboard');
            } else if (userRole === 'USER') {
                navigate('/staff-dashboard');
            } else {
                // Fallback to staff dashboard for unknown roles
                navigate('/staff-dashboard');
            }
        }
        
      }

    return (
        <div className="login-page">
            <div className="login-background">
                <div className="container-fluid">
                    <div className="row min-vh-100">
                        {/* Left Side - Company Branding */}
                        <div className="col-lg-6 d-none d-lg-flex company-branding">
                            <div className="branding-content">
                                <div className="company-logo-large">
                                    <img 
                                        src="/logo.png" 
                                        alt="MARSHAL DENTAL ART" 
                                        className="logo-image"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                </div>
                                <h1 className="company-title">MARSHAL DENTAL ART</h1>
                                <h2 className="company-subtitle">CAD Cam Milling Center</h2>
                                <div className="company-details">
                                    <p className="address">📍Harmony Archade industrial estate building no B.106 behind pranayu hospital pimpalghar Bhiwandi-421311</p>
                                    <p className="contact">📞 9920559121 / 8692884526 / 8655131595</p>
                                </div>
                                <div className="features-list">
                                    <div className="feature-item">
                                        <span className="feature-icon">🦷</span>
                                        <span>Professional Dental Lab Services</span>
                                    </div>
                                    <div className="feature-item">
                                        <span className="feature-icon">⚙️</span>
                                        <span>Advanced CAD/CAM Technology</span>
                                    </div>
                                    <div className="feature-item">
                                        <span className="feature-icon">💎</span>
                                        <span>Premium Quality Solutions</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Login Form */}
                        <div className="col-lg-6 d-flex align-items-center justify-content-center login-form-section">
                            <div className="login-card">
                                <div className="login-header">
                                    <div className="d-lg-none mb-4 text-center">
                                        <img 
                                            src="/logo.png" 
                                            alt="MARSHAL DENTAL ART" 
                                            className="mobile-logo"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                        <h3 className="mobile-company-name">MARSHAL DENTAL ART</h3>
                                    </div>
                                    <h3 className="login-title">🔐 System Login</h3>
                                    <p className="login-subtitle">Enter your credentials to access the dental lab management system</p>
                                </div>
                                <form onSubmit={submitForm} className="login-form">
                                    <div className="form-group mb-3">
                                        <label htmlFor="email" className="form-label">Email address</label>
                                        <input 
                                            type="email"  
                                            value={email}  
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="form-control" 
                                            id="email" 
                                            placeholder="Enter your email address"
                                            required
                                        />
                                    </div>
                                    <div className="form-group mb-3">
                                        <label htmlFor="password" className="form-label">Password</label>
                                        <input 
                                            type="password"  
                                            value={password}  
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="form-control" 
                                            id="password" 
                                            placeholder="Enter your password"
                                            required
                                        />
                                    </div>
                                    <div className="d-grid">
                                        <button type="submit" className="btn btn-primary btn-lg">
                                            Login
                                        </button>
                                    </div>
                                </form>
                            </div>
                      
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
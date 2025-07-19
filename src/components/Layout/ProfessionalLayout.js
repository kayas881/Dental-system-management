import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/supabaseAuthService';
import './ProfessionalLayout.css';

const ProfessionalLayout = ({ children }) => {
    const [userEmail, setUserEmail] = useState('');
    const [userRole, setUserRole] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const loadUserData = async () => {
            const email = authService.getUserEmail();
            const role = authService.getUserRole();
            setUserEmail(email || '');
            setUserRole(role || '');
        };
        loadUserData();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowUserDropdown(false);
            }
        };

        const handleResize = () => {
            // Close dropdown on window resize to prevent positioning issues
            if (showUserDropdown) {
                setShowUserDropdown(false);
            }
        };

        if (showUserDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', handleResize);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', handleResize);
        };
    }, [showUserDropdown]);

    const handleLogout = async () => {
        await authService.logout();
        navigate('/');
    };

    const getUserInitials = () => {
        if (!userEmail) return 'U';
        const parts = userEmail.split('@')[0].split('.');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return userEmail[0].toUpperCase();
    };

    const getNavigationItems = () => {
        const isAdmin = userRole === 'ADMIN' || userRole === 'admin';
        const isStaff = userRole === 'STAFF' || userRole === 'staff';

        if (isAdmin) {
            return [
                { path: '/admin-dashboard', icon: '🏠', label: 'Dashboard' },
                { path: '/admin/monthly-billing', icon: '💰', label: 'Monthly Billing & Pricing' },
                { path: '/user-management', icon: '👥', label: 'User Management' },
            ];
        } else if (isStaff) {
            return [
                { path: '/staff-dashboard', icon: '🏠', label: 'Dashboard' },
                { path: '/work-order-form', icon: '📝', label: 'Create Work Order' },
                { path: '/batch-work-order', icon: '📋', label: 'Batch Work Orders' },
                { path: '/work-orders-list', icon: '📊', label: 'Work Orders & Billing' },
            ];
        }
        return [];
    };

    const isCurrentPath = (path) => {
        return location.pathname === path;
    };

    const getCurrentPageTitle = () => {
        const path = location.pathname;
        const pathMap = {
            '/admin-dashboard': 'Admin Dashboard',
            '/staff-dashboard': 'Staff Dashboard',
            '/admin/monthly-billing': 'Monthly Billing & Pricing',
            '/user-management': 'User Management',
            '/work-order-form': 'Create Work Order',
            '/batch-work-order': 'Batch Work Orders',
            '/work-orders-list': 'Work Orders & Billing'
        };
        return pathMap[path] || 'Dashboard';
    };

    return (
        <div className="professional-layout">
            {/* Sticky Navigation Bar */}
            <nav className="navbar navbar-expand-lg navbar-dark professional-navbar">
                <div className="container-fluid px-4">
                    {/* Company Logo and Name */}
                    <div className="navbar-brand-section d-flex align-items-center">
                        <button 
                            className="btn btn-link text-white p-0 me-3 sidebar-toggle"
                            onClick={() => setShowSidebar(!showSidebar)}
                            type="button"
                        >
                            <i className="fas fa-bars fs-5"></i>
                        </button>
                        <img 
                            src="/logo.png" 
                            alt="MARSHAL DENTAL ART" 
                            className="company-logo me-3"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="company-info">
                            <div className="company-name">MARSHAL DENTAL ART</div>
                            <div className="company-subtitle">CAD Cam Milling Center</div>
                        </div>
                    </div>

                    {/* User Account Section */}
                    <div className="user-section">
                        <div className="user-info me-3 text-end">
                            <div className="user-email">{userEmail}</div>
                            <div className="user-role">{userRole}</div>
                        </div>
                        <div className="dropdown" ref={dropdownRef}>
                            <button 
                                className="btn user-avatar"
                                onClick={() => setShowUserDropdown(!showUserDropdown)}
                                type="button"
                            >
                                <div className="avatar-circle">
                                    {getUserInitials()}
                                </div>
                            </button>
                            {showUserDropdown && (
                                <div className="dropdown-menu dropdown-menu-end show user-dropdown">
                                    <div className="dropdown-header">
                                        <strong>{userEmail}</strong>
                                        <br />
                                        <small className="text-muted">{userRole}</small>
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    <button 
                                        className="dropdown-item"
                                        onClick={() => {
                                            setShowUserDropdown(false);
                                            // Could add profile page navigation here
                                        }}
                                    >
                                        <i className="fas fa-user me-2"></i>
                                        Profile Settings
                                    </button>
                                    <button 
                                        className="dropdown-item text-danger"
                                        onClick={handleLogout}
                                    >
                                        <i className="fas fa-sign-out-alt me-2"></i>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Sidebar */}
            <div className={`sidebar ${showSidebar ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <h5 className="mb-0">Navigation</h5>
                    <button 
                        className="btn btn-sm btn-outline-light"
                        onClick={() => setShowSidebar(false)}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="sidebar-content">
                    <ul className="nav flex-column">
                        {getNavigationItems().map((item, index) => (
                            <li key={index} className="nav-item">
                                <button
                                    className={`nav-link ${isCurrentPath(item.path) ? 'active' : ''}`}
                                    onClick={() => {
                                        navigate(item.path);
                                        setShowSidebar(false);
                                    }}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    <span className="nav-label">{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Sidebar Overlay */}
            {showSidebar && (
                <div 
                    className="sidebar-overlay"
                    onClick={() => setShowSidebar(false)}
                ></div>
            )}

            {/* Main Content */}
            <main className="main-content">
                {/* Breadcrumb */}
                <div className="content-wrapper">
                    <nav aria-label="breadcrumb" className="professional-breadcrumb">
                        <ol className="breadcrumb mb-0">
                            <li className="breadcrumb-item">
                                <span className="status-indicator online"></span>
                                MARSHAL DENTAL ART
                            </li>
                            <li className="breadcrumb-item active" aria-current="page">
                                {getCurrentPageTitle()}
                            </li>
                        </ol>
                    </nav>
                    {children}
                </div>
            </main>

            {/* Company Footer */}
            <footer className="professional-footer">
                <div className="container-fluid px-4">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <div className="footer-info">
                                <strong>MARSHAL DENTAL ART</strong> - CAD Cam Milling Center
                                <br />
                                <small className="text-muted">
                                    📍Harmony Archade industrial estate building no B.106 behind pranayu hospital pimpalghar Bhiwandi-421311
                                </small>
                            </div>
                        </div>
                        <div className="col-md-3 text-center">
                            <small className="text-muted">
                                <span className="status-indicator online"></span>
                                System Online | Logged in as <strong>{userRole}</strong>
                            </small>
                        </div>
                        <div className="col-md-3 text-end">
                            <small className="text-muted">
                                © 2025 Marshal Dental Art. All rights reserved.
                            </small>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ProfessionalLayout;

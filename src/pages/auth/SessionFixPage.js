import React, { useState } from 'react';
import { authService } from '../../services/supabaseAuthService';
import { useNavigate } from 'react-router-dom';

const SessionFixPage = () => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const fixSession = async () => {
        setLoading(true);
        setMessage('Fixing user session...');
        
        try {
            const userId = await authService.fixUserSession();
            if (userId) {
                setMessage('✅ Session fixed successfully! You can now create work orders.');
                setTimeout(() => {
                    navigate('/staff-dashboard');
                }, 2000);
            } else {
                setMessage('❌ Could not fix session. Please log out and log in again.');
            }
        } catch (error) {
            setMessage('❌ Error fixing session: ' + error.message);
        }
        
        setLoading(false);
    };

    const forceLogout = async () => {
        await authService.logOut();
        navigate('/');
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">
                            <h4>🔧 Fix User Session</h4>
                        </div>
                        <div className="card-body">
                            <div className="alert alert-warning">
                                <strong>Session Issue Detected</strong><br/>
                                Your user session has an invalid ID format. This can happen after system updates.
                            </div>
                            
                            {message && (
                                <div className={`alert ${message.includes('✅') ? 'alert-success' : message.includes('❌') ? 'alert-danger' : 'alert-info'}`}>
                                    {message}
                                </div>
                            )}

                            <h6>Option 1: Try to Fix Session</h6>
                            <p>Attempt to automatically fix your session:</p>
                            <button 
                                className="btn btn-primary mb-3" 
                                onClick={fixSession}
                                disabled={loading}
                            >
                                {loading ? 'Fixing...' : 'Fix Session'}
                            </button>

                            <h6>Option 2: Fresh Login</h6>
                            <p>Log out and log in again with fresh credentials:</p>
                            <button 
                                className="btn btn-secondary" 
                                onClick={forceLogout}
                            >
                                Log Out & Start Fresh
                            </button>

                            <hr />
                            <button 
                                className="btn btn-outline-primary" 
                                onClick={() => navigate('/staff-dashboard')}
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionFixPage;

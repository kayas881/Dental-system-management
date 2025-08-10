import React, { useState } from 'react';
import { authService } from '../../services/supabaseAuthService';

const QuickPasswordChange = ({ onClose, userEmail }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    const showMessage = (msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            setMessage('');
            setMessageType('');
        }, 4000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            showMessage('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showMessage('New password must be at least 6 characters long', 'error');
            return;
        }

        if (!currentPassword) {
            showMessage('Current password is required', 'error');
            return;
        }

        setLoading(true);
        
        try {
            const response = await authService.changeOwnPassword(currentPassword, newPassword);
            
            if (response.success) {
                showMessage('Password changed successfully! You may need to log in again.', 'success');
                // Clear form
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                
                // Close modal after 2 seconds
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                showMessage(response.error || 'Failed to change password', 'error');
            }
        } catch (error) {
            showMessage('Error changing password: ' + error.message, 'error');
        }
        
        setLoading(false);
    };

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-sm">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">🔑 Change Password</h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={onClose}
                        ></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {message && (
                                <div className={`alert ${messageType === 'success' ? 'alert-success' : messageType === 'error' ? 'alert-danger' : 'alert-info'} alert-dismissible fade show`}>
                                    {message}
                                </div>
                            )}
                            
                            <div className="alert alert-info">
                                <small>
                                    <strong>Account:</strong> {userEmail}
                                    <br />
                                    <strong>🔐 Security:</strong> Enter your current password to verify identity
                                </small>
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label">Current Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    required
                                    autoFocus
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label">New Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    minLength="6"
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                    minLength="6"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                type="button" 
                                className="btn btn-secondary btn-sm"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-warning btn-sm"
                                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                            >
                                {loading ? 'Changing...' : 'Change Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default QuickPasswordChange;

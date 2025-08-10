import React, { useState } from 'react';
import { authService } from '../../services/supabaseAuthService';

const PasswordManagement = ({ users, onPasswordChanged }) => {
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [showOwnPasswordModal, setShowOwnPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    
    // For changing other user's password
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // For changing own password
    const [currentPassword, setCurrentPassword] = useState('');
    const [ownNewPassword, setOwnNewPassword] = useState('');
    const [ownConfirmPassword, setOwnConfirmPassword] = useState('');

    const showMessage = (msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            setMessage('');
            setMessageType('');
        }, 5000);
    };

    const handleChangeUserPassword = (user) => {
        setSelectedUser(user);
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePasswordModal(true);
    };

    const handleChangeOwnPassword = () => {
        setCurrentPassword('');
        setOwnNewPassword('');
        setOwnConfirmPassword('');
        setShowOwnPasswordModal(true);
    };

    const submitPasswordChange = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        setLoading(true);
        
        try {
            const response = await authService.changeUserPassword(selectedUser.user_id, newPassword);
            
            if (response.success) {
                showMessage(response.message, 'success');
                setShowChangePasswordModal(false);
                if (onPasswordChanged) onPasswordChanged();
            } else {
                showMessage(response.error || 'Failed to change password', 'error');
            }
        } catch (error) {
            showMessage('Error changing password: ' + error.message, 'error');
        }
        
        setLoading(false);
    };

    const submitOwnPasswordChange = async (e) => {
        e.preventDefault();
        
        if (ownNewPassword !== ownConfirmPassword) {
            showMessage('New passwords do not match', 'error');
            return;
        }

        if (ownNewPassword.length < 6) {
            showMessage('New password must be at least 6 characters long', 'error');
            return;
        }

        if (!currentPassword) {
            showMessage('Current password is required', 'error');
            return;
        }

        setLoading(true);
        
        try {
            const response = await authService.changeOwnPassword(currentPassword, ownNewPassword);
            
            if (response.success) {
                showMessage(response.message, 'success');
                setShowOwnPasswordModal(false);
                if (onPasswordChanged) onPasswordChanged();
            } else {
                showMessage(response.error || 'Failed to change password', 'error');
            }
        } catch (error) {
            showMessage('Error changing password: ' + error.message, 'error');
        }
        
        setLoading(false);
    };

    const generateStrongPassword = () => {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        setNewPassword(password);
        setConfirmPassword(password);
    };

    return (
        <>
            {/* Message Display */}
            {message && (
                <div className={`alert ${messageType === 'success' ? 'alert-success' : messageType === 'error' ? 'alert-danger' : 'alert-info'} alert-dismissible fade show`}>
                    {message}
                    <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
                </div>
            )}

            {/* Password Management Actions */}
            <div className="card mb-4">
                <div className="card-header">
                    <h5>🔐 Password Management</h5>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <button 
                                className="btn btn-warning w-100 mb-2"
                                onClick={handleChangeOwnPassword}
                            >
                                🔑 Change My Password
                            </button>
                            <small className="text-muted">
                                Change your own admin password for security
                            </small>
                        </div>
                        <div className="col-md-6">
                            <div className="alert alert-info mb-0">
                                <strong>💡 Security Tips:</strong>
                                <ul className="mb-0 mt-2">
                                    <li>Use passwords with at least 6 characters</li>
                                    <li>Include numbers and special characters</li>
                                    <li>Change passwords regularly</li>
                                    <li>Don't share passwords with anyone</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* User List with Password Change Options */}
            <div className="card">
                <div className="card-header">
                    <h5>👥 Users - Password Management</h5>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.email}</td>
                                        <td>
                                            <span className={`badge ${user.role === 'ADMIN' ? 'bg-danger' : 'bg-primary'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-warning"
                                                onClick={() => handleChangeUserPassword(user)}
                                                disabled={loading}
                                            >
                                                🔐 Change Password
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Change User Password Modal */}
            {showChangePasswordModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    🔐 Change Password for {selectedUser?.email}
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowChangePasswordModal(false)}
                                ></button>
                            </div>
                            <form onSubmit={submitPasswordChange}>
                                <div className="modal-body">
                                    <div className="alert alert-warning">
                                        <strong>⚠️ Warning:</strong> This will immediately change the password for this user. 
                                        Make sure to communicate the new password securely.
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">New Password</label>
                                        <div className="input-group">
                                            <input
                                                type="password"
                                                className="form-control"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Enter new password"
                                                required
                                                minLength="6"
                                            />
                                            <button 
                                                type="button" 
                                                className="btn btn-outline-secondary"
                                                onClick={generateStrongPassword}
                                            >
                                                🎲 Generate
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">Confirm Password</label>
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

                                    {newPassword && (
                                        <div className="alert alert-info">
                                            <strong>📋 New Password:</strong> 
                                            <code className="ms-2">{newPassword}</code>
                                            <br />
                                            <small>Make sure to save this password securely!</small>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={() => setShowChangePasswordModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-warning"
                                        disabled={loading || !newPassword || !confirmPassword}
                                    >
                                        {loading ? 'Changing...' : 'Change Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Own Password Modal */}
            {showOwnPasswordModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">🔑 Change My Password</h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowOwnPasswordModal(false)}
                                ></button>
                            </div>
                            <form onSubmit={submitOwnPasswordChange}>
                                <div className="modal-body">
                                    <div className="alert alert-info">
                                        <strong>🔐 Security Check:</strong> Enter your current password to verify your identity.
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">Current Password</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Enter your current password"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">New Password</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={ownNewPassword}
                                            onChange={(e) => setOwnNewPassword(e.target.value)}
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
                                            value={ownConfirmPassword}
                                            onChange={(e) => setOwnConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                            required
                                            minLength="6"
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={() => setShowOwnPasswordModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-warning"
                                        disabled={loading || !currentPassword || !ownNewPassword || !ownConfirmPassword}
                                    >
                                        {loading ? 'Changing...' : 'Change My Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PasswordManagement;

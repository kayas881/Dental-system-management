import React, { useState, useEffect } from 'react';
import { authService } from '../../services/supabaseAuthService';

const SuperAdminControls = ({ users, onUserAction }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showDemoteModal, setShowDemoteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        checkSuperAdminStatus();
    }, []);

    const checkSuperAdminStatus = async () => {
        const superAdminStatus = await authService.isSuperAdmin();
        setIsSuperAdmin(superAdminStatus);
    };

    const showMessage = (msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            setMessage('');
            setMessageType('');
        }, 5000);
    };

    const handlePromoteToAdmin = async () => {
        if (!selectedUser) return;
        
        setLoading(true);
        try {
            const response = await authService.promoteToAdmin(selectedUser.user_id);
            
            if (response.success) {
                showMessage(response.message, 'success');
                setShowPromoteModal(false);
                if (onUserAction) onUserAction();
            } else {
                showMessage(response.error || 'Failed to promote user', 'error');
            }
        } catch (error) {
            showMessage('Error promoting user: ' + error.message, 'error');
        }
        setLoading(false);
    };

    const handleDemoteFromAdmin = async () => {
        if (!selectedUser) return;
        
        setLoading(true);
        try {
            const response = await authService.demoteFromAdmin(selectedUser.user_id);
            
            if (response.success) {
                showMessage(response.message, 'success');
                setShowDemoteModal(false);
                if (onUserAction) onUserAction();
            } else {
                showMessage(response.error || 'Failed to demote user', 'error');
            }
        } catch (error) {
            showMessage('Error demoting user: ' + error.message, 'error');
        }
        setLoading(false);
    };

    const handleDeleteUser = async (user) => {
        if (window.confirm(`⚠️ Are you sure you want to permanently delete user: ${user.email}?`)) {
            setLoading(true);
            try {
                const response = await authService.deleteUser(user.user_id);
                
                if (response.success) {
                    showMessage(`User ${user.email} deleted successfully`, 'success');
                    if (onUserAction) onUserAction();
                } else {
                    showMessage(response.error?.message || 'Failed to delete user', 'error');
                }
            } catch (error) {
                showMessage('Error deleting user: ' + error.message, 'error');
            }
            setLoading(false);
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="alert alert-warning">
                <h5>🔒 Super Admin Controls</h5>
                <p>Access denied. Only Super Admin can access these advanced controls.</p>
            </div>
        );
    }

    return (
        <>
            {/* Message Display */}
            {message && (
                <div className={`alert ${messageType === 'success' ? 'alert-success' : messageType === 'error' ? 'alert-danger' : 'alert-info'} alert-dismissible fade show`}>
                    {message}
                    <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
                </div>
            )}

            {/* Super Admin Header */}
            <div className="card mb-4">
                <div className="card-header bg-dark text-white">
                    <h5>👑 Super Admin Controls</h5>
                </div>
                <div className="card-body">
                    <div className="alert alert-warning">
                        <strong>⚠️ Warning:</strong> You have Super Admin privileges. These actions affect system security and user access.
                        <ul className="mb-0 mt-2">
                            <li>You can promote/demote admin users</li>
                            <li>You can delete any user except Super Admins</li>
                            <li>Your password cannot be changed through normal interface</li>
                            <li>Your account cannot be deleted for security</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Enhanced User Management Table */}
            <div className="card">
                <div className="card-header">
                    <h5>👥 Enhanced User Management</h5>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => {
                                    const isCurrentUser = user.user_id === authService.getUserId();
                                    const isSuperUser = user.is_super_admin === true || user.role === 'SUPER_ADMIN';
                                    
                                    return (
                                        <tr key={user.id}>
                                            <td>
                                                {user.email}
                                                {isCurrentUser && <span className="badge bg-info ms-2">You</span>}
                                            </td>
                                            <td>
                                                <span className={`badge ${
                                                    isSuperUser ? 'bg-dark' : 
                                                    user.role === 'ADMIN' ? 'bg-danger' : 'bg-primary'
                                                }`}>
                                                    {isSuperUser ? '👑 SUPER ADMIN' : user.role}
                                                </span>
                                            </td>
                                            <td>
                                                {isSuperUser ? (
                                                    <span className="badge bg-success">Protected</span>
                                                ) : user.role === 'ADMIN' ? (
                                                    <span className="badge bg-warning">Admin</span>
                                                ) : (
                                                    <span className="badge bg-secondary">User</span>
                                                )}
                                            </td>
                                            <td>
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div className="btn-group btn-group-sm">
                                                    {/* Promote to Admin */}
                                                    {user.role === 'USER' && !isSuperUser && (
                                                        <button
                                                            className="btn btn-success"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setShowPromoteModal(true);
                                                            }}
                                                            disabled={loading}
                                                        >
                                                            ⬆️ Promote
                                                        </button>
                                                    )}
                                                    
                                                    {/* Demote from Admin */}
                                                    {user.role === 'ADMIN' && !isSuperUser && (
                                                        <button
                                                            className="btn btn-warning"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setShowDemoteModal(true);
                                                            }}
                                                            disabled={loading}
                                                        >
                                                            ⬇️ Demote
                                                        </button>
                                                    )}
                                                    
                                                    {/* Delete User */}
                                                    {!isCurrentUser && !isSuperUser && (
                                                        <button
                                                            className="btn btn-danger"
                                                            onClick={() => handleDeleteUser(user)}
                                                            disabled={loading}
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    )}
                                                    
                                                    {/* Super Admin Protection Message */}
                                                    {isSuperUser && (
                                                        <span className="text-muted">
                                                            🔒 Protected Account
                                                        </span>
                                                    )}
                                                    
                                                    {/* Current User Protection */}
                                                    {isCurrentUser && !isSuperUser && (
                                                        <span className="text-muted">
                                                            Current User
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Promote to Admin Modal */}
            {showPromoteModal && selectedUser && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">⬆️ Promote to Admin</h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowPromoteModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-warning">
                                    <strong>⚠️ Confirm Admin Promotion</strong>
                                    <p className="mb-0">
                                        You are about to promote <strong>{selectedUser.email}</strong> to Admin.
                                        This will give them administrative privileges including:
                                    </p>
                                    <ul className="mt-2 mb-0">
                                        <li>Manage work orders and bills</li>
                                        <li>Change user passwords</li>
                                        <li>View admin dashboard</li>
                                        <li>Manage regular users</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowPromoteModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-success"
                                    onClick={handlePromoteToAdmin}
                                    disabled={loading}
                                >
                                    {loading ? 'Promoting...' : '⬆️ Promote to Admin'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Demote from Admin Modal */}
            {showDemoteModal && selectedUser && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">⬇️ Demote from Admin</h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowDemoteModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-danger">
                                    <strong>⚠️ Confirm Admin Demotion</strong>
                                    <p className="mb-0">
                                        You are about to demote <strong>{selectedUser.email}</strong> from Admin to User.
                                        They will lose all administrative privileges and will only be able to:
                                    </p>
                                    <ul className="mt-2 mb-0">
                                        <li>Create and manage their own work orders</li>
                                        <li>View their own bills</li>
                                        <li>Access staff dashboard only</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowDemoteModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-warning"
                                    onClick={handleDemoteFromAdmin}
                                    disabled={loading}
                                >
                                    {loading ? 'Demoting...' : '⬇️ Demote from Admin'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SuperAdminControls;

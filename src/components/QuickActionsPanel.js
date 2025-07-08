import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './QuickActionsPanel.css';

const QuickActionsPanel = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const quickActions = [
        {
            id: 'bills',
            icon: '💰',
            label: 'Bills Management',
            description: 'Manage bills and pricing',
            action: () => navigate('/bills-management'),
            color: '#3498db'
        },
        {
            id: 'users',
            icon: '👥',
            label: 'User Management',
            description: 'Create and manage user accounts',
            action: () => navigate('/user-management'),
            color: '#27ae60'
        },
        {
            id: 'analytics',
            icon: '📊',
            label: 'Analytics',
            description: 'View business insights',
            action: () => navigate('/analytics'),
            color: '#f39c12'
        },
        {
            id: 'monitor',
            icon: '🖥️',
            label: 'System Monitor',
            description: 'Check system health',
            action: () => navigate('/system-monitor'),
            color: '#9b59b6'
        },
        {
            id: 'batch-bill',
            icon: '📋',
            label: 'Batch Bill',
            description: 'Create grouped billing',
            action: () => navigate('/admin/grouped-bill'),
            color: '#e74c3c'
        },
        {
            id: 'audit',
            icon: '📝',
            label: 'Audit Log',
            description: 'View system logs',
            action: () => navigate('/audit-log'),
            color: '#34495e'
        }
    ];

    const handleActionClick = (action) => {
        action.action();
        setIsOpen(false);
    };

    return (
        <div className={`quick-actions-panel ${isOpen ? 'open' : ''}`}>
            {/* Main Action Button */}
            <button
                className="main-action-btn"
                onClick={() => setIsOpen(!isOpen)}
                title="Quick Actions"
            >
                {isOpen ? '✕' : '⚡'}
            </button>

            {/* Actions List */}
            <div className="actions-list">
                {quickActions.map((action, index) => (
                    <button
                        key={action.id}
                        className="action-btn"
                        onClick={() => handleActionClick(action)}
                        style={{ 
                            '--action-color': action.color,
                            '--action-delay': `${index * 0.1}s`
                        }}
                        title={action.description}
                    >
                        <span className="action-icon">{action.icon}</span>
                        <span className="action-label">{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="actions-backdrop" 
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default QuickActionsPanel;

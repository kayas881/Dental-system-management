import React from 'react';
import { useNavigate } from 'react-router-dom';

const PageHeader = ({ 
    title, 
    backPath = null, 
    backLabel = "Back to Dashboard",
    actions = null 
}) => {
    const navigate = useNavigate();

    return (
        <div className="card-header d-flex justify-content-between align-items-center">
            <h4>{title}</h4>
            <div className="action-buttons">
                {actions && actions}
                {backPath && (
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => navigate(backPath)}
                    >
                        {backLabel}
                    </button>
                )}
            </div>
        </div>
    );
};

export default PageHeader;

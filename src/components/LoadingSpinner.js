import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
    size = 'medium', 
    message = 'Loading...', 
    overlay = false,
    centered = true 
}) => {
    const sizeClasses = {
        small: 'spinner-small',
        medium: 'spinner-medium', 
        large: 'spinner-large'
    };

    const spinnerContent = (
        <div className={`loading-spinner ${centered ? 'spinner-centered' : ''}`}>
            <div className={`professional-spinner ${sizeClasses[size]}`}>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-logo">
                    <img 
                        src="/logo.png" 
                        alt="MARSHAL DENTAL ART"
                        className="spinner-logo-img"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
            </div>
            {message && (
                <div className="spinner-message">
                    {message}
                </div>
            )}
        </div>
    );

    if (overlay) {
        return (
            <div className="loading-overlay">
                {spinnerContent}
            </div>
        );
    }

    return spinnerContent;
};

export default LoadingSpinner;

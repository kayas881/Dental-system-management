import React from 'react';
import './BillToothDisplay.css'; // Assuming you have a CSS file for styling
const BillToothDisplay = ({ toothNumbers, isPreview = false, size = 'normal' }) => {
    // Helper function to parse tooth numbers from various formats
    const groupToothsByQuadrant = (teethData) => {
        const nums = [];
        const collect = (x) => {
            if (x == null) return;
            if (Array.isArray(x)) return x.forEach(collect);
            if (typeof x === 'object') return Object.values(x).forEach(collect);
            if (typeof x === 'string') {
                try {
                    return collect(JSON.parse(x));
                } catch {
                    return x.split(/[^0-9]+/).forEach(collect);
                }
            }
            const n = parseInt(x, 10);
            if (!isNaN(n) && n >= 11 && n <= 48) nums.push(n);
        };
        collect(teethData);

        const q = {
            upperRight: [],
            upperLeft: [],
            lowerLeft: [],
            lowerRight: []
        };
        nums.forEach(n => {
            if (n >= 11 && n <= 18) q.upperRight.push(n);
            else if (n >= 21 && n <= 28) q.upperLeft.push(n);
            else if (n >= 31 && n <= 38) q.lowerLeft.push(n);
            else if (n >= 41 && n <= 48) q.lowerRight.push(n);
        });
        Object.values(q).forEach(arr => arr.sort((a, b) => a - b));
        return q;
    };

    const formatQuadrantDisplay = (teeth) => {
        // Convert to single digit display
        return teeth.map(t => t.toString().charAt(1)).join('');
    };

    const quadrants = groupToothsByQuadrant(toothNumbers);
    const parsedNumbers = [
        ...quadrants.upperRight,
        ...quadrants.upperLeft,
        ...quadrants.lowerLeft,
        ...quadrants.lowerRight
    ];

    if (parsedNumbers.length === 0) {
        return (
            <div className="tooth-display-empty">
                <small className="text-muted">No teeth specified</small>
            </div>
        );
    }

    const getSizeClass = () => {
        switch (size) {
            case 'mini': return 'tooth-display-mini';
            case 'small': return 'tooth-display-small';
            default: return '';
        }
    };

     return (
        <div className={`tooth-display ${getSizeClass()}`}>
            {isPreview && (
                <div className="mb-2">
                    <strong>Tooth Position(s):</strong>
                    <span className="ms-2 badge bg-primary">{parsedNumbers.join(', ')}</span>
                </div>
            )}
            
            <div className="quadrant-grid">
                {/* Upper Left Quadrant (Q2) */}
                <div className="quadrant-cell">
                    {quadrants.upperLeft.length > 0 ? formatQuadrantDisplay(quadrants.upperLeft) : '-'}
                </div>
                {/* Upper Right Quadrant (Q1) */}
                <div className="quadrant-cell">
                    {quadrants.upperRight.length > 0 ? formatQuadrantDisplay(quadrants.upperRight) : '-'}
                </div>
                {/* Lower Left Quadrant (Q3) */}
                <div className="quadrant-cell">
                    {quadrants.lowerLeft.length > 0 ? formatQuadrantDisplay(quadrants.lowerLeft) : '-'}
                </div>
                {/* Lower Right Quadrant (Q4) */}
                <div className="quadrant-cell">
                    {quadrants.lowerRight.length > 0 ? formatQuadrantDisplay(quadrants.lowerRight) : '-'}
                </div>
            </div>

            {isPreview && (
                <div className="mt-2">
                     <small className="text-muted"> 
                        Full notation: {parsedNumbers.join(', ')}
                    </small>
                </div>
            )}
        </div>
    );
};

export default BillToothDisplay;
import React from 'react';

const BillToothDisplay = ({ toothNumbers, isPreview = false, size = 'normal' }) => {
    // Group teeth by quadrants for display
    const groupToothsByQuadrant = (teeth) => {
        const quadrants = {
            upperRight: teeth.filter(t => t >= 11 && t <= 18),
            upperLeft: teeth.filter(t => t >= 21 && t <= 28),
            lowerLeft: teeth.filter(t => t >= 31 && t <= 38),
            lowerRight: teeth.filter(t => t >= 41 && t <= 48)
        };
        return quadrants;
    };

    const formatQuadrantDisplay = (teeth) => {
        // Convert to single digit display (your client's style)
        return teeth.map(t => t.toString().charAt(1)).join('');
    };

    const quadrants = groupToothsByQuadrant(toothNumbers || []);

    if (!toothNumbers || toothNumbers.length === 0) {
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
                    <span className="ms-2 badge bg-primary">{toothNumbers.join(', ')}</span>
                </div>
            )}
            
            {/* Quadrant Display (Your Client's Style) */}
            <div className="quadrant-display">
                <div className="quadrant-grid">
                    {/* Upper Row */}
                    <div className="quadrant-row upper-row">
                        <div className="quadrant-cell upper-right">
                            <div className="quadrant-label">UR</div>
                            <div className="quadrant-numbers">
                                {quadrants.upperRight.length > 0 ? formatQuadrantDisplay(quadrants.upperRight) : '-'}
                            </div>
                        </div>
                        <div className="quadrant-divider">|</div>
                        <div className="quadrant-cell upper-left">
                            <div className="quadrant-label">UL</div>
                            <div className="quadrant-numbers">
                                {quadrants.upperLeft.length > 0 ? formatQuadrantDisplay(quadrants.upperLeft) : '-'}
                            </div>
                        </div>
                    </div>
                    
                    {/* Horizontal Divider */}
                    <div className="horizontal-divider">
                        <hr />
                    </div>
                    
                    {/* Lower Row */}
                    <div className="quadrant-row lower-row">
                        <div className="quadrant-cell lower-right">
                            <div className="quadrant-label">LR</div>
                            <div className="quadrant-numbers">
                                {quadrants.lowerRight.length > 0 ? formatQuadrantDisplay(quadrants.lowerRight) : '-'}
                            </div>
                        </div>
                        <div className="quadrant-divider">|</div>
                        <div className="quadrant-cell lower-left">
                            <div className="quadrant-label">LL</div>
                            <div className="quadrant-numbers">
                                {quadrants.lowerLeft.length > 0 ? formatQuadrantDisplay(quadrants.lowerLeft) : '-'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Full Numbers Display (for reference) */}
            {isPreview && (
                <div className="mt-2">
                    <small className="text-muted">
                        Full notation: {toothNumbers.join(', ')}
                    </small>
                </div>
            )}
        </div>
    );
};

export default BillToothDisplay;

import React, { useState } from 'react';
import './ToothSelector.css';

const ToothSelector = ({ selectedTeeth, onTeethChange, disabled = false, patientName = '' }) => {
    const [inputMode, setInputMode] = useState('visual'); // 'visual' or 'text'

    // Tooth numbering system (FDI notation)
    const quadrants = {
        upperRight: { quadrant: 1, teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
        upperLeft: { quadrant: 2, teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
        lowerLeft: { quadrant: 3, teeth: [31, 32, 33, 34, 35, 36, 37, 38] },
        lowerRight: { quadrant: 4, teeth: [41, 42, 43, 44, 45, 46, 47, 48] }
    };

    const getToothName = (toothNumber) => {
        const names = {
            // Upper Right
            18: 'UR8', 17: 'UR7', 16: 'UR6', 15: 'UR5', 14: 'UR4', 13: 'UR3', 12: 'UR2', 11: 'UR1',
            // Upper Left  
            21: 'UL1', 22: 'UL2', 23: 'UL3', 24: 'UL4', 25: 'UL5', 26: 'UL6', 27: 'UL7', 28: 'UL8',
            // Lower Left
            31: 'LL1', 32: 'LL2', 33: 'LL3', 34: 'LL4', 35: 'LL5', 36: 'LL6', 37: 'LL7', 38: 'LL8',
            // Lower Right
            41: 'LR1', 42: 'LR2', 43: 'LR3', 44: 'LR4', 45: 'LR5', 46: 'LR6', 47: 'LR7', 48: 'LR8'
        };
        return names[toothNumber] || toothNumber.toString();
    };

    const toggleTooth = (toothNumber) => {
        if (disabled) return;
        
        const newSelected = selectedTeeth.includes(toothNumber)
            ? selectedTeeth.filter(t => t !== toothNumber)
            : [...selectedTeeth, toothNumber].sort((a, b) => a - b);
        
        onTeethChange(newSelected);
    };

    const handleTextInput = (value) => {
        if (disabled) return;
        
        // Parse comma-separated tooth numbers
        const teeth = value
            .split(',')
            .map(t => parseInt(t.trim()))
            .filter(t => !isNaN(t) && t >= 11 && t <= 48)
            .sort((a, b) => a - b);
        
        onTeethChange([...new Set(teeth)]); // Remove duplicates
    };

    const formatTeethForDisplay = () => {
        return selectedTeeth.map(t => getToothName(t)).join(', ');
    };

    const formatTeethByQuadrant = () => {
        const byQuadrant = {
            upperRight: selectedTeeth.filter(t => t >= 11 && t <= 18),
            upperLeft: selectedTeeth.filter(t => t >= 21 && t <= 28),
            lowerLeft: selectedTeeth.filter(t => t >= 31 && t <= 38),
            lowerRight: selectedTeeth.filter(t => t >= 41 && t <= 48)
        };
        
        return byQuadrant;
    };

    return (
        <div className="tooth-selector">
            {/* Patient Context Header */}
            {patientName ? (
                <div className="patient-context-header mb-3">
                    <div className="card border-primary">
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center">
                                <div className="me-3">
                                    <i className="bi bi-person-fill text-primary" style={{fontSize: '1.5rem'}}></i>
                                </div>
                                <div>
                                    <h6 className="mb-1 text-primary">Selecting Teeth for Patient:</h6>
                                    <div className="fw-bold fs-5">{patientName}</div>
                                    <small className="text-muted">Choose the specific tooth positions that will be worked on</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="patient-context-header mb-3">
                    <div className="alert alert-warning">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        <strong>Please enter the patient name first</strong> to provide context for tooth selection.
                    </div>
                </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-3">
                <label className="form-label fw-bold mb-0">
                    🦷 Tooth Position(s) {patientName && `for ${patientName}`}
                </label>
                <div className="btn-group btn-group-sm" role="group">
                    <button
                        type="button"
                        className={`btn ${inputMode === 'visual' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setInputMode('visual')}
                        disabled={disabled}
                    >
                        Visual
                    </button>
                    <button
                        type="button"
                        className={`btn ${inputMode === 'text' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setInputMode('text')}
                        disabled={disabled}
                    >
                        Numbers
                    </button>
                </div>
            </div>

            {inputMode === 'visual' ? (
                <div className="dental-chart">
                    {/* Upper Jaw */}
                    <div className="jaw upper-jaw">
                        <div className="quadrant upper-right">
                            <div className="quadrant-label">Upper Right</div>
                            <div className="teeth-row">
                                {quadrants.upperRight.teeth.map(toothNumber => (
                                    <button
                                        key={toothNumber}
                                        type="button"
                                        className={`tooth-btn ${selectedTeeth.includes(toothNumber) ? 'selected' : ''}`}
                                        onClick={() => toggleTooth(toothNumber)}
                                        disabled={disabled}
                                        title={`Tooth ${toothNumber} (${getToothName(toothNumber)})`}
                                    >
                                        {toothNumber}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="quadrant upper-left">
                            <div className="quadrant-label">Upper Left</div>
                            <div className="teeth-row">
                                {quadrants.upperLeft.teeth.map(toothNumber => (
                                    <button
                                        key={toothNumber}
                                        type="button"
                                        className={`tooth-btn ${selectedTeeth.includes(toothNumber) ? 'selected' : ''}`}
                                        onClick={() => toggleTooth(toothNumber)}
                                        disabled={disabled}
                                        title={`Tooth ${toothNumber} (${getToothName(toothNumber)})`}
                                    >
                                        {toothNumber}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Lower Jaw */}
                    <div className="jaw lower-jaw">
                        <div className="quadrant lower-right">
                            <div className="quadrant-label">Lower Right</div>
                            <div className="teeth-row">
                                {quadrants.lowerRight.teeth.map(toothNumber => (
                                    <button
                                        key={toothNumber}
                                        type="button"
                                        className={`tooth-btn ${selectedTeeth.includes(toothNumber) ? 'selected' : ''}`}
                                        onClick={() => toggleTooth(toothNumber)}
                                        disabled={disabled}
                                        title={`Tooth ${toothNumber} (${getToothName(toothNumber)})`}
                                    >
                                        {toothNumber}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="quadrant lower-left">
                            <div className="quadrant-label">Lower Left</div>
                            <div className="teeth-row">
                                {quadrants.lowerLeft.teeth.map(toothNumber => (
                                    <button
                                        key={toothNumber}
                                        type="button"
                                        className={`tooth-btn ${selectedTeeth.includes(toothNumber) ? 'selected' : ''}`}
                                        onClick={() => toggleTooth(toothNumber)}
                                        disabled={disabled}
                                        title={`Tooth ${toothNumber} (${getToothName(toothNumber)})`}
                                    >
                                        {toothNumber}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-input-mode">
                    <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Enter tooth numbers separated by commas (e.g., 11, 12, 21, 46)"
                        value={selectedTeeth.join(', ')}
                        onChange={(e) => handleTextInput(e.target.value)}
                        disabled={disabled}
                    />
                    <small className="form-text text-muted">
                        Use FDI notation: 11-18 (Upper Right), 21-28 (Upper Left), 31-38 (Lower Left), 41-48 (Lower Right)
                    </small>
                </div>
            )}

            {/* Selected Teeth Summary */}
            {selectedTeeth.length > 0 && (
                <div className="selected-summary mt-3">
                    <div className="alert alert-success border">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>
                                    🦷 Selected Teeth for {patientName || 'Patient'} ({selectedTeeth.length}):
                                </strong>
                                <div className="mt-1">
                                    <span className="badge bg-primary me-1">Numbers: {selectedTeeth.join(', ')}</span>
                                    <span className="badge bg-secondary">Names: {formatTeethForDisplay()}</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => onTeethChange([])}
                                disabled={disabled}
                                title="Clear all selections"
                            >
                                Clear All
                            </button>
                        </div>
                        
                        {/* Quadrant Summary (like your client's system) */}
                        <div className="quadrant-summary mt-2">
                            <small className="text-muted">By Position:</small>
                            <div className="row mt-1">
                                {Object.entries(formatTeethByQuadrant()).map(([quadrant, teeth]) => (
                                    teeth.length > 0 && (
                                        <div key={quadrant} className="col-6 col-md-3">
                                            <div className="quadrant-box p-2 border rounded text-center">
                                                <div className="fw-bold" style={{fontSize: '0.8em'}}>
                                                    {quadrant.replace(/([A-Z])/g, ' $1').trim()}
                                                </div>
                                                <div className="text-primary">
                                                    {teeth.map(t => t.toString().charAt(1)).join('')}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToothSelector;

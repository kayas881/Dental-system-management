import React, { useState } from 'react';

const ReturnWorkOrderModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    workOrder 
}) => {
    console.log('ReturnWorkOrderModal props:', { isOpen, workOrder: workOrder?.serial_number });
    
    const [formData, setFormData] = useState({
        reason: '',
        notes: '',
        expectedDate: ''
    });
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.reason.trim()) {
            newErrors.reason = 'Return reason is required';
        }
        
        if (formData.expectedDate && formData.expectedDate.trim()) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(formData.expectedDate)) {
                newErrors.expectedDate = 'Date must be in YYYY-MM-DD format';
            } else {
                const inputDate = new Date(formData.expectedDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (inputDate < today) {
                    newErrors.expectedDate = 'Expected date cannot be in the past';
                }
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        onSubmit({
            reason: formData.reason.trim(),
            notes: formData.notes.trim() || null,
            expectedDate: formData.expectedDate.trim() || null
        });
        
        // Reset form
        setFormData({
            reason: '',
            notes: '',
            expectedDate: ''
        });
        setErrors({});
    };

    const handleClose = () => {
        // Reset form when closing
        setFormData({
            reason: '',
            notes: '',
            expectedDate: ''
        });
        setErrors({});
        onClose();
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    if (!isOpen) {
        console.log('Modal not rendering because isOpen is:', isOpen);
        return null;
    }

    console.log('Modal should render now - isOpen:', isOpen, 'workOrder:', workOrder?.serial_number);

    return (
 <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-7 w-full max-w-lg mx-4 border border-orange-400" style={{zIndex: 10000}}>
            <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold text-orange-700">
                    <span style={{marginRight: 8}}>🔄</span>Return Work Order for Revision
                </h3>
                <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer'}}
                    aria-label="Close"
                >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {workOrder && (
                <div className="mb-5 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-gray-700 mb-1">
                        <span className="font-semibold">Work Order:</span> {workOrder.serial_number}
                    </p>
                    <p className="text-sm text-gray-700 mb-1">
                        <span className="font-semibold">Patient:</span> {workOrder.patient_name}
                    </p>
                    <p className="text-sm text-gray-700">
                        <span className="font-semibold">Doctor:</span> {workOrder.doctor_name}
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                        Return Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={formData.reason}
                        onChange={(e) => handleInputChange('reason', e.target.value)}
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50 ${
                            errors.reason ? 'border-red-400' : 'border-orange-200'
                        }`}
                        placeholder="Enter the reason for returning this work order..."
                    />
                    {errors.reason && (
                        <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                        Additional Notes (Optional)
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50"
                        placeholder="Any additional notes or instructions..."
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                        New Expected Completion Date (Optional)
                    </label>
                    <input
                        type="date"
                        value={formData.expectedDate}
                        onChange={(e) => handleInputChange('expectedDate', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-orange-50 ${
                            errors.expectedDate ? 'border-red-400' : 'border-orange-200'
                        }`}
                    />
                    {errors.expectedDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.expectedDate}</p>
                    )}
                </div>

                <div className="flex space-x-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 border border-orange-300 text-gray-700 rounded-lg bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400 font-semibold transition-colors"
                    >
                        Return for Revision
                    </button>
                </div>
            </form>
        </div>
    </div>
    );
};

export default ReturnWorkOrderModal;

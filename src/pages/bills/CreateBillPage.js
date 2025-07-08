import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { dentalLabService } from '../../services/dentalLabService';
import { printInitialBill } from '../../components/bills/BillPrintUtils';
import ToothSelector from '../../components/ToothSelector';
import BillToothDisplay from '../../components/BillToothDisplay';

const CreateBillPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const [workOrder, setWorkOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingWorkOrder, setLoadingWorkOrder] = useState(true);
    const [message, setMessage] = useState('');
    const [createdBill, setCreatedBill] = useState(null); // Track created bill for printing
    const [billData, setBillData] = useState({
        bill_date: new Date().toISOString().split('T')[0],
        work_description: '',
        notes: '',
        tooth_numbers: [] // Add tooth numbers to bill data
    });

    // Debug logging
    console.log('CreateBillPage - location.state:', location.state);
    console.log('CreateBillPage - searchParams:', Object.fromEntries(searchParams));
    
    // Check authentication state on component mount
    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const userRole = localStorage.getItem('user_role');
            const userId = localStorage.getItem('user_id');
            
            console.log('CreateBillPage - Auth state check:', {
                hasToken: !!token,
                userRole,
                hasUserId: !!userId,
                tokenLength: token?.length
            });
        };
        
        checkAuth();
    }, []);
    
    // Get work order from state or URL parameter
    useEffect(() => {
        const loadWorkOrder = async () => {
            setLoadingWorkOrder(true);
            try {
                let workOrderData = null;
                
                // First try to get from navigation state
                if (location.state?.workOrder) {
                    console.log('Using work order from navigation state');
                    workOrderData = location.state.workOrder;
                } else {
                    // Fall back to URL parameter
                    const workOrderId = searchParams.get('workOrderId');
                    if (workOrderId) {
                        console.log('Loading work order from URL parameter:', workOrderId);
                        const response = await dentalLabService.getWorkOrder(workOrderId);
                        if (response.success && response.data) {
                            workOrderData = response.data;
                        } else {
                            throw new Error('Work order not found');
                        }
                    }
                }
                
                if (workOrderData) {
                    setWorkOrder(workOrderData);
                    setBillData(prev => ({
                        ...prev,
                        work_description: workOrderData.product_quality || '',
                        tooth_numbers: workOrderData.tooth_numbers || [] // Load existing tooth numbers if any
                    }));
                    console.log('CreateBillPage - loaded workOrder:', workOrderData);
                } else {
                    console.error('No work order found in state or URL parameters');
                }
            } catch (error) {
                console.error('Error loading work order:', error);
                setMessage('Error loading work order data: ' + error.message);
            } finally {
                setLoadingWorkOrder(false);
            }
        };
        
        loadWorkOrder();
    }, [location.state, searchParams]);

    // Format date to dd-mm-yyyy
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // Show loading spinner while fetching work order
    if (loadingWorkOrder) {
        return (
            <div className="container mt-4">
                <div className="d-flex justify-content-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading work order...</span>
                    </div>
                </div>
                <p className="text-center mt-2">Loading work order data...</p>
            </div>
        );
    }

    if (!workOrder) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <h5>No Work Order Found</h5>
                    <p>Unable to load work order data. This could happen if:</p>
                    <ul>
                        <li>You navigated directly to this URL without a work order ID</li>
                        <li>The work order ID in the URL is invalid</li>
                        <li>The work order was deleted</li>
                        <li>There was a navigation error</li>
                    </ul>
                    <small className="text-muted">
                        Debug info: location.state = {JSON.stringify(location.state, null, 2)}<br/>
                        URL params = {JSON.stringify(Object.fromEntries(searchParams), null, 2)}
                    </small>
                </div>
                <div className="d-flex gap-2">
                    <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/work-orders-list')}
                    >
                        ← Back to Work Orders
                    </button>
                    <button 
                        className="btn btn-outline-secondary" 
                        onClick={() => navigate('/staff-dashboard')}
                    >
                        📊 Staff Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBillData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleTeethChange = (selectedTeeth) => {
        setBillData(prev => ({
            ...prev,
            tooth_numbers: selectedTeeth
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            console.log('=== BILL CREATION DEBUG ===');
            console.log('Starting bill creation process...');
            
            // Check authentication before proceeding
            const { dentalLabService } = await import('../../services/dentalLabService');
            const { authService } = await import('../../services/supabaseAuthService');
            
            const currentUser = await authService.getUserId();
            const userRole = authService.getUserRole();
            console.log('Current user context:', { currentUser, userRole });
            
            if (!currentUser) {
                throw new Error('Authentication required. Please log in again.');
            }

            const billPayload = {
                work_order_id: workOrder.id,
                doctor_name: workOrder.doctor_name,
                patient_name: workOrder.patient_name,
                work_description: billData.work_description,
                serial_number: workOrder.serial_number,
                completion_date: workOrder.completion_date,
                bill_date: billData.bill_date,
                notes: billData.notes,
                tooth_numbers: billData.tooth_numbers, // Include tooth numbers
                status: 'pending' // Staff creates bills without amount, admin will price them
            };

            console.log('Creating bill with payload:', billPayload);

            const response = await dentalLabService.createBill(billPayload);
            
            console.log('Bill creation response:', response);
            
            if (response.data) {
                const newBill = response.data;
                setCreatedBill(newBill); // Store created bill for printing
                setMessage('Bill created successfully! You can now print the initial bill or go back to work orders.');
                console.log('Bill created successfully:', newBill);
                
                // Call the callback if provided (from WorkOrdersList navigation)
                if (location.state?.onBillCreated) {
                    location.state.onBillCreated();
                }
                
                // Don't auto-navigate anymore, let user choose to print or go back
            } else {
                console.error('Bill creation error:', response.error);
                setMessage(`Error creating bill: ${response.error?.message || 'Unknown database error'}`);
            }
        } catch (error) {
            console.error('=== BILL CREATION ERROR ===');
            console.error('Error details:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            if (error.message.includes('Authentication') || error.message.includes('session')) {
                setMessage('Authentication error: Please refresh the page and try again. If the problem persists, please log out and log back in.');
            } else {
                setMessage('Error creating bill: ' + error.message);
            }
        }
        
        setLoading(false);
    };

    const handlePrintInitialBill = async () => {
        if (!createdBill) return;
        
        try {
            await printInitialBill(createdBill);
            
            // Mark bill as printed after successful print
            const result = await dentalLabService.markBillAsPrinted(createdBill.id);
            if (result.error) {
                console.error('Failed to mark bill as printed:', result.error);
            }
        } catch (error) {
            console.error('Error printing initial bill:', error);
            alert('Error printing initial bill: ' + error.message);
        }
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-header">
                            <h4>🧾 Create Bill</h4>
                            <p className="mb-0 text-muted">Creating bill for completed work order</p>
                        </div>
                        <div className="card-body">
                            {/* Debug Authentication Status */}
                            <div className="card mb-3" style={{backgroundColor: '#fff3cd', borderColor: '#ffeaa7'}}>
                                <div className="card-body py-2">
                                    <small>
                                        <strong>🔐 Auth Status:</strong> 
                                        <span className="ms-2">
                                            Token: {localStorage.getItem('token') ? '✓' : '✗'} | 
                                            Role: {localStorage.getItem('user_role') || 'None'} | 
                                            User ID: {localStorage.getItem('user_id') ? '✓' : '✗'}
                                        </span>
                                    </small>
                                </div>
                            </div>

                            {message && (
                                <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'}`}>
                                    {message}
                                    {/* Show print button when bill is successfully created */}
                                    {createdBill && !message.includes('Error') && (
                                        <div className="mt-3 d-flex gap-2">
                                            <button
                                                className="btn btn-outline-success btn-sm"
                                                onClick={handlePrintInitialBill}
                                            >
                                                🖨️ Print Initial Bill (For Product Delivery)
                                            </button>
                                            <button
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => navigate('/work-orders-list')}
                                            >
                                                📋 Back to Work Orders
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Work Order Summary */}
                            <div className="card mb-4" style={{backgroundColor: '#f8f9fa'}}>
                                <div className="card-body">
                                    <h6 className="card-title">Work Order Details</h6>
                                    <div className="row">
                                        <div className="col-md-6">
                                            <p><strong>Serial Number:</strong> {workOrder.serial_number}</p>
                                            <p><strong>Doctor:</strong> {workOrder.doctor_name}</p>
                                            <p><strong>Patient:</strong> {workOrder.patient_name}</p>
                                        </div>
                                        <div className="col-md-6">
                                            <p><strong>Quality:</strong> {workOrder.product_quality}</p>
                                            <p><strong>Shade:</strong> {workOrder.product_shade}</p>
                                            <p><strong>Completion Date:</strong> {formatDate(workOrder.completion_date)}</p>
                                            {workOrder.tooth_numbers && workOrder.tooth_numbers.length > 0 && (
                                                <div>
                                                    <strong>Teeth:</strong>
                                                    <div className="mt-1">
                                                        <BillToothDisplay 
                                                            toothNumbers={workOrder.tooth_numbers} 
                                                            isPreview={true} 
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label htmlFor="bill_date" className="form-label">
                                                Bill Date *
                                            </label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                id="bill_date"
                                                name="bill_date"
                                                value={billData.bill_date}
                                                onChange={handleInputChange}
                                                disabled={createdBill}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label htmlFor="work_description" className="form-label">
                                                Work Description *
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="work_description"
                                                name="work_description"
                                                value={billData.work_description}
                                                onChange={handleInputChange}
                                                placeholder="e.g., Premium Crown, Standard Bridge..."
                                                disabled={createdBill}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Tooth Position Selector */}
                                <div className="mb-4">
                                    <ToothSelector
                                        selectedTeeth={billData.tooth_numbers}
                                        onTeethChange={handleTeethChange}
                                        disabled={loading || createdBill}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="notes" className="form-label">
                                        Additional Notes
                                    </label>
                                    <textarea
                                        className="form-control"
                                        id="notes"
                                        name="notes"
                                        rows="3"
                                        value={billData.notes}
                                        onChange={handleInputChange}
                                        placeholder="Any additional notes about the work completed..."
                                        disabled={createdBill}
                                    ></textarea>
                                </div>

                                <div className="alert alert-info">
                                    <i className="bi bi-info-circle"></i>
                                    <strong>Note:</strong> The bill amount will be added by the admin. This bill will be marked as "pending" until pricing is completed. As staff, you cannot see or edit bill pricing - this is handled by admin only.
                                </div>

                                {/* Bill Preview */}
                                {billData.tooth_numbers.length > 0 && (
                                    <div className="card border-primary mb-3">
                                        <div className="card-header bg-primary text-white">
                                            <h6 className="mb-0">🧾 Bill Preview - How teeth will appear on the bill</h6>
                                        </div>
                                        <div className="card-body">
                                            <div className="row align-items-center">
                                                <div className="col-md-8">
                                                    <p className="mb-1"><strong>Your Client's Familiar Format:</strong></p>
                                                    <p className="text-muted small mb-2">
                                                        Teeth are shown in the traditional quadrant box format your client is used to.
                                                    </p>
                                                </div>
                                                <div className="col-md-4 text-center">
                                                    <BillToothDisplay 
                                                        toothNumbers={billData.tooth_numbers} 
                                                        isPreview={false}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="d-flex gap-2">
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading || createdBill}
                                    >
                                        {loading ? 'Creating Bill...' : createdBill ? 'Bill Created ✓' : 'Create Bill'}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => navigate('/work-orders-list')}
                                    >
                                        {createdBill ? 'Back to Work Orders' : 'Cancel'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateBillPage;

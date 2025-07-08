import React, { useState, useEffect } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { useNavigate, useLocation } from 'react-router-dom';
import BillToothDisplay from '../../components/BillToothDisplay';
import './GroupedBillPage.css';

const GroupedBillPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [batchGroups, setBatchGroups] = useState([]); // Only batch groups
    const [selectedBatch, setSelectedBatch] = useState(null); // Select entire batch
    const [searchQuery, setSearchQuery] = useState('');
    const [billData, setBillData] = useState({
        doctor_name: '',
        notes: ''
    });
    const [consolidatedTeeth, setConsolidatedTeeth] = useState([]);

    // Format date to dd-mm-yyyy
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // Load available batch groups for billing
    const loadBatchGroups = async () => {
        setLoading(true);
        setMessage('');
        try {
            const response = await dentalLabService.getWorkOrdersWithBatchInfo();
            if (response.data) {
                // Group work orders by batch_id, only include orders that:
                // 1. Have a batch_id (were created in batch)
                // 2. Are completed (ready for billing)
                // 3. Don't already have bills
                const batchMap = {};
                
                for (const order of response.data) {
                    // Only include orders that were created as part of a batch
                    if (order.batch_id && order.status === 'completed') {
                        // Check if this order already has a bill
                        const billCheck = await dentalLabService.checkWorkOrderHasBill(order.id);
                        
                        if (!billCheck.hasBill) {
                            if (!batchMap[order.batch_id]) {
                                batchMap[order.batch_id] = {
                                    batch_id: order.batch_id,
                                    doctor_name: order.doctor_name,
                                    order_date: order.order_date,
                                    completion_date: order.completion_date,
                                    orders: [],
                                    total_items: 0,
                                    all_teeth: []
                                };
                            }
                            batchMap[order.batch_id].orders.push(order);
                            batchMap[order.batch_id].total_items++;
                            
                            // Collect all teeth from this batch
                            if (order.tooth_numbers && Array.isArray(order.tooth_numbers)) {
                                batchMap[order.batch_id].all_teeth = [
                                    ...batchMap[order.batch_id].all_teeth,
                                    ...order.tooth_numbers
                                ];
                            }
                        }
                    }
                }
                
                // Convert to array and filter out single orders (batches should have 2+ orders)
                const batches = Object.values(batchMap).filter(batch => batch.orders.length >= 2);
                
                setBatchGroups(batches);
                
                if (batches.length === 0) {
                    setMessage('No batch work orders available for grouped billing. Only work orders created using "Batch Work Order Entry" can be grouped for billing.');
                } else {
                    setMessage(`Found ${batches.length} batch groups available for billing.`);
                }
            }
        } catch (error) {
            console.error('Error loading batch groups:', error);
            setMessage('Error loading batch groups: ' + error.message);
        }
        setLoading(false);
    };

    useEffect(() => {
        // Check if a specific batch was passed from navigation
        if (location.state?.batch) {
            console.log('Pre-selected batch from navigation:', location.state.batch);
            setSelectedBatch(location.state.batch);
            setBillData(prev => ({ ...prev, doctor_name: location.state.batch.doctor_name }));
            
            // Set consolidated teeth from the batch
            setConsolidatedTeeth(location.state.batch.all_teeth || []);
        } else {
            loadBatchGroups();
        }
    }, [location.state]);

    const filteredBatches = batchGroups.filter(batch => {
        const searchLower = searchQuery.toLowerCase();
        return !searchQuery || 
               batch.doctor_name.toLowerCase().includes(searchLower) ||
               batch.batch_id.toLowerCase().includes(searchLower) ||
               batch.orders.some(order => 
                   order.patient_name.toLowerCase().includes(searchLower) ||
                   order.serial_number.toLowerCase().includes(searchLower)
               );
    });

    const handleBatchSelection = (batch) => {
        setSelectedBatch(batch);
        setBillData(prev => ({ ...prev, doctor_name: batch.doctor_name }));
        
        // Remove duplicates from consolidated teeth
        const uniqueTeeth = [...new Set(batch.all_teeth)].sort((a, b) => a - b);
        setConsolidatedTeeth(uniqueTeeth);
    };

    const createGroupedBill = async () => {
        if (!selectedBatch) {
            setMessage('Please select a batch to create a grouped bill');
            return;
        }

        if (selectedBatch.orders.length < 2) {
            setMessage('Batch must have at least 2 work orders to create a grouped bill');
            return;
        }

        setLoading(true);
        setMessage('Creating grouped bill for batch...');

        try {
            const response = await dentalLabService.createGroupedBill({
                work_order_ids: selectedBatch.orders.map(o => o.id),
                doctor_name: selectedBatch.doctor_name,
                notes: billData.notes,
                tooth_numbers: consolidatedTeeth,
                is_grouped: true,
                batch_id: selectedBatch.batch_id // Include batch reference
            });

            if (response.success) {
                setMessage(`Grouped bill created successfully for batch ${selectedBatch.batch_id}!`);
                
                // Navigate back to appropriate page based on user role
                const userRole = localStorage.getItem('user_role');
                setTimeout(() => {
                    if (userRole === 'ADMIN') {
                        navigate('/admin/bills-management');
                    } else {
                        navigate('/staff-dashboard');
                    }
                }, 2000);
            } else {
                setMessage('Error creating grouped bill: ' + response.error);
            }
        } catch (error) {
            console.error('Error creating grouped bill:', error);
            setMessage('Error creating grouped bill: ' + error.message);
        }

        setLoading(false);
    };

    const handleBillDataChange = (e) => {
        const { name, value } = e.target;
        setBillData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="container-fluid mt-4">
            <div className="row justify-content-center">
                <div className="col-12">
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h3>💰 Grouped Billing - Batch Orders Only</h3>
                            <p className="text-muted mb-0">Create bills for work orders that were created together as a batch</p>
                        </div>
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => navigate('/staff-dashboard')}
                        >
                            <i className="bi bi-arrow-left me-1"></i>
                            Back to Dashboard
                        </button>
                    </div>

                    {message && (
                        <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-info'} mb-4`}>
                            {message}
                        </div>
                    )}

                    <div className="row">
                        {/* Left Panel - Batch Groups */}
                        <div className="col-lg-8">
                            <div className="card mb-4">
                                <div className="card-header">
                                    <h5 className="mb-0">
                                        <i className="bi bi-collection me-2"></i>
                                        Available Batch Groups for Billing
                                    </h5>
                                </div>
                                <div className="card-body">
                                    <div className="mb-3">
                                        <small className="text-muted">
                                            Only work orders created together using "Batch Work Order Entry" can be grouped for billing.
                                            Each batch represents orders made simultaneously for the same doctor.
                                        </small>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="mb-3">
                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="bi bi-search"></i>
                                            </span>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Search by doctor name, batch ID, or patient name..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {loading ? (
                                        <div className="text-center py-4">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                            <p className="mt-2 text-muted">Loading batch groups...</p>
                                        </div>
                                    ) : filteredBatches.length === 0 ? (
                                        <div className="text-center py-4">
                                            <i className="bi bi-inbox text-muted" style={{fontSize: '3rem'}}></i>
                                            <h6 className="text-muted mt-2">No Batch Groups Available</h6>
                                            <p className="text-muted">
                                                {searchQuery ? 
                                                    'No batches match your search criteria.' : 
                                                    'No completed batch work orders found for billing.'
                                                }
                                            </p>
                                            <p className="small text-muted">
                                                To create batch orders, use "Batch Work Order Entry" from the staff dashboard.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="row">
                                            {filteredBatches.map((batch) => (
                                                <div key={batch.batch_id} className="col-md-6 mb-3">
                                                    <div className={`card h-100 border-2 ${selectedBatch?.batch_id === batch.batch_id ? 'border-success bg-light' : 'border-light'}`}>
                                                        <div className="card-header d-flex justify-content-between align-items-center p-3">
                                                            <div>
                                                                <span className="badge bg-warning text-dark me-2">Batch</span>
                                                                <span className="small text-muted">({batch.total_items} orders)</span>
                                                            </div>
                                                            <button
                                                                className={`btn btn-sm ${selectedBatch?.batch_id === batch.batch_id ? 'btn-success' : 'btn-outline-primary'}`}
                                                                onClick={() => handleBatchSelection(batch)}
                                                                disabled={selectedBatch?.batch_id === batch.batch_id}
                                                            >
                                                                {selectedBatch?.batch_id === batch.batch_id ? '✓ Selected' : 'Select Batch'}
                                                            </button>
                                                        </div>
                                                        <div className="card-body p-3">
                                                            <h6 className="card-title">Dr. {batch.doctor_name}</h6>
                                                            <p className="card-text mb-2 small">
                                                                <strong>Batch ID:</strong> {batch.batch_id.substring(0, 8)}...<br/>
                                                                <strong>Order Date:</strong> {formatDate(batch.order_date)}<br/>
                                                                <strong>Completed:</strong> {formatDate(batch.completion_date)}
                                                            </p>
                                                            <div className="small">
                                                                <strong>Patients:</strong>
                                                                {batch.orders.slice(0, 3).map((order, idx) => (
                                                                    <div key={order.id} className="d-flex justify-content-between align-items-center mb-1">
                                                                        <span className="text-truncate">{order.patient_name}</span>
                                                                        <span className="text-muted">{order.serial_number}</span>
                                                                    </div>
                                                                ))}
                                                                {batch.orders.length > 3 && (
                                                                    <div className="text-muted">+ {batch.orders.length - 3} more patients...</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Panel - Bill Summary */}
                        <div className="col-lg-4">
                            <div className="card sticky-top">
                                <div className="card-header">
                                    <h5 className="mb-0">
                                        <i className="bi bi-receipt me-2"></i>
                                        Batch Bill Summary
                                    </h5>
                                </div>
                                <div className="card-body">
                                    {!selectedBatch ? (
                                        <div className="text-center py-4">
                                            <i className="bi bi-arrow-left text-muted" style={{fontSize: '2rem'}}></i>
                                            <p className="text-muted mt-2">Select a batch group to create a bill</p>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* Batch Info */}
                                            <div className="mb-3">
                                                <h6>Batch Information</h6>
                                                <div className="small">
                                                    <p><strong>Doctor:</strong> {selectedBatch.doctor_name}</p>
                                                    <p><strong>Items:</strong> {selectedBatch.total_items} work orders</p>
                                                    <p><strong>Batch ID:</strong> {selectedBatch.batch_id.substring(0, 12)}...</p>
                                                    <p><strong>Completion:</strong> {formatDate(selectedBatch.completion_date)}</p>
                                                </div>
                                            </div>

                                            {/* Work Orders List */}
                                            <div className="mb-3">
                                                <h6>Work Orders in Batch</h6>
                                                <div style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                    {selectedBatch.orders.map((order, index) => (
                                                        <div key={order.id} className="border-bottom pb-2 mb-2">
                                                            <div className="d-flex justify-content-between">
                                                                <span className="fw-bold">{order.patient_name}</span>
                                                                <span className="small text-muted">{order.serial_number}</span>
                                                            </div>
                                                            <div className="small text-muted">
                                                                {order.product_quality} - {order.product_shade}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Consolidated Teeth Display */}
                                            {consolidatedTeeth.length > 0 && (
                                                <div className="mb-3">
                                                    <h6>Teeth Involved</h6>
                                                    <BillToothDisplay 
                                                        selectedTeeth={consolidatedTeeth}
                                                        isEditable={false}
                                                    />
                                                </div>
                                            )}

                                            {/* Bill Notes */}
                                            <div className="mb-3">
                                                <label className="form-label">Bill Notes</label>
                                                <textarea
                                                    className="form-control"
                                                    name="notes"
                                                    value={billData.notes}
                                                    onChange={handleBillDataChange}
                                                    rows="3"
                                                    placeholder="Add any notes for this grouped bill..."
                                                />
                                            </div>

                                            {/* Create Bill Button */}
                                            <div className="d-grid">
                                                <button 
                                                    className="btn btn-primary"
                                                    onClick={createGroupedBill}
                                                    disabled={loading}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                            Creating Bill...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-plus-circle me-2"></i>
                                                            Create Grouped Bill
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            <div className="alert alert-info mt-3">
                                                <small>
                                                    <strong>Note:</strong> This will create a single bill for all {selectedBatch.total_items} work orders in this batch.
                                                    The admin will add pricing information later.
                                                </small>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupedBillPage;

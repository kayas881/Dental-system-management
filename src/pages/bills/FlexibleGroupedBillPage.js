import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { dentalLabService } from '../../services/dentalLabService';
import BillToothDisplay from '../../components/BillToothDisplay';

const FlexibleGroupedBillPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [workOrders, setWorkOrders] = useState([]);
    const [doctorGroups, setDoctorGroups] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('today');
    const [billData, setBillData] = useState({
        bill_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // Load all completed work orders that don't have bills yet
    const loadAvailableWorkOrders = async () => {
        setLoading(true);
        setMessage('');
        try {
            const response = await dentalLabService.getWorkOrdersWithBatchInfo();
            if (response.data) {
                // Filter completed orders without bills
                const availableOrders = [];
                
                for (const order of response.data) {
                    if (order.status === 'completed') {
                        // Check if this order already has a bill
                        const billCheck = await dentalLabService.checkWorkOrderHasBill(order.id);
                        if (!billCheck.hasBill) {
                            availableOrders.push(order);
                        }
                    }
                }

                // Apply date filter
                const filteredOrders = filterOrdersByDate(availableOrders);
                setWorkOrders(filteredOrders);
                
                // Group by doctor
                const doctorMap = {};
                filteredOrders.forEach(order => {
                    const doctorKey = order.doctor_name;
                    if (!doctorMap[doctorKey]) {
                        doctorMap[doctorKey] = {
                            doctor_name: doctorKey,
                            orders: [],
                            total_orders: 0,
                            batch_orders: 0,
                            individual_orders: 0,
                            all_teeth: []
                        };
                    }
                    doctorMap[doctorKey].orders.push(order);
                    doctorMap[doctorKey].total_orders++;
                    
                    if (order.batch_id) {
                        doctorMap[doctorKey].batch_orders++;
                    } else {
                        doctorMap[doctorKey].individual_orders++;
                    }
                    
                    // Collect all teeth
                    if (order.tooth_numbers && Array.isArray(order.tooth_numbers)) {
                        doctorMap[doctorKey].all_teeth = [
                            ...doctorMap[doctorKey].all_teeth,
                            ...order.tooth_numbers
                        ];
                    }
                });

                // Filter doctors with 2+ orders
                const doctors = Object.values(doctorMap).filter(group => group.total_orders >= 2);
                setDoctorGroups(doctors);
                
                if (doctors.length === 0) {
                    setMessage('No doctors with multiple completed work orders available for grouped billing.');
                } else {
                    setMessage(`Found ${doctors.length} doctors with multiple completed work orders available for billing.`);
                }
            }
        } catch (error) {
            console.error('Error loading work orders:', error);
            setMessage('Error loading work orders: ' + error.message);
        }
        setLoading(false);
    };

    // Filter orders by date
    const filterOrdersByDate = (orders) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        return orders.filter(order => {
            const orderDate = new Date(order.completion_date || order.order_date);
            orderDate.setHours(0, 0, 0, 0);
            
            switch (dateFilter) {
                case 'today':
                    return orderDate.getTime() === today.getTime();
                case 'yesterday':
                    return orderDate.getTime() === yesterday.getTime();
                case 'week':
                    return orderDate >= weekAgo;
                case 'all':
                default:
                    return true;
            }
        });
    };

    useEffect(() => {
        loadAvailableWorkOrders();
    }, [dateFilter]);

    // Filter doctors by search query
    const filteredDoctorGroups = doctorGroups.filter(group => {
        const searchLower = searchQuery.toLowerCase();
        return !searchQuery || 
               group.doctor_name.toLowerCase().includes(searchLower) ||
               group.orders.some(order => 
                   order.patient_name.toLowerCase().includes(searchLower) ||
                   order.serial_number.toLowerCase().includes(searchLower)
               );
    });

    // Handle order selection
    const handleOrderSelection = (orders, selectAll = false) => {
        if (selectAll) {
            // Select all orders from this doctor
            const orderIds = orders.map(o => o.id);
            setSelectedOrders(orderIds);
        } else {
            // Toggle individual order
            const orderId = orders[0].id;
            setSelectedOrders(prev => 
                prev.includes(orderId) 
                    ? prev.filter(id => id !== orderId)
                    : [...prev, orderId]
            );
        }
    };

    // Create grouped bill
    const createGroupedBill = async () => {
        if (selectedOrders.length < 2) {
            setMessage('Please select at least 2 work orders to create a grouped bill');
            return;
        }

        setLoading(true);
        setMessage('Creating grouped bill...');

        try {
            const selectedWorkOrders = workOrders.filter(o => selectedOrders.includes(o.id));
            
            // Validate all orders are from the same doctor
            const uniqueDoctors = [...new Set(selectedWorkOrders.map(o => o.doctor_name))];
            if (uniqueDoctors.length > 1) {
                setMessage('All selected work orders must be from the same doctor');
                setLoading(false);
                return;
            }

            // Collect all teeth from selected orders
            const allTeeth = [];
            selectedWorkOrders.forEach(order => {
                if (order.tooth_numbers && Array.isArray(order.tooth_numbers)) {
                    allTeeth.push(...order.tooth_numbers);
                }
            });
            const uniqueTeeth = [...new Set(allTeeth)].sort((a, b) => a - b);

            const response = await dentalLabService.createGroupedBill({
                work_order_ids: selectedOrders,
                doctor_name: selectedWorkOrders[0].doctor_name,
                notes: billData.notes,
                tooth_numbers: uniqueTeeth,
                is_grouped: true,
                batch_id: null // This is for flexible grouping, not batch-specific
            });

            if (response.success) {
                setMessage(`Grouped bill created successfully for ${selectedOrders.length} work orders from Dr. ${selectedWorkOrders[0].doctor_name}!`);
                
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

    return (
        <div className="container-fluid mt-4">
            <div className="row justify-content-center">
                <div className="col-12">
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h3>💰 Flexible Grouped Billing</h3>
                            <p className="text-muted mb-0">Group any completed work orders from the same doctor into a single bill</p>
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
                        {/* Left Panel - Doctor Groups */}
                        <div className="col-lg-8">
                            <div className="card">
                                <div className="card-header">
                                    <h5 className="mb-0">
                                        <i className="bi bi-people me-2"></i>
                                        Doctors with Multiple Completed Work Orders
                                    </h5>
                                </div>
                                <div className="card-body">
                                    {/* Filters */}
                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    <i className="bi bi-search"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Search by doctor, patient, or serial number..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <select 
                                                className="form-select"
                                                value={dateFilter}
                                                onChange={(e) => setDateFilter(e.target.value)}
                                            >
                                                <option value="today">Today's Orders</option>
                                                <option value="yesterday">Yesterday's Orders</option>
                                                <option value="week">This Week</option>
                                                <option value="all">All Orders</option>
                                            </select>
                                        </div>
                                    </div>

                                    {loading ? (
                                        <div className="text-center py-4">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                            <p className="mt-2 text-muted">Loading doctor groups...</p>
                                        </div>
                                    ) : filteredDoctorGroups.length === 0 ? (
                                        <div className="text-center py-4">
                                            <i className="bi bi-inbox text-muted" style={{fontSize: '3rem'}}></i>
                                            <h6 className="text-muted mt-2">No Doctor Groups Available</h6>
                                            <p className="text-muted">
                                                {searchQuery ? 
                                                    'No doctors match your search criteria.' : 
                                                    'No doctors have multiple completed work orders for the selected date range.'
                                                }
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="row">
                                            {filteredDoctorGroups.map((group) => (
                                                <div key={group.doctor_name} className="col-12 mb-3">
                                                    <div className="card border-2">
                                                        <div className="card-header">
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <h6 className="mb-1">Dr. {group.doctor_name}</h6>
                                                                    <small className="text-muted">
                                                                        {group.total_orders} orders 
                                                                        {group.batch_orders > 0 && ` (${group.batch_orders} batch, ${group.individual_orders} individual)`}
                                                                    </small>
                                                                </div>
                                                                <button
                                                                    className="btn btn-primary btn-sm"
                                                                    onClick={() => handleOrderSelection(group.orders, true)}
                                                                >
                                                                    Select All ({group.total_orders})
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="card-body p-2">
                                                            <div className="row">
                                                                {group.orders.map((order) => (
                                                                    <div key={order.id} className="col-md-6 mb-2">
                                                                        <div className={`border rounded p-2 ${selectedOrders.includes(order.id) ? 'bg-light border-primary' : ''}`}>
                                                                            <div className="form-check">
                                                                                <input
                                                                                    className="form-check-input"
                                                                                    type="checkbox"
                                                                                    checked={selectedOrders.includes(order.id)}
                                                                                    onChange={() => handleOrderSelection([order])}
                                                                                />
                                                                                <label className="form-check-label small">
                                                                                    <strong>{order.patient_name}</strong><br/>
                                                                                    <span className="text-muted">{order.serial_number}</span><br/>
                                                                                    <span className="text-success">{order.product_quality}</span>
                                                                                    {order.batch_id && <span className="badge bg-info ms-1">Batch</span>}
                                                                                </label>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
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
                                        Grouped Bill Summary
                                    </h5>
                                </div>
                                <div className="card-body">
                                    {selectedOrders.length === 0 ? (
                                        <div className="text-center py-4">
                                            <i className="bi bi-check-square text-muted" style={{fontSize: '2rem'}}></i>
                                            <p className="text-muted mt-2">Select work orders to create a grouped bill</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="mb-3">
                                                <h6>Selected Orders</h6>
                                                <p className="mb-2"><strong>Count:</strong> {selectedOrders.length} work orders</p>
                                                {selectedOrders.length > 0 && (
                                                    <p className="mb-2">
                                                        <strong>Doctor:</strong> {workOrders.find(o => selectedOrders.includes(o.id))?.doctor_name}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Selected Orders List */}
                                            <div className="mb-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                <h6>Orders to be Billed</h6>
                                                {workOrders.filter(o => selectedOrders.includes(o.id)).map((order, index) => (
                                                    <div key={order.id} className="border-bottom pb-2 mb-2">
                                                        <div className="d-flex justify-content-between">
                                                            <span className="fw-bold">{order.patient_name}</span>
                                                            <span className="small text-muted">{order.serial_number}</span>
                                                        </div>
                                                        <div className="small text-muted">
                                                            {order.product_quality} - {order.product_shade}
                                                            {order.batch_id && <span className="badge bg-info ms-1">Batch</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Bill Notes */}
                                            <div className="mb-3">
                                                <label className="form-label">Bill Notes</label>
                                                <textarea
                                                    className="form-control"
                                                    value={billData.notes}
                                                    onChange={(e) => setBillData(prev => ({...prev, notes: e.target.value}))}
                                                    rows="3"
                                                    placeholder="Add any notes for this grouped bill..."
                                                />
                                            </div>

                                            {/* Create Bill Button */}
                                            <div className="d-grid">
                                                <button 
                                                    className="btn btn-primary"
                                                    onClick={createGroupedBill}
                                                    disabled={loading || selectedOrders.length < 2}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                            Creating Bill...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-plus-circle me-2"></i>
                                                            Create Grouped Bill ({selectedOrders.length} orders)
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {selectedOrders.length < 2 && (
                                                <div className="alert alert-warning mt-3">
                                                    <small>Select at least 2 work orders to create a grouped bill.</small>
                                                </div>
                                            )}
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

export default FlexibleGroupedBillPage;

import React from 'react';
import './WorkOrdersTable.css';
import { printInitialBill } from './bills/BillPrintUtils';
import { dentalLabService } from '../services/dentalLabService';

const WorkOrdersTable = ({ 
    filteredWorkOrders, 
    selectedOrders,
    setSelectedOrders, 
    handleSelectOrder,
    clearSelection,
    billStatus,
    refreshBillStatus,
    formatDate,
    editingOrder,
    editData,
    handleEditInputChange,
    startEdit,
    handleSave,
    cancelEdit,
    handleCreateBill,
    canCreateBill,
    selectedOrder,
    setSelectedOrder,
    completionDate,
    setCompletionDate,
    handleCompleteOrder,
    isBatchSelected,
    handleSelectBatch,
    isBatchCompleted,
    batchGroups
}) => {
    const [expandedOrders, setExpandedOrders] = React.useState(new Set());
    
    // Handle printing initial bill for existing bills
    const handlePrintInitialBill = async (order) => {
        try {
            if (!billStatus[order.id]?.hasBill || !billStatus[order.id]?.billData) {
                alert('No bill found for this work order');
                return;
            }
            
            // Get the bill ID from the stored bill data
            const billId = billStatus[order.id].billData.id;
            
            // Fetch complete bill data for printing
            const billResponse = await dentalLabService.getAllBills();
            if (!billResponse.data) {
                alert('Error fetching bill data');
                return;
            }
            
            // Find the specific bill
            const completeBill = billResponse.data.find(bill => bill.id === billId);
            if (!completeBill) {
                alert('Bill not found');
                return;
            }
            
            console.log('Printing initial bill for complete bill data:', completeBill);
            await printInitialBill(completeBill);
            
            // Mark bill as printed after successful print
            const result = await dentalLabService.markBillAsPrinted(completeBill.id);
            if (result.error) {
                console.error('Failed to mark bill as printed:', result.error);
            } else {
                // Refresh bill status to show updated print status
                if (refreshBillStatus) {
                    refreshBillStatus();
                }
            }
        } catch (error) {
            console.error('Error printing initial bill:', error);
            alert('Error printing initial bill: ' + error.message);
        }
    };
    
    const toggleExpanded = (orderId) => {
        const newExpanded = new Set(expandedOrders);
        if (newExpanded.has(orderId)) {
            newExpanded.delete(orderId);
        } else {
            newExpanded.add(orderId);
        }
        setExpandedOrders(newExpanded);
    };
    
    const isExpanded = (orderId) => expandedOrders.has(orderId);
    return (
        <div className="work-orders-container">
            {/* Mobile/Tablet Card View */}
            <div className="d-lg-none">
                {filteredWorkOrders.map((order) => (
                    <div key={order.id} className={`card mb-3 shadow-sm ${isExpanded(order.id) ? 'expanded' : ''}`}>
                        <div 
                            className={`card-header d-flex justify-content-between align-items-center py-2 cursor-pointer ${isExpanded(order.id) ? 'expanded' : ''}`}
                            onClick={() => toggleExpanded(order.id)}
                            style={{cursor: 'pointer'}}
                        >
                            <div className="d-flex align-items-center">
                                <input
                                    type="checkbox"
                                    className="form-check-input me-2"
                                    checked={selectedOrders.includes(order.id)}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleSelectOrder(order.id);
                                    }}
                                    disabled={order.status !== 'completed'}
                                />
                                <div>
                                    <div>
                                        <strong className="text-primary">{order.serial_number}</strong>
                                        {order.batch_id && (
                                            <span className="badge bg-info ms-2">Batch ({order.batch_size})</span>
                                        )}
                                    </div>
                                    <div className="small text-muted">
                                        <strong>Dr. {order.doctor_name}</strong>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex align-items-center">
                                <span className={`badge me-2 ${order.status === 'completed' ? 'bg-success' : 'bg-primary'}`}>
                                    {order.status === 'completed' ? 'Completed' : 'In Progress'}
                                </span>
                                <small className={`text-muted expand-icon ${isExpanded(order.id) ? 'expanded' : ''}`}>
                                    {isExpanded(order.id) ? '▼' : '▶'}
                                </small>
                            </div>
                        </div>
                        
                        {/* Compact info always visible */}
                        <div className="card-body py-2">
                            <div className="row">
                                <div className="col-6">
                                    <div className="small text-muted mb-1">Patient:</div>
                                    <div className="fw-bold">{order.patient_name}</div>
                                </div>
                                <div className="col-6">
                                    <div className="small text-muted mb-1">Product:</div>
                                    <div>
                                        <strong>{order.product_quality}</strong>
                                        {order.product_shade && (
                                            <div className="small text-muted">Shade: {order.product_shade}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <div>
                                    {order.status === 'completed' && billStatus[order.id]?.hasBill && (
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={`badge ${billStatus[order.id].billType === 'grouped' ? 'bg-info' : 'bg-success'}`}>
                                                ✓ {billStatus[order.id].billType === 'grouped' ? 'Grouped Bill' : 'Bill Created'}
                                            </span>
                                            {billStatus[order.id].billData?.status === 'printed' && (
                                                <span className="badge bg-primary">
                                                    🖨️ Printed
                                                </span>
                                            )}
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePrintInitialBill(order);
                                                }}
                                                title="Print Initial Bill (without amount)"
                                            >
                                                🖨️ Initial
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Quick Actions - Always Visible */}
                            <div className="d-flex justify-content-end mt-2">
                                {editingOrder === order.id ? (
                                    <div className="btn-group">
                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSave(order.id);
                                            }}
                                        >
                                            ✓ Save
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                cancelEdit();
                                            }}
                                        >
                                            ✗ Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="btn-group">
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(order);
                                            }}
                                        >
                                            ✏️
                                        </button>
                                        {order.status === 'completed' && !billStatus[order.id]?.hasBill && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCreateBill(order);
                                                }}
                                                disabled={!canCreateBill(order)}
                                            >
                                                💰
                                            </button>
                                        )}
                                        {order.status !== 'completed' && (
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedOrder(order.id);
                                                    setCompletionDate(new Date().toISOString().split('T')[0]);
                                                }}
                                            >
                                                ✓
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Expanded Details */}
                        {isExpanded(order.id) && (
                            <div className="card-body border-top bg-light py-2">
                                <div className="row small">
                                    <div className="col-6">
                                        <div className="mb-2">
                                            <span className="text-muted">Order Date:</span><br/>
                                            {formatDate(order.order_date)}
                                        </div>
                                        {order.completion_date && (
                                            <div className="mb-2">
                                                <span className="text-muted">Completed:</span><br/>
                                                {formatDate(order.completion_date)}
                                            </div>
                                        )}
                                        {order.expected_complete_date && (
                                            <div className="mb-2">
                                                <span className="text-muted">Expected:</span><br/>
                                                <span className={`${
                                                    new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' 
                                                        ? 'text-danger fw-bold' 
                                                        : 'text-muted'
                                                }`}>
                                                    {formatDate(order.expected_complete_date)}
                                                    {new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' && (
                                                        <small className="text-danger d-block">⚠️ Overdue</small>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-6">
                                        {(order.requires_trial || order.trial_date_1 || order.trial_date_2) && (
                                            <div className="mb-2">
                                                <span className="text-muted">Trial Information:</span><br/>
                                                {order.requires_trial && (
                                                    <span className="badge bg-warning text-dark mb-1">🦷 Trial Required</span>
                                                )}
                                                {order.trial_date_1 && (
                                                    <div className="small text-success mt-1">
                                                        ✓ Trial 1: {formatDate(order.trial_date_1)}
                                                    </div>
                                                )}
                                                {order.trial_date_2 && (
                                                    <div className="small text-success">
                                                        ✓ Trial 2: {formatDate(order.trial_date_2)}
                                                    </div>
                                                )}
                                                {order.requires_trial && !order.trial_date_1 && (
                                                    <div className="small text-warning">
                                                        ⏳ Awaiting Trial 1
                                                    </div>
                                                )}
                                                {order.requires_trial && order.trial_date_1 && !order.trial_date_2 && (
                                                    <div className="small text-warning">
                                                        ⏳ Awaiting Trial 2 (if needed)
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {order.expected_complete_date && (
                                            <div className="mb-2">
                                                <span className="text-muted">Expected:</span><br/>
                                                <span className={`${
                                                    new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' 
                                                        ? 'text-danger fw-bold' 
                                                        : 'text-muted'
                                                }`}>
                                                    {formatDate(order.expected_complete_date)}
                                                    {new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' && (
                                                        <small className="text-danger d-block">⚠️ Overdue</small>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        {order.feedback && (
                                            <div className="mb-2">
                                                <span className="text-muted">Feedback:</span><br/>
                                                <span className="text-dark">{order.feedback}</span>
                                            </div>
                                        )}
                                        {order.status === 'completed' && billStatus[order.id]?.hasBill && (
                                            <div className="mb-2">
                                                <span className="text-muted">Bill Date:</span><br/>
                                                {formatDate(billStatus[order.id].billData.bill_date)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Editing Fields (Mobile) */}
                        {editingOrder === order.id && (
                            <div className="card-body border-top py-2">
                                <div className="row">
                                    <div className="col-6">
                                        <div className="mb-2">
                                            <label className="form-label small">Trial Date 1:</label>
                                            <input
                                                type="date"
                                                name="trial_date_1"
                                                className="form-control form-control-sm"
                                                value={editData.trial_date_1 || ''}
                                                onChange={handleEditInputChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="mb-2">
                                            <label className="form-label small">Trial Date 2:</label>
                                            <input
                                                type="date"
                                                name="trial_date_2"
                                                className="form-control form-control-sm"
                                                value={editData.trial_date_2 || ''}
                                                onChange={handleEditInputChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mb-2">
                                    <label className="form-label small">Feedback:</label>
                                    <textarea
                                        name="feedback"
                                        className="form-control form-control-sm"
                                        value={editData.feedback || ''}
                                        onChange={handleEditInputChange}
                                        placeholder="Enter feedback..."
                                        rows="2"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {/* Completion Modal for Mobile */}
                        {selectedOrder === order.id && (
                            <div className="card-body border-top bg-warning bg-opacity-10 py-2">
                                <div className="mb-2">
                                    <label className="form-label small">Completion Date:</label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={completionDate}
                                        onChange={(e) => setCompletionDate(e.target.value)}
                                    />
                                </div>
                                <div className="btn-group w-100">
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleCompleteOrder(order.id)}
                                    >
                                        ✓ Mark Complete
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setSelectedOrder(null)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Desktop Compact Table View */}
            <div className="d-none d-lg-block">
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead className="table-dark">
                            <tr>
                                <th style={{width: '40px'}}>
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={selectedOrders.length > 0}
                                        onChange={() => {
                                            if (selectedOrders.length > 0) {
                                                clearSelection();
                                            } else {
                                                const allCompletedIds = filteredWorkOrders
                                                    .filter(order => order.status === 'completed')
                                                    .map(order => order.id);
                                                setSelectedOrders(allCompletedIds);
                                            }
                                        }}
                                    />
                                </th>
                                <th style={{width: '120px'}}>Serial #</th>
                                <th style={{width: '120px'}}>Doctor</th>
                                <th style={{width: '120px'}}>Patient</th>
                                <th style={{width: '140px'}}>Product</th>
                                <th style={{width: '100px'}}>Status</th>
                                <th style={{width: '120px'}}>Bill Status</th>
                                <th style={{width: '180px'}}>Actions</th>
                                <th style={{width: '30px'}}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWorkOrders.map((order) => (
                                <React.Fragment key={order.id}>
                                    <tr className={`${editingOrder === order.id ? 'table-warning' : ''} ${isExpanded(order.id) ? 'expanded' : ''}`}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={selectedOrders.includes(order.id)}
                                                onChange={() => handleSelectOrder(order.id)}
                                                disabled={order.status !== 'completed'}
                                            />
                                        </td>
                                        <td>
                                            <div>
                                                <strong className="text-primary">{order.serial_number}</strong>
                                                {order.batch_id && (
                                                    <div>
                                                        <span className="badge bg-info badge-sm">
                                                            Batch ({order.batch_size})
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <div className="small text-muted">Doctor:</div>
                                                <strong>{order.doctor_name}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <div className="small text-muted">Patient:</div>
                                                <div>{order.patient_name}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <div className="small text-muted">Product:</div>
                                                <div>
                                                    <strong>{order.product_quality}</strong>
                                                    {order.product_shade && (
                                                        <div className="small text-muted">Shade: {order.product_shade}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${order.status === 'completed' ? 'bg-success' : 'bg-primary'}`}>
                                                {order.status === 'completed' ? 'Completed' : 'In Progress'}
                                            </span>
                                            {order.completion_date && (
                                                <div className="small text-muted">
                                                    {formatDate(order.completion_date)}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {order.status === 'completed' && billStatus[order.id]?.hasBill ? (
                                                <div className="d-flex flex-column align-items-start gap-1">
                                                    <span className={`badge fs-6 ${billStatus[order.id].billType === 'grouped' ? 'bg-info' : 'bg-success'}`}>
                                                        ✓ {billStatus[order.id].billType === 'grouped' ? 'Grouped' : 'Individual'}
                                                        <div className="mt-1 fw-bold">
                                                            {formatDate(billStatus[order.id].billData.bill_date)}
                                                        </div>
                                                    </span>
                                                    {billStatus[order.id].billData?.status === 'printed' && (
                                                        <span className="badge bg-primary fs-6">
                                                            🖨️ Printed
                                                        </span>
                                                    )}
                                                    <button
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => handlePrintInitialBill(order)}
                                                        title="Print Initial Bill (without amount)"
                                                    >
                                                        🖨️ Initial
                                                    </button>
                                                </div>
                                            ) : order.status === 'completed' ? (
                                                <span className="badge bg-warning text-dark fs-6">
                                                    💰 Ready to Bill
                                                </span>
                                            ) : (
                                                <span className="badge bg-secondary fs-6">
                                                    ⏳ Pending Completion
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="btn-group btn-group-sm">
                                                {editingOrder === order.id ? (
                                                    <>
                                                        <button
                                                            className="btn btn-success"
                                                            onClick={() => handleSave(order.id)}
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={cancelEdit}
                                                        >
                                                            ✗
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn btn-outline-primary"
                                                            onClick={() => startEdit(order)}
                                                            title="Edit work order"
                                                        >
                                                            ✏️
                                                        </button>
                                                        {order.status === 'completed' && !billStatus[order.id]?.hasBill && (
                                                            <button
                                                                className="btn btn-primary"
                                                                onClick={() => handleCreateBill(order)}
                                                                disabled={!canCreateBill(order)}
                                                                title="Create bill for this order"
                                                            >
                                                                💰 Bill
                                                            </button>
                                                        )}
                                                        {order.status !== 'completed' && (
                                                            <button
                                                                className="btn btn-success"
                                                                onClick={() => {
                                                                    setSelectedOrder(order.id);
                                                                    setCompletionDate(new Date().toISOString().split('T')[0]);
                                                                }}
                                                                title="Mark as completed"
                                                            >
                                                                ✓
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                className="expand-btn"
                                                onClick={() => toggleExpanded(order.id)}
                                                title="Show/hide details"
                                            >
                                                <span className={`expand-icon ${isExpanded(order.id) ? 'expanded' : ''}`}>
                                                    {isExpanded(order.id) ? '▼' : '▶'}
                                                </span>
                                            </button>
                                        </td>
                                    </tr>
                                    
                                    {/* Expanded Details Row (Desktop) */}
                                    {isExpanded(order.id) && (
                                        <tr className="table-light">
                                            <td colSpan="9">
                                                <div className="p-3">
                                                    <div className="row small">
                                                        <div className="col-md-3">
                                                            <div className="mb-2">
                                                                <span className="text-muted">Order Date:</span><br/>
                                                                <strong>{formatDate(order.order_date)}</strong>
                                                            </div>
                                                            {order.expected_complete_date && (
                                                                <div className="mb-2">
                                                                    <span className="text-muted">Expected Complete:</span><br/>
                                                                    <span className={`${
                                                                        new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' 
                                                                            ? 'text-danger fw-bold' : 'text-dark'
                                                                    }`}>
                                                                        {formatDate(order.expected_complete_date)}
                                                                        {new Date(order.expected_complete_date) < new Date() && order.status !== 'completed' && (
                                                                            <span className="text-danger ms-1">⚠️ Overdue</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-md-3">
                                                            {(order.requires_trial || order.trial_date_1 || order.trial_date_2) && (
                                                                <div className="mb-3">
                                                                    <span className="text-muted">Trial Information:</span><br/>
                                                                    {order.requires_trial && (
                                                                        <span className="badge bg-warning text-dark mb-2">🦷 Trial Required</span>
                                                                    )}
                                                                    {order.trial_date_1 && (
                                                                        <div className="text-success mt-1">✓ Trial 1: {formatDate(order.trial_date_1)}</div>
                                                                    )}
                                                                    {order.trial_date_2 && (
                                                                        <div className="text-success">✓ Trial 2: {formatDate(order.trial_date_2)}</div>
                                                                    )}
                                                                    {order.requires_trial && !order.trial_date_1 && (
                                                                        <div className="text-warning mt-1">⏳ Awaiting Trial 1</div>
                                                                    )}
                                                                    {order.requires_trial && order.trial_date_1 && !order.trial_date_2 && (
                                                                        <div className="text-warning">⏳ Awaiting Trial 2 (if needed)</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-md-6">
                                                            {order.feedback && (
                                                                <div className="mb-2">
                                                                    <span className="text-muted">Feedback:</span><br/>
                                                                    <span className="text-dark">{order.feedback}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    
                                    {/* Editing Row (Desktop) */}
                                    {editingOrder === order.id && (
                                        <tr className="table-warning">
                                            <td colSpan="9">
                                                <div className="p-3">
                                                    <h6 className="mb-3">Editing: {order.serial_number}</h6>
                                                    <div className="row">
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label small">Trial Date 1:</label>
                                                                <input
                                                                    type="date"
                                                                    name="trial_date_1"
                                                                    className="form-control form-control-sm"
                                                                    value={editData.trial_date_1 || ''}
                                                                    onChange={handleEditInputChange}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label small">Trial Date 2:</label>
                                                                <input
                                                                    type="date"
                                                                    name="trial_date_2"
                                                                    className="form-control form-control-sm"
                                                                    value={editData.trial_date_2 || ''}
                                                                    onChange={handleEditInputChange}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label small">Feedback:</label>
                                                                <textarea
                                                                    name="feedback"
                                                                    className="form-control form-control-sm"
                                                                    value={editData.feedback || ''}
                                                                    onChange={handleEditInputChange}
                                                                    placeholder="Enter feedback..."
                                                                    rows="2"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Empty State */}
            {filteredWorkOrders.length === 0 && (
                <div className="text-center py-4 text-muted">
                    <div className="mb-2">📝 No work orders found</div>
                    <small>Create your first work order to get started!</small>
                </div>
            )}

            {/* Completion Modal */}
            {selectedOrder && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Mark Order as Completed</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setSelectedOrder(null)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>
                                    Mark work order <strong>
                                        {filteredWorkOrders.find(o => o.id === selectedOrder)?.serial_number}
                                    </strong> as completed?
                                </p>
                                <div className="mb-3">
                                    <label className="form-label">Completion Date:</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={completionDate}
                                        onChange={(e) => setCompletionDate(e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedOrder(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => handleCompleteOrder(selectedOrder)}
                                    disabled={!completionDate}
                                >
                                    ✓ Mark Complete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkOrdersTable;
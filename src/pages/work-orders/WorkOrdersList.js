import React, { useState, useEffect, useCallback } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { useNavigate } from 'react-router-dom';
import WorkOrdersTable from '../../components/WorkOrdersTable';

const WorkOrdersList = () => {
    const [workOrders, setWorkOrders] = useState([]);
    const [filteredWorkOrders, setFilteredWorkOrders] = useState([]);
    const [billStatus, setBillStatus] = useState({}); // Track which orders have bills
    const [selectedOrders, setSelectedOrders] = useState([]); // For batch billing
    const [batchGroups, setBatchGroups] = useState({}); // Group orders by batch_id
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        status: 'all',
        trialRequired: 'all',
        doctorName: '',
        productQuality: 'all',
        billStatus: 'all',
        overdue: false
    });
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [completionDate, setCompletionDate] = useState('');
    const [editingOrder, setEditingOrder] = useState(null);
    const [editData, setEditData] = useState({
        trial_date_1: '',
        trial_date_2: '',
        feedback: ''
    });
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [paginatedOrders, setPaginatedOrders] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    
    const navigate = useNavigate();

    const loadWorkOrders = useCallback(async () => {
        setLoading(true);
        setMessage('');
        try {
            console.log('Loading work orders with batch info...');
            const response = await dentalLabService.getWorkOrdersWithBatchInfo();
            
            if (response.data) {
                console.log('Work orders loaded:', response.data.length);
                console.log('Sample work order structure:', response.data[0]);
                
                // Validate work order data structure
                if (response.data.length > 0) {
                    const sampleOrder = response.data[0];
                    console.log('Work order validation:');
                    console.log('- Has ID:', !!sampleOrder.id);
                    console.log('- Has serial_number:', !!sampleOrder.serial_number);
                    console.log('- Has status:', !!sampleOrder.status);
                    console.log('- Sample completion_date:', sampleOrder.completion_date);
                    console.log('- Has batch_id field:', 'batch_id' in sampleOrder);
                }
                
                setWorkOrders(response.data);
                setFilteredWorkOrders(response.data);
                
                // Group orders by batch_id for easier batch operations
                const batches = {};
                response.data.forEach(order => {
                    if (order.batch_id) {
                        if (!batches[order.batch_id]) {
                            batches[order.batch_id] = [];
                        }
                        batches[order.batch_id].push(order);
                    }
                });
                setBatchGroups(batches);
                
                // Check bill status for completed orders (but don't block the UI)
                checkBillStatusForOrders(response.data);
            } else if (response.error) {
                console.error('Error loading work orders:', response.error);
                setMessage('Error loading work orders: ' + (response.error.message || 'Unknown error'));
            } else {
                setMessage('No work orders found or unexpected response format');
            }
        } catch (error) {
            console.error('Load work orders catch error:', error);
            setMessage('Error loading work orders: ' + error.message);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadWorkOrders();
    }, [loadWorkOrders]);

    // Check which orders already have bills (run in background)
    const checkBillStatusForOrders = async (orders) => {
        try {
            const billStatusMap = {};
            
            // Only check completed orders, and limit to recent ones to avoid performance issues
            const completedOrders = orders
                .filter(order => order.status === 'completed')
                .slice(0, 50); // Limit to 50 most recent to avoid timeout
            
            console.log('Checking bill status for', completedOrders.length, 'completed orders');
            
            // Use Promise.allSettled to handle individual failures gracefully
            const billChecks = completedOrders.map(async (order) => {
                try {
                    const response = await dentalLabService.checkWorkOrderHasBill(order.id);
                    if (response.hasBill) {
                        return {
                            orderId: order.id,
                            status: {
                                hasBill: true,
                                billData: response.data,
                                billType: response.billType // 'individual' or 'grouped'
                            }
                        };
                    } else {
                        return {
                            orderId: order.id,
                            status: {
                                hasBill: false,
                                billData: null
                            }
                        };
                    }
                } catch (error) {
                    console.error('Error checking bill status for order:', order.id, error);
                    return {
                        orderId: order.id,
                        status: {
                            hasBill: false,
                            billData: null,
                            error: true
                        }
                    };
                }
            });
            
            // Wait for all checks to complete (or fail)
            const results = await Promise.allSettled(billChecks);
            
            // Process results
            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value) {
                    billStatusMap[result.value.orderId] = result.value.status;
                }
            });
            
            console.log('Bill status check completed for', Object.keys(billStatusMap).length, 'orders');
            setBillStatus(billStatusMap);
            
        } catch (error) {
            console.error('Error in checkBillStatusForOrders:', error);
            // Don't set an error message here since this is background loading
        }
    };

    const handleCompleteOrder = async (orderId) => {
        if (!completionDate) {
            setMessage('Please select completion date');
            return;
        }

        setLoading(true);
        const response = await dentalLabService.updateWorkOrder(orderId, {
            completion_date: completionDate,
            status: 'completed'
        });

        if (response.data) {
            setMessage('Work order marked as completed!');
            setSelectedOrder(null);
            setCompletionDate('');
            loadWorkOrders(); // This will also refresh bill status
        } else {
            setMessage('Error updating work order');
        }
        setLoading(false);
    };

    const handleEditOrder = (order) => {
        setEditingOrder(order.id);
        setEditData({
            trial_date_1: order.trial_date_1 || '',
            trial_date_2: order.trial_date_2 || '',
            feedback: order.feedback || ''
        });
    };

    const handleSaveEdit = async (orderId) => {
        setLoading(true);
        const response = await dentalLabService.updateWorkOrder(orderId, editData);

        if (response.data) {
            setMessage('Work order updated successfully!');
            setEditingOrder(null);
            setEditData({ trial_date_1: '', trial_date_2: '', feedback: '' });
            loadWorkOrders();
        } else {
            setMessage('Error updating work order');
        }
        setLoading(false);
    };

    const handleCancelEdit = () => {
        setEditingOrder(null);
        setEditData({ trial_date_1: '', trial_date_2: '', feedback: '' });
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const canCreateBill = (order) => {
        const isCompleted = order.status === 'completed' && order.completion_date;
        const alreadyHasBill = billStatus[order.id]?.hasBill;
        return isCompleted && !alreadyHasBill;
    };

    const handleCreateBill = (order) => {
        console.log('=== BILL CREATION DEBUG ===');
        console.log('handleCreateBill called with order:', order);
        console.log('Order ID:', order?.id);
        console.log('Order serial:', order?.serial_number);
        console.log('Order status:', order?.status);
        console.log('Order completion_date:', order?.completion_date);
        console.log('Can create bill:', canCreateBill(order));
        console.log('Bill status for this order:', billStatus[order?.id]);
        console.log('================================');
        
        // Validate order data
        if (!order) {
            console.error('ERROR: No order object passed to handleCreateBill');
            setMessage('Error: No work order data available for billing.');
            return;
        }
        
        if (!order.id) {
            console.error('ERROR: Order missing ID:', order);
            setMessage('Error: Work order is missing required ID field.');
            return;
        }
        
        if (!order.serial_number) {
            console.error('ERROR: Order missing serial number:', order);
            setMessage('Error: Work order is missing serial number.');
            return;
        }
        
        // Check if order can be billed
        if (!canCreateBill(order)) {
            console.warn('WARN: Order cannot be billed:', {
                status: order.status,
                completionDate: order.completion_date,
                hasBill: billStatus[order.id]?.hasBill
            });
            setMessage('This work order cannot be billed yet. It must be completed with a completion date.');
            return;
        }

        console.log('SUCCESS: Proceeding with navigation to create-bill page');
        console.log('Navigation state will contain:', { workOrder: order });

        try {
            // Use both URL parameter AND navigation state for maximum compatibility
            navigate(`/create-bill?workOrderId=${order.id}`, { 
                state: { 
                    workOrder: order,
                    onBillCreated: () => {
                        // Refresh bill status when coming back
                        checkBillStatusForOrders(workOrders);
                    }
                } 
            });
            console.log('Navigation called successfully with URL param and state');
        } catch (error) {
            console.error('ERROR: Navigation failed:', error);
            setMessage('Error: Failed to navigate to bill creation page.');
        }
    };

    // Batch selection functions
    const handleSelectOrder = (orderId) => {
        setSelectedOrders(prev => 
            prev.includes(orderId) 
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    const handleSelectBatch = (batchId) => {
        const batchOrderIds = batchGroups[batchId]?.map(order => order.id) || [];
        const allSelected = batchOrderIds.every(id => selectedOrders.includes(id));
        
        if (allSelected) {
            // Deselect all orders in batch
            setSelectedOrders(prev => prev.filter(id => !batchOrderIds.includes(id)));
        } else {
            // Select all orders in batch
            setSelectedOrders(prev => {
                const newSelected = [...prev];
                batchOrderIds.forEach(id => {
                    if (!newSelected.includes(id)) {
                        newSelected.push(id);
                    }
                });
                return newSelected;
            });
        }
    };

    const handleCreateBatchBill = () => {
        if (selectedOrders.length === 0) {
            setMessage('Please select a batch to create a grouped bill.');
            return;
        }

        const selectedWorkOrders = workOrders.filter(order => selectedOrders.includes(order.id));
        
        // Check if all selected orders belong to the same batch
        const batchIds = [...new Set(selectedWorkOrders.map(order => order.batch_id).filter(Boolean))];
        
        if (batchIds.length === 0) {
            setMessage('Selected orders were not created as a batch. Only work orders created using "Batch Work Order Entry" can be grouped for billing.');
            return;
        }
        
        if (batchIds.length > 1) {
            setMessage('Selected orders belong to different batches. Please select orders from the same batch only.');
            return;
        }
        
        const completedOrders = selectedWorkOrders.filter(order => order.status === 'completed');

        if (completedOrders.length === 0) {
            setMessage('Selected batch orders must be completed before creating a bill.');
            return;
        }

        if (completedOrders.length !== selectedOrders.length) {
            setMessage(`Only ${completedOrders.length} of ${selectedOrders.length} selected orders are completed. Please complete all batch orders first.`);
            return;
        }

        // Create batch object for the new grouped billing page
        const batchId = batchIds[0];
        const batchOrders = completedOrders.filter(order => order.batch_id === batchId);
        
        const batch = {
            batch_id: batchId,
            doctor_name: batchOrders[0].doctor_name,
            order_date: batchOrders[0].order_date,
            completion_date: batchOrders[0].completion_date,
            orders: batchOrders,
            total_items: batchOrders.length,
            all_teeth: []
        };
        
        // Collect all teeth from batch orders
        batchOrders.forEach(order => {
            if (order.tooth_numbers && Array.isArray(order.tooth_numbers)) {
                batch.all_teeth = [...batch.all_teeth, ...order.tooth_numbers];
            }
        });

        // Navigate to batch bill creation
        navigate('/grouped-bill', { 
            state: { 
                batch: batch,
                onBillCreated: () => {
                    setSelectedOrders([]);
                    loadWorkOrders();
                }
            }
        });
    };

    const clearSelection = () => {
        setSelectedOrders([]);
    };

    // Utility functions
    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid date';
        }
    };

    const isBatchSelected = (batchId) => {
        const batchOrderIds = batchGroups[batchId]?.map(order => order.id) || [];
        return batchOrderIds.length > 0 && batchOrderIds.some(id => selectedOrders.includes(id));
    };

    const isBatchCompleted = (batchId) => {
        const batchOrders = batchGroups[batchId] || [];
        return batchOrders.length > 0 && batchOrders.every(order => order.status === 'completed');
    };

    // Pagination functions
    const updatePagination = useCallback((filteredData, page = currentPage) => {
        const totalItems = filteredData.length;
        const calculatedTotalPages = Math.ceil(totalItems / itemsPerPage);
        
        // Reset to page 1 if current page is out of bounds
        const validPage = page > calculatedTotalPages ? 1 : page;
        
        const startIndex = (validPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        setPaginatedOrders(paginatedData);
        setTotalPages(calculatedTotalPages);
        
        if (validPage !== page) {
            setCurrentPage(validPage);
        }
        
        return {
            currentPage: validPage,
            totalPages: calculatedTotalPages,
            totalItems,
            startIndex: startIndex + 1,
            endIndex: Math.min(endIndex, totalItems)
        };
    }, [currentPage, itemsPerPage]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        updatePagination(filteredWorkOrders, page);
        // Scroll to top when changing pages
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1); // Reset to first page
        updatePagination(filteredWorkOrders, 1);
    };

    // Helper function to get page numbers for pagination
    const getPageNumbers = () => {
        const maxVisiblePages = 5;
        const pages = [];
        
        if (totalPages <= maxVisiblePages) {
            // Show all pages if there are few enough
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Smart pagination with ellipsis
            const halfVisible = Math.floor(maxVisiblePages / 2);
            let startPage = Math.max(1, currentPage - halfVisible);
            let endPage = Math.min(totalPages, currentPage + halfVisible);
            
            // Adjust if we're near the beginning or end
            if (currentPage <= halfVisible) {
                endPage = Math.min(totalPages, maxVisiblePages);
            } else if (currentPage > totalPages - halfVisible) {
                startPage = Math.max(1, totalPages - maxVisiblePages + 1);
            }
            
            // Always show first page
            if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) {
                    pages.push('...');
                }
            }
            
            // Show middle pages
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            
            // Always show last page
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    pages.push('...');
                }
                pages.push(totalPages);
            }
        }
        
        return pages;
    };

    // Enhanced search and filter functionality
    const applyFilters = useCallback((query = searchQuery, currentFilters = filters) => {
        let filtered = [...workOrders];
        
        // Text search
        if (query.trim()) {
            const searchTerm = query.toLowerCase();
            filtered = filtered.filter(order => 
                order.doctor_name?.toLowerCase().includes(searchTerm) ||
                order.patient_name?.toLowerCase().includes(searchTerm) ||
                order.serial_number?.toLowerCase().includes(searchTerm)
            );
        }
        
        // Date range filter
        if (currentFilters.dateFrom) {
            const fromDate = new Date(currentFilters.dateFrom);
            filtered = filtered.filter(order => {
                const orderDate = new Date(order.order_date);
                return orderDate >= fromDate;
            });
        }
        
        if (currentFilters.dateTo) {
            const toDate = new Date(currentFilters.dateTo);
            toDate.setHours(23, 59, 59, 999); // Include the entire day
            filtered = filtered.filter(order => {
                const orderDate = new Date(order.order_date);
                return orderDate <= toDate;
            });
        }
        
        // Status filter
        if (currentFilters.status !== 'all') {
            filtered = filtered.filter(order => order.status === currentFilters.status);
        }
        
        // Trial required filter
        if (currentFilters.trialRequired !== 'all') {
            if (currentFilters.trialRequired === 'yes') {
                filtered = filtered.filter(order => order.requires_trial || order.trial_date_1 || order.trial_date_2);
            } else if (currentFilters.trialRequired === 'no') {
                filtered = filtered.filter(order => !order.requires_trial && !order.trial_date_1 && !order.trial_date_2);
            }
        }
        
        // Doctor name filter
        if (currentFilters.doctorName.trim()) {
            const doctorTerm = currentFilters.doctorName.toLowerCase();
            filtered = filtered.filter(order => 
                order.doctor_name?.toLowerCase().includes(doctorTerm)
            );
        }
        
        // Product quality filter
        if (currentFilters.productQuality !== 'all') {
            filtered = filtered.filter(order => order.product_quality === currentFilters.productQuality);
        }
        
        // Bill status filter
        if (currentFilters.billStatus !== 'all') {
            filtered = filtered.filter(order => {
                const hasBill = billStatus[order.id]?.hasBill;
                const billData = billStatus[order.id]?.billData;
                const billPrintStatus = billData?.status;
                
                if (currentFilters.billStatus === 'billed') {
                    return hasBill;
                } else if (currentFilters.billStatus === 'printed') {
                    return hasBill && billPrintStatus === 'printed';
                } else if (currentFilters.billStatus === 'unbilled') {
                    return order.status === 'completed' && !hasBill;
                } else if (currentFilters.billStatus === 'ready') {
                    return order.status === 'completed' && !hasBill;
                }
                return true;
            });
        }
        
        // Overdue filter
        if (currentFilters.overdue) {
            const now = new Date();
            filtered = filtered.filter(order => {
                if (!order.expected_complete_date || order.status === 'completed') return false;
                const expectedDate = new Date(order.expected_complete_date);
                return expectedDate < now;
            });
        }
        
        setFilteredWorkOrders(filtered);
        // Update pagination after filtering will be handled by useEffect
    }, [workOrders, billStatus, searchQuery, filters]);

    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        setCurrentPage(1); // Reset to first page when searching
        applyFilters(query, filters);
    }, [filters, applyFilters]);
    
    const handleFilterChange = (filterName, value) => {
        const newFilters = { ...filters, [filterName]: value };
        setFilters(newFilters);
        setCurrentPage(1); // Reset to first page when filtering
        applyFilters(searchQuery, newFilters);
    };
    
    const clearAllFilters = () => {
        const defaultFilters = {
            dateFrom: '',
            dateTo: '',
            status: 'all',
            trialRequired: 'all',
            doctorName: '',
            productQuality: 'all',
            billStatus: 'all',
            overdue: false
        };
        setFilters(defaultFilters);
        setSearchQuery('');
        setCurrentPage(1); // Reset to first page when clearing filters
        applyFilters('', defaultFilters);
    };
    
    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.dateFrom || filters.dateTo) count++;
        if (filters.status !== 'all') count++;
        if (filters.trialRequired !== 'all') count++;
        if (filters.doctorName.trim()) count++;
        if (filters.productQuality !== 'all') count++;
        if (filters.billStatus !== 'all') count++;
        if (filters.overdue) count++;
        if (searchQuery.trim()) count++;
        return count;
    };
    
    // Get unique values for filter dropdowns
    const getUniqueProductQualities = () => {
        const qualities = workOrders.map(order => order.product_quality).filter(Boolean);
        return [...new Set(qualities)].sort();
    };

    // Update filtered results when workOrders or billStatus change
    useEffect(() => {
        applyFilters(searchQuery, filters);
    }, [workOrders, billStatus, applyFilters]);

    // Initialize pagination when filteredWorkOrders changes
    useEffect(() => {
        if (filteredWorkOrders.length > 0) {
            updatePagination(filteredWorkOrders, currentPage);
        } else {
            setPaginatedOrders([]);
            setTotalPages(0);
        }
    }, [filteredWorkOrders, itemsPerPage, currentPage, updatePagination]);

    // Keyboard shortcuts for search
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Escape' && searchQuery) {
                handleSearch('');
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [searchQuery, handleSearch]);

    return (
        <div className="container mt-4">
            {/* Smart Batch Billing Button - Only show if there are batch orders */}
            {(filteredWorkOrders.filter(o => o.status === 'completed' && !billStatus[o.id]?.hasBill).length > 1 || selectedOrders.length > 1) && (
                <div className="position-fixed" style={{bottom: '20px', right: '20px', zIndex: 1050}}>
                    <button 
                        className="btn btn-primary btn-lg rounded-circle shadow-lg"
                        onClick={() => {
                            if (selectedOrders.length > 1) {
                                handleCreateBatchBill();
                            } else {
                                navigate('/grouped-bill', { 
                                    state: { 
                                        workOrders: filteredWorkOrders.filter(o => o.status === 'completed' && !billStatus[o.id]?.hasBill),
                                        onBillCreated: loadWorkOrders
                                    }
                                });
                            }
                        }}
                        title={selectedOrders.length > 1 ? `Create bill for ${selectedOrders.length} selected batch orders` : `Batch billing for completed orders created together`}
                        style={{width: '60px', height: '60px'}}
                    >
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '12px', lineHeight: '1'}}>
                            <span style={{fontSize: '20px'}}>💰</span>
                            <span style={{fontSize: '10px', marginTop: '2px'}}>
                                {selectedOrders.length > 1 ? selectedOrders.length : filteredWorkOrders.filter(o => o.status === 'completed' && !billStatus[o.id]?.hasBill).length}
                            </span>
                        </div>
                    </button>
                </div>
            )}

            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h4>🦷 Work Orders Management</h4>
                            <div>
                                <button 
                                    className="btn btn-success me-2" 
                                    onClick={() => navigate('/work-order-form')}
                                >
                                    + New Work Order
                                </button>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => navigate('/staff-dashboard')}
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
                            {message && (
                                <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'}`}>
                                    {message}
                                </div>
                            )}

                            {/* Help text for billing */}
                            <div className="alert alert-info">
                                <div className="d-flex justify-content-between align-items-center">
                                    <small>
                                        <strong>💡 Billing Help:</strong> 
                                        Select batch orders using checkboxes for batch billing, or use "Create Bill" for individual orders.
                                        {Object.keys(batchGroups).length > 0 && (
                                            <span className="ms-2">
                                                🎯 <strong>Batch orders</strong> can be selected together using the "Batch" buttons.
                                            </span>
                                        )}
                                    </small>
                                    {filteredWorkOrders.filter(o => o.status === 'completed' && !billStatus[o.id]?.hasBill).length > 1 && (
                                        <button 
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => navigate('/grouped-bill', { 
                                                state: { 
                                                    workOrders: filteredWorkOrders.filter(o => o.status === 'completed' && !billStatus[o.id]?.hasBill),
                                                    onBillCreated: loadWorkOrders
                                                }
                                            })}
                                            title="Open batch billing for batch orders"
                                        >
                                            💰 Open Batch Billing
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Search Bar and Filters */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    {/* Search and Filter Toggle */}
                                    <div className="row align-items-center mb-2">
                                        <div className="col-md-8">
                                            <div className="input-group">
                                                <span className="input-group-text">
                                                    🔍
                                                </span>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Search by doctor name, patient name, or serial number..."
                                                    value={searchQuery}
                                                    onChange={(e) => handleSearch(e.target.value)}
                                                    autoComplete="off"
                                                    spellCheck="false"
                                                />
                                                {searchQuery && (
                                                    <button
                                                        className="btn btn-outline-secondary"
                                                        type="button"
                                                        onClick={() => handleSearch('')}
                                                        title="Clear search"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-md-4 text-end">
                                            <button
                                                className={`btn btn-outline-primary me-2 ${getActiveFilterCount() > 0 ? 'btn-primary text-white' : ''}`}
                                                onClick={() => setShowFilters(!showFilters)}
                                            >
                                                🎛️ Filters
                                                {getActiveFilterCount() > 0 && (
                                                    <span className="badge bg-light text-dark ms-1">
                                                        {getActiveFilterCount()}
                                                    </span>
                                                )}
                                            </button>
                                            {getActiveFilterCount() > 0 && (
                                                <button
                                                    className="btn btn-outline-secondary btn-sm"
                                                    onClick={clearAllFilters}
                                                    title="Clear all filters"
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Advanced Filters Panel */}
                                    {showFilters && (
                                        <div className="card border-primary mb-3">
                                            <div className="card-header bg-primary text-white">
                                                <h6 className="mb-0">🎛️ Advanced Filters</h6>
                                            </div>
                                            <div className="card-body">
                                                <div className="row g-3">
                                                    {/* Date Range */}
                                                    <div className="col-md-3">
                                                        <label className="form-label small fw-bold">📅 Order Date Range</label>
                                                        <div className="mb-2">
                                                            <input
                                                                type="date"
                                                                className="form-control form-control-sm"
                                                                placeholder="From date"
                                                                value={filters.dateFrom}
                                                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                                            />
                                                            <small className="text-muted">From</small>
                                                        </div>
                                                        <div>
                                                            <input
                                                                type="date"
                                                                className="form-control form-control-sm"
                                                                placeholder="To date"
                                                                value={filters.dateTo}
                                                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                                            />
                                                            <small className="text-muted">To</small>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Status */}
                                                    <div className="col-md-2">
                                                        <label className="form-label small fw-bold">📊 Status</label>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={filters.status}
                                                            onChange={(e) => handleFilterChange('status', e.target.value)}
                                                        >
                                                            <option value="all">All Status</option>
                                                            <option value="pending">In Progress</option>
                                                            <option value="completed">Completed</option>
                                                        </select>
                                                    </div>
                                                    
                                                    {/* Trial Required */}
                                                    <div className="col-md-2">
                                                        <label className="form-label small fw-bold">🦷 Trial</label>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={filters.trialRequired}
                                                            onChange={(e) => handleFilterChange('trialRequired', e.target.value)}
                                                        >
                                                            <option value="all">All Orders</option>
                                                            <option value="yes">Trial Required</option>
                                                            <option value="no">No Trial</option>
                                                        </select>
                                                    </div>
                                                    
                                                    {/* Product Quality */}
                                                    <div className="col-md-2">
                                                        <label className="form-label small fw-bold">🦷 Product</label>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={filters.productQuality}
                                                            onChange={(e) => handleFilterChange('productQuality', e.target.value)}
                                                        >
                                                            <option value="all">All Products</option>
                                                            {getUniqueProductQualities().map(quality => (
                                                                <option key={quality} value={quality}>{quality}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    
                                                    {/* Bill Status */}
                                                    <div className="col-md-2">
                                                        <label className="form-label small fw-bold">💰 Bill Status</label>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={filters.billStatus}
                                                            onChange={(e) => handleFilterChange('billStatus', e.target.value)}
                                                        >
                                                            <option value="all">All Bills</option>
                                                            <option value="billed">Already Billed</option>
                                                            <option value="printed">Printed Bills</option>
                                                            <option value="ready">Ready to Bill</option>
                                                            <option value="unbilled">Not Billed</option>
                                                        </select>
                                                    </div>
                                                    
                                                    {/* Doctor Name */}
                                                    <div className="col-md-6">
                                                        <label className="form-label small fw-bold">👨‍⚕️ Doctor Name</label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Filter by doctor name..."
                                                            value={filters.doctorName}
                                                            onChange={(e) => handleFilterChange('doctorName', e.target.value)}
                                                        />
                                                    </div>
                                                    
                                                    {/* Overdue Orders */}
                                                    <div className="col-md-6">
                                                        <label className="form-label small fw-bold">⚠️ Special Filters</label>
                                                        <div className="form-check">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id="overdueFilter"
                                                                checked={filters.overdue}
                                                                onChange={(e) => handleFilterChange('overdue', e.target.checked)}
                                                            />
                                                            <label className="form-check-label small" htmlFor="overdueFilter">
                                                                ⚠️ Show only overdue orders
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Filter Summary */}
                                                <div className="row mt-3">
                                                    <div className="col-12">
                                                        <div className="alert alert-light mb-0">
                                                            <small>
                                                                <strong>📊 Results:</strong> Showing {filteredWorkOrders.length} of {workOrders.length} work orders
                                                                {getActiveFilterCount() > 0 && (
                                                                    <span className="ms-2">
                                                                        • {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active
                                                                    </span>
                                                                )}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Quick Filter Results */}
                                    {(searchQuery || getActiveFilterCount() > 0) && (
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <small className="text-muted">
                                                {filteredWorkOrders.length === 0 ? (
                                                    <span className="text-warning">
                                                        ⚠️ No work orders match your current filters
                                                    </span>
                                                ) : (
                                                    <span>
                                                        📋 Showing {filteredWorkOrders.length} of {workOrders.length} work orders
                                                    </span>
                                                )}
                                            </small>
                                            {getActiveFilterCount() > 0 && (
                                                <small>
                                                    <button
                                                        className="btn btn-link btn-sm p-0 text-decoration-none"
                                                        onClick={clearAllFilters}
                                                    >
                                                        🔄 Reset all filters
                                                    </button>
                                                </small>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <div className="mt-2">Loading work orders...</div>
                                    <small className="text-muted">This might take a moment if you have many orders</small>
                                </div>
                            ) : message ? (
                                <div className="text-center py-4">
                                    <div className="alert alert-warning">
                                        {message}
                                    </div>
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={loadWorkOrders}
                                    >
                                        🔄 Retry Loading
                                    </button>
                                </div>
                            ) : (
                                <WorkOrdersTable 
                                    filteredWorkOrders={paginatedOrders}
                                    selectedOrders={selectedOrders}
                                    setSelectedOrders={setSelectedOrders}
                                    handleSelectOrder={handleSelectOrder}
                                    clearSelection={clearSelection}
                                    billStatus={billStatus}
                                    refreshBillStatus={() => checkBillStatusForOrders(workOrders)}
                                    formatDate={formatDate}
                                    editingOrder={editingOrder}
                                    editData={editData}
                                    handleEditInputChange={handleEditInputChange}
                                    startEdit={handleEditOrder}
                                    handleSave={handleSaveEdit}
                                    cancelEdit={handleCancelEdit}
                                    handleCreateBill={handleCreateBill}
                                    canCreateBill={canCreateBill}
                                    selectedOrder={selectedOrder}
                                    setSelectedOrder={setSelectedOrder}
                                    completionDate={completionDate}
                                    setCompletionDate={setCompletionDate}
                                    handleCompleteOrder={handleCompleteOrder}
                                    isBatchSelected={isBatchSelected}
                                    handleSelectBatch={handleSelectBatch}
                                    isBatchCompleted={isBatchCompleted}
                                    batchGroups={batchGroups}
                                />
                            )}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    {/* Items per page selector */}
                                    <div className="me-3">
                                        <select
                                            className="form-select form-select-sm"
                                            value={itemsPerPage}
                                            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                            aria-label="Items per page"
                                        >
                                            <option value={25}>25 items per page</option>
                                            <option value={50}>50 items per page</option>
                                            <option value={100}>100 items per page</option>
                                        </select>
                                    </div>
                                    
                                    {/* Pagination buttons */}
                                    <nav>
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className="page-item">
                                                <button 
                                                    className="page-link"
                                                    onClick={() => handlePageChange(1)}
                                                    disabled={currentPage === 1}
                                                    title="First Page"
                                                >
                                                    ««
                                                </button>
                                            </li>
                                            <li className="page-item">
                                                <button 
                                                    className="page-link"
                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    title="Previous Page"
                                                >
                                                    «
                                                </button>
                                            </li>
                                            
                                            {/* Page number buttons */}
                                            {getPageNumbers().map((page, index) => {
                                                if (page === '...') {
                                                    return (
                                                        <li key={`ellipsis-${index}`} className="page-item disabled">
                                                            <span className="page-link">...</span>
                                                        </li>
                                                    );
                                                }
                                                return (
                                                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                                        <button 
                                                            className="page-link"
                                                            onClick={() => handlePageChange(page)}
                                                            title={`Page ${page}`}
                                                        >
                                                            {page}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                            
                                            <li className="page-item">
                                                <button 
                                                    className="page-link"
                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                    disabled={currentPage === totalPages}
                                                    title="Next Page"
                                                >
                                                    »
                                                </button>
                                            </li>
                                            <li className="page-item">
                                                <button 
                                                    className="page-link"
                                                    onClick={() => handlePageChange(totalPages)}
                                                    disabled={currentPage === totalPages}
                                                    title="Last Page"
                                                >
                                                    »»
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            )}

                            {/* Selected Orders Summary - Only show if multiple orders selected */}
                            {selectedOrders.length > 1 && (
                                <div className="card-body border-bottom bg-light">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 className="mb-1">📋 Ready for Batch Billing</h6>
                                            <small className="text-muted">
                                                {selectedOrders.length} orders selected
                                                {Object.keys(batchGroups).some(batchId => 
                                                    isBatchSelected(batchId) && 
                                                    batchGroups[batchId].every(order => selectedOrders.includes(order.id))
                                                ) && (
                                                    <span className="ms-2 badge bg-info">
                                                        Includes complete batch{Object.keys(batchGroups).filter(batchId => 
                                                            isBatchSelected(batchId)
                                                        ).length > 1 ? 'es' : ''}
                                                    </span>
                                                )}
                                            </small>
                                        </div>
                                        <div>
                                            <button
                                                className="btn btn-success me-2"
                                                onClick={handleCreateBatchBill}
                                            >
                                                💰 Create Batch Bill
                                            </button>
                                            <button
                                                className="btn btn-outline-secondary"
                                                onClick={clearSelection}
                                            >
                                                Clear Selection
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkOrdersList;

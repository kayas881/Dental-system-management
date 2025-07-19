import React, { useState, useEffect, useCallback } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { useNavigate } from 'react-router-dom';
import WorkOrdersTable from '../../components/WorkOrdersTable';

const WorkOrdersList = () => {
    // ... (keep all existing useState hooks as they are)
    const [workOrders, setWorkOrders] = useState([]);
    const [filteredWorkOrders, setFilteredWorkOrders] = useState([]);
    const [billStatus, setBillStatus] = useState({});
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [batchGroups, setBatchGroups] = useState({});
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
    const [editData, setEditData] = useState({ feedback: '' });
    const [workOrderTrials, setWorkOrderTrials] = useState({});
    const [showTrialForm, setShowTrialForm] = useState({});
    const [newTrial, setNewTrial] = useState({ trial_name: '', trial_date: '' });
    const [returningOrder, setReturningOrder] = useState(null);
    const [returnData, setReturnData] = useState({ reason: '', notes: '', expectedDate: '' });
    const [showRevisionHistory, setShowRevisionHistory] = useState(null);
    const [revisionHistory, setRevisionHistory] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [paginatedOrders, setPaginatedOrders] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const navigate = useNavigate();

    // --- Helper to clear messages after a delay ---
    const showTemporaryMessage = (msg, isError = false) => {
        setMessage(msg);
        setTimeout(() => {
            setMessage('');
        }, isError ? 4000 : 1000); // Longer delay for errors
    };

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
            showTemporaryMessage('Please select a completion date.', true);
            return;
        }
        setLoading(true);
        const response = await dentalLabService.updateWorkOrder(orderId, {
            completion_date: completionDate,
            status: 'completed'
        });
        if (response.data) {
            showTemporaryMessage('Work order marked as completed!');
            setSelectedOrder(null);
            setCompletionDate('');
            loadWorkOrders();
        } else {
            showTemporaryMessage('Error updating work order', true);
        }
        setLoading(false);
    };

    const handleEditOrder = (order) => {
        setEditingOrder(order.id);
        setEditData({
            feedback: order.feedback || ''
        });
        // Load trials for this work order when editing
        loadTrialsForWorkOrder(order.id);
    };

const handleSaveEdit = async (orderId) => {
        setLoading(true);
        const response = await dentalLabService.updateWorkOrder(orderId, editData);
        if (response.data) {
            showTemporaryMessage('Work order updated successfully!');
            setEditingOrder(null);
            setEditData({ feedback: '' });
            loadWorkOrders();
        } else {
            showTemporaryMessage('Error updating work order', true);
        }
        setLoading(false);
    };




    const handleCancelEdit = () => {
        // Reset trial form state for the current editing order
        if (editingOrder) {
            setShowTrialForm(prev => ({ ...prev, [editingOrder]: false }));
        }
        setEditingOrder(null);
        setEditData({ feedback: '' });
        setNewTrial({ trial_name: '', trial_date: '' });
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

    const handleCreateBill = async (order) => {
        console.log('=== INDIVIDUAL BILL CREATION ===');
        console.log('Creating bill for order:', order);
        console.log('Order ID:', order?.id);
        console.log('Order serial:', order?.serial_number);
        console.log('Order status:', order?.status);
        console.log('Order tooth_numbers RAW:', order?.tooth_numbers);
        console.log('Order tooth_numbers type:', typeof order?.tooth_numbers);
        console.log('Order tooth_numbers is array:', Array.isArray(order?.tooth_numbers));
        console.log('Order tooth_numbers length:', order?.tooth_numbers?.length);
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

        // Create the bill directly
        setLoading(true);
        setMessage('Creating bill...');

        try {
            // Prepare bill data for individual order (using correct bill table schema)
            const billData = {
                work_order_id: order.id,
                doctor_name: order.doctor_name,
                patient_name: order.patient_name, // Include patient name for printing
                work_description: `${order.product_quality} - ${order.product_shade} for ${order.patient_name}`,
                serial_number: order.serial_number,
                tooth_numbers: order.tooth_numbers, // Include tooth numbers for quadrant display
                completion_date: order.completion_date,
                bill_date: new Date().toISOString().split('T')[0],
                notes: `Individual bill for work order ${order.serial_number}`,
                status: 'pending'
            };

            console.log('Creating individual bill with data:', billData);
            console.log('Order tooth_numbers format:', typeof order.tooth_numbers, order.tooth_numbers);
            console.log('Bill tooth_numbers format:', typeof billData.tooth_numbers, billData.tooth_numbers);
            
            // Ensure tooth_numbers is properly formatted as array
            let processedToothNumbers = order.tooth_numbers;
            if (typeof processedToothNumbers === 'string') {
                try {
                    processedToothNumbers = JSON.parse(processedToothNumbers);
                } catch (e) {
                    console.warn('Failed to parse tooth_numbers string:', processedToothNumbers);
                    processedToothNumbers = [];
                }
            }
            if (!Array.isArray(processedToothNumbers)) {
                processedToothNumbers = processedToothNumbers ? [processedToothNumbers] : [];
            }
            
            // Fallback: If no tooth numbers but we have product info, provide a generic display
            if (processedToothNumbers.length === 0 && order.product_quality) {
                console.log('No tooth numbers found, using fallback display');
                // Don't add fake tooth numbers, just leave empty for now
                // The print template will handle empty arrays gracefully
            }
            
            console.log('Processed tooth_numbers for bill:', processedToothNumbers);
            
            // Update billData with processed tooth_numbers
            billData.tooth_numbers = processedToothNumbers;

            // Create the bill using the service
            const response = await dentalLabService.createBill(billData);
            
            if (response.data) {
                setMessage(`✅ Bill created successfully for work order ${order.serial_number}`);
                
                // Refresh data to update bill status
                loadWorkOrders();
                
                // Show success message for a bit longer
                setTimeout(() => setMessage(''), 5000);
                
            } else {
                console.error('Error creating bill:', response.error);
                setMessage('❌ Error creating bill: ' + (response.error?.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error in handleCreateBill:', error);
            setMessage('❌ Error creating bill: ' + error.message);
        }

        setLoading(false);
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

    const handleCreateBatchBill = async () => {
        if (selectedOrders.length === 0) {
            setMessage('Please select work orders to create a grouped bill.');
            return;
        }

        const selectedWorkOrders = workOrders.filter(order => selectedOrders.includes(order.id));
        
        // Check if all selected orders are from the same doctor
        const doctors = [...new Set(selectedWorkOrders.map(order => order.doctor_name))];
        
        if (doctors.length > 1) {
            setMessage(`You can only generate a bill for one doctor at a time. Selected orders are from: ${doctors.join(', ')}`);
            return;
        }
        
        const completedOrders = selectedWorkOrders.filter(order => order.status === 'completed');

        if (completedOrders.length === 0) {
            setMessage('Selected orders must be completed before creating a bill.');
            return;
        }

        if (completedOrders.length !== selectedOrders.length) {
            setMessage(`Only ${completedOrders.length} of ${selectedOrders.length} selected orders are completed. Please complete all orders first.`);
            return;
        }

        // Check if any selected orders already have bills
        const ordersWithBills = completedOrders.filter(order => billStatus[order.id]?.hasBill);
        if (ordersWithBills.length > 0) {
            setMessage(`${ordersWithBills.length} of the selected orders already have bills. Please select only unbilled orders.`);
            return;
        }

        // Create the grouped bill directly
        setLoading(true);
        setMessage('Creating grouped bill...');

        try {
            const doctorName = doctors[0];
            
            // Prepare bill data
            const billData = {
                doctor_name: doctorName,
                bill_date: new Date().toISOString().split('T')[0],
                work_order_ids: completedOrders.map(order => order.id),
                notes: `Grouped bill for ${completedOrders.length} work orders`,
                is_grouped: true,
                grouped_orders_count: completedOrders.length
            };

            console.log('Creating grouped bill with data:', billData);

            // Create the bill using the service
            const response = await dentalLabService.createGroupedBill(billData);
            
            if (response.data) {
                setMessage(`✅ Grouped bill created successfully for Dr. ${doctorName} (${completedOrders.length} orders)`);
                
                // Clear selection and refresh data
                setSelectedOrders([]);
                loadWorkOrders(); // This will refresh the bill status for all orders
                
                // Show success message for a bit longer
                setTimeout(() => setMessage(''), 5000);
                
            } else {
                console.error('Error creating grouped bill:', response.error);
                setMessage('❌ Error creating grouped bill: ' + (response.error?.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error in handleCreateBatchBill:', error);
            setMessage('❌ Error creating grouped bill: ' + error.message);
        }

        setLoading(false);
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
                filtered = filtered.filter(order => {
                    // Check if order requires trial OR has existing trials
                    const hasTrials = workOrderTrials[order.id] && workOrderTrials[order.id].length > 0;
                    return order.requires_trial || hasTrials;
                });
            } else if (currentFilters.trialRequired === 'no') {
                filtered = filtered.filter(order => {
                    // Check if order doesn't require trial AND has no existing trials
                    const hasTrials = workOrderTrials[order.id] && workOrderTrials[order.id].length > 0;
                    return !order.requires_trial && !hasTrials;
                });
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

    // Load trials for expanded work orders (not just editing) - moved before useEffect
    const loadTrialsForWorkOrder = useCallback(async (workOrderId) => {
        try {
            console.log('Loading trials for work order:', workOrderId);
            const response = await dentalLabService.getTrialsByWorkOrder(workOrderId);
            
            if (response.success) {
                setWorkOrderTrials(prev => ({
                    ...prev,
                    [workOrderId]: response.data || []
                }));
            } else {
                console.error('Error loading trials:', response.error);
            }
        } catch (error) {
            console.error('Error loading trials:', error);
        }
    }, []);

    useEffect(() => {
        // Preload trials for all work orders on initial load
        const preloadTrials = async () => {
            for (const order of workOrders) {
                if (order.id) {
                    await loadTrialsForWorkOrder(order.id);
                }
            }
        };

        if (workOrders.length > 0) {
            preloadTrials();
        }
    }, [workOrders, loadTrialsForWorkOrder]);

    // Trial Management Functions
    const handleAddTrial = async () => {
        if (!newTrial.trial_name.trim() || !newTrial.trial_date) {
            alert('Please enter both trial name and date');
            return;
        }
        try {
            const trialData = {
                work_order_id: editingOrder,
                trial_name: newTrial.trial_name.trim(),
                trial_date: newTrial.trial_date
            };
            const response = await dentalLabService.createTrial(trialData);
            if (response.success) {
                showTemporaryMessage('Trial added successfully!');
                setNewTrial({ trial_name: '', trial_date: '' });
                setShowTrialForm(prev => ({ ...prev, [editingOrder]: false }));
                loadTrialsForWorkOrder(editingOrder);
            } else {
                showTemporaryMessage('Error adding trial: ' + response.error, true);
            }
        } catch (error) {
            showTemporaryMessage('Error adding trial: ' + error.message, true);
        }
    };


    const handleDeleteTrial = async (trialId) => {
        if (!window.confirm('Are you sure you want to delete this trial?')) return;

        try {
            const response = await dentalLabService.deleteTrial(trialId);
            
            if (response.success) {
                setMessage('Trial deleted successfully!');
                // Reload trials for this work order
                loadTrialsForWorkOrder(editingOrder);
            } else {
                alert('Error deleting trial: ' + response.error);
            }
        } catch (error) {
            console.error('Error deleting trial:', error);
            alert('Error deleting trial: ' + error.message);
        }
    };

    const handleTrialInputChange = (e) => {
        const { name, value } = e.target;
        setNewTrial(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Return/Revision Management Functions
    const handleReturnOrder = (order) => {
        setReturningOrder(order);
        setReturnData({
            reason: '',
            notes: '',
            expectedDate: ''
        });
    };

 const handleReturnSubmit = async () => {
        if (!returnData.reason.trim()) {
            setMessage('Please provide a reason for returning the order');
            return;
        }

        setLoading(true);
        try {
            const response = await dentalLabService.returnWorkOrder(returningOrder.id, returnData);
            
            if (response.success) {
                setMessage(`Work order ${returningOrder.serial_number} returned for revision successfully`);
                setReturningOrder(null);
                setReturnData({ reason: '', notes: '', expectedDate: '' });
                
                // Refresh the list and bill status
                await loadWorkOrders();
            } else {
                setMessage('Error returning work order: ' + response.error);
            }
        } catch (error) {
            setMessage('Error returning work order: ' + error.message);
        }
        setLoading(false);
    };

    const handleCompleteRevision = async (orderId) => {
        if (!completionDate) {
            setMessage('Please select completion date');
            return;
        }

        setLoading(true);
        try {
            const response = await dentalLabService.completeRevision(orderId, completionDate);
            
            if (response.success) {
                setMessage('Revision completed successfully!');
                setSelectedOrder(null);
                setCompletionDate('');
                loadWorkOrders(); // Refresh the list
            } else {
                setMessage('Error completing revision: ' + response.error);
            }
        } catch (error) {
            setMessage('Error completing revision: ' + error.message);
        }
        setLoading(false);
    };

    const loadRevisionHistory = async (workOrderId) => {
        try {
            const response = await dentalLabService.getRevisionHistory(workOrderId);
            if (response.success) {
                setRevisionHistory(response.data);
                setShowRevisionHistory(workOrderId);
            } else {
                setMessage('Error loading revision history: ' + response.error);
            }
        } catch (error) {
            setMessage('Error loading revision history: ' + error.message);
        }
    };

    const handleReturnInputChange = (e) => {
        const { name, value } = e.target;
        setReturnData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="container mt-4">
            {/* Unified Direct Billing Button - Show if orders are selected */}
            {selectedOrders.length > 1 && (
                <div className="position-fixed" style={{bottom: '20px', right: '20px', zIndex: 1050}}>
                    <button 
                        className="btn btn-primary btn-lg rounded-circle shadow-lg"
                        onClick={handleCreateBatchBill}
                        title={`Create bill directly for ${selectedOrders.length} selected orders`}
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
                            {/* Message will now appear here, above the table */}
                            {message && (
                                <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'}`}>
                                    {message}
                                </div>
                            )}
                             {/* Help text for unified billing and returns */}
                            <div className="alert alert-info">
                                <div className="d-flex justify-content-between align-items-center">
                                    <small>
                                        <strong>💡 Workflow:</strong> 
                                        Select completed work orders to create bills instantly. 
                                        <span className="text-primary ms-1">
                                            All selected orders must be from the same doctor.
                                        </span>
                                        <span className="text-warning ms-2">
                                            ↩️ Use return button on billed orders if product needs revision.
                                        </span>
                                        {Object.keys(batchGroups).length > 0 && (
                                            <span className="ms-2">
                                                🎯 Use "Batch" buttons to quickly select all orders from a batch.
                                            </span>
                                        )}
                                    </small>
                                </div>
                            </div>
                            {/* Help text for unified billing */}
                            <div className="alert alert-info">
                                <div className="d-flex justify-content-between align-items-center">
                                    <small>
                                        <strong>💡 Direct Billing:</strong> 
                                        Select any completed work orders using checkboxes to create a grouped bill instantly. 
                                        <span className="text-primary ms-1">
                                            All selected orders must be from the same doctor.
                                        </span>
                                        {Object.keys(batchGroups).length > 0 && (
                                            <span className="ms-2">
                                                🎯 Use "Batch" buttons to quickly select all orders from a batch.
                                            </span>
                                        )}
                                    </small>
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
                                                            <option value="in_progress">In Progress</option>
                                                            <option value="completed">Completed</option>
                                                            <option value="returned">Returned</option>
                                                            <option value="revision_in_progress">Revision in Progress</option>
                                                            <option value="cancelled">Cancelled</option>
                                                            
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
                                <>
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
                                        handleReturnOrder={handleReturnOrder}
                                        handleCompleteRevision={handleCompleteRevision}
                                        loadRevisionHistory={loadRevisionHistory}
                                        workOrderTrials={workOrderTrials}
                                        loadTrialsForWorkOrder={loadTrialsForWorkOrder}
                                        showTrialForm={showTrialForm}
                                        setShowTrialForm={setShowTrialForm}
                                        newTrial={newTrial}
                                        handleTrialInputChange={handleTrialInputChange}
                                        handleAddTrial={handleAddTrial}
                                        handleDeleteTrial={handleDeleteTrial}
                        
                                    />

                                    {/* Selection Summary */}
                                    {selectedOrders.length > 0 && (
                                        <div className="mb-3">
                                            <div className="card border-primary">
                                                <div className="card-body py-2">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <strong className="text-primary">
                                                                {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
                                                            </strong>
                                                            {(() => {
                                                                const selectedWorkOrders = workOrders.filter(order => selectedOrders.includes(order.id));
                                                                const doctors = [...new Set(selectedWorkOrders.map(order => order.doctor_name))];
                                                                
                                                                if (doctors.length === 1) {
                                                                    return (
                                                                        <span className="text-success ms-2">
                                                                            ✓ All from Dr. {doctors[0]}
                                                                        </span>
                                                                    );
                                                                } else if (doctors.length > 1) {
                                                                    return (
                                                                        <span className="text-danger ms-2">
                                                                            ⚠️ Multiple doctors: {doctors.join(', ')}
                                                                        </span>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                        </div>
                                                        <div>
                                                            <button 
                                                                className="btn btn-success btn-sm me-2"
                                                                onClick={handleCreateBatchBill}
                                                                disabled={(() => {
                                                                    const selectedWorkOrders = workOrders.filter(order => selectedOrders.includes(order.id));
                                                                    const doctors = [...new Set(selectedWorkOrders.map(order => order.doctor_name))];
                                                                    return doctors.length > 1 || selectedWorkOrders.some(order => order.status !== 'completed');
                                                                })()}
                                                            >
                                                                💰 Create Bill Now
                                                            </button>
                                                            <button 
                                                                className="btn btn-outline-secondary btn-sm"
                                                                onClick={clearSelection}
                                                            >
                                                                Clear Selection
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
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
                                                💰 Create Bill Now
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
                       {/* Return Order Modal */}
            {returningOrder && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Return Work Order for Revision</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setReturningOrder(null)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <strong>Work Order:</strong> {returningOrder.serial_number}<br/>
                                    <strong>Patient:</strong> {returningOrder.patient_name}<br/>
                                    <strong>Doctor:</strong> Dr. {returningOrder.doctor_name}
                                </div>
                                                                
                                <div className="alert alert-warning">
                                    <small>
                                        <strong>Note:</strong> This work order has been billed and delivered. 
                                        Returning it will put it back into production for revision.
                                    </small>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Reason for Return <span className="text-danger">*</span></label>
                                    <select
                                        className="form-select"
                                        name="reason"
                                        value={returnData.reason}
                                        onChange={handleReturnInputChange}
                                        required
                                    >
                                        <option value="">Select reason...</option>
                                        <option value="Poor Fit">Poor Fit</option>
                                        <option value="Color Mismatch">Color Mismatch</option>
                                        <option value="Incorrect Shape">Incorrect Shape</option>
                                        <option value="Surface Imperfections">Surface Imperfections</option>
                                        <option value="Size Issues">Size Issues</option>
                                        <option value="Material Defect">Material Defect</option>
                                        <option value="Doctor Request">Doctor's Request for Changes</option>
                                        <option value="Patient Complaint">Patient Complaint</option>
                                        <option value="Quality Control">Quality Control Issues</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Revision Notes</label>
                                    <textarea
                                        className="form-control"
                                        name="notes"
                                        value={returnData.notes}
                                        onChange={handleReturnInputChange}
                                        rows={3}
                                        placeholder="Describe what needs to be revised or improved..."
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">New Expected Completion Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        name="expectedDate"
                                        value={returnData.expectedDate}
                                        onChange={handleReturnInputChange}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <small className="text-muted">Leave empty to keep existing expected date</small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setReturningOrder(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-warning"
                                    onClick={handleReturnSubmit}
                                    disabled={!returnData.reason}
                                >
                                    Return for Revision
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Revision History Modal */}
            {showRevisionHistory && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Revision History</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowRevisionHistory(null)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {revisionHistory.length === 0 ? (
                                    <p className="text-muted">No revision history found for this work order.</p>
                                ) : (
                                    <div className="timeline">
                                        {revisionHistory.map((revision, index) => (
                                            <div key={revision.id} className="timeline-item mb-3">
                                                <div className="card">
                                                    <div className="card-header d-flex justify-content-between align-items-center">
                                                        <h6 className="mb-0">
                                                            Revision #{revision.revision_number}
                                                        </h6>
                                                        <small className="text-muted">
                                                            {formatDate(revision.return_date)}
                                                        </small>
                                                    </div>
                                                    <div className="card-body">
                                                        <div className="row">
                                                            <div className="col-md-6">
                                                                <strong>Reason:</strong> {revision.return_reason}<br/>
                                                                <strong>Returned by:</strong> {revision.returned_by_user?.email || 'Unknown'}
                                                            </div>
                                                            <div className="col-md-6">
                                                                {revision.previous_completion_date && (
                                                                    <>
                                                                        <strong>Previous Completion:</strong> {formatDate(revision.previous_completion_date)}<br/>
                                                                    </>
                                                                )}
                                                                {revision.new_expected_completion_date && (
                                                                    <>
                                                                        <strong>New Expected Date:</strong> {formatDate(revision.new_expected_completion_date)}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {revision.revision_notes && (
                                                            <div className="mt-2">
                                                                <strong>Notes:</strong>
                                                                <p className="text-muted mb-0">{revision.revision_notes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowRevisionHistory(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkOrdersList;

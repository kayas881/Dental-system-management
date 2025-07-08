import React, { useState, useEffect, useCallback } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { authService } from '../../services/supabaseAuthService';
import { useNavigate } from 'react-router-dom';

// Component imports
import PageHeader from '../../components/shared/PageHeader';
import StatisticsCards from '../../components/shared/StatisticsCards';
import BillFilters from '../../components/bills/BillFilters';
import BillsTable from '../../components/bills/BillsTable';
import BulkOperations from '../../components/bills/BulkOperations';
import { 
    formatDate, 
    handleSingleBillPrint, 
    handleGroupedBillPrint,
    printInitialBill,
    printFinalBill,
    handleBulkBillPrint
} from '../../components/bills/BillPrintUtils';

const BillsManagementPage = () => {
    // State management
    const [bills, setBills] = useState([]);
    const [filteredBills, setFilteredBills] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: 'all',
        doctor: '',
        searchSerial: ''
    });
    const [editingBill, setEditingBill] = useState(null);
    const [billAmount, setBillAmount] = useState('');
    const [selectedBills, setSelectedBills] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [paginatedBills, setPaginatedBills] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    
    const navigate = useNavigate();

    // Filter bills based on current filters
    const filterBills = useCallback(() => {
        let filtered = [...bills];

        if (filters.startDate) {
            filtered = filtered.filter(bill => bill.bill_date >= filters.startDate);
        }
        if (filters.endDate) {
            filtered = filtered.filter(bill => bill.bill_date <= filters.endDate);
        }
        if (filters.status !== 'all') {
            // Special handling for pending status - bills that haven't been priced yet
            if (filters.status === 'pending') {
                filtered = filtered.filter(bill => !bill.amount || parseFloat(bill.amount) <= 0);
            } else if (filters.status === 'priced') {
                // Priced bills should have amount > 0 (regardless of database status for backward compatibility)
                filtered = filtered.filter(bill => 
                    bill.amount && parseFloat(bill.amount) > 0
                );
            } else {
                // For other statuses (printed, sent), just check the database status
                filtered = filtered.filter(bill => bill.status === filters.status);
            }
        }
        if (filters.doctor) {
            filtered = filtered.filter(bill => 
                bill.doctor_name.toLowerCase().includes(filters.doctor.toLowerCase())
            );
        }
        if (filters.searchSerial) {
            filtered = filtered.filter(bill => 
                bill.serial_number.toLowerCase().includes(filters.searchSerial.toLowerCase())
            );
        }

        setFilteredBills(filtered);
    }, [bills, filters]);

    // Pagination functions
    const updatePagination = useCallback((filteredData, page = currentPage) => {
        const totalItems = filteredData.length;
        const calculatedTotalPages = Math.ceil(totalItems / itemsPerPage);
        
        // Reset to page 1 if current page is out of bounds
        const validPage = page > calculatedTotalPages ? 1 : page;
        
        const startIndex = (validPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        setPaginatedBills(paginatedData);
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
        updatePagination(filteredBills, page);
        // Scroll to top when changing pages
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1); // Reset to first page
        updatePagination(filteredBills, 1);
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
            
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            
            // Add ellipsis if needed
            if (startPage > 1) {
                if (startPage > 2) {
                    pages.unshift('...');
                }
                pages.unshift(1);
            }
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    pages.push('...');
                }
                pages.push(totalPages);
            }
        }
        
        return pages;
    };

    // Check user role and permissions
    useEffect(() => {
        const checkUserRole = async () => {
            const role = authService.getUserRole();
            setIsAdmin(role === 'ADMIN' || role === 'admin');
            
            // Both admin and staff can access bills management
            // Staff can print initial bills, admin can print final bills
        };
        
        checkUserRole();
    }, [navigate]);

    useEffect(() => {
        loadBills();
    }, []);

    useEffect(() => {
        filterBills();
    }, [bills, filters, filterBills]);

    // Initialize pagination when filteredBills changes
    useEffect(() => {
        if (filteredBills.length >= 0) {
            updatePagination(filteredBills, currentPage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredBills, itemsPerPage, currentPage, updatePagination]);

    // Load bills from database
    const loadBills = async () => {
        setLoading(true);
        try {
            console.log('Loading bills...');
            
            // All users see all bills, but permissions differ for printing and editing
            const response = await dentalLabService.getAllBills();
            
            console.log('Bills response:', response);
            
            if (response.data) {
                setBills(response.data || []);
                console.log('Bills loaded successfully:', response.data.length, 'bills');
            } else if (response.error) {
                console.error('Error from service:', response.error);
                setMessage('Error loading bills: ' + (response.error.message || response.error));
            } else {
                console.warn('Unexpected response format:', response);
                setMessage('Error loading bills: Unexpected response format');
            }
        } catch (error) {
            console.error('Error in loadBills:', error);
            setMessage('Error loading bills: ' + error.message);
        }
        setLoading(false);
    };

    // Event handlers
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const clearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            status: 'all',
            doctor: '',
            searchSerial: ''
        });
    };

    const getTotalAmount = () => {
        return filteredBills
            .filter(bill => bill.amount)
            .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0)
            .toFixed(2);
    };

    const handleEditAmount = (bill) => {
        setEditingBill(bill.id);
        setBillAmount(bill.amount || '');
    };

    const handleSaveAmount = async (billId) => {
        if (!billAmount || parseFloat(billAmount) <= 0) {
            setMessage('Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            const response = await dentalLabService.updateBillAmount(billId, parseFloat(billAmount));
            if (response.data) {
                setMessage('Bill amount updated successfully');
                loadBills();
                setEditingBill(null);
                setBillAmount('');
            } else if (response.error) {
                setMessage('Error updating bill amount: ' + response.error);
            }
        } catch (error) {
            setMessage('Error updating bill amount: ' + error.message);
        }
        setLoading(false);
    };

    const handlePrintBill = async (bill) => {
        try {
            if (bill.is_grouped || bill.batch_id) {
                await handleGroupedBillPrint(bill);
            } else {
                await handleSingleBillPrint(bill);
            }
            
            // Mark bill as printed after successful print
            const result = await dentalLabService.markBillAsPrinted(bill.id);
            if (result.error) {
                console.error('Failed to mark bill as printed:', result.error);
            } else {
                // Refresh bills to show updated status
                loadBills();
            }
        } catch (error) {
            console.error('Error printing bill:', error);
        }
    };

    // Print initial bill (without amount) - for product delivery
    const handlePrintInitialBill = async (bill) => {
        try {
            await printInitialBill(bill);
            
            // Mark bill as printed after successful print
            const result = await dentalLabService.markBillAsPrinted(bill.id);
            if (result.error) {
                console.error('Failed to mark bill as printed:', result.error);
            } else {
                // Refresh bills to show updated status
                loadBills();
            }
        } catch (error) {
            console.error('Error printing initial bill:', error);
        }
    };

    // Print final bill (with amount) - for payment at month end
    const handlePrintFinalBill = async (bill) => {
        try {
            await printFinalBill(bill);
            
            // Mark bill as printed after successful print
            const result = await dentalLabService.markBillAsPrinted(bill.id);
            if (result.error) {
                console.error('Failed to mark bill as printed:', result.error);
            } else {
                // Refresh bills to show updated status
                loadBills();
            }
        } catch (error) {
            console.error('Error printing final bill:', error);
        }
    };

    // Bulk operations
    const handleBillSelection = (billId) => {
        setSelectedBills(prev => 
            prev.includes(billId) 
                ? prev.filter(id => id !== billId)
                : [...prev, billId]
        );
    };

    const handleSelectAll = () => {
        if (selectedBills.length === filteredBills.length) {
            setSelectedBills([]);
        } else {
            setSelectedBills(filteredBills.map(bill => bill.id));
        }
    };

    const handleBulkAction = async () => {
        if (selectedBills.length === 0) {
            setMessage('Please select bills to print');
            return;
        }

        if (bulkAction !== 'print-selected') {
            setMessage('Please select the print action');
            return;
        }

        // Filter out unpriced bills before printing
        const selectedBillsData = bills.filter(bill => selectedBills.includes(bill.id));
        const unpricedBills = selectedBillsData.filter(bill => !bill.amount || parseFloat(bill.amount) <= 0);
        const pricedBills = selectedBillsData.filter(bill => bill.amount && parseFloat(bill.amount) > 0);

        if (unpricedBills.length > 0) {
            const unpricedCount = unpricedBills.length;
            const pricedCount = pricedBills.length;
            
            if (pricedCount === 0) {
                setMessage(`Cannot print: All ${unpricedCount} selected bills are unpriced. Please set amounts before printing.`);
                return;
            } else {
                setMessage(`Warning: ${unpricedCount} unpriced bills will be skipped. Printing ${pricedCount} priced bills only.`);
            }
        }

        if (pricedBills.length === 0) {
            return;
        }

        setLoading(true);
        
        try {
            await printSelectedPricedBills(pricedBills);
            setMessage(`Successfully printed ${pricedBills.length} bills${unpricedBills.length > 0 ? ` (${unpricedBills.length} unpriced bills were skipped)` : ''}`);
        } catch (error) {
            setMessage('Error printing bills: ' + error.message);
        }
        
        setSelectedBills([]);
        setBulkAction('');
        setLoading(false);
    };

    const printSelectedPricedBills = async (pricedBillsData) => {
        try {
            await handleBulkBillPrint(pricedBillsData);
            
            // Mark all bills as printed after successful bulk print
            for (const bill of pricedBillsData) {
                const result = await dentalLabService.markBillAsPrinted(bill.id);
                if (result.error) {
                    console.error(`Failed to mark bill ${bill.serial_number} as printed:`, result.error);
                }
            }
            
            // Refresh bills to show updated status
            loadBills();
        } catch (error) {
            console.error('Error in bulk printing:', error);
        }
    };

    return (
        <div className="container mt-4">
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <PageHeader 
                            title={isAdmin ? "💰 Bills Management" : "🧾 My Bills"}
                            backPath={isAdmin ? "/admin-dashboard" : "/staff-dashboard"}
                            backLabel="Back to Dashboard"
                        />
                        
                        <div className="card-body">
                            {message && (
                                <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'}`}>
                                    {message}
                                </div>
                            )}

                            <BillFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                onClearFilters={clearFilters}
                            />

                            <StatisticsCards
                                filteredBills={filteredBills}
                                isAdmin={isAdmin}
                                getTotalAmount={getTotalAmount}
                            />

                            <BillsTable
                                filteredBills={paginatedBills}
                                selectedBills={selectedBills}
                                isAdmin={isAdmin}
                                editingBill={editingBill}
                                billAmount={billAmount}
                                loading={loading}
                                formatDate={formatDate}
                                handleBillSelection={handleBillSelection}
                                handleSelectAll={handleSelectAll}
                                handleEditAmount={handleEditAmount}
                                handleSaveAmount={handleSaveAmount}
                                handlePrintBill={handlePrintBill}
                                handlePrintInitialBill={handlePrintInitialBill}
                                handlePrintFinalBill={handlePrintFinalBill}
                                setBillAmount={setBillAmount}
                                setEditingBill={setEditingBill}
                            />

                            <BulkOperations
                                filteredBills={filteredBills}
                                isAdmin={isAdmin}
                                selectedBills={selectedBills}
                                bulkAction={bulkAction}
                                bills={bills}
                                setBulkAction={setBulkAction}
                                handleBulkAction={handleBulkAction}
                            />

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-between align-items-center mt-4 mb-3">
                                    {/* Items per page selector */}
                                    <div className="me-3">
                                        <select
                                            className="form-select form-select-sm"
                                            value={itemsPerPage}
                                            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                            aria-label="Items per page"
                                        >
                                            <option value={25}>25 bills per page</option>
                                            <option value={50}>50 bills per page</option>
                                            <option value={100}>100 bills per page</option>
                                        </select>
                                    </div>
                                    
                                    {/* Page info */}
                                    <div className="text-muted small">
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBills.length)} of {filteredBills.length} bills
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

                            {!isAdmin && (
                                <div className="mt-4">
                                    <div className="alert alert-info">
                                        <i className="bi bi-info-circle"></i>
                                        <strong>Note:</strong> Bill pricing and advanced management features are restricted to administrators. You can view bills but cannot modify pricing information.
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

export default BillsManagementPage;

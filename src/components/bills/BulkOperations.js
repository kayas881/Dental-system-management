import React from 'react';

const BulkOperations = ({
    filteredBills,
    isAdmin,
    selectedBills,
    bulkAction,
    bills,
    setBulkAction,
    handleBulkAction
}) => {
    if (!filteredBills.length) {
        return null;
    }

    // Calculate pricing statistics for selected bills
    const selectedBillsData = bills.filter(bill => selectedBills.includes(bill.id));
    const unpricedBills = selectedBillsData.filter(bill => !bill.amount || parseFloat(bill.amount) <= 0);
    const pricedBills = selectedBillsData.filter(bill => bill.amount && parseFloat(bill.amount) > 0);

    return (
        <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6>🖨️ Bulk Print</h6>
                <small className="text-muted">
                    Select bills using checkboxes, then print them all in a single window.
                </small>
            </div>

            {/* Warning for unpriced bills */}
            {selectedBills.length > 0 && unpricedBills.length > 0 && (
                <div className="alert alert-warning mb-3">
                    <div className="d-flex align-items-center">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        <div>
                            <strong>Pricing Warning:</strong> {unpricedBills.length} of {selectedBills.length} selected bills are unpriced.
                            {pricedBills.length > 0 ? (
                                <span> Only {pricedBills.length} priced bills will be printed.</span>
                            ) : (
                                <span> Cannot print unpriced bills - please set amounts first.</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="row">
                <div className="col-md-3">
                    <div className="form-group">
                        <label className="form-label">Select Action</label>
                        <select
                            className="form-select"
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value)}
                        >
                            <option value="">Choose action...</option>
                            <option value="print-selected">Print Selected</option>
                        </select>
                    </div>
                </div>
                
                <div className="col-md-3">
                    <div className="form-group">
                        <label className="form-label">&nbsp;</label>
                        <button
                            className="btn btn-primary w-100"
                            onClick={handleBulkAction}
                            disabled={selectedBills.length === 0 || bulkAction !== 'print-selected' || pricedBills.length === 0}
                        >
                            {bulkAction === 'print-selected' 
                                ? `🖨️ Print ${pricedBills.length} ${pricedBills.length === 1 ? 'Bill' : 'Bills'}${unpricedBills.length > 0 ? ` (${unpricedBills.length} skipped)` : ''}` 
                                : `Select Print Action (${selectedBills.length} selected)`
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkOperations;

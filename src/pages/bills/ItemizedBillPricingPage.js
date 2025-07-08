import React, { useState, useEffect } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { useParams, useNavigate } from 'react-router-dom';

const ItemizedBillPricingPage = () => {
    const { billId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [billData, setBillData] = useState(null);
    const [items, setItems] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);

    // Format date to dd-mm-yyyy
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    useEffect(() => {
        if (billId) {
            loadBillWithItems();
        }
    }, [billId]);

    useEffect(() => {
        // Calculate total whenever items change
        const total = items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
        setTotalAmount(total);
    }, [items]);

    const loadBillWithItems = async () => {
        setLoading(true);
        console.log('Loading bill with ID:', billId); // Debug log
        try {
            const response = await dentalLabService.getBillWithItems(billId);
            console.log('getBillWithItems response:', response); // Debug log
            if (response.success) {
                setBillData(response.data);
                setItems(response.data.items || []);
                console.log('Bill data loaded successfully:', response.data); // Debug log
            } else {
                setMessage('Error loading bill: ' + response.error);
                console.error('Error loading bill:', response.error); // Debug log
            }
        } catch (error) {
            setMessage('Error loading bill: ' + error.message);
            console.error('Exception loading bill:', error); // Debug log
        }
        setLoading(false);
    };

    const updateItemPrice = async (itemId, unitPrice) => {
        try {
            console.log('=== ITEMIZED PRICING PAGE - UPDATING ITEM ===');
            console.log('Item ID:', itemId);
            console.log('Unit Price:', unitPrice);
            
            const numericPrice = parseFloat(unitPrice) || 0;
            console.log('Numeric Price:', numericPrice);
            
            const response = await dentalLabService.updateBillItemPrice(itemId, numericPrice);
            
            console.log('Update response:', response);
            
            if (response.success) {
                // Update local state
                setItems(prevItems => 
                    prevItems.map(item => 
                        item.id === itemId 
                            ? { ...item, unit_price: numericPrice, total_price: numericPrice }
                            : item
                    )
                );
                setMessage('Price updated successfully');
                console.log('Local state updated successfully');
            } else {
                setMessage('Error updating price: ' + response.error);
                console.error('Error updating price:', response.error);
            }
        } catch (error) {
            setMessage('Error updating price: ' + error.message);
            console.error('Exception updating price:', error);
        }
    };

    const finalizeBillPricing = async () => {
        if (totalAmount <= 0) {
            setMessage('Please set prices for all items before finalizing');
            return;
        }

        setLoading(true);
        try {
            const response = await dentalLabService.updateBillAmount(billId, totalAmount);
            if (response.data) {
                setMessage('Bill pricing finalized successfully!');
                setTimeout(() => {
                    navigate('/admin/bills-management');
                }, 2000);
            } else {
                setMessage('Error finalizing bill: ' + response.error);
            }
        } catch (error) {
            setMessage('Error finalizing bill: ' + error.message);
        }
        setLoading(false);
    };

    if (loading && !billData) {
        return <div className="loading">Loading bill details...</div>;
    }

    if (!billData && !loading) {
        return (
            <div className="error-page">
                <h2>Bill Not Found</h2>
                {message && (
                    <div className="error-message">
                        <p><strong>Error:</strong> {message}</p>
                    </div>
                )}
                <p>Bill ID: {billId}</p>
                <button onClick={() => navigate('/admin/bills-management')} className="back-btn">
                    ← Back to Bills Management
                </button>
            </div>
        );
    }

    return (
        <div className="itemized-pricing-page">
            <div className="page-header">
                <h2>Itemized Bill Pricing</h2>
                <button onClick={() => navigate('/admin/bills-management')} className="back-btn">
                    ← Back to Bills Management
                </button>
            </div>

            {message && (
                <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}

            {/* Bill Summary */}
            <div className="bill-summary">
                <h3>Bill Information</h3>
                <div className="bill-info-grid">
                    <div className="info-item">
                        <label>Bill Number:</label>
                        <span>{billData.bill_number || 'Auto-generated'}</span>
                    </div>
                    <div className="info-item">
                        <label>Doctor:</label>
                        <span>{billData.doctor_name}</span>
                    </div>
                    <div className="info-item">
                        <label>Patient(s):</label>
                        <span>{billData.patient_name}</span>
                    </div>
                    <div className="info-item">
                        <label>Bill Date:</label>
                        <span>{formatDate(billData.bill_date)}</span>
                    </div>
                    <div className="info-item">
                        <label>Status:</label>
                        <span className={`status ${billData.status}`}>{billData.status}</span>
                    </div>
                    <div className="info-item">
                        <label>Type:</label>
                        <span>{billData.is_grouped ? 'Grouped Bill' : 'Single Bill'}</span>
                    </div>
                </div>
                {billData.notes && (
                    <div className="bill-notes">
                        <label>Notes:</label>
                        <p>{billData.notes}</p>
                    </div>
                )}
            </div>

            {/* Itemized Pricing Table */}
            <div className="itemized-pricing">
                <h3>Items to Price ({items.length})</h3>
                
                {items.length === 0 ? (
                    <div className="no-items">
                        <p>No items found for this bill. This might be an old bill format.</p>
                        <p>Please use the regular bill amount update in Bills Management.</p>
                    </div>
                ) : (
                    <div className="pricing-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Serial Number</th>
                                    <th>Description</th>
                                    <th>Product Quality</th>
                                    <th>Product Shade</th>
                                    <th>Patient</th>
                                    <th>Order Date</th>
                                    <th>Unit Price (₹)</th>
                                    <th>Total (₹)</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.serial_number}</td>
                                        <td>{item.item_description}</td>
                                        <td>{item.product_quality}</td>
                                        <td>{item.product_shade || '-'}</td>
                                        <td>{item.work_orders?.patient_name || '-'}</td>
                                        <td>{formatDate(item.work_orders?.order_date)}</td>
                                        <td>
                                            {/* UPDATED: Added manual save button - v2.0 */}
                                            <div style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
                                                <input
                                                    type="number"
                                                    value={item.unit_price || ''}
                                                    onChange={(e) => {
                                                        const newPrice = e.target.value;
                                                        console.log('NEW VERSION: Price input changed:', { itemId: item.id, newPrice });
                                                        // Update local state immediately
                                                        setItems(prevItems => 
                                                            prevItems.map(i => 
                                                                i.id === item.id 
                                                                    ? { ...i, unit_price: newPrice, total_price: newPrice }
                                                                    : i
                                                            )
                                                        );
                                                    }}
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    min="0"
                                                    className="price-input"
                                                    style={{width: '80px'}}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        console.log('💾 SAVE BUTTON CLICKED for item:', item.id);
                                                        const currentPrice = item.unit_price || '0';
                                                        console.log('💾 Current price to save:', currentPrice);
                                                        updateItemPrice(item.id, currentPrice);
                                                    }}
                                                    className="btn btn-sm btn-primary"
                                                    style={{padding: '2px 6px', fontSize: '12px'}}
                                                    title="Save price to database"
                                                >
                                                    💾
                                                </button>
                                            </div>
                                        </td>
                                        <td className="total-cell">
                                            ₹{parseFloat(item.total_price || 0).toFixed(2)}
                                        </td>
                                        <td>{item.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="total-row">
                                    <td colSpan="7"><strong>Total Amount:</strong></td>
                                    <td className="total-amount">
                                        <strong>₹{totalAmount.toFixed(2)}</strong>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            {items.length > 0 && (
                <div className="action-buttons">
                    <button 
                        onClick={finalizeBillPricing}
                        disabled={loading || totalAmount <= 0}
                        className="finalize-btn"
                    >
                        {loading ? 'Finalizing...' : 'Finalize Bill Pricing'}
                    </button>
                    <button 
                        onClick={() => navigate('/admin/bills-management')}
                        className="cancel-btn"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Pricing Guidelines */}
            <div className="pricing-guidelines">
                <h4>Pricing Guidelines</h4>
                <ul>
                    <li>Enter the price per unit for each work order item</li>
                    <li>Total amount will be calculated automatically</li>
                    <li>Prices are saved automatically when you move to the next field</li>
                    <li>Click "Finalize Bill Pricing" to complete the pricing process</li>
                    <li>Once finalized, the bill status will be updated to "priced"</li>
                </ul>
            </div>
        </div>
    );
};

export default ItemizedBillPricingPage;

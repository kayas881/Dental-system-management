import React, { useState, useEffect } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { authService } from '../../services/supabaseAuthService';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';

const MonthlyBillingPage = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [doctors, setDoctors] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [pricing, setPricing] = useState({}); // { workOrderId: price }
    const [totalAmount, setTotalAmount] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);
    
    const navigate = useNavigate();

    // Function to group teeth by quadrants
    const groupTeethByQuadrants = (toothNumbers) => {
        if (!toothNumbers) return { Q1: [], Q2: [], Q3: [], Q4: [] };
        
        let teeth = [];
        
        // Handle different data formats
        if (Array.isArray(toothNumbers)) {
            teeth = toothNumbers;
        } else if (typeof toothNumbers === 'string') {
            try {
                // Try to parse as JSON first (in case it's a JSON string)
                const parsed = JSON.parse(toothNumbers);
                teeth = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                // If JSON parsing fails, treat as comma-separated string
                teeth = toothNumbers.split(',').map(t => t.trim()).filter(t => t);
            }
        } else if (typeof toothNumbers === 'object' && toothNumbers !== null) {
            // Handle case where it might be an object with array-like properties
            const values = Object.values(toothNumbers);
            teeth = values.length > 0 ? values : [toothNumbers];
        } else {
            teeth = [toothNumbers];
        }
        
        const quadrants = { Q1: [], Q2: [], Q3: [], Q4: [] };
        
        teeth.forEach(tooth => {
            const toothNum = parseInt(tooth);
            
            if (!isNaN(toothNum)) {
                if (toothNum >= 11 && toothNum <= 18) {
                    quadrants.Q1.push(toothNum);
                } else if (toothNum >= 21 && toothNum <= 28) {
                    quadrants.Q2.push(toothNum);
                } else if (toothNum >= 31 && toothNum <= 38) {
                    quadrants.Q3.push(toothNum);
                } else if (toothNum >= 41 && toothNum <= 48) {
                    quadrants.Q4.push(toothNum);
                }
            }
        });
        
        // Sort teeth in each quadrant
        Object.keys(quadrants).forEach(quad => {
            quadrants[quad].sort((a, b) => a - b);
        });
        
        return quadrants;
    };

    // Component to render tooth quadrant boxes
    const ToothQuadrantDisplay = ({ toothNumbers }) => {
        const quadrants = groupTeethByQuadrants(toothNumbers);
        
        // Check if all quadrants are empty
        const hasAnyTeeth = Object.values(quadrants).some(q => q.length > 0);
        
        if (!hasAnyTeeth && toothNumbers) {
            // Fallback: show raw data if quadrants are empty but we have data
            return (
                <div style={{ 
                    fontSize: '10px', 
                    color: '#666',
                    textAlign: 'center',
                    padding: '4px'
                }}>
                    Raw: {JSON.stringify(toothNumbers)}
                </div>
            );
        }
        
        return (
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gridTemplateRows: '1fr 1fr', 
                width: '50px', 
                height: '35px', 
                border: '1px solid #ddd',
                fontSize: '7px',
                fontFamily: 'monospace'
            }}>
                {/* Q2 - Upper Left */}
                <div style={{ 
                    border: '1px solid #ccc', 
                    padding: '1px', 
                    backgroundColor: quadrants.Q2.length > 0 ? '#e8f4f8' : '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    lineHeight: '1',
                    fontSize: '6px'
                }}>
                    {quadrants.Q2.length > 0 ? quadrants.Q2.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                </div>
                
                {/* Q1 - Upper Right */}
                <div style={{ 
                    border: '1px solid #ccc', 
                    padding: '1px', 
                    backgroundColor: quadrants.Q1.length > 0 ? '#e8f4f8' : '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    lineHeight: '1',
                    fontSize: '6px'
                }}>
                    {quadrants.Q1.length > 0 ? quadrants.Q1.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                </div>
                
                {/* Q3 - Lower Left */}
                <div style={{ 
                    border: '1px solid #ccc', 
                    padding: '1px', 
                    backgroundColor: quadrants.Q3.length > 0 ? '#e8f4f8' : '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    lineHeight: '1',
                    fontSize: '6px'
                }}>
                    {quadrants.Q3.length > 0 ? quadrants.Q3.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                </div>
                
                {/* Q4 - Lower Right */}
                <div style={{ 
                    border: '1px solid #ccc', 
                    padding: '1px', 
                    backgroundColor: quadrants.Q4.length > 0 ? '#e8f4f8' : '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    lineHeight: '1',
                    fontSize: '6px'
                }}>
                    {quadrants.Q4.length > 0 ? quadrants.Q4.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                </div>
            </div>
        );
    };

    useEffect(() => {
        const checkUserRole = async () => {
            const role = authService.getUserRole();
            if (role !== 'ADMIN' && role !== 'admin') {
                navigate('/staff-dashboard');
                return;
            }
            setIsAdmin(true);
        };
        
        checkUserRole();
        loadDoctors();
    }, [navigate]);

    const loadDoctors = async () => {
        try {
            const response = await dentalLabService.getAllWorkOrders();
            if (response.data) {
                // Get unique doctors with normalization
                const doctorNamesMap = new Map();
                
                response.data.forEach(order => {
                    if (order.doctor_name) {
                        // Normalize doctor name: remove "Dr", "Dr.", trim, and convert to lowercase for comparison
                        const normalizedName = order.doctor_name
                            .replace(/^(dr\.?|doctor)\s+/i, '')  // Remove "Dr", "Dr.", "Doctor" prefix
                            .trim()
                            .toLowerCase();
                        
                        if (!doctorNamesMap.has(normalizedName)) {
                            // Store the first occurrence as the canonical name
                            doctorNamesMap.set(normalizedName, order.doctor_name);
                        }
                    }
                });
                
                // Get the canonical names and sort them
                const uniqueDoctors = Array.from(doctorNamesMap.values()).sort();
                setDoctors(uniqueDoctors);
            }
        } catch (error) {
            console.error('Error loading doctors:', error);
        }
    };

    const loadWorkOrdersForMonth = async () => {
        if (!selectedDoctor || !selectedMonth) return;

        setLoading(true);
        try {
            const response = await dentalLabService.getAllWorkOrders();
            if (response.data) {
                // Normalize selected doctor name for comparison
                const normalizeDoctor = (name) => {
                    return name
                        .replace(/^(dr\.?|doctor)\s+/i, '')  // Remove "Dr", "Dr.", "Doctor" prefix
                        .trim()
                        .toLowerCase();
                };
                
                const selectedDoctorNormalized = normalizeDoctor(selectedDoctor);
                
                // Filter work orders by doctor and month
                const [year, month] = selectedMonth.split('-');
                const filtered = response.data.filter(order => {
                    const orderDate = new Date(order.completion_date);
                    const orderDoctorNormalized = normalizeDoctor(order.doctor_name || '');
                    
                    return orderDoctorNormalized === selectedDoctorNormalized &&
                           orderDate.getFullYear() === parseInt(year) &&
                           orderDate.getMonth() === parseInt(month) - 1;
                });
                
                setWorkOrders(filtered);
                
                // Initialize pricing with existing amounts or 0
                const initialPricing = {};
                filtered.forEach(order => {
                    initialPricing[order.id] = order.amount || 0;
                });
                setPricing(initialPricing);
                calculateTotal(initialPricing);
            }
        } catch (error) {
            console.error('Error loading work orders:', error);
            setMessage('Error loading work orders: ' + error.message);
        }
        setLoading(false);
    };

    const calculateTotal = (pricingData) => {
        const total = Object.values(pricingData).reduce((sum, price) => sum + parseFloat(price || 0), 0);
        setTotalAmount(total);
    };

    const handlePriceChange = (workOrderId, price) => {
        const newPricing = { ...pricing, [workOrderId]: price };
        setPricing(newPricing);
        calculateTotal(newPricing);
    };

    const saveAllPrices = async () => {
        setLoading(true);
        let savedCount = 0;
        let errors = [];

        try {
            for (const workOrderId in pricing) {
                const price = parseFloat(pricing[workOrderId]);
                if (price > 0) {
                    const response = await dentalLabService.updateWorkOrderAmount(workOrderId, price);
                    if (response.data) {
                        savedCount++;
                    } else {
                        errors.push(`Failed to update order ${workOrderId}: ${response.error}`);
                    }
                }
            }

            if (errors.length === 0) {
                setMessage(`Successfully saved prices for ${savedCount} work orders`);
                // Reload to show updated data
                loadWorkOrdersForMonth();
            } else {
                setMessage(`Saved ${savedCount} prices, but had ${errors.length} errors: ${errors.join(', ')}`);
            }
        } catch (error) {
            setMessage('Error saving prices: ' + error.message);
        }
        setLoading(false);
    };

    const printMonthlyBill = async () => {
        if (!selectedDoctor || workOrders.length === 0) {
            setMessage('Please select a doctor and load work orders first');
            return;
        }

        try {
            // Create consolidated bill data
            const billData = {
                doctor_name: selectedDoctor,
                month: selectedMonth,
                work_orders: workOrders.map(order => ({
                    ...order,
                    amount: parseFloat(pricing[order.id] || 0)
                })),
                total_amount: totalAmount,
                generated_date: new Date().toISOString().split('T')[0]
            };

            // Generate and print consolidated bill
            await printConsolidatedBill(billData);
            setMessage('Monthly bill printed successfully');
        } catch (error) {
            setMessage('Error printing monthly bill: ' + error.message);
        }
    };

    const printConsolidatedBill = async (billData) => {
        // Function to group teeth by quadrants for print
        const groupTeethByQuadrants = (toothNumbers) => {
            if (!toothNumbers) return { Q1: [], Q2: [], Q3: [], Q4: [] };
            
            let teeth = [];
            
            // Handle different data formats
            if (Array.isArray(toothNumbers)) {
                teeth = toothNumbers;
            } else if (typeof toothNumbers === 'string') {
                try {
                    // Try to parse as JSON first (in case it's a JSON string)
                    const parsed = JSON.parse(toothNumbers);
                    teeth = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    // If JSON parsing fails, treat as comma-separated string
                    teeth = toothNumbers.split(',').map(t => t.trim()).filter(t => t);
                }
            } else if (typeof toothNumbers === 'object' && toothNumbers !== null) {
                // Handle case where it might be an object with array-like properties
                const values = Object.values(toothNumbers);
                teeth = values.length > 0 ? values : [toothNumbers];
            } else {
                teeth = [toothNumbers];
            }
            
            const quadrants = { Q1: [], Q2: [], Q3: [], Q4: [] };
            
            teeth.forEach(tooth => {
                const toothNum = parseInt(tooth);
                if (!isNaN(toothNum)) {
                    if (toothNum >= 11 && toothNum <= 18) {
                        quadrants.Q1.push(toothNum);
                    } else if (toothNum >= 21 && toothNum <= 28) {
                        quadrants.Q2.push(toothNum);
                    } else if (toothNum >= 31 && toothNum <= 38) {
                        quadrants.Q3.push(toothNum);
                    } else if (toothNum >= 41 && toothNum <= 48) {
                        quadrants.Q4.push(toothNum);
                    }
                }
            });
            
            // Sort teeth in each quadrant
            Object.keys(quadrants).forEach(quad => {
                quadrants[quad].sort((a, b) => a - b);
            });
            
            return quadrants;
        };

        // Function to generate HTML for quadrant display
        const generateQuadrantHTML = (toothNumbers) => {
            const quadrants = groupTeethByQuadrants(toothNumbers);
            
            return `
                <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; width: 45px; height: 30px; border: 1px solid #333; font-size: 6px; font-family: monospace; margin: 0 auto;">
                    <div style="border: 1px solid #666; padding: 0; background-color: ${quadrants.Q2.length > 0 ? '#e8f4f8' : '#f9f9f9'}; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 5px;">
                        ${quadrants.Q2.length > 0 ? quadrants.Q2.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                    </div>
                    <div style="border: 1px solid #666; padding: 0; background-color: ${quadrants.Q1.length > 0 ? '#e8f4f8' : '#f9f9f9'}; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 5px;">
                        ${quadrants.Q1.length > 0 ? quadrants.Q1.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                    </div>
                    <div style="border: 1px solid #666; padding: 0; background-color: ${quadrants.Q3.length > 0 ? '#e8f4f8' : '#f9f9f9'}; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 5px;">
                        ${quadrants.Q3.length > 0 ? quadrants.Q3.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                    </div>
                    <div style="border: 1px solid #666; padding: 0; background-color: ${quadrants.Q4.length > 0 ? '#e8f4f8' : '#f9f9f9'}; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 5px;">
                        ${quadrants.Q4.length > 0 ? quadrants.Q4.map(tooth => tooth.toString().slice(-1)).join('') : ''}
                    </div>
                </div>
            `;
        };

        return new Promise((resolve) => {
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            const monthName = new Date(billData.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Monthly Bill - ${billData.doctor_name}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 10px; font-size: 10px; line-height: 1.1; }
        .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
        .header-content { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 8px; }
        .logo { width: 60px; height: 60px; object-fit: contain; flex-shrink: 0; }
        .company-info { text-align: center; }
        .company-name { font-size: 20px; font-weight: bold; color: #0066cc; margin-bottom: 5px; letter-spacing: 1px; }
        .company-subtitle { font-size: 14px; color: #666; font-weight: 500; margin-bottom: 8px; }
        .bill-title { font-size: 16px; font-weight: bold; color: #333; margin-top: 8px; }
        .doctor-info { margin-bottom: 12px; font-size: 10px; background-color: #f8f9fa; padding: 8px; border-radius: 5px; }
        .doctor-info strong { font-size: 11px; color: #0066cc; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9px; }
        th, td { border: 1px solid #ddd; padding: 2px; text-align: left; vertical-align: middle; }
        th { background-color: #f2f2f2; font-weight: bold; font-size: 8px; color: #333; }
        .total-row { background-color: #e6f3ff; font-weight: bold; font-size: 10px; }
        .amount { text-align: right; }
        .footer { margin-top: 12px; text-align: center; font-size: 8px; color: #666; border-top: 1px solid #ddd; padding-top: 8px; }
        .serial-col { width: 6%; }
        .patient-col { width: 10%; }
        .product-col { width: 12%; }
        .shade-col { width: 6%; }
        .tooth-col { width: 12%; }
        .date-col { width: 8%; }
        .amount-col { width: 8%; }
        @media print {
            * { box-sizing: border-box; }
            body { margin: 0; padding: 3mm; font-size: 8px; line-height: 1.0; }
            .header { margin-bottom: 10px; padding-bottom: 8px; }
            .header-content { gap: 10px; margin-bottom: 5px; }
            .logo { width: 50px; height: 50px; flex-shrink: 0; }
            .company-info { text-align: center; }
            .company-name { font-size: 18px; }
            .company-subtitle { font-size: 12px; }
            .bill-title { font-size: 14px; }
            .doctor-info { margin-bottom: 8px; padding: 6px; }
            table { font-size: 7px; margin-bottom: 4px; }
            th, td { padding: 1px; font-size: 6px; }
            .total-row { font-size: 7px; }
            tr { page-break-inside: avoid; height: 20px; }
            .footer { margin-top: 8px; padding-top: 6px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <img src="/logo.png" alt="Marshal Dental Art Logo" class="logo" onerror="this.style.display='none'" />
            <div class="company-info">
                <div class="company-name">MARSHAL DENTAL ART</div>
                <div class="company-subtitle">CAD Camp Milling Center</div>
            </div>
        </div>
        <div class="bill-title">Monthly Consolidated Bill</div>
    </div>
    
    <div class="doctor-info">
        <strong>Doctor:</strong> ${billData.doctor_name}<br>
        <strong>Month:</strong> ${monthName}<br>
        <strong>Generated:</strong> ${new Date(billData.generated_date).toLocaleDateString()}
    </div>
    
    <table>
        <thead>
            <tr>
                <th class="serial-col">Serial #</th>
                <th class="patient-col">Patient</th>
                <th class="product-col">Product Quality</th>
                <th class="shade-col">Shade</th>
                <th class="tooth-col">Quadrants</th>
                <th class="date-col">Date</th>
                <th class="amount-col amount">Amount (₹)</th>
            </tr>
        </thead>
        <tbody>
            ${billData.work_orders.map(order => `
                <tr>
                    <td class="serial-col">${order.serial_number}</td>
                    <td class="patient-col">${order.patient_name}</td>
                    <td class="product-col">${order.product_quality}</td>
                    <td class="shade-col">${order.product_shade || '-'}</td>
                    <td class="tooth-col" style="text-align: center; vertical-align: middle;">${generateQuadrantHTML(order.tooth_numbers)}</td>
                    <td class="date-col">${new Date(order.completion_date).toLocaleDateString('en-GB')}</td>
                    <td class="amount-col amount">${order.amount ? parseFloat(order.amount).toFixed(2) : '0.00'}</td>
                </tr>
            `).join('')}
            <tr class="total-row">
                <td colspan="6"><strong>Total Amount</strong></td>
                <td class="amount"><strong>₹${billData.total_amount.toFixed(2)}</strong></td>
            </tr>
        </tbody>
    </table>
    
    <div class="footer">
        <p>Thank you for your business! | Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
    </div>
</body>
</html>`;
            
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Wait for content to load before printing
            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                    resolve();
                }, 500);
            };
        });
    };

    if (!isAdmin) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mt-4">
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <PageHeader 
                            title="📊 Monthly Billing System"
                            backPath="/admin-dashboard"
                            backLabel="Back to Dashboard"
                        />
                        
                        <div className="card-body">
                            {message && (
                                <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'}`}>
                                    {message}
                                </div>
                            )}

                            {/* Selection Controls */}
                            <div className="card mb-4">
                                <div className="card-header">
                                    <h6>📅 Select Month & Doctor</h6>
                                </div>
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-4">
                                            <label className="form-label">Select Month</label>
                                            <input
                                                type="month"
                                                className="form-control"
                                                value={selectedMonth}
                                                onChange={(e) => setSelectedMonth(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Select Doctor</label>
                                            <select
                                                className="form-control"
                                                value={selectedDoctor}
                                                onChange={(e) => setSelectedDoctor(e.target.value)}
                                            >
                                                <option value="">Choose Doctor...</option>
                                                {doctors.map(doctor => (
                                                    <option key={doctor} value={doctor}>{doctor}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">&nbsp;</label>
                                            <button
                                                className="btn btn-primary w-100"
                                                onClick={loadWorkOrdersForMonth}
                                                disabled={!selectedDoctor || !selectedMonth || loading}
                                            >
                                                {loading ? 'Loading...' : 'Load Orders'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Work Orders Table */}
                            {workOrders.length > 0 && (
                                <div className="card mb-4">
                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <h6>📋 Work Orders for {selectedDoctor} - {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h6>
                                        <div>
                                            <span className="badge bg-info me-2">{workOrders.length} orders</span>
                                            <span className="badge bg-success">Total: ₹{totalAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="card-body">
                                        <div className="table-responsive">
                                            <table className="table table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>Serial #</th>
                                                        <th>Patient</th>
                                                        <th>Product Quality</th>
                                                        <th>Product Shade</th>
                                                        <th>Tooth Quadrants</th>
                                                        <th>Completion Date</th>
                                                        <th>Amount (₹)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {workOrders.map(order => (
                                                        <tr key={order.id}>
                                                            <td><strong>{order.serial_number}</strong></td>
                                                            <td>{order.patient_name}</td>
                                                            <td>{order.product_quality}</td>
                                                            <td>{order.product_shade || '-'}</td>                                            <td style={{ padding: '4px' }}>
                                                <ToothQuadrantDisplay toothNumbers={order.tooth_numbers} />
                                            </td>
                                                            <td>{new Date(order.completion_date).toLocaleDateString()}</td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    className="form-control"
                                                                    style={{width: '100px'}}
                                                                    value={pricing[order.id] || ''}
                                                                    onChange={(e) => handlePriceChange(order.id, e.target.value)}
                                                                    placeholder="0.00"
                                                                    step="0.01"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="table-info">
                                                        <td colSpan="6"><strong>Total Amount</strong></td>
                                                        <td><strong>₹{totalAmount.toFixed(2)}</strong></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {workOrders.length > 0 && (
                                <div className="card">
                                    <div className="card-body">
                                        <div className="d-flex gap-2">
                                            <button
                                                className="btn btn-success"
                                                onClick={saveAllPrices}
                                                disabled={loading}
                                            >
                                                💾 Save All Prices
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={printMonthlyBill}
                                                disabled={loading || totalAmount === 0}
                                            >
                                                🖨️ Print Monthly Bill
                                            </button>
                                        </div>
                                        <small className="text-muted d-block mt-2">
                                            Save prices first, then print the consolidated monthly bill
                                        </small>
                                    </div>
                                </div>
                            )}

                            {workOrders.length === 0 && selectedDoctor && selectedMonth && !loading && (
                                <div className="alert alert-info">
                                    <i className="bi bi-info-circle"></i>
                                    No work orders found for {selectedDoctor} in {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonthlyBillingPage;

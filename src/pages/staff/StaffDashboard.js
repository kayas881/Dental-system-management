import { useEffect, useState } from "react";
import { authService } from "../../services/supabaseAuthService";
import { dentalLabService } from "../../services/dentalLabService";
import { useNavigate } from "react-router-dom";

const StaffDashboard = () => {
    const [email, setEmail] = useState();
    const [userRole, setUserRole] = useState();
    const [workOrderStats, setWorkOrderStats] = useState({
        total: 0,
        inProgress: 0,
        completed: 0,
        pendingBills: 0
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { 
        const loadUserData = async () => {
            // Get cached data
            const role = authService.getUserRole();
            setUserRole(role);
           
            const email = authService.getUserEmail();
            setEmail(email);

            // Refresh role from database
            const freshRole = await authService.refreshUserRole();
            if (freshRole && freshRole !== role) {
                setUserRole(freshRole);
            }

            // Load work order statistics
            await loadStats();
        };

        loadUserData();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const workOrdersResponse = await dentalLabService.getAllWorkOrders();
            const billsResponse = await dentalLabService.getAllBills();
            
            if (workOrdersResponse.data) {
                const orders = workOrdersResponse.data;
                setWorkOrderStats({
                    total: orders.length,
                    inProgress: orders.filter(o => o.status === 'in_progress').length,
                    completed: orders.filter(o => o.status === 'completed').length,
                    pendingBills: billsResponse.data ? 
                        billsResponse.data.filter(b => b.status === 'pending').length : 0
                });
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
        setLoading(false);
    };

    const logout = async () => {
        await authService.logOut();
        navigate('/');
    }

    return (
        <>
            <div className="container mt-5">
                <div className="row">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2>📊 Staff Dashboard</h2>
                            <div>
                                <button className="btn btn-danger" onClick={logout}>
                                    Logout
                                </button>
                            </div>
                        </div>

                        <div className="card mb-4">
                            <div className="card-header">
                                <h4>Welcome, Staff Member!</h4>
                            </div>
                            <div className="card-body">
                                <ul className="list-group list-group-flush">
                                    <li className="list-group-item">
                                        <strong>Email:</strong> {email}
                                    </li>
                                    <li className="list-group-item">
                                        <strong>Role:</strong> 
                                        <span className="badge bg-primary ms-2">{userRole}</span>
                                    </li>
                                    <li className="list-group-item">
                                        <strong>Access Level:</strong> Staff Member
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-3">
                                <div className="card text-center bg-primary text-white">
                                    <div className="card-body">
                                        <h3>{workOrderStats.total}</h3>
                                        <p className="mb-0">Total Work Orders</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-center bg-warning text-white">
                                    <div className="card-body">
                                        <h3>{workOrderStats.inProgress}</h3>
                                        <p className="mb-0">In Progress</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-center bg-success text-white">
                                    <div className="card-body">
                                        <h3>{workOrderStats.completed}</h3>
                                        <p className="mb-0">Completed</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-center bg-info text-white">
                                    <div className="card-body">
                                        <h3>{workOrderStats.pendingBills}</h3>
                                        <p className="mb-0">Pending Bills</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row mt-4">
                            <div className="col-md-6">
                                <div className="card">
                                    <div className="card-header">
                                        <h5>🦷 Work Orders</h5>
                                    </div>
                                    <div className="card-body">
                                        <p>Manage dental work orders from creation to completion.</p>
                                        <div className="d-grid gap-2">
                                            <button 
                                                className="btn btn-primary"
                                                onClick={() => navigate('/work-order-form')}
                                            >
                                                + Create New Work Order
                                            </button>
                                            <button 
                                                className="btn btn-info"
                                                onClick={() => navigate('/batch-work-order')}
                                            >
                                                📝 Batch Work Order Entry
                                            </button>
                                            <button 
                                                className="btn btn-outline-primary"
                                                onClick={() => navigate('/work-orders-list')}
                                            >
                                                📋 View All Work Orders
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="col-md-6">
                                <div className="card">
                                    <div className="card-header">
                                        <h5>🧾 Billing</h5>
                                    </div>
                                    <div className="card-body">
                                        <p>Create bills for completed work orders.</p>
                                        <div className="alert alert-info">
                                            <small>
                                                <strong>Note:</strong> You can create bills after work completion. 
                                                Admin will add pricing information.
                                            </small>
                                        </div>
                                        <div className="d-grid gap-2">
                                            <button 
                                                className="btn btn-success"
                                                onClick={() => navigate('/work-orders-list')}
                                            >
                                                💰 Individual Bills
                                            </button>
                                            <button 
                                                className="btn btn-primary"
                                                onClick={() => navigate('/flexible-grouped-bill')}
                                                title="Group any completed orders from the same doctor into one bill"
                                            >
                                                📊 Flexible Grouped Billing
                                            </button>
                                            <button 
                                                className="btn btn-outline-secondary"
                                                onClick={() => navigate('/grouped-bill')}
                                                title="Bill work orders that were created as batches"
                                            >
                                                📋 Batch Billing Only
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row mt-4">
                            <div className="col-12">
                                <div className="card">
                                    <div className="card-header">
                                        <h5>� Workflow</h5>
                                    </div>
                                    <div className="card-body">
                                        <p className="text-muted">
                                            Follow this workflow for processing dental lab orders:
                                        </p>
                                        <div className="row">
                                            <div className="col-md-3">
                                                <div className="bg-light p-3 rounded text-center">
                                                    <strong>1. Create Order</strong>
                                                    <br />
                                                    <small>Enter patient & work details</small>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="bg-light p-3 rounded text-center">
                                                    <strong>2. Process Work</strong>
                                                    <br />
                                                    <small>Complete the dental work</small>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="bg-light p-3 rounded text-center">
                                                    <strong>3. Mark Complete</strong>
                                                    <br />
                                                    <small>Update completion date</small>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="bg-light p-3 rounded text-center">
                                                    <strong>4. Create Bill</strong>
                                                    <br />
                                                    <small>Generate bill for admin</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default StaffDashboard;

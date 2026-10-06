import { useEffect, useState } from "react";
import { authService } from "../../services/supabaseAuthService";
import { dentalLabService } from "../../services/dentalLabService";
import { useNavigate } from "react-router-dom";

const StaffDashboard = () => {
    const [email, setEmail] = useState('');
    const [userRole, setUserRole] = useState('');
    const [workOrderStats, setWorkOrderStats] = useState({
        total: 0,
        inProgress: 0,
        completed: 0,
        urgent: 0,
        overdue: 0,
        recentOrders: 0,
        activeDoctors: 0,
        revisionsInProgress: 0
    });
    const [billStats, setBillStats] = useState({
        totalBills: 0,
        pendingBills: 0,
        paidBills: 0,
        monthlyRevenue: 0
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadUserData = async () => {
            const role = authService.getUserRole();
            setUserRole(role);

            const email = authService.getUserEmail();
            setEmail(email);


            // Load stats regardless of user ID
            await loadStats();
        };

        loadUserData();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const response = await dentalLabService.getStaffDashboardSummary();
            if (response.error) throw response.error;

            const summary = response.data || {};
            setWorkOrderStats({
                total: Number(summary.total || 0),
                inProgress: Number(summary.inProgress || 0),
                completed: Number(summary.completed || 0),
                urgent: Number(summary.urgent || 0),
                overdue: Number(summary.overdue || 0),
                recentOrders: Number(summary.recentOrders || 0),
                activeDoctors: Number(summary.activeDoctors || 0),
                revisionsInProgress: Number(summary.revisionsInProgress || 0)
            });
            setBillStats({
                totalBills: Number(summary.totalBills || 0),
                pendingBills: Number(summary.pendingBills || 0),
                paidBills: Number(summary.paidBills || 0),
                monthlyRevenue: Number(summary.monthlyRevenue || 0)
            });
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
                            <h2>Staff Dashboard</h2>
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
                                </ul>
                            </div>
                        </div>

                        {/* Primary Stats Row */}
                        <div className="row">
                            <div className="col-6 col-md-4 mb-3">
                                <div className="card text-center bg-primary text-white h-100 p-2 p-md-3">
                                    <div className="card-body p-2">
                                        <h3 className="mb-1">{loading ? '...' : workOrderStats.total}</h3>
                                        <p className="mb-0 small">Total Orders</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-md-4 mb-3">
                                <div className="card text-center bg-warning text-dark h-100 p-2 p-md-3">
                                    <div className="card-body p-2">
                                        <h3 className="mb-1">{loading ? '...' : workOrderStats.inProgress}</h3>
                                        <p className="mb-0 small">Orders In Progress</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-md-4 mb-3">
                                <div className="card text-center bg-success text-white h-100 p-2 p-md-3">
                                    <div className="card-body p-2">
                                        <h3 className="mb-1">{loading ? '...' : workOrderStats.completed}</h3>
                                        <p className="mb-0 small">Orders Completed</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Secondary Stats Row */}
                        <div className="row">
                            <div className="col-6 col-md-4 mb-3">
                                <div className="card text-center bg-danger text-white h-100 p-2 p-md-3" title="Orders marked as urgent that need immediate attention">
                                    <div className="card-body p-2">
                                        <h4 className="mb-1">{loading ? '...' : workOrderStats.urgent}</h4>
                                        <p className="mb-0 small">🚨 Urgent</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-md-4 mb-3">
                                <div className="card text-center bg-secondary text-white h-100 p-2 p-md-3" title="Orders past their expected completion date">
                                    <div className="card-body p-2">
                                        <h4 className="mb-1">{loading ? '...' : workOrderStats.overdue}</h4>
                                        <p className="mb-0 small">⏰ Overdue</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-md-4 mb-3">
                                <div className="card text-center bg-dark text-white h-100 p-2 p-md-3" title="Orders created in the last 7 days">
                                    <div className="card-body p-2">
                                        <h4 className="mb-1">{loading ? '...' : workOrderStats.recentOrders}</h4>
                                        <p className="mb-0 small">📅 This Week</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activity & Billing Row */}
                        <div className="row">
                            <div className="col-6 col-md-3 mb-3">
                                <div className="card text-center border-primary h-100 p-2" title="Number of unique doctors with active orders">
                                    <div className="card-body p-2">
                                        <h4 className="text-primary mb-1">{loading ? '...' : workOrderStats.activeDoctors}</h4>
                                        <p className="mb-0 small">👨‍⚕️ Doctors</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-md-3 mb-3">
                                <div className="card text-center border-success h-100 p-2" title="Total bills created in the system">
                                    <div className="card-body p-2">
                                        <h4 className="text-success mb-1">{loading ? '...' : billStats.totalBills}</h4>
                                        <p className="mb-0 small">💰 Total Bills</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-md-3 mb-3">
                                <div className="card text-center border-warning h-100 p-2" title="Bills awaiting payment">
                                    <div className="card-body p-2">
                                        <h4 className="text-warning mb-1">{loading ? '...' : billStats.pendingBills}</h4>
                                        <p className="mb-0 small">⏳ Pending Bills</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-md-3 mb-3">
                                <div className="card text-center border-info h-100 p-2" title="Orders currently undergoing revisions">
                                    <div className="card-body p-2">
                                        <h4 className="text-info mb-1">
                                            {loading ? '...' : workOrderStats.revisionsInProgress}
                                        </h4>
                                        <p className="mb-0 small"> Revisions</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row mt-4">
                            <div className="col-md-6 mb-3">
                                <div className="card h-100">
                                    <div className="card-header">
                                        <h5>Work Orders</h5>
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
                                                ++ Create New Batch Work Order
                                            </button>
                                            <button
                                                className="btn btn-outline-primary"
                                                onClick={() => navigate('/work-orders-list')}
                                            >
                                                View All Work Orders
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-6 mb-3">
                                <div className="card h-100">
                                    <div className="card-header">
                                        <h5>Billing</h5>
                                    </div>
                                    <div className="card-body">
                                        <p>Create bills for completed work orders.</p>
                                        <div className="alert alert-info">
                                            <small>
                                                <strong>Note:</strong> You can create bills after work completion. Admin will add pricing information.
                                            </small>
                                        </div>
                                        <div className="d-grid gap-2">
                                            <button
                                                className="btn btn-success"
                                                onClick={() => navigate('/work-orders-list')}
                                            >
                                                Work Orders & Direct Billing
                                            </button>
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

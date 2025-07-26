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
        completed: 0
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
            const workOrdersResponse = await dentalLabService.getAllWorkOrders();

            if (workOrdersResponse.data) {
                const allOrders = workOrdersResponse.data;

                setWorkOrderStats({
                    total: allOrders.length,
                    inProgress: allOrders.filter(o => o.status === 'in_progress').length,
                    completed: allOrders.filter(o => o.status === 'completed').length
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

                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <div className="card text-center bg-primary text-white h-100">
                                    <div className="card-body">
                                        <h3>{loading ? '...' : workOrderStats.total}</h3>
                                        <p className="mb-0">Total Orders</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4 mb-3">
                                <div className="card text-center bg-warning text-dark h-100">
                                    <div className="card-body">
                                        <h3>{loading ? '...' : workOrderStats.inProgress}</h3>
                                        <p className="mb-0">Orders In Progress</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4 mb-3">
                                <div className="card text-center bg-success text-white h-100">
                                    <div className="card-body">
                                        <h3>{loading ? '...' : workOrderStats.completed}</h3>
                                        <p className="mb-0">Orders Completed</p>
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
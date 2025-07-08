import React from 'react';

const StatisticsCards = ({ 
    filteredBills, 
    isAdmin, 
    getTotalAmount 
}) => {
    return (
        <div className="row mb-4">
            <div className="col-md-3">
                <div className="card text-center bg-primary text-white">
                    <div className="card-body">
                        <h5>{filteredBills.length}</h5>
                        <small>Total Bills</small>
                    </div>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card text-center bg-warning text-white">
                    <div className="card-body">
                        <h5>{filteredBills.filter(b => b.status === 'pending').length}</h5>
                        <small>Pending</small>
                    </div>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card text-center bg-success text-white">
                    <div className="card-body">
                        <h5>{filteredBills.filter(b => b.status !== 'pending').length}</h5>
                        <small>Priced</small>
                    </div>
                </div>
            </div>
            <div className="col-md-3">
                <div className="card text-center bg-info text-white">
                    <div className="card-body">
                        <h5>{isAdmin ? `₹${getTotalAmount()}` : '***'}</h5>
                        <small>{isAdmin ? 'Total Amount' : 'Total (Admin Only)'}</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatisticsCards;

import React, { useState } from 'react';
import { dentalLabService } from '../../services/dentalLabService';
import { supabase } from '../../supabase/supabaseClient';

const DatabaseTestPage = () => {
    const [testResults, setTestResults] = useState({});
    const [loading, setLoading] = useState(false);

    const runTests = async () => {
        setLoading(true);
        const results = {};

        // Test 1: Basic Supabase connection
        try {
            const { data, error } = await supabase
                .from('work_orders')
                .select('count', { count: 'exact', head: true });
            
            if (error) {
                results.connection = { success: false, error: error.message };
            } else {
                results.connection = { success: true, count: data };
            }
        } catch (error) {
            results.connection = { success: false, error: error.message };
        }

        // Test 2: Service function
        try {
            const response = await dentalLabService.getAllWorkOrders();
            if (response.data) {
                results.service = { success: true, count: response.data.length };
            } else {
                results.service = { success: false, error: response.error?.message || 'Unknown error' };
            }
        } catch (error) {
            results.service = { success: false, error: error.message };
        }

        // Test 3: Auth check
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                results.auth = { success: true, user: user.email };
            } else {
                results.auth = { success: false, error: 'No user found' };
            }
        } catch (error) {
            results.auth = { success: false, error: error.message };
        }

        // Test 4: RLS policies check
        try {
            const { data, error } = await supabase
                .from('work_orders')
                .select('id')
                .limit(1);
            
            if (error) {
                results.rls = { success: false, error: error.message };
            } else {
                results.rls = { success: true, message: 'RLS policies working' };
            }
        } catch (error) {
            results.rls = { success: false, error: error.message };
        }

        setTestResults(results);
        setLoading(false);
    };

    return (
        <div className="container mt-4">
            <div className="card">
                <div className="card-header">
                    <h4>🔧 Database Connection Test</h4>
                </div>
                <div className="card-body">
                    <button 
                        className="btn btn-primary mb-3"
                        onClick={runTests}
                        disabled={loading}
                    >
                        {loading ? 'Running Tests...' : 'Run Database Tests'}
                    </button>

                    {Object.keys(testResults).length > 0 && (
                        <div className="test-results">
                            <h5>Test Results:</h5>
                            
                            {Object.entries(testResults).map(([testName, result]) => (
                                <div key={testName} className={`alert ${result.success ? 'alert-success' : 'alert-danger'}`}>
                                    <strong>{testName.toUpperCase()} Test:</strong>
                                    {result.success ? (
                                        <div>
                                            ✅ Success
                                            {result.count !== undefined && <div>Count: {result.count}</div>}
                                            {result.user && <div>User: {result.user}</div>}
                                            {result.message && <div>{result.message}</div>}
                                        </div>
                                    ) : (
                                        <div>
                                            ❌ Failed: {result.error}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4">
                        <h6>What each test checks:</h6>
                        <ul>
                            <li><strong>Connection:</strong> Basic Supabase database connection</li>
                            <li><strong>Service:</strong> dentalLabService.getAllWorkOrders() function</li>
                            <li><strong>Auth:</strong> User authentication status</li>
                            <li><strong>RLS:</strong> Row Level Security policies</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatabaseTestPage;

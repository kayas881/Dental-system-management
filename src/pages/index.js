// Pages index - Re-export all pages from their organized directories

// Auth pages
export { default as LoginPage } from './auth/LoginPage';
export { default as SessionFixPage } from './auth/SessionFixPage';

// Admin pages  
export { default as AdminPage } from './admin/AdminPage';
export { default as AdminDashboard } from './admin/AdminDashboard';
export { default as UserManagementPage } from './admin/UserManagementPage';
export { default as AnalyticsPage } from './admin/AnalyticsPage';
export { default as AuditLogPage } from './admin/AuditLogPage';
export { default as SystemMonitorPage } from './admin/SystemMonitorPage';

// Staff pages
export { default as StaffDashboard } from './staff/StaffDashboard';

// Bill pages
export { default as CreateBillPage } from './bills/CreateBillPage';
export { default as BillsManagementPage } from './bills/BillsManagementPage';
export { default as GroupedBillPage } from './bills/GroupedBillPage';
export { default as ItemizedBillPricingPage } from './bills/ItemizedBillPricingPage';

// Work order pages
export { default as WorkOrderForm } from './work-orders/WorkOrderForm';
export { default as WorkOrdersList } from './work-orders/WorkOrdersList';
export { default as BatchWorkOrderForm } from './work-orders/BatchWorkOrderForm';

// Shared pages
export { default as DiagnosticPage } from './shared/DiagnosticPage';
export { default as DatabaseTestPage } from './shared/DatabaseTestPage';

import './App.css';
import { Route, Routes } from 'react-router-dom';
// Auth pages
import LoginPage from './pages/auth/LoginPage';

// Admin pages
import AdminPage from './pages/admin/AdminPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagementPage from './pages/admin/UserManagementPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import SystemMonitorPage from './pages/admin/SystemMonitorPage';
import MonthlyBillingPage from './pages/admin/MonthlyBillingPage';

// Staff pages
import StaffDashboard from './pages/staff/StaffDashboard';

// Bill pages
import CreateBillPage from './pages/bills/CreateBillPage';
import BillsManagementPage from './pages/bills/BillsManagementPage';
import GroupedBillPage from './pages/bills/GroupedBillPage';
import FlexibleGroupedBillPage from './pages/bills/FlexibleGroupedBillPage';
import ItemizedBillPricingPage from './pages/bills/ItemizedBillPricingPage';

// Work order pages
import WorkOrderForm from './pages/work-orders/WorkOrderForm';
import WorkOrdersList from './pages/work-orders/WorkOrdersList';
import BatchWorkOrderForm from './pages/work-orders/BatchWorkOrderForm';

// Shared pages
import DiagnosticPage from './pages/shared/DiagnosticPage';

// Routes
import { PrivateRoute } from './routes/PrivateRoute';
import { AdminPrivateRoute } from './routes/AdminRoute';
import { StaffRoute } from './routes/StaffRoute';
import ProfessionalLayout from './components/Layout/ProfessionalLayout';

function App() {
  return (
   <>
   <Routes>
    <Route path='/' element={
    <LoginPage /> 
    }>

    </Route>

    <Route path='/staff-dashboard' element={
    <StaffRoute>
      <ProfessionalLayout>
        <StaffDashboard /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/admin-dashboard' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <AdminDashboard /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/admin-page' element={
    
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <AdminPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/user-management' element={
    
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <UserManagementPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/work-order-form' element={
    <StaffRoute>
      <ProfessionalLayout>
        <WorkOrderForm /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/batch-work-order' element={
    <StaffRoute>
      <ProfessionalLayout>
        <BatchWorkOrderForm /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/work-orders-list' element={
    <StaffRoute>
      <ProfessionalLayout>
        <WorkOrdersList /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/create-bill' element={
    <StaffRoute>
      <ProfessionalLayout>
        <CreateBillPage /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/staff/bills' element={
    <StaffRoute>
      <ProfessionalLayout>
        <BillsManagementPage /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/bills-management' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <BillsManagementPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/admin/bills-management' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <BillsManagementPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/admin/grouped-bill' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <GroupedBillPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/admin/bill-pricing/:billId' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <ItemizedBillPricingPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/admin/monthly-billing' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <MonthlyBillingPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/staff/batch-work-order' element={
    <StaffRoute>
      <ProfessionalLayout>
        <BatchWorkOrderForm /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/grouped-bill' element={
    <StaffRoute>
      <ProfessionalLayout>
        <GroupedBillPage /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/flexible-grouped-bill' element={
    <StaffRoute>
      <ProfessionalLayout>
        <FlexibleGroupedBillPage /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/diagnostic' element={
    <StaffRoute>
      <ProfessionalLayout>
        <DiagnosticPage /> 
      </ProfessionalLayout>
    </StaffRoute>
    }>
    </Route>

    <Route path='/analytics' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <AnalyticsPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/audit-log' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <AuditLogPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/system-monitor' element={
    <AdminPrivateRoute>
      <ProfessionalLayout>
        <SystemMonitorPage /> 
      </ProfessionalLayout>
    </AdminPrivateRoute>
    }>
    </Route>

    <Route path='/*' element={<LoginPage /> }>

    </Route>


   </Routes>
   
   </>
  );
}

export default App;

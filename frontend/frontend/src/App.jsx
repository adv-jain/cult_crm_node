import { BrowserRouter, Routes, Route } from "react-router-dom";

// =====================================================
// PUBLIC PAGES
// =====================================================

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

// =====================================================
// PAGES
// =====================================================

import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Leads from "./pages/Leads";
import Enquiries from "./pages/Enquiries";
import Customers from "./pages/Customers";
import Travellers from "./pages/Travellers";
import Quotations from "./pages/Quotations";
import Bookings from "./pages/Bookings";
import Contacts from "./pages/Contacts";
import Companies from "./pages/Companies";
import Trips from "./pages/Trips";
import Itineraries from "./pages/Itineraries";
import Packages from "./pages/Packages";
import Hotels from "./pages/Hotels";
import Transports from "./pages/Transports";
import Suppliers from "./pages/Supplier";
import Tasks from "./pages/Tasks";
import Activities from "./pages/Activities";
import Users from "./pages/Users";

// =====================================================
// FINANCE PAGES
// =====================================================

import Payment from "./pages/Payment";
import Invoice from "./pages/Invoice";
import Refund from "./pages/Refund";
import Expense from "./pages/Expense";
import Commission from "./pages/Commission";

// =====================================================
// REPORT PAGES
// =====================================================

import Reports from "./pages/Reports";
import SalesReport from "./pages/SalesReport";
import BookingReport from "./pages/BookingReport";
import RevenueReport from "./pages/RevenueReport";
import ProfitLossReport from "./pages/ProfitLossReport";
import AgentPerformanceReport from "./pages/AgentPerformanceReport";

// =====================================================
// COMPONENTS
// =====================================================

import Notifications from "./components/Notifications";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

// =====================================================
// LAYOUT
// =====================================================

import DashboardLayout from "./layouts/DashboardLayout";

// =====================================================
// ROLE GROUPS
// =====================================================

const ALL_ROLES = [
  "admin",
  "manager",
  "sales",
  "operations",
  "accounts",
];

const SALES_ROLES = [
  "admin",
  "manager",
  "sales",
];

const OPS_ROLES = [
  "admin",
  "manager",
  "sales",
  "operations",
];

const FINANCE_ROLES = [
  "admin",
  "manager",
  "accounts",
];

const ADMIN_ONLY = [
  "admin",
];

// =====================================================
// PROTECTED ROUTES CONFIG
// =====================================================

const protectedRoutes = [

  // ===================================================
  // DASHBOARD
  // ===================================================

  {
    path: "/",
    element: <Dashboard />,
    roles: ALL_ROLES,
  },

  // ===================================================
  // CALENDAR
  // ===================================================

  {
    path: "/calendar",
    element: <Calendar />,
    roles: ALL_ROLES,
  },

  // ===================================================
  // SALES
  // ===================================================

  {
    path: "/leads",
    element: <Leads />,
    roles: SALES_ROLES,
  },

  {
    path: "/enquiries",
    element: <Enquiries />,
    roles: SALES_ROLES,
  },

  {
    path: "/customers",
    element: <Customers />,
    roles: SALES_ROLES,
  },

  {
    path: "/travellers",
    element: <Travellers />,
    roles: SALES_ROLES,
  },

  {
    path: "/quotations",
    element: <Quotations />,
    roles: SALES_ROLES,
  },

  {
    path: "/bookings",
    element: <Bookings />,
    roles: SALES_ROLES,
  },

  {
    path: "/contacts",
    element: <Contacts />,
    roles: SALES_ROLES,
  },

  {
    path: "/companies",
    element: <Companies />,
    roles: SALES_ROLES,
  },

  {
    path: "/trips",
    element: <Trips />,
    roles: SALES_ROLES,
  },

  // ===================================================
  // FINANCE
  // ===================================================

  {
    path: "/invoices",
    element: <Invoice />,
    roles: FINANCE_ROLES,
  },

  {
    path: "/payments",
    element: <Payment />,
    roles: FINANCE_ROLES,
  },

  {
    path: "/refunds",
    element: <Refund />,
    roles: FINANCE_ROLES,
  },

  {
    path: "/expenses",
    element: <Expense />,
    roles: FINANCE_ROLES,
  },

  {
    path: "/commissions",
    element: <Commission />,
    roles: FINANCE_ROLES,
  },

  // ===================================================
  // OPERATIONS
  // ===================================================

  {
    path: "/itineraries",
    element: <Itineraries />,
    roles: OPS_ROLES,
  },

  {
    path: "/packages",
    element: <Packages />,
    roles: OPS_ROLES,
  },

  {
    path: "/hotels",
    element: <Hotels />,
    roles: OPS_ROLES,
  },

  {
    path: "/transports",
    element: <Transports />,
    roles: OPS_ROLES,
  },

  {
    path: "/suppliers",
    element: <Suppliers />,
    roles: OPS_ROLES,
  },

  {
    path: "/tasks",
    element: <Tasks />,
    roles: OPS_ROLES,
  },

  {
    path: "/activities",
    element: <Activities />,
    roles: OPS_ROLES,
  },

  // ===================================================
  // REPORTS
  // ===================================================

  // Reports Overview
  {
    path: "/reports",
    element: <Reports />,
    roles: ALL_ROLES,
  },

  // Sales Report
  {
    path: "/reports/sales",
    element: <SalesReport />,
    roles: ALL_ROLES,
  },

  // Booking Report
  {
    path: "/reports/bookings",
    element: <BookingReport />,
    roles: ALL_ROLES,
  },

  // Revenue Report
  {
    path: "/reports/revenue",
    element: <RevenueReport />,
    roles: ALL_ROLES,
  },

  // Profit & Loss Report
  {
    path: "/reports/profit-loss",
    element: <ProfitLossReport />,
    roles: [
      "admin",
      "manager",
      "operations",
      "accounts",
    ],
  },

  // Agent Performance Report
  {
    path: "/reports/agent-performance",
    element: <AgentPerformanceReport />,
    roles: [
      "admin",
      "manager",
      "sales",
    ],
  },

  // ===================================================
  // ADMIN
  // ===================================================

  {
    path: "/users",
    element: <Users />,
    roles: ADMIN_ONLY,
  },

  // ===================================================
  // NOTIFICATIONS
  // ===================================================

  {
    path: "/notifications",
    element: <Notifications />,
    roles: SALES_ROLES,
  },
];

// =====================================================
// APP
// =====================================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =================================================
            PUBLIC ROUTES
        ================================================= */}

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/signup"
          element={<SignupPage />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        {/* =================================================
            PROTECTED ROUTES
        ================================================= */}

        {protectedRoutes.map(
          ({ path, element, roles }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={roles}>
                    <DashboardLayout>
                      {element}
                    </DashboardLayout>
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
          )
        )}

      </Routes>
    </BrowserRouter>
  );
}

export default App;
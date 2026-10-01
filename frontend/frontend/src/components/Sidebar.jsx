import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import {
  FiHome,
  FiUsers,
  FiUser,
  FiUserCheck,
  FiFileText,
  FiBriefcase,
  FiMap,
  FiMapPin,
  FiPackage,
  FiTruck,
  FiCreditCard,
  FiDollarSign,
  FiRefreshCcw,
  FiClipboard,
  FiActivity,
  FiCalendar,
  FiBarChart2,
  FiSettings,
  FiShield,
  FiChevronDown,
  FiChevronRight,
  FiX,
} from "react-icons/fi";

function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();

  const [openSections, setOpenSections] = useState(() => {
    const saved = localStorage.getItem("travelCRMOpenSections");
    return saved
      ? JSON.parse(saved)
      : {
          sales: true,
          trips: false,
          customers: false,
          operations: false,
          finance: false,
          work: false,
          reports: false,
          admin: false,
        };
  });

  useEffect(() => {
    localStorage.setItem(
      "travelCRMOpenSections",
      JSON.stringify(openSections)
    );
  }, [openSections]);

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const hasRole = (...roles) => roles.includes(user?.role);

  const isSectionActive = (paths) =>
    paths.some((path) => location.pathname.startsWith(path));

  /* =========================================================
     LINK CLASSES — Dark blue sidebar
  ========================================================= */
  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
    ${
      isActive
        ? "bg-brand-sidebar-active text-white shadow-md shadow-brand-blue/40"
        : "text-brand-sidebar-text hover:bg-brand-sidebar-hover hover:text-white"
    }`;

  /* =========================================================
     SECTION HEADER CLASSES
  ========================================================= */
  const sectionButtonClasses = (active) =>
    `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all
    ${
      active
        ? "text-white bg-brand-sidebar-dark"
        : "text-brand-sidebar-text-muted hover:bg-brand-sidebar-hover hover:text-white"
    }`;

  const SectionHeader = ({ id, title, icon: Icon, paths }) => {
    const active = isSectionActive(paths);

    return (
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className={sectionButtonClasses(active)}
      >
        <span className="flex items-center gap-3">
          <Icon
            size={18}
            className={active ? "text-brand-gold" : ""}
          />
          <span>{title}</span>
        </span>

        {openSections[id] ? (
          <FiChevronDown size={16} />
        ) : (
          <FiChevronRight size={16} />
        )}
      </button>
    );
  };

  const NavItem = ({ to, icon: Icon, children }) => (
    <NavLink to={to} onClick={onClose} className={linkClasses}>
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            className={isActive ? "text-brand-gold" : ""}
          />
          <span>{children}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {/* MOBILE OVERLAY */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* =========================================================
          SIDEBAR — DARK BLUE
      ========================================================= */}
      <aside
        className={`
          fixed top-0 left-0 z-50
          h-screen w-64
          bg-brand-sidebar
          border-r border-brand-sidebar-border
          flex flex-col
          transition-transform duration-300
          ${
            isOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        {/* =================================================
            LOGO — White card wrapper
        ================================================= */}
        <div className="h-20 px-4 flex items-center justify-between border-b border-brand-sidebar-border">
          <div className="flex items-center min-w-0">
            <div className="bg-white rounded-xl px-4 py-2 shadow-md">
              <img
                src="/images/cult-holidays-logo.webp"
                alt="ULT Holidays"
                className="h-10 w-auto object-contain shrink-0"
              />
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden text-brand-sidebar-text hover:text-brand-gold transition"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* =================================================
            NAVIGATION
        ================================================= */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 sidebar-scroll">
          {/* DASHBOARD */}
          <NavItem to="/" icon={FiHome}>
            Dashboard
          </NavItem>

          {/* SALES */}
          {hasRole("admin", "manager", "sales") && (
            <div className="pt-2">
              <SectionHeader
                id="sales"
                title="Sales"
                icon={FiUsers}
                paths={[
                  "/leads",
                  "/enquiries",
                  "/quotations",
                  "/bookings",
                ]}
              />

              {openSections.sales && (
                <div className="mt-1 ml-2 pl-3 border-l border-brand-sidebar-border space-y-1">
                  <NavItem to="/leads" icon={FiUser}>
                    Leads
                  </NavItem>
                  <NavItem to="/enquiries" icon={FiFileText}>
                    Enquiries
                  </NavItem>
                  <NavItem to="/quotations" icon={FiFileText}>
                    Quotations
                  </NavItem>
                  <NavItem to="/bookings" icon={FiBriefcase}>
                    Bookings
                  </NavItem>
                </div>
              )}
            </div>
          )}

          {/* TRIPS */}
          {hasRole("admin", "manager", "sales", "operations") && (
            <div className="pt-1">
              <SectionHeader
                id="trips"
                title="Trips"
                icon={FiMap}
                paths={[
                  "/trips",
                  "/travellers",
                  "/itineraries",
                  "/packages",
                ]}
              />

              {openSections.trips && (
                <div className="mt-1 ml-2 pl-3 border-l border-brand-sidebar-border space-y-1">
                  <NavItem to="/trips" icon={FiMapPin}>
                    All Trips
                  </NavItem>
                  <NavItem to="/travellers" icon={FiUserCheck}>
                    Travellers
                  </NavItem>
                  <NavItem to="/itineraries" icon={FiMap}>
                    Itineraries
                  </NavItem>
                  <NavItem to="/packages" icon={FiPackage}>
                    Packages
                  </NavItem>
                </div>
              )}
            </div>
          )}

          {/* CUSTOMERS */}
          {hasRole("admin", "manager", "sales") && (
            <div className="pt-1">
              <SectionHeader
                id="customers"
                title="Customers"
                icon={FiUsers}
                paths={["/customers"]}
              />

              {openSections.customers && (
                <div className="mt-1 ml-2 pl-3 border-l border-brand-sidebar-border space-y-1">
                  <NavItem to="/customers" icon={FiUser}>
                    Customers
                  </NavItem>
                </div>
              )}
            </div>
          )}

          {/* OPERATIONS */}
          {hasRole("admin", "manager", "operations") && (
            <div className="pt-1">
              <SectionHeader
                id="operations"
                title="Operations"
                icon={FiTruck}
                paths={["/hotels", "/transports", "/suppliers"]}
              />

              {openSections.operations && (
                <div className="mt-1 ml-2 pl-3 border-l border-brand-sidebar-border space-y-1">
                  <NavItem to="/hotels" icon={FiBriefcase}>
                    Hotels
                  </NavItem>
                  <NavItem to="/transports" icon={FiTruck}>
                    Transport
                  </NavItem>
                  <NavItem to="/suppliers" icon={FiUsers}>
                    Suppliers
                  </NavItem>
                </div>
              )}
            </div>
          )}

          {/* FINANCE */}
          {hasRole("admin", "manager", "accounts") && (
            <div className="pt-1">
              <SectionHeader
                id="finance"
                title="Finance"
                icon={FiDollarSign}
                paths={[
                  "/payments",
                  "/expenses",
                  "/refunds",
                  "/invoices",
                  "/commissions",
                ]}
              />

              {openSections.finance && (
                <div className="mt-1 ml-2 pl-3 border-l border-brand-sidebar-border space-y-1">
                  <NavItem to="/payments" icon={FiCreditCard}>
                    Payments
                  </NavItem>
                  <NavItem to="/expenses" icon={FiDollarSign}>
                    Expenses
                  </NavItem>
                  <NavItem to="/refunds" icon={FiRefreshCcw}>
                    Refunds
                  </NavItem>
                  <NavItem to="/invoices" icon={FiFileText}>
                    Invoices
                  </NavItem>
                  <NavItem to="/commissions" icon={FiDollarSign}>
                    Commission
                  </NavItem>
                </div>
              )}
            </div>
          )}

          {/* WORK */}
          {hasRole("admin", "manager", "sales", "operations") && (
            <div className="pt-1">
              <SectionHeader
                id="work"
                title="Work"
                icon={FiClipboard}
                paths={["/tasks", "/activities", "/calendar"]}
              />

              {openSections.work && (
                <div className="mt-1 ml-2 pl-3 border-l border-brand-sidebar-border space-y-1">
                  <NavItem to="/tasks" icon={FiClipboard}>
                    Tasks
                  </NavItem>
                  <NavItem to="/activities" icon={FiActivity}>
                    Activities
                  </NavItem>
                  <NavItem to="/calendar" icon={FiCalendar}>
                    Calendar
                  </NavItem>
                </div>
              )}
            </div>
          )}

          {/* REPORTS */}
          {hasRole(
            "admin",
            "manager",
            "sales",
            "operations",
            "accounts"
          ) && (
            <div className="pt-1">
              <SectionHeader
                id="reports"
                title="Reports"
                icon={FiBarChart2}
                paths={[
                  "/reports",
                  "/reports/sales",
                  "/reports/bookings",
                  "/reports/revenue",
                  "/reports/profit-loss",
                  "/reports/agent-performance",
                ]}
              />

              {openSections.reports && (
                <div className="mt-1 ml-2 pl-3 border-l border-brand-sidebar-border space-y-1">
                  <NavItem to="/reports/sales" icon={FiBarChart2}>
                    Sales Reports
                  </NavItem>
                  <NavItem to="/reports/bookings" icon={FiBriefcase}>
                    Booking Reports
                  </NavItem>
                  <NavItem to="/reports/revenue" icon={FiDollarSign}>
                    Revenue
                  </NavItem>
                  <NavItem to="/reports/profit-loss" icon={FiBarChart2}>
                    Profit & Loss
                  </NavItem>
                  <NavItem
                    to="/reports/agent-performance"
                    icon={FiUsers}
                  >
                    Agent Performance
                  </NavItem>
                </div>
              )}
            </div>
          )}

          {/* ADMIN */}
          {hasRole("admin") && (
            <div className="pt-1">
              <SectionHeader
                id="admin"
                title="Admin"
                icon={FiShield}
                paths={["/users", "/roles-permissions", "/settings"]}
              />

              {openSections.admin && (
                <div className="mt-1 ml-2 pl-3 border-l border-brand-sidebar-border space-y-1">
                  <NavItem to="/users" icon={FiUsers}>
                    Users
                  </NavItem>
                  <NavItem to="/roles-permissions" icon={FiShield}>
                    Roles & Permissions
                  </NavItem>
                  <NavItem to="/settings" icon={FiSettings}>
                    Settings
                  </NavItem>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================
            FOOTER — Brand accent
        ================================================= */}
        <div className="border-t border-brand-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] text-brand-sidebar-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-gold animate-pulse" />
            <span>CULT Holidays</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
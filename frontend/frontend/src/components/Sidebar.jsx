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

// =====================================================
// CONSTANTS
// =====================================================

const STORAGE_KEY = "travelCRMOpenSections";

const DEFAULT_OPEN_SECTIONS = {
  sales: true,
  trips: false,
  customers: false,
  operations: false,
  finance: false,
  work: false,
  reports: false,
  admin: false,
};

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// =====================================================
// SUB-COMPONENTS
// =====================================================

function SectionHeader({ id, title, icon: Icon, paths, isOpen, onToggle, isSectionActive }) {
  const active = isSectionActive(paths);

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
        active
          ? "text-white bg-brand-sidebar-dark"
          : "text-brand-sidebar-text-muted hover:bg-brand-sidebar-hover hover:text-white"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon size={18} className={active ? "text-brand-gold" : ""} />
        <span>{title}</span>
      </span>

      {isOpen ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
    </button>
  );
}

function NavItem({ to, icon: Icon, onClose, children }) {
  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-brand-sidebar-active text-white shadow-md shadow-brand-blue/40"
        : "text-brand-sidebar-text hover:bg-brand-sidebar-hover hover:text-white"
    }`;

  return (
    <NavLink to={to} onClick={() => onClose?.()} className={linkClasses}>
      {({ isActive }) => (
        <>
          <Icon size={17} className={isActive ? "text-brand-gold" : ""} />
          <span>{children}</span>
        </>
      )}
    </NavLink>
  );
}

function SubMenu({ children }) {
  return (
    <div className="mt-1 ml-2 pl-3 border-l border-brand-sidebar-border space-y-1">
      {children}
    </div>
  );
}

// =====================================================
// MAIN SIDEBAR
// =====================================================

function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();

  // -------- Open sections state (persisted) --------
  const [openSections, setOpenSections] = useState(() =>
    safeParse(localStorage.getItem(STORAGE_KEY), DEFAULT_OPEN_SECTIONS)
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections));
  }, [openSections]);

  // -------- Close sidebar on route change --------
  useEffect(() => {
    onClose?.();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------- Close on desktop resize --------
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) onClose?.();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onClose]);

  // -------- Lock body scroll on mobile when open --------
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }

    if (window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // -------- Close on Escape --------
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // -------- Helpers --------
  const toggleSection = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const hasRole = (...roles) => roles.includes(user?.role);

  const isSectionActive = (paths) =>
    paths.some((path) => location.pathname.startsWith(path));

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-[1px]"
          onClick={() => onClose?.()}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-brand-sidebar border-r border-brand-sidebar-border flex flex-col transform-gpu transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* HEADER / LOGO */}
        <div className="h-20 min-h-20 px-4 flex items-center justify-between border-b border-brand-sidebar-border">
          <div className="flex items-center min-w-0">
            <div className="bg-white rounded-xl px-4 py-2 shadow-md max-w-[180px]">
              <img
                src="/images/cult-holidays-logo.webp"
                alt="CULT Holidays"
                className="h-10 w-auto max-w-full object-contain shrink-0"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onClose?.()}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-brand-sidebar-text hover:text-white hover:bg-brand-sidebar-hover transition"
            aria-label="Close sidebar"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* NAVIGATION */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1 sidebar-scroll overscroll-contain">
          {/* Dashboard */}
          <NavItem to="/" icon={FiHome} onClose={onClose}>
            Dashboard
          </NavItem>

          {/* Sales */}
          {hasRole("admin", "manager", "sales") && (
            <div className="pt-2">
              <SectionHeader
                id="sales"
                title="Sales"
                icon={FiUsers}
                paths={["/leads", "/enquiries", "/quotations", "/bookings"]}
                isOpen={openSections.sales}
                onToggle={toggleSection}
                isSectionActive={isSectionActive}
              />

              {openSections.sales && (
                <SubMenu>
                  <NavItem to="/leads" icon={FiUser} onClose={onClose}>
                    Leads
                  </NavItem>
                  <NavItem to="/enquiries" icon={FiFileText} onClose={onClose}>
                    Enquiries
                  </NavItem>
                  <NavItem to="/quotations" icon={FiFileText} onClose={onClose}>
                    Quotations
                  </NavItem>
                  <NavItem to="/bookings" icon={FiBriefcase} onClose={onClose}>
                    Bookings
                  </NavItem>
                </SubMenu>
              )}
            </div>
          )}

          {/* Trips */}
          {hasRole("admin", "manager", "sales", "operations") && (
            <div className="pt-1">
              <SectionHeader
                id="trips"
                title="Trips"
                icon={FiMap}
                paths={["/trips", "/travellers", "/itineraries", "/packages"]}
                isOpen={openSections.trips}
                onToggle={toggleSection}
                isSectionActive={isSectionActive}
              />

              {openSections.trips && (
                <SubMenu>
                  <NavItem to="/trips" icon={FiMapPin} onClose={onClose}>
                    All Trips
                  </NavItem>
                  <NavItem to="/travellers" icon={FiUserCheck} onClose={onClose}>
                    Travellers
                  </NavItem>
                  <NavItem to="/itineraries" icon={FiMap} onClose={onClose}>
                    Itineraries
                  </NavItem>
                  <NavItem to="/packages" icon={FiPackage} onClose={onClose}>
                    Packages
                  </NavItem>
                </SubMenu>
              )}
            </div>
          )}

          {/* Customers */}
          {hasRole("admin", "manager", "sales") && (
            <div className="pt-1">
              <SectionHeader
                id="customers"
                title="Customers"
                icon={FiUsers}
                paths={["/customers"]}
                isOpen={openSections.customers}
                onToggle={toggleSection}
                isSectionActive={isSectionActive}
              />

              {openSections.customers && (
                <SubMenu>
                  <NavItem to="/customers" icon={FiUser} onClose={onClose}>
                    Customers
                  </NavItem>
                </SubMenu>
              )}
            </div>
          )}

          {/* Operations */}
          {hasRole("admin", "manager", "operations") && (
            <div className="pt-1">
              <SectionHeader
                id="operations"
                title="Operations"
                icon={FiTruck}
                paths={["/hotels", "/transports", "/suppliers"]}
                isOpen={openSections.operations}
                onToggle={toggleSection}
                isSectionActive={isSectionActive}
              />

              {openSections.operations && (
                <SubMenu>
                  <NavItem to="/hotels" icon={FiBriefcase} onClose={onClose}>
                    Hotels
                  </NavItem>
                  <NavItem to="/transports" icon={FiTruck} onClose={onClose}>
                    Transport
                  </NavItem>
                  <NavItem to="/suppliers" icon={FiUsers} onClose={onClose}>
                    Suppliers
                  </NavItem>
                </SubMenu>
              )}
            </div>
          )}

          {/* Finance */}
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
                isOpen={openSections.finance}
                onToggle={toggleSection}
                isSectionActive={isSectionActive}
              />

              {openSections.finance && (
                <SubMenu>
                  <NavItem to="/payments" icon={FiCreditCard} onClose={onClose}>
                    Payments
                  </NavItem>
                  <NavItem to="/expenses" icon={FiDollarSign} onClose={onClose}>
                    Expenses
                  </NavItem>
                  <NavItem to="/refunds" icon={FiRefreshCcw} onClose={onClose}>
                    Refunds
                  </NavItem>
                  <NavItem to="/invoices" icon={FiFileText} onClose={onClose}>
                    Invoices
                  </NavItem>
                  <NavItem to="/commissions" icon={FiDollarSign} onClose={onClose}>
                    Commission
                  </NavItem>
                </SubMenu>
              )}
            </div>
          )}

          {/* Work */}
          {hasRole("admin", "manager", "sales", "operations") && (
            <div className="pt-1">
              <SectionHeader
                id="work"
                title="Work"
                icon={FiClipboard}
                paths={["/tasks", "/activities", "/calendar"]}
                isOpen={openSections.work}
                onToggle={toggleSection}
                isSectionActive={isSectionActive}
              />

              {openSections.work && (
                <SubMenu>
                  <NavItem to="/tasks" icon={FiClipboard} onClose={onClose}>
                    Tasks
                  </NavItem>
                  <NavItem to="/activities" icon={FiActivity} onClose={onClose}>
                    Activities
                  </NavItem>
                  <NavItem to="/calendar" icon={FiCalendar} onClose={onClose}>
                    Calendar
                  </NavItem>
                </SubMenu>
              )}
            </div>
          )}

          {/* Reports */}
          {hasRole("admin", "manager", "sales", "operations", "accounts") && (
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
                isOpen={openSections.reports}
                onToggle={toggleSection}
                isSectionActive={isSectionActive}
              />

              {openSections.reports && (
                <SubMenu>
                  <NavItem to="/reports/sales" icon={FiBarChart2} onClose={onClose}>
                    Sales Reports
                  </NavItem>
                  <NavItem to="/reports/bookings" icon={FiBriefcase} onClose={onClose}>
                    Booking Reports
                  </NavItem>
                  <NavItem to="/reports/revenue" icon={FiDollarSign} onClose={onClose}>
                    Revenue
                  </NavItem>
                  <NavItem to="/reports/profit-loss" icon={FiBarChart2} onClose={onClose}>
                    Profit & Loss
                  </NavItem>
                  <NavItem to="/reports/agent-performance" icon={FiUsers} onClose={onClose}>
                    Agent Performance
                  </NavItem>
                </SubMenu>
              )}
            </div>
          )}

          {/* Admin */}
          {hasRole("admin") && (
            <div className="pt-1">
              <SectionHeader
                id="admin"
                title="Admin"
                icon={FiShield}
                paths={["/users", "/roles-permissions", "/settings"]}
                isOpen={openSections.admin}
                onToggle={toggleSection}
                isSectionActive={isSectionActive}
              />

              {openSections.admin && (
                <SubMenu>
                  <NavItem to="/users" icon={FiUsers} onClose={onClose}>
                    Users
                  </NavItem>
                  <NavItem to="/roles-permissions" icon={FiShield} onClose={onClose}>
                    Roles & Permissions
                  </NavItem>
                  <NavItem to="/settings" icon={FiSettings} onClose={onClose}>
                    Settings
                  </NavItem>
                </SubMenu>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-brand-sidebar-border px-4 py-3 shrink-0">
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
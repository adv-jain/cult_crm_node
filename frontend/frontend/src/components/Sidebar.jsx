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
  FiDollarSign,
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

function SectionHeader({
  id,
  title,
  icon: Icon,
  paths,
  isOpen,
  onToggle,
  isSectionActive,
  disabled = false,
}) {
  const active = isSectionActive(paths);

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) onToggle(id);
      }}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        disabled
          ? "text-gray-300 cursor-not-allowed"
          : active
          ? "text-brand-blue"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon
          size={18}
          className={
            disabled
              ? "text-gray-300"
              : active
              ? "text-brand-blue"
              : "text-gray-400"
          }
        />

        <span>{title}</span>

        {disabled && (
          <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
            Soon
          </span>
        )}
      </span>

      {!disabled &&
        (isOpen ? (
          <FiChevronDown
            size={16}
            className={active ? "text-brand-blue" : "text-gray-400"}
          />
        ) : (
          <FiChevronRight
            size={16}
            className={active ? "text-brand-blue" : "text-gray-400"}
          />
        ))}
    </button>
  );
}

function NavItem({ to, icon: Icon, onClose, children, disabled = false }) {
  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
      disabled
        ? "text-gray-300 cursor-not-allowed"
        : isActive
        ? "bg-brand-blue-50 text-brand-blue"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`;

  if (disabled) {
    return (
      <div className={linkClasses({ isActive: false })} aria-disabled="true">
        <Icon size={17} className="text-gray-300" />

        <span className="flex-1">{children}</span>

        <span className="text-[9px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
          Soon
        </span>
      </div>
    );
  }

  return (
    <NavLink to={to} onClick={() => onClose?.()} className={linkClasses}>
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            className={isActive ? "text-brand-blue" : "text-gray-400"}
          />

          <span>{children}</span>
        </>
      )}
    </NavLink>
  );
}

function SubMenu({ children }) {
  return (
    <div className="mt-1 ml-2 pl-3 border-l border-gray-200 space-y-0.5">
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

  const [openSections, setOpenSections] = useState(() => {
    const saved = safeParse(
      localStorage.getItem(STORAGE_KEY),
      DEFAULT_OPEN_SECTIONS
    );

    // Sales section always open by default (unless user manually closed it)
    return {
      ...DEFAULT_OPEN_SECTIONS,
      ...saved,
      sales: saved?.sales !== undefined ? saved.sales : true,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections));
  }, [openSections]);

  useEffect(() => {
    onClose?.();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) onClose?.();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }
    if (window.innerWidth < 768) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const toggleSection = (section) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const hasRole = (...roles) => roles.includes(user?.role);

  const isSectionActive = (paths) =>
    paths.some((path) => location.pathname.startsWith(path));

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-[1px]"
          onClick={() => onClose?.()}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transform-gpu transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* HEADER / LOGO */}

        <div className="h-20 min-h-20 px-4 flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <img
              src="/images/cult-holidays-logo.webp"
              alt="CULT Holidays"
              className="h-10 w-auto max-w-[180px] object-contain shrink-0"
            />
          </div>

          <button
            type="button"
            onClick={() => onClose?.()}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
            aria-label="Close sidebar"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* NAVIGATION */}

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1 sidebar-scroll overscroll-contain">
          <NavItem to="/" icon={FiHome} onClose={onClose}>
            Dashboard
          </NavItem>

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
                isOpen={false}
                onToggle={toggleSection}
                isSectionActive={isSectionActive}
                disabled={true}
              />
            </div>
          )}

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
                isOpen={false}
                onToggle={toggleSection}
                isSectionActive={isSectionActive}
                disabled={true}
              />
            </div>
          )}

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
                  <NavItem
                    to="/roles-permissions"
                    icon={FiShield}
                    onClose={onClose}
                    disabled={true}
                  >
                    Roles & Permissions
                  </NavItem>
                  <NavItem
                    to="/settings"
                    icon={FiSettings}
                    onClose={onClose}
                    disabled={true}
                  >
                    Settings
                  </NavItem>
                </SubMenu>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}

        <div className="border-t border-gray-200 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-gold animate-pulse" />
            <span>CULT Holidays</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
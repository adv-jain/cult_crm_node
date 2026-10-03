import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";
import { FiMenu, FiLogOut, FiChevronDown, FiBell } from "react-icons/fi";

// =====================================================
// PAGE TITLES
// Note: exact: true means only match when path is exactly equal.
//       Longer paths should be listed BEFORE shorter ones so that
//       e.g. "/reports/sales" matches before "/reports".
// =====================================================

const PAGE_TITLES = [
  { path: "/", title: "Dashboard", exact: true },

  // Sales
  { path: "/leads", title: "Leads" },
  { path: "/enquiries", title: "Enquiries" },
  { path: "/customers", title: "Customers" },
  { path: "/travellers", title: "Travellers" },
  { path: "/quotations", title: "Quotations" },
  { path: "/bookings", title: "Bookings" },

  // Trips
  { path: "/trips", title: "All Trips" },
  { path: "/itineraries", title: "Itineraries" },
  { path: "/packages", title: "Packages" },

  // Operations
  { path: "/hotels", title: "Hotels" },
  { path: "/transports", title: "Transport" },
  { path: "/suppliers", title: "Suppliers" },

  // Finance
  { path: "/payments", title: "Payments" },
  { path: "/expenses", title: "Expenses" },
  { path: "/refunds", title: "Refunds" },
  { path: "/invoices", title: "Invoices" },
  { path: "/commissions", title: "Commission" },

  // Work
  { path: "/tasks", title: "Tasks" },
  { path: "/activities", title: "Activities" },
  { path: "/calendar", title: "Calendar" },

  // Reports — specific ones BEFORE "/reports"
  { path: "/reports/sales", title: "Sales Reports" },
  { path: "/reports/bookings", title: "Booking Reports" },
  { path: "/reports/revenue", title: "Revenue" },
  { path: "/reports/profit-loss", title: "Profit & Loss" },
  { path: "/reports/agent-performance", title: "Agent Performance" },
  { path: "/reports", title: "Reports" },

  // Admin
  { path: "/users", title: "Users" },
  { path: "/roles-permissions", title: "Roles & Permissions" },
  { path: "/settings", title: "Settings" },

  // Misc
  { path: "/notifications", title: "Notifications" },
];

function Header({ user, onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // =====================================================
  // PAGE TITLE
  // =====================================================

  const pageTitle = useMemo(() => {
    const currentPath = location.pathname;

    // Exact match first (e.g. "/" only matches "/")
    const exactMatch = PAGE_TITLES.find(
      (item) => item.exact && currentPath === item.path
    );
    if (exactMatch) return exactMatch.title;

    // Prefix match — longest path wins
    const prefixMatch = PAGE_TITLES.filter(
      (item) =>
        !item.exact &&
        (currentPath === item.path || currentPath.startsWith(`${item.path}/`))
    ).sort((a, b) => b.path.length - a.path.length)[0];

    return prefixMatch?.title || "Dashboard";
  }, [location.pathname]);

  // =====================================================
  // CLOSE USER MENU ON OUTSIDE CLICK
  // =====================================================

  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (event) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showUserMenu]);

  // =====================================================
  // CLOSE MENU ON ESCAPE
  // =====================================================

  useEffect(() => {
    if (!showUserMenu) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") setShowUserMenu(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showUserMenu]);

  // =====================================================
  // ACTIONS
  // =====================================================

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate("/login");
  };

  const handleNavigate = (path) => {
    setShowUserMenu(false);
    navigate(path);
  };

  // =====================================================
  // INITIALS
  // =====================================================

  const initials = useMemo(() => {
    if (!user?.name) return "U";

    return user.name
      .split(" ")
      .filter(Boolean)
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 sm:px-6 h-14">
      <div className="flex items-center justify-between gap-3 h-full">
        {/* LEFT — menu button + page title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-md transition flex-shrink-0"
            aria-label="Open sidebar"
          >
            <FiMenu size={18} />
          </button>

          <h1 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight truncate">
            {pageTitle}
          </h1>
        </div>

        {/* RIGHT — notifications + user menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition">
            <NotificationBell />
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-1.5 pl-0.5 pr-1 py-0.5 rounded-md hover:bg-gray-50 transition"
              aria-label="User menu"
              aria-expanded={showUserMenu}
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 ring-1 ring-gray-200 flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                {initials}
              </div>

              <span className="hidden lg:block text-sm font-medium text-gray-700 leading-tight max-w-[120px] truncate">
                {user?.name || "User"}
              </span>

              <FiChevronDown
                size={13}
                className={`hidden lg:block text-gray-400 transition-transform ${
                  showUserMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-lg shadow-lg shadow-gray-200/60 z-50 overflow-hidden">
                {/* User info */}
                <div className="px-3.5 py-2.5 border-b border-gray-100">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {user?.email || "No email"}
                  </p>
                </div>

                {/* Notifications (mobile only) */}
                <div className="py-0.5 lg:hidden">
                  <button
                    type="button"
                    onClick={() => handleNavigate("/notifications")}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition"
                  >
                    <FiBell size={14} className="text-gray-400" />
                    Notifications
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 py-0.5">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50 transition"
                  >
                    <FiLogOut size={14} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
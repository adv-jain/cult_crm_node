import { useCallback, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";

function DashboardLayout({ children }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar — mobile drawer + desktop fixed */}
      <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />

      {/* Main content — pushed right on desktop because sidebar is fixed w-64 */}
      <main className="md:ml-64 min-h-screen flex flex-col">
        <Header user={user} onMenuClick={handleOpenSidebar} />

        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}

export default DashboardLayout;
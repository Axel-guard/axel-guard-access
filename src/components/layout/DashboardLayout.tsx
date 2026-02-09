import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="fixed inset-0 flex w-full bg-background overflow-hidden">
      {/* Fixed Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-full">
        {/* Fixed Header */}
        <DashboardHeader onMenuToggle={toggleSidebar} />
        
        {/* Scrollable Content Area - Responsive padding */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

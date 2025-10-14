"use client";

import { AppSidebar } from "@/components/app-sidebar"
import { DynamicBreadcrumb } from "@/components/user-dashboard/DynamicBreadcrumb";
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { WithProtectionRoute } from "@/components/protectionRoute";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { NotificationsPanel } from "@/components/notifications/modules/notifications-panel";
import { getAllNotifications } from "@/service/notificationServices";
import { getUserIdFromToken } from "@/utils/auth";
import { BreadcrumbProvider, useBreadcrumb } from "@/contexts/BreadcrumbContext";



function BreadcrumbWithContext() {
  const { customLabels } = useBreadcrumb();
  return <DynamicBreadcrumb customLabels={{ 
    user: "User Management", 
    employeeview: "", // Hide employeeview from breadcrumb
    addemployee: "Add Employee", // Change addemployee to Add Employee
    "edit-dealer": "Edit Dealer", // Change edit-dealer to Edit Dealer
    adddealer: "Add Dealer", // Change adddealer to Add Dealer
    "PricingMarginMangement": "SLA Violations", // Fix route display
    "sla-violations": "SLA Violations", // Correct route display
    order: "Order Management", // Fix order breadcrumb
    orderdetails: "Order Details", // Fix order details breadcrumb
    returnclaims: "Return Claims", // Fix return claims breadcrumb
    pickup: "Picklist Management", // Fix pickup breadcrumb
    contentManagement: "Content Management", // Fix content management breadcrumb
    tickets: "Support Tickets", // Fix support tickets breadcrumb
    paymentDetails: "Payment Details", // Fix payment details breadcrumb
    ...customLabels 
  }} />;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  // Background poll for unread count so the bell shows counts even when the panel is closed
  const refreshUnreadCount = useCallback(async () => {
    try {
      const userId = getUserIdFromToken();
      if (!userId) {
        setNotifCount(0);
        return;
      }
      // Get all notifications so we can compute both unread and total.
      const response = await getAllNotifications(userId);
      if (response?.success) {
        const allItems = (response.data || []).filter((n: any) => !n.isUserDeleted);
        const unreadCount = allItems.filter((n: any) => !n.markAsRead).length;
        setNotifCount(unreadCount);
      } else {
        setNotifCount(0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    // initial fetch and then poll quicker
    refreshUnreadCount();
    const intervalId = setInterval(() => {
      if (!isCancelled) refreshUnreadCount();
    }, 5000);

    const handleFocus = () => refreshUnreadCount();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshUnreadCount();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshUnreadCount]);
  return (
    <WithProtectionRoute redirectTo="/admin/login">
      <BreadcrumbProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0 overflow-x-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40 min-w-0">
              <div className="flex items-center gap-2 px-4 min-w-0 flex-1">
                <SidebarTrigger className="-ml-1 flex-shrink-0" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <BreadcrumbWithContext />
                </div>
              </div>
              <div className="flex-shrink-0 px-4">
                <button
                  onClick={() => setIsNotifOpen((prev) => !prev)}
                  className="relative rounded-full p-2 hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Open notifications"
                >
                  <Bell className="w-6 h-6 text-gray-700" />
                  <span
                    className={`absolute -top-1 -right-1 rounded-full min-w-4 h-4 px-1 flex items-center justify-center text-[10px] leading-none ${
                      notifCount > 0 ? "bg-red-500 text-white" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {notifCount}
                  </span>
                </button>
              </div>
            </header>
            <NotificationsPanel
              open={isNotifOpen}
              onOpenChange={(open) => {
                setIsNotifOpen(open);
                if (!open) {
                  // refresh count when panel closes after actions
                  refreshUnreadCount();
                }
              }}
              onCountUpdate={setNotifCount}
            />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </BreadcrumbProvider>
    </WithProtectionRoute>
  );
}

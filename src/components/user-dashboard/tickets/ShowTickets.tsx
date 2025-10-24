"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Filter } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SearchInput from "@/components/common/search/SearchInput";
import DynamicButton from "@/components/common/button/button";
import useDebounce from "@/utils/useDebounce";
import { getTickets } from "@/service/Ticket-service";
import { Ticket, TicketResponse, TicketStatus, TicketType } from "@/types/Ticket-types";
import GeneralTickets from "./components/GeneralTickets";
import UserTickets from "./components/UserTickets";
import TicketDetails from "./components/popUp/TicketDetails";

type TabType = "General" | "User";

interface TabConfig {
  id: TabType;
  label: string;
  component?: React.ComponentType<any>;
}

export default function ShowTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("General");

  
  // Dialog state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filters state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    assigned: "",
    dateRange: ""
  });

  // Fetch tickets function
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTickets();
      
      if (response.success && response.data) {
        setTickets(response.data);
      } else {
        console.warn("Invalid response structure:", response);
        setTickets([]);
      }
    } catch (error) {
      console.log("error in fetch tickets", error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tickets on component mount
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

    // Tab configurations
  const tabConfigs: TabConfig[] = useMemo(() => [
    {
      id: "General",
      label: "General",
      component: GeneralTickets,
    },
    {
      id: "User",
      label: "User",
      component: UserTickets,
    },
  ], []);

  // Get current tab configuration
  const currentTabConfig = useMemo(
    () => tabConfigs.find((tab) => tab.id === activeTab) || tabConfigs[0],
    [tabConfigs, activeTab]
  );

  // Render tab content similar to ProductManagement
  const renderTabContent = useCallback(() => {
    const TabComponent = currentTabConfig.component;
    if (!TabComponent) return null;
    
    return (
      <TabComponent
        tickets={tickets}
        searchQuery={searchQuery}
        loading={loading}
        onViewTicket={handleViewTicketDetails}
        onTicketsRefresh={fetchTickets}
        filters={filters}
      />
    );
  }, [currentTabConfig, tickets, searchQuery, loading, fetchTickets, filters]);

  // Debounced search functionality
  const performSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(false);
  }, []);

  const { debouncedCallback: debouncedSearch } = useDebounce(performSearch, 500);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setIsSearching(value.trim() !== "");
    debouncedSearch(value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setIsSearching(false);
  };



  // Handle opening ticket details dialog
  const handleViewTicketDetails = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsDialogOpen(true);
  };

  // Handle closing ticket details dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTicketId(null);
  };

  return (
    <div className="w-full">
      <Card className="shadow-sm rounded-none">
        {/* Header */}
        <CardHeader className="space-y-4 sm:space-y-6">
          <CardTitle className="text-[#000000] font-bold text-lg font-sans">
            <span>Support Tickets</span>
          </CardTitle>

          {/* Search and Filters */}
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 gap-4 w-full">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:gap-3 w-full lg:w-auto">
              <SearchInput
                placeholder="Search tickets"
                value={searchInput}
                onChange={handleSearchChange}
                onClear={handleClearSearch}
                isLoading={isSearching}
              />
              <div className="flex gap-2 sm:gap-3">
                <DynamicButton
                  variant="outline"
                  text="Filters"
                  icon={<Filter className="h-4 w-4 mr-2" />}
                  onClick={() => setIsFiltersOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* Tickets Section Header */}
          <div className="mb-4">
            <CardTitle className="font-sans font-bold text-lg text-[#000000]">
              {currentTabConfig.label}
            </CardTitle>
            <CardDescription className="text-sm text-[#737373] font-medium font-sans">
              Manage and track support tickets by category
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Tab Bar */}
          <div
            className="flex w-full items-center justify-between border-b border-gray-200 overflow-x-auto"
            aria-label="Ticket tabs"
          >
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabConfigs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm font-mono transition-colors
                    ${
                      activeTab === tab.id
                        ? "text-[#C72920] border-b-2 border-[#C72920]"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <span>{tab.label}</span>
                  {/* Show count for each tab */}
                  <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id 
                      ? "bg-[#C72920] text-white" 
                      : "bg-gray-200 text-gray-600"
                  }`}>
                    {tab.id === "General" 
                      ? tickets.filter(ticket => ticket.ticketType === "General").length
                      : tickets.filter(ticket => ticket.ticketType === "Order").length
                    }
                  </span>
                </button>
              ))}
            </nav>
          </div>
          {/* Tab Content */}
          <div className="min-h-[400px] font-sans">
            {renderTabContent()}
          </div>
        </CardContent>
      </Card>

      {/* Filters Modal */}
      {isFiltersOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setIsFiltersOpen(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Filter Tickets</h3>
              <button
                onClick={() => setIsFiltersOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select 
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned</label>
                <select 
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.assigned}
                  onChange={(e) => setFilters(prev => ({ ...prev, assigned: e.target.value }))}
                >
                  <option value="">All</option>
                  <option value="true">Assigned</option>
                  <option value="false">Unassigned</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <select 
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <DynamicButton
                variant="outline"
                text="Clear Filters"
                onClick={() => setFilters({ status: "", assigned: "", dateRange: "" })}
                className="flex-1 border-gray-300 hover:bg-gray-50"
              />
              <DynamicButton
                text="Apply Filters"
                onClick={() => setIsFiltersOpen(false)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Dialog */}
      <TicketDetails
        open={isDialogOpen}
        onClose={handleCloseDialog}
        ticketId={selectedTicketId}
      />
    </div>
  );
}

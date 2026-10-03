
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

import {
  FiUsers,
  FiUserPlus,
  FiCalendar,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiMapPin,
  FiCreditCard,
  FiActivity,
  FiPhone,
  FiMail,
  FiCheckCircle,
  FiArrowRight,
  FiBriefcase,
} from "react-icons/fi";

import { TbCurrencyRupee } from "react-icons/tb";

function Dashboard() {
  const navigate = useNavigate();

  // =====================================================
  // STATES
  // =====================================================

  const [summary, setSummary] = useState({});
  const [pipeline, setPipeline] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [bookingStatus, setBookingStatus] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [travelTypes, setTravelTypes] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // FETCH DASHBOARD DATA
  // =====================================================

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        summaryResponse,
        pipelineResponse,
        sourcesResponse,
        revenueResponse,
        bookingStatusResponse,
        paymentStatusResponse,
        destinationsResponse,
        travelTypesResponse,
        recentResponse,
      ] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/dashboard/pipeline"),
        api.get("/dashboard/lead-sources"),
        api.get("/dashboard/monthly-revenue"),
        api.get("/dashboard/booking-status"),
        api.get("/dashboard/payment-status"),
        api.get("/dashboard/destinations"),
        api.get("/dashboard/travel-types"),
        api.get("/dashboard/recent"),
      ]);

      setSummary(summaryResponse.data.summary || {});
      setPipeline(pipelineResponse.data.pipeline || []);
      setLeadSources(sourcesResponse.data.sources || []);
      setMonthlyRevenue(revenueResponse.data.monthlyRevenue || []);
      setBookingStatus(bookingStatusResponse.data.bookingStatus || []);
      setPaymentStatus(paymentStatusResponse.data.paymentStatus || []);
      setDestinations(destinationsResponse.data.destinations || []);
      setTravelTypes(travelTypesResponse.data.travelTypes || []);

      setRecentActivities(
        recentResponse.data.recentActivities || []
      );

      setUpcomingTasks(
        recentResponse.data.upcomingTasks || []
      );
    } catch (error) {
      console.error(
        "Dashboard error:",
        error.response?.data || error.message
      );

      setErrorMessage(
        error.response?.data?.message ||
          "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // =====================================================
  // HELPERS
  // =====================================================

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("en-IN");
  };

  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatRelativeTime = (date) => {
    if (!date) return "";

    const d = new Date(date);
    const now = new Date();

    const diffMs = now.getTime() - d.getTime();

    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return "Just now";

    if (mins < 60) {
      return `${mins} min ago`;
    }

    if (hours < 24) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    if (days < 7) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }

    return d.toLocaleDateString("en-IN");
  };

  const getActivityRelatedName = (activity) => {
    if (activity?.lead) {
      return `${activity.lead.firstName || ""} ${
        activity.lead.lastName || ""
      }`.trim();
    }

    if (activity?.contact) {
      return `${activity.contact.firstName || ""} ${
        activity.contact.lastName || ""
      }`.trim();
    }

    if (activity?.company) {
      return activity.company.name;
    }

    if (activity?.deal) {
      return activity.deal.title;
    }

    return "General activity";
  };

  const getTaskRelatedName = (task) => {
    if (task?.relatedLead) {
      return `${task.relatedLead.firstName || ""} ${
        task.relatedLead.lastName || ""
      }`.trim();
    }

    if (task?.relatedContact) {
      return `${task.relatedContact.firstName || ""} ${
        task.relatedContact.lastName || ""
      }`.trim();
    }

    if (task?.relatedCompany) {
      return task.relatedCompany.name;
    }

    if (task?.relatedDeal) {
      return task.relatedDeal.title;
    }

    return "General task";
  };

  // =====================================================
  // STAT CARDS
  // =====================================================

  const statCards = useMemo(() => {
    return [
      {
        label: "Total Leads",
        value: summary.totalLeads,
        icon: <FiUsers size={19} />,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
      },
      {
        label: "Enquiries",
        value: summary.totalEnquiries,
        icon: <FiUserPlus size={19} />,
        iconBg: "bg-violet-50",
        iconColor: "text-violet-600",
      },
      {
        label: "Bookings",
        value: summary.totalBookings,
        icon: <FiCalendar size={19} />,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
      },
      {
        label: "Total Revenue",
        value: formatCurrency(summary.totalRevenue),
        icon: <TbCurrencyRupee size={21} />,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
      },
      {
        label: "Customers",
        value: summary.totalCustomers,
        icon: <FiUsers size={19} />,
        iconBg: "bg-cyan-50",
        iconColor: "text-cyan-600",
      },
      {
        label: "Payment Due",
        value: formatCurrency(summary.paymentDue),
        icon: <FiCreditCard size={19} />,
        iconBg: "bg-red-50",
        iconColor: "text-red-600",
      },
      {
        label: "Upcoming Trips",
        value: summary.upcomingTrips,
        icon: <FiMapPin size={19} />,
        iconBg: "bg-indigo-50",
        iconColor: "text-indigo-600",
      },
      {
        label: "Net Profit",
        value: formatCurrency(summary.netProfit),
        icon: <FiTrendingUp size={19} />,
        iconBg: "bg-green-50",
        iconColor: "text-green-600",
      },
    ];
  }, [summary]);

  // =====================================================
  // REVENUE CHART
  // =====================================================

  const revenueChartData = useMemo(() => {
    return monthlyRevenue.map((item) => ({
      name:
        item.month ||
        item.label ||
        item._id ||
        "Month",
      revenue: Number(
        item.revenue ||
          item.totalRevenue ||
          item.amount ||
          0
      ),
    }));
  }, [monthlyRevenue]);

  // =====================================================
  // PIPELINE
  // =====================================================

  const maxPipelineValue = useMemo(() => {
    if (!pipeline.length) return 1;

    return Math.max(
      ...pipeline.map((item) =>
        Number(item.totalValue || 0)
      ),
      1
    );
  }, [pipeline]);

  // =====================================================
  // ACTIVITY ICON
  // =====================================================

  const getActivityIcon = (type) => {
    const normalizedType = String(type || "").toLowerCase();

    if (normalizedType === "call") {
      return <FiPhone size={13} />;
    }

    if (normalizedType === "email") {
      return <FiMail size={13} />;
    }

    if (normalizedType === "meeting") {
      return <FiUsers size={13} />;
    }

    if (normalizedType === "note") {
      return <FiActivity size={13} />;
    }

    return <FiCheckCircle size={13} />;
  };

  const getActivityColor = (type) => {
    const normalizedType = String(type || "").toLowerCase();

    if (normalizedType === "call") {
      return "bg-green-50 text-green-600";
    }

    if (normalizedType === "email") {
      return "bg-purple-50 text-purple-600";
    }

    if (normalizedType === "meeting") {
      return "bg-blue-50 text-blue-600";
    }

    if (normalizedType === "note") {
      return "bg-amber-50 text-amber-600";
    }

    return "bg-gray-50 text-gray-600";
  };

  // =====================================================
  // LOADING SKELETON
  // =====================================================

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        <div className="space-y-6 animate-pulse">

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-32 bg-white rounded-xl border border-gray-100"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="h-[350px] bg-white rounded-xl border border-gray-100" />
            <div className="h-[350px] bg-white rounded-xl border border-gray-100" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="h-72 bg-white rounded-xl border border-gray-100" />
            <div className="h-72 bg-white rounded-xl border border-gray-100" />
            <div className="h-72 bg-white rounded-xl border border-gray-100" />
          </div>

        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">

      {/* =====================================================
          ERROR
      ===================================================== */}

      {errorMessage && (
        <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <span>{errorMessage}</span>

          <button
            onClick={fetchDashboardData}
            className="text-xs font-semibold text-red-700 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* =====================================================
          PAGE INTRO
      ===================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Travel Dashboard
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Overview of your travel sales, bookings and finances.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          Refresh
        </button>
      </div>

      {/* =====================================================
          STAT CARDS
      ===================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg} ${card.iconColor}`}
              >
                {card.icon}
              </div>

              <FiArrowRight
                size={15}
                className="text-gray-300"
              />
            </div>

            <p className="text-xs font-medium text-gray-500 mt-4">
              {card.label}
            </p>

            <p className="text-xl font-bold text-gray-900 mt-1">
              {card.value ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* =====================================================
          REVENUE + PIPELINE
      ===================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* REVENUE */}

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">

          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-800">
                Revenue Overview
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Monthly booking revenue
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-400">
                Total Revenue
              </p>

              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(summary.totalRevenue)}
              </p>
            </div>
          </div>

          <div className="h-[260px] w-full">

            {revenueChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                No revenue data available
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={revenueChartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#2563eb"
                        stopOpacity={0.25}
                      />

                      <stop
                        offset="95%"
                        stopColor="#2563eb"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "#94a3b8",
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "#94a3b8",
                    }}
                    tickFormatter={(value) =>
                      `₹${(value / 1000).toFixed(0)}k`
                    }
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) =>
                      formatCurrency(value)
                    }
                  />

                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

          </div>
        </section>

        {/* PIPELINE */}

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">

          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-800">
                Sales Pipeline
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Current trip value by stage
              </p>
            </div>

            <button
              onClick={() => navigate("/trips")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View Trips
            </button>
          </div>

          {pipeline.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
              No pipeline data available
            </div>
          ) : (
            <div className="h-[260px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={pipeline}
                  margin={{
                    top: 10,
                    right: 5,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    dataKey="stage"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "#64748b",
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "#94a3b8",
                    }}
                    tickFormatter={(value) =>
                      `₹${(value / 1000).toFixed(0)}k`
                    }
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) =>
                      formatCurrency(value)
                    }
                  />

                  <Bar
                    dataKey="totalValue"
                    fill="#6366f1"
                    radius={[5, 5, 0, 0]}
                    barSize={34}
                  />
                </BarChart>
              </ResponsiveContainer>

            </div>
          )}

        </section>
      </div>

      {/* =====================================================
          BOOKING STATUS + PAYMENT STATUS + LEAD SOURCES
      ===================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* BOOKING STATUS */}

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">
              Booking Status
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Current booking distribution
            </p>
          </div>

          <div className="p-5 space-y-4">

            {bookingStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No booking data
              </p>
            ) : (
              bookingStatus.map((item) => (
                <div
                  key={item.status}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {item.status}
                    </span>

                    <span className="text-xs font-semibold text-gray-500">
                      {item.count || item.bookingCount || 0}
                    </span>
                  </div>

                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          Number(
                            item.count ||
                              item.bookingCount ||
                              0
                          ) * 20,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}

          </div>
        </section>

        {/* PAYMENT STATUS */}

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">
              Payment Status
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Payment collection overview
            </p>
          </div>

          <div className="p-5 space-y-4">

            {paymentStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No payment data
              </p>
            ) : (
              paymentStatus.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">

                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FiCreditCard size={15} />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {item.status}
                      </p>

                      <p className="text-[11px] text-gray-400">
                        {item.count || item.paymentCount || 0} payments
                      </p>
                    </div>

                  </div>

                  <p className="text-sm font-bold text-gray-800">
                    {formatCurrency(
                      item.amount ||
                        item.totalAmount ||
                        0
                    )}
                  </p>
                </div>
              ))
            )}

          </div>
        </section>

        {/* LEAD SOURCES */}

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">
              Lead Sources
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Where your leads are coming from
            </p>
          </div>

          <div className="p-5 space-y-4">

            {leadSources.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No lead source data
              </p>
            ) : (
              leadSources.map((item) => (
                <div
                  key={item.source}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FiUsers size={15} />
                  </div>

                  <div className="flex-1 min-w-0">

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate">
                        {item.source || "Unknown"}
                      </span>

                      <span className="text-xs font-semibold text-gray-500">
                        {item.count || item.leadCount || 0}
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            Number(
                              item.count ||
                                item.leadCount ||
                                0
                            ) * 20,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                  </div>
                </div>
              ))
            )}

          </div>
        </section>
      </div>

      {/* =====================================================
          DESTINATIONS + TRAVEL TYPES
      ===================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* DESTINATIONS */}

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

            <div>
              <h2 className="text-sm font-bold text-gray-800">
                Popular Destinations
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Booking and revenue by destination
              </p>
            </div>

            <FiMapPin
              size={17}
              className="text-gray-400"
            />

          </div>

          <div className="p-5">

            {destinations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No destination data
              </p>
            ) : (
              <div className="space-y-4">

                {destinations.slice(0, 5).map((item) => (
                  <div
                    key={item.destination}
                    className="flex items-center gap-3"
                  >

                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FiMapPin size={16} />
                    </div>

                    <div className="flex-1 min-w-0">

                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {item.destination || "Unknown"}
                      </p>

                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.bookingCount ||
                          item.count ||
                          0}{" "}
                        booking
                        {(item.bookingCount ||
                          item.count ||
                          0) !== 1
                          ? "s"
                          : ""}
                      </p>

                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">
                        {formatCurrency(
                          item.revenue ||
                            item.totalRevenue ||
                            0
                        )}
                      </p>

                      <p className="text-[10px] text-green-600 mt-0.5">
                        Profit{" "}
                        {formatCurrency(
                          item.profit || 0
                        )}
                      </p>
                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>
        </section>

        {/* TRAVEL TYPES */}

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

            <div>
              <h2 className="text-sm font-bold text-gray-800">
                Travel Types
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Revenue by travel category
              </p>
            </div>

            <FiBriefcase
              size={17}
              className="text-gray-400"
            />

          </div>

          <div className="p-5">

            {travelTypes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No travel type data
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">

                {travelTypes.slice(0, 6).map((item) => (
                  <div
                    key={item.travelType}
                    className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition"
                  >

                    <div className="flex items-center justify-between">

                      <span className="text-sm font-medium text-gray-700">
                        {item.travelType || "Other"}
                      </span>

                      <span className="text-xs font-bold text-gray-500">
                        {item.bookingCount ||
                          item.count ||
                          0}
                      </span>

                    </div>

                    <p className="text-sm font-bold text-gray-900 mt-2">
                      {formatCurrency(
                        item.revenue ||
                          item.totalRevenue ||
                          0
                      )}
                    </p>

                  </div>
                ))}

              </div>
            )}

          </div>
        </section>
      </div>

      {/* =====================================================
          UPCOMING TASKS + RECENT ACTIVITIES
      ===================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* UPCOMING TASKS */}

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

            <div>
              <h2 className="text-sm font-bold text-gray-800">
                Upcoming Tasks
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Tasks that need your attention
              </p>
            </div>

            <button
              onClick={() => navigate("/tasks")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All
            </button>

          </div>

          <div className="p-5">

            {upcomingTasks.length === 0 ? (
              <div className="py-10 text-center">

                <FiCheckCircle
                  size={30}
                  className="mx-auto text-green-400"
                />

                <p className="text-sm font-medium text-gray-600 mt-3">
                  No upcoming tasks
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  You're all caught up.
                </p>

              </div>
            ) : (
              <div className="space-y-3">

                {upcomingTasks.slice(0, 5).map((task) => {

                  const priority = String(
                    task.priority || "Medium"
                  ).toLowerCase();

                  const priorityClass =
                    priority === "high"
                      ? "bg-red-50 text-red-600"
                      : priority === "medium"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-green-50 text-green-600";

                  return (
                    <div
                      key={task._id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
                    >

                      <div className="mt-0.5">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex-1 min-w-0">

                        <p className="text-sm font-medium text-gray-800 truncate">
                          {task.title}
                        </p>

                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {getTaskRelatedName(task)}
                        </p>

                        <div className="flex items-center gap-1 mt-1">

                          <FiClock
                            size={11}
                            className="text-gray-400"
                          />

                          <p className="text-[11px] text-gray-400">
                            Due {formatDate(task.dueDate)}
                          </p>

                        </div>

                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${priorityClass}`}
                      >
                        {task.priority || "Medium"}
                      </span>

                    </div>
                  );
                })}

              </div>
            )}

          </div>
        </section>

        {/* RECENT ACTIVITIES */}

        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

            <div>
              <h2 className="text-sm font-bold text-gray-800">
                Recent Activities
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Latest CRM activity
              </p>
            </div>

            <button
              onClick={() => navigate("/activities")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All
            </button>

          </div>

          <div className="p-5">

            {recentActivities.length === 0 ? (
              <div className="py-10 text-center">

                <FiActivity
                  size={30}
                  className="mx-auto text-gray-300"
                />

                <p className="text-sm text-gray-500 mt-3">
                  No recent activities
                </p>

              </div>
            ) : (
              <div className="space-y-3">

                {recentActivities.slice(0, 5).map(
                  (activity) => (
                    <div
                      key={activity._id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
                    >

                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(
                          activity.type
                        )}`}
                      >
                        {getActivityIcon(
                          activity.type
                        )}
                      </div>

                      <div className="flex-1 min-w-0">

                        <p className="text-sm font-medium text-gray-800 truncate">
                          {activity.title}
                        </p>

                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {getActivityRelatedName(
                            activity
                          )}
                        </p>

                      </div>

                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {formatRelativeTime(
                          activity.activityDate ||
                            activity.createdAt
                        )}
                      </span>

                    </div>
                  )
                )}

              </div>
            )}

          </div>
        </section>
      </div>

    </div>
  );
}

export default Dashboard;


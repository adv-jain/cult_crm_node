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
  Cell,
} from "recharts";

import {
  FiUsers,
  FiUserPlus,
  FiCalendar,
  FiTrendingUp,
  FiClock,
  FiMapPin,
  FiCreditCard,
  FiActivity,
  FiPhone,
  FiMail,
  FiCheckCircle,
  FiArrowRight,
  FiBriefcase,
  FiChevronRight,
} from "react-icons/fi";

import { TbCurrencyRupee } from "react-icons/tb";

// =====================================================
// HELPERS
// =====================================================

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatCompactCurrency = (value) => {
  const num = Number(value || 0);

  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)}Cr`;
  }

  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)}L`;
  }

  if (num >= 1000) {
    return `₹${(num / 1000).toFixed(1)}K`;
  }

  return `₹${num}`;
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

  const diffMs =
    now.getTime() - d.getTime();

  const mins = Math.floor(
    diffMs / 60000
  );

  const hours = Math.floor(
    mins / 60
  );

  const days = Math.floor(
    hours / 24
  );

  if (mins < 1) return "Just now";

  if (mins < 60) {
    return `${mins}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

// =====================================================
// DASHBOARD
// =====================================================

function Dashboard() {
  const navigate = useNavigate();

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
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // FETCH
  // =====================================================

  const fetchDashboardData = async (
    isRefresh = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      const [
        summaryRes,
        pipelineRes,
        sourcesRes,
        revenueRes,
        bookingStatusRes,
        paymentStatusRes,
        destinationsRes,
        travelTypesRes,
        recentRes,
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

      setSummary(
        summaryRes.data.summary || {}
      );

      setPipeline(
        pipelineRes.data.pipeline || []
      );

      setLeadSources(
        sourcesRes.data.sources || []
      );

      setMonthlyRevenue(
        revenueRes.data.monthlyRevenue || []
      );

      setBookingStatus(
        bookingStatusRes.data.bookingStatus || []
      );

      setPaymentStatus(
        paymentStatusRes.data.paymentStatus || []
      );

      setDestinations(
        destinationsRes.data.destinations || []
      );

      setTravelTypes(
        travelTypesRes.data.travelTypes || []
      );

      setRecentActivities(
        recentRes.data.recentActivities || []
      );

      setUpcomingTasks(
        recentRes.data.upcomingTasks || []
      );
    } catch (error) {
      console.error(
        "Dashboard error:",
        error.response?.data ||
          error.message
      );

      setErrorMessage(
        error.response?.data?.message ||
          "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // =====================================================
  // DERIVED DATA
  // =====================================================

  const statCards = useMemo(
    () => [
      {
        label: "Total Leads",
        value: summary.totalLeads,
        icon: <FiUsers size={18} />,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        accent:
          "from-blue-500 to-blue-600",
      },

      {
        label: "Enquiries",
        value: summary.totalEnquiries,
        icon: <FiUserPlus size={18} />,
        iconBg: "bg-violet-50",
        iconColor: "text-violet-600",
        accent:
          "from-violet-500 to-violet-600",
      },

      {
        label: "Bookings",
        value: summary.totalBookings,
        icon: <FiCalendar size={18} />,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        accent:
          "from-emerald-500 to-emerald-600",
      },

      {
        label: "Total Revenue",
        value: formatCurrency(
          summary.totalRevenue
        ),
        icon: <TbCurrencyRupee size={20} />,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        accent:
          "from-amber-500 to-amber-600",
      },

      {
        label: "Customers",
        value: summary.totalCustomers,
        icon: <FiUsers size={18} />,
        iconBg: "bg-cyan-50",
        iconColor: "text-cyan-600",
        accent:
          "from-cyan-500 to-cyan-600",
      },

      {
        label: "Payment Due",
        value: formatCurrency(
          summary.paymentDue
        ),
        icon: <FiCreditCard size={18} />,
        iconBg: "bg-red-50",
        iconColor: "text-red-600",
        accent:
          "from-red-500 to-red-600",
      },

      {
        label: "Upcoming Trips",
        value: summary.upcomingTrips,
        icon: <FiMapPin size={18} />,
        iconBg: "bg-indigo-50",
        iconColor: "text-indigo-600",
        accent:
          "from-indigo-500 to-indigo-600",
      },

      {
        label: "Net Profit",
        value: formatCurrency(
          summary.netProfit
        ),
        icon: <FiTrendingUp size={18} />,
        iconBg: "bg-green-50",
        iconColor: "text-green-600",
        accent:
          "from-green-500 to-green-600",
      },
    ],
    [summary]
  );

  // =====================================================
  // REVENUE CHART DATA
  // =====================================================

  const revenueChartData = useMemo(
    () =>
      monthlyRevenue.map((item) => ({
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
      })),
    [monthlyRevenue]
  );

  // =====================================================
  // QUOTATION PIPELINE DATA
  // =====================================================

  const pipelineData = useMemo(
    () =>
      Array.isArray(pipeline)
        ? pipeline.map(
            (item, index) => ({
              stage:
                item.stage || "Unknown",

              totalValue: Number(
                item.totalValue || 0
              ),

              count: Number(
                item.count ||
                  item.quotationCount ||
                  0
              ),

              quotationCount: Number(
                item.quotationCount ||
                  item.count ||
                  0
              ),

              fill: [
                "#6366f1",
                "#8b5cf6",
                "#a855f7",
                "#d946ef",
                "#ec4899",
                "#f43f5e",
              ][index % 6],
            })
          )
        : [],
    [pipeline]
  );

  // =====================================================
  // MAX BOOKING COUNT
  // =====================================================

  const maxBookingCount = useMemo(
    () =>
      Math.max(
        ...bookingStatus.map(
          (booking) =>
            Number(
              booking.count ||
                booking.bookingCount ||
                0
            )
        ),
        1
      ),
    [bookingStatus]
  );

  // =====================================================
  // MAX LEAD SOURCE COUNT
  // =====================================================

  const maxLeadSourceCount = useMemo(
    () =>
      Math.max(
        ...leadSources.map(
          (source) =>
            Number(
              source.count ||
                source.leadCount ||
                0
            )
        ),
        1
      ),
    [leadSources]
  );

  // =====================================================
  // ACTIVITY ICON
  // =====================================================

  const getActivityIcon = (type) => {
    const t = String(
      type || ""
    ).toLowerCase();

    if (t === "call") {
      return <FiPhone size={13} />;
    }

    if (t === "email") {
      return <FiMail size={13} />;
    }

    if (t === "meeting") {
      return <FiUsers size={13} />;
    }

    if (t === "note") {
      return <FiActivity size={13} />;
    }

    return <FiCheckCircle size={13} />;
  };

  // =====================================================
  // ACTIVITY COLOR
  // =====================================================

  const getActivityColor = (type) => {
    const t = String(
      type || ""
    ).toLowerCase();

    if (t === "call") {
      return "bg-green-50 text-green-600";
    }

    if (t === "email") {
      return "bg-purple-50 text-purple-600";
    }

    if (t === "meeting") {
      return "bg-brand-blue-50 text-brand-blue";
    }

    if (t === "note") {
      return "bg-amber-50 text-amber-600";
    }

    return "bg-gray-50 text-gray-600";
  };

  // =====================================================
  // ACTIVITY RELATED NAME
  // =====================================================

  const getActivityRelatedName = (
    activity
  ) => {
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

    if (activity?.trip) {
      return (
        activity.trip.title ||
        activity.trip.tripCode ||
        "Trip"
      );
    }

    if (activity?.customer) {
      return (
        activity.customer.name ||
        "Customer"
      );
    }

    if (activity?.booking) {
      return (
        activity.booking.bookingNumber ||
        "Booking"
      );
    }

    return "General activity";
  };

  // =====================================================
  // TASK RELATED NAME
  // =====================================================

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

    if (task?.relatedTrip) {
      return (
        task.relatedTrip.title ||
        task.relatedTrip.tripCode ||
        "Trip"
      );
    }

    if (task?.relatedCustomer) {
      return (
        task.relatedCustomer.name ||
        "Customer"
      );
    }

    if (task?.relatedBooking) {
      return (
        task.relatedBooking.bookingNumber ||
        "Booking"
      );
    }

    return "General task";
  };

  // =====================================================
  // LOADING SKELETON
  // =====================================================

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="space-y-5 animate-pulse">

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <div
                key={index}
                className="h-20 bg-white rounded-xl border border-gray-100"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="h-[380px] bg-white rounded-2xl border border-gray-100" />

            <div className="h-[380px] bg-white rounded-2xl border border-gray-100" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="h-80 bg-white rounded-2xl border border-gray-100" />

            <div className="h-80 bg-white rounded-2xl border border-gray-100" />

            <div className="h-80 bg-white rounded-2xl border border-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">

      {/* =================================================
          ERROR
      ================================================= */}

      {errorMessage && (
        <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <span>{errorMessage}</span>

          <button
            onClick={() =>
              fetchDashboardData()
            }
            className="text-xs font-semibold text-red-700 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="group relative bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:shadow-gray-200/50 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
          >
            <div
              className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.accent}`}
            />

            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg} ${card.iconColor} shrink-0`}
              >
                {card.icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide truncate">
                  {card.label}
                </p>

                <p className="text-lg font-semibold text-gray-900 mt-0.5 truncate">
                  {card.value ?? 0}
                </p>
              </div>

              <FiArrowRight
                size={14}
                className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </div>
          </div>
        ))}
      </div>

      {/* =================================================
          REVENUE + QUOTATION PIPELINE
      ================================================= */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* =================================================
            REVENUE
        ================================================= */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-start justify-between mb-6">

            <div>
              <h2 className="text-base font-bold text-gray-900">
                Revenue Overview
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Monthly booking revenue trend
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Total Revenue
              </p>

              <p className="text-lg font-bold text-gray-900 mt-0.5">
                {formatCurrency(
                  summary.totalRevenue
                )}
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {revenueChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-sm text-gray-400">
                <FiTrendingUp
                  size={32}
                  className="text-gray-300 mb-2"
                />

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
                    left: -10,
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
                        stopColor="#1800AC"
                        stopOpacity={0.3}
                      />

                      <stop
                        offset="95%"
                        stopColor="#1800AC"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="4 4"
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
                    tickFormatter={
                      formatCompactCurrency
                    }
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor:
                        "#ffffff",
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "12px",
                      boxShadow:
                        "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                      padding:
                        "10px 14px",
                    }}
                    formatter={(value) => [
                      formatCurrency(value),
                      "Revenue",
                    ]}
                  />

                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1800AC"
                    strokeWidth={2.5}
                    fill="url(#revenueGradient)"
                    activeDot={{
                      r: 5,
                      fill: "#1800AC",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* =================================================
            QUOTATION PIPELINE
        ================================================= */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">

          <div className="flex items-start justify-between mb-6">

            <div>
              <h2 className="text-base font-bold text-gray-900">
                Quotation Pipeline
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Quotation value distribution by stage
              </p>
            </div>

            <button
              onClick={() =>
                navigate("/quotations")
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:text-brand-blue-dark transition"
            >
              View Quotations

              <FiChevronRight
                size={12}
              />
            </button>
          </div>

          {pipelineData.length === 0 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-sm text-gray-400">
              <FiBriefcase
                size={32}
                className="text-gray-300 mb-2"
              />

              No quotation pipeline data available
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={pipelineData}
                  margin={{
                    top: 10,
                    right: 5,
                    left: -10,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
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
                    tickFormatter={
                      formatCompactCurrency
                    }
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor:
                        "#ffffff",
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "12px",
                      boxShadow:
                        "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                      padding:
                        "10px 14px",
                    }}
                    formatter={(
                      value,
                      name,
                      props
                    ) => {
                      if (
                        name ===
                        "totalValue"
                      ) {
                        return [
                          formatCurrency(
                            value
                          ),
                          "Quotation Value",
                        ];
                      }

                      return [
                        value,
                        "Quotations",
                      ];
                    }}
                    cursor={{
                      fill:
                        "rgba(99, 102, 241, 0.05)",
                    }}
                  />

                  <Bar
                    dataKey="totalValue"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                    barSize={36}
                  >
                    {pipelineData.map(
                      (
                        entry,
                        index
                      ) => (
                        <Cell
                          key={index}
                          fill={
                            entry.fill
                          }
                        />
                      )
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* =================================================
          BOOKING / PAYMENT / LEAD SOURCES
      ================================================= */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* BOOKING STATUS */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">
              Booking Status
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Current booking distribution
            </p>
          </div>

          <div className="p-5 space-y-4">
            {bookingStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No booking data
              </p>
            ) : (
              bookingStatus.map(
                (item) => {
                  const count =
                    Number(
                      item.count ||
                        item.bookingCount ||
                        0
                    );

                  return (
                    <div
                      key={
                        item.status
                      }
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {item.status}
                        </span>

                        <span className="text-xs font-bold text-gray-900">
                          {count}
                        </span>
                      </div>

                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-blue to-brand-blue-dark rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              (count /
                                maxBookingCount) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>

        {/* PAYMENT STATUS */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">
              Payment Status
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Payment collection overview
            </p>
          </div>

          <div className="p-5 space-y-3">
            {paymentStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No payment data
              </p>
            ) : (
              paymentStatus.map(
                (item) => (
                  <div
                    key={
                      item.status
                    }
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100/70 transition"
                  >
                    <div className="flex items-center gap-3">

                      <div className="w-9 h-9 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center">
                        <FiCreditCard
                          size={15}
                        />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {item.status}
                        </p>

                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {item.count ||
                            item.paymentCount ||
                            0}{" "}
                          payments
                        </p>
                      </div>
                    </div>

                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(
                        item.amount ||
                          item.totalAmount ||
                          0
                      )}
                    </p>
                  </div>
                )
              )
            )}
          </div>
        </section>

        {/* LEAD SOURCES */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">
              Lead Sources
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Where your leads are coming from
            </p>
          </div>

          <div className="p-5 space-y-4">
            {leadSources.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No lead source data
              </p>
            ) : (
              leadSources.map(
                (item) => {
                  const count =
                    Number(
                      item.count ||
                        item.leadCount ||
                        0
                    );

                  return (
                    <div
                      key={
                        item.source
                      }
                      className="flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FiUsers
                          size={15}
                        />
                      </div>

                      <div className="flex-1 min-w-0">

                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-700 truncate">
                            {item.source ||
                              "Unknown"}
                          </span>

                          <span className="text-xs font-bold text-gray-900 ml-2">
                            {count}
                          </span>
                        </div>

                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                (count /
                                  maxLeadSourceCount) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>
      </div>

      {/* =================================================
          DESTINATIONS + TRAVEL TYPES
      ================================================= */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* DESTINATIONS */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Popular Destinations
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Booking and revenue by destination
              </p>
            </div>

            <div className="w-8 h-8 rounded-lg bg-brand-blue-50 text-brand-blue flex items-center justify-center">
              <FiMapPin
                size={15}
              />
            </div>
          </div>

          <div className="p-5">
            {destinations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No destination data
              </p>
            ) : (
              <div className="space-y-3">
                {destinations
                  .slice(0, 5)
                  .map(
                    (item) => (
                      <div
                        key={
                          item.destination
                        }
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white flex items-center justify-center shrink-0 shadow-sm">
                          <FiMapPin
                            size={16}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {item.destination ||
                              "Unknown"}
                          </p>

                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.bookingCount ||
                              item.count ||
                              0}{" "}
                            booking
                            {(item.bookingCount ||
                              item.count ||
                              0) !==
                            1
                              ? "s"
                              : ""}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900">
                            {formatCurrency(
                              item.revenue ||
                                item.totalRevenue ||
                                0
                            )}
                          </p>

                          <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                            Profit{" "}
                            {formatCurrency(
                              item.profit ||
                                0
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  )}
              </div>
            )}
          </div>
        </section>

        {/* TRAVEL TYPES */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Travel Types
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Revenue by travel category
              </p>
            </div>

            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <FiBriefcase
                size={15}
              />
            </div>
          </div>

          <div className="p-5">
            {travelTypes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No travel type data
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {travelTypes
                  .slice(0, 6)
                  .map(
                    (item) => (
                      <div
                        key={
                          item.travelType
                        }
                        className="border border-gray-100 rounded-xl p-4 hover:border-brand-blue/30 hover:bg-brand-blue-50/30 transition group"
                      >
                        <div className="flex items-center justify-between">

                          <span className="text-xs font-medium text-gray-600 group-hover:text-gray-800 transition">
                            {item.travelType ||
                              "Other"}
                          </span>

                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {item.bookingCount ||
                              item.count ||
                              0}
                          </span>
                        </div>

                        <p className="text-base font-bold text-gray-900 mt-3">
                          {formatCurrency(
                            item.revenue ||
                              item.totalRevenue ||
                              0
                          )}
                        </p>
                      </div>
                    )
                  )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* =================================================
          UPCOMING TASKS + RECENT ACTIVITIES
      ================================================= */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* UPCOMING TASKS */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Upcoming Tasks
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Tasks that need your attention
              </p>
            </div>

            <button
              onClick={() =>
                navigate("/tasks")
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:text-brand-blue-dark transition"
            >
              View All

              <FiChevronRight
                size={12}
              />
            </button>
          </div>

          <div className="p-5">
            {upcomingTasks.length === 0 ? (
              <div className="py-10 text-center">

                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                  <FiCheckCircle
                    size={26}
                    className="text-green-500"
                  />
                </div>

                <p className="text-sm font-semibold text-gray-700 mt-3">
                  No upcoming tasks
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  You're all caught up.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingTasks
                  .slice(0, 5)
                  .map(
                    (task) => {
                      const priority =
                        String(
                          task.priority ||
                            "Medium"
                        ).toLowerCase();

                      const priorityClass =
                        priority ===
                        "high"
                          ? "bg-red-50 text-red-600 border-red-100"
                          : priority ===
                            "medium"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-green-50 text-green-600 border-green-100";

                      return (
                        <div
                          key={
                            task._id
                          }
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition group"
                        >

                          <div className="mt-0.5">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30 cursor-pointer"
                            />
                          </div>

                          <div className="flex-1 min-w-0">

                            <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-brand-blue transition">
                              {
                                task.title
                              }
                            </p>

                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {getTaskRelatedName(
                                task
                              )}
                            </p>

                            <div className="flex items-center gap-1 mt-1.5">
                              <FiClock
                                size={11}
                                className="text-gray-400"
                              />

                              <p className="text-[11px] text-gray-400">
                                Due{" "}
                                {formatDate(
                                  task.dueDate
                                )}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${priorityClass}`}
                          >
                            {task.priority ||
                              "Medium"}
                          </span>
                        </div>
                      );
                    }
                  )}
              </div>
            )}
          </div>
        </section>

        {/* RECENT ACTIVITIES */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">

            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Recent Activities
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Latest CRM activity
              </p>
            </div>

            <button
              onClick={() =>
                navigate("/activities")
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:text-brand-blue-dark transition"
            >
              View All

              <FiChevronRight
                size={12}
              />
            </button>
          </div>

          <div className="p-5">
            {recentActivities.length ===
            0 ? (
              <div className="py-10 text-center">

                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto">
                  <FiActivity
                    size={26}
                    className="text-gray-300"
                  />
                </div>

                <p className="text-sm text-gray-500 mt-3">
                  No recent activities
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivities
                  .slice(0, 5)
                  .map(
                    (activity) => (
                      <div
                        key={
                          activity._id
                        }
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition"
                      >

                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(
                            activity.type
                          )}`}
                        >
                          {getActivityIcon(
                            activity.type
                          )}
                        </div>

                        <div className="flex-1 min-w-0">

                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {
                              activity.title
                            }
                          </p>

                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {getActivityRelatedName(
                              activity
                            )}
                          </p>
                        </div>

                        <span className="text-[10px] font-medium text-gray-400 flex-shrink-0 bg-gray-50 px-2 py-1 rounded-full">
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
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiAward,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiDownload,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import api from "../api";

/* =====================================================
   HELPERS
===================================================== */

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
};

const formatPercentage = (value) => {
  return `${Number(value || 0).toFixed(1)}%`;
};

const extractReport = (data) => {
  if (!data) return {};
  if (
    data.data &&
    typeof data.data === "object" &&
    !Array.isArray(data.data)
  ) {
    return data.data;
  }
  return data;
};

const getArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
};

const getNumber = (object, keys, fallback = 0) => {
  if (!object) return fallback;
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null) {
      return Number(object[key]) || 0;
    }
  }
  return fallback;
};

const getAgentName = (agent) => {
  return (
    agent.agentName ||
    agent.name ||
    agent.userName ||
    agent.fullName ||
    agent.salesOwner?.name ||
    agent.salesOwner?.fullName ||
    agent.user?.name ||
    agent.user?.fullName ||
    agent.email ||
    "Unknown Agent"
  );
};

/* =====================================================
   AGENT PERFORMANCE REPORT
===================================================== */

function AgentPerformanceReport() {
  const [report, setReport] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* ===================================================
     FETCH
  =================================================== */

  const fetchReport = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await api.get("/reports/agent-performance", {
          params,
        });
        setReport(response.data);
      } catch (err) {
        console.error("Agent performance report error:", err);
        setError(
          err?.response?.data?.message ||
            "Unable to load agent performance report."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [startDate, endDate]
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /* ===================================================
     NORMALIZE
  =================================================== */

  const reportData = useMemo(() => extractReport(report), [report]);

  const agents = useMemo(() => {
    const data = getArray(
      reportData.agents,
      reportData.agentPerformance,
      reportData.performance,
      reportData.rows,
      reportData.results,
      reportData.details
    );

    return data.map((agent) => {
      const revenue = getNumber(agent, [
        "bookingRevenue",
        "revenue",
        "totalRevenue",
        "salesRevenue",
      ]);

      const cost = getNumber(agent, [
        "bookingCost",
        "cost",
        "totalCost",
      ]);

      const grossProfit = getNumber(
        agent,
        ["grossProfit", "profit", "profitAmount"],
        revenue - cost
      );

      const bookings = getNumber(agent, [
        "bookings",
        "bookingCount",
        "totalBookings",
        "count",
      ]);

      const customers = getNumber(agent, [
        "customers",
        "customerCount",
        "totalCustomers",
      ]);

      const enquiries = getNumber(agent, [
        "enquiries",
        "enquiryCount",
        "totalEnquiries",
      ]);

      const quotations = getNumber(agent, [
        "quotations",
        "quotationCount",
        "totalQuotations",
      ]);

      const conversionRate = getNumber(
        agent,
        ["conversionRate", "conversion"],
        enquiries > 0 ? (bookings / enquiries) * 100 : 0
      );

      const averageBookingValue = bookings > 0 ? revenue / bookings : 0;
      const profitMargin =
        revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      return {
        ...agent,
        name: getAgentName(agent),
        revenue,
        cost,
        grossProfit,
        bookings,
        customers,
        enquiries,
        quotations,
        conversionRate,
        averageBookingValue,
        profitMargin,
      };
    });
  }, [reportData]);

  const rankedAgents = useMemo(() => {
    return [...agents]
      .sort((a, b) => b.revenue - a.revenue)
      .map((agent, index) => ({ ...agent, rank: index + 1 }));
  }, [agents]);

  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rankedAgents;
    return rankedAgents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        String(agent.email || "").toLowerCase().includes(query)
    );
  }, [rankedAgents, search]);

  /* ===================================================
     SUMMARY
  =================================================== */

  const summary = useMemo(() => {
    const source = reportData.summary || {};

    const totalRevenue = getNumber(
      source,
      ["bookingRevenue", "revenue", "totalRevenue"],
      rankedAgents.reduce((sum, agent) => sum + agent.revenue, 0)
    );

    const totalCost = getNumber(
      source,
      ["bookingCost", "cost", "totalCost"],
      rankedAgents.reduce((sum, agent) => sum + agent.cost, 0)
    );

    const totalProfit = getNumber(
      source,
      ["grossProfit", "profit", "totalProfit"],
      rankedAgents.reduce((sum, agent) => sum + agent.grossProfit, 0)
    );

    const totalBookings = getNumber(
      source,
      ["bookings", "bookingCount", "totalBookings"],
      rankedAgents.reduce((sum, agent) => sum + agent.bookings, 0)
    );

    const totalCustomers = getNumber(
      source,
      ["customers", "customerCount", "totalCustomers"],
      rankedAgents.reduce((sum, agent) => sum + agent.customers, 0)
    );

    const averageBookingValue =
      totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalBookings,
      totalCustomers,
      averageBookingValue,
      profitMargin,
    };
  }, [reportData, rankedAgents]);

  const topAgent = rankedAgents[0] || null;

  const maxRevenue = useMemo(() => {
    if (!rankedAgents.length) return 0;
    return Math.max(...rankedAgents.map((agent) => agent.revenue));
  }, [rankedAgents]);

  /* ===================================================
     EXPORT CSV
  =================================================== */

  const exportCSV = () => {
    if (!filteredAgents.length) return;

    const headers = [
      "Rank",
      "Agent",
      "Bookings",
      "Customers",
      "Enquiries",
      "Quotations",
      "Revenue",
      "Cost",
      "Gross Profit",
      "Profit Margin %",
      "Conversion Rate %",
      "Average Booking Value",
    ];

    const rows = filteredAgents.map((agent) => [
      agent.rank,
      agent.name,
      agent.bookings,
      agent.customers,
      agent.enquiries,
      agent.quotations,
      agent.revenue,
      agent.cost,
      agent.grossProfit,
      agent.profitMargin.toFixed(2),
      agent.conversionRate.toFixed(2),
      agent.averageBookingValue,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "agent-performance-report.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto flex-wrap">
          <div className="flex items-center gap-2 h-9 rounded-lg border border-gray-200 bg-white px-3">
            <FiCalendar className="text-gray-400 flex-shrink-0" size={14} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm text-gray-700 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 h-9 rounded-lg border border-gray-200 bg-white px-3">
            <FiCalendar className="text-gray-400 flex-shrink-0" size={14} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm text-gray-700 outline-none"
            />
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              Clear
            </button>
          )}

          <div className="relative w-full sm:w-56">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={15}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agent..."
              className="w-full pl-9 pr-8 h-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchReport(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
          >
            <FiRefreshCw
              size={14}
              className={refreshing ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          disabled={!filteredAgents.length}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiDownload size={15} />
          Export CSV
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
          <FiAlertCircle className="flex-shrink-0 mt-0.5" size={18} />
          <p className="flex-1">{error}</p>
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-gray-200 bg-white"
            />
          ))}
        </div>
      ) : (
        <>
          {/* SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <SummaryCard
              title="Total Agents"
              value={formatNumber(rankedAgents.length)}
              subtitle="Sales owners with data"
              icon={<FiUsers size={16} />}
              iconClass="bg-blue-50 text-blue-600"
              valueClass="text-blue-700"
            />
            <SummaryCard
              title="Total Revenue"
              value={formatCurrency(summary.totalRevenue)}
              subtitle={`${formatNumber(summary.totalBookings)} bookings`}
              icon={<FiDollarSign size={16} />}
              iconClass="bg-emerald-50 text-emerald-600"
              valueClass="text-emerald-700"
            />
            <SummaryCard
              title="Total Profit"
              value={formatCurrency(summary.totalProfit)}
              subtitle={`${formatPercentage(summary.profitMargin)} margin`}
              icon={<FiTrendingUp size={16} />}
              iconClass="bg-purple-50 text-purple-600"
              valueClass="text-purple-700"
            />
            <SummaryCard
              title="Avg. Booking"
              value={formatCurrency(summary.averageBookingValue)}
              subtitle="Revenue per booking"
              icon={<FiBarChart2 size={16} />}
              iconClass="bg-amber-50 text-amber-600"
              valueClass="text-amber-700"
            />
          </div>

          {/* TOP PERFORMER */}
          {topAgent && (
            <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <FiAward size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                      Top Performing Agent
                    </p>
                    <h2 className="mt-0.5 text-lg font-bold text-gray-900">
                      {topAgent.name}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Rank #1 by booking revenue
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <MiniStat label="Revenue" value={formatCurrency(topAgent.revenue)} />
                  <MiniStat label="Bookings" value={formatNumber(topAgent.bookings)} />
                  <MiniStat
                    label="Profit"
                    value={formatCurrency(topAgent.grossProfit)}
                    valueClass="text-emerald-600"
                  />
                  <MiniStat
                    label="Margin"
                    value={formatPercentage(topAgent.profitMargin)}
                    valueClass="text-purple-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* AGENT TABLE */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Agent Performance
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Ranked by booking revenue
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-700">
                  {formatNumber(filteredAgents.length)}
                </span>{" "}
                agents
              </p>
            </div>

            {filteredAgents.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1250px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/60">
                      {[
                        "Rank",
                        "Agent",
                        "Bookings",
                        "Customers",
                        "Revenue",
                        "Cost",
                        "Gross Profit",
                        "Margin",
                        "Conversion",
                        "Avg. Booking",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className={`px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${
                            i <= 1 ? "text-left" : "text-right"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredAgents.map((agent) => (
                      <tr
                        key={agent._id || agent.id || agent.name}
                        className="hover:bg-brand-blue-50/40 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <RankBadge rank={agent.rank} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold shrink-0">
                              {agent.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate max-w-[160px]">
                                {agent.name}
                              </p>
                              {agent.email && (
                                <p className="text-xs text-gray-500 truncate max-w-[160px]">
                                  {agent.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-gray-800">
                          {formatNumber(agent.bookings)}
                        </td>

                        <td className="px-5 py-4 text-right text-gray-600">
                          {formatNumber(agent.customers)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <p className="font-semibold text-gray-800 whitespace-nowrap">
                            {formatCurrency(agent.revenue)}
                          </p>
                          <div className="mt-1.5 h-1 w-20 ml-auto overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{
                                width: `${
                                  maxRevenue > 0
                                    ? Math.min(
                                        (agent.revenue / maxRevenue) * 100,
                                        100
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right text-gray-600 whitespace-nowrap">
                          {formatCurrency(agent.cost)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span
                            className={`font-semibold whitespace-nowrap ${
                              agent.grossProfit >= 0
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(agent.grossProfit)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                              agent.profitMargin >= 30
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : agent.profitMargin >= 15
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-red-200 bg-red-50 text-red-700"
                            }`}
                          >
                            {formatPercentage(agent.profitMargin)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-purple-600 whitespace-nowrap">
                          {formatPercentage(agent.conversionRate)}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-gray-800 whitespace-nowrap">
                          {formatCurrency(agent.averageBookingValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DISTRIBUTION + INSIGHTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Revenue Distribution */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-gray-800">
                  Revenue Distribution
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Revenue contribution by agent
                </p>
              </div>

              {rankedAgents.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-3">
                  {rankedAgents.slice(0, 8).map((agent) => {
                    const percentage =
                      summary.totalRevenue > 0
                        ? (agent.revenue / summary.totalRevenue) * 100
                        : 0;

                    return (
                      <div key={agent._id || agent.id || agent.name}>
                        <div className="mb-1 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[11px] font-bold text-gray-400 flex-shrink-0">
                              #{agent.rank}
                            </span>
                            <span className="text-xs font-medium text-gray-700 truncate">
                              {agent.name}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                            {formatCurrency(agent.revenue)}
                          </span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.min(percentage, 100)}%`,
                            }}
                          />
                        </div>

                        <p className="mt-0.5 text-right text-[10px] text-gray-400">
                          {percentage.toFixed(1)}% of total revenue
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Insights */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-gray-800">
                  Performance Insights
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Key observations from the current report
                </p>
              </div>

              <div className="space-y-2.5">
                <InsightCard
                  icon={<FiAward size={16} />}
                  title="Top Revenue Agent"
                  description={
                    topAgent
                      ? `${topAgent.name} generated ${formatCurrency(
                          topAgent.revenue
                        )} in booking revenue.`
                      : "No agent data available."
                  }
                  colorClass="bg-emerald-50 border-emerald-100 text-emerald-700"
                  iconClass="bg-white text-emerald-600"
                  titleClass="text-emerald-900"
                />
                <InsightCard
                  icon={<FiCheckCircle size={16} />}
                  title="Total Bookings"
                  description={
                    <>
                      The sales team generated{" "}
                      <strong>{formatNumber(summary.totalBookings)}</strong>{" "}
                      bookings in the selected period.
                    </>
                  }
                  colorClass="bg-blue-50 border-blue-100 text-blue-700"
                  iconClass="bg-white text-blue-600"
                  titleClass="text-blue-900"
                />
                <InsightCard
                  icon={<FiTrendingUp size={16} />}
                  title="Overall Profit Margin"
                  description={
                    <>
                      The current agent portfolio generated a{" "}
                      <strong>{formatPercentage(summary.profitMargin)}</strong>{" "}
                      gross profit margin.
                    </>
                  }
                  colorClass="bg-purple-50 border-purple-100 text-purple-700"
                  iconClass="bg-white text-purple-600"
                  titleClass="text-purple-900"
                />
                <InsightCard
                  icon={<FiDollarSign size={16} />}
                  title="Average Booking Value"
                  description={
                    <>
                      Average revenue per booking is{" "}
                      <strong>
                        {formatCurrency(summary.averageBookingValue)}
                      </strong>
                      .
                    </>
                  }
                  colorClass="bg-amber-50 border-amber-100 text-amber-700"
                  iconClass="bg-white text-amber-600"
                  titleClass="text-amber-900"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* =====================================================
   SUB-COMPONENTS
===================================================== */

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
  valueClass = "text-gray-900",
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className={`mt-1.5 text-lg font-bold truncate ${valueClass}`}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-[11px] text-gray-400">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, valueClass = "text-gray-900" }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-bold whitespace-nowrap ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <FiAward size={15} />
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700">
        <span className="text-xs font-bold">2</span>
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700">
        <span className="text-xs font-bold">3</span>
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
      <span className="text-xs font-semibold">{rank}</span>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  description,
  colorClass,
  iconClass,
  titleClass,
}) {
  return (
    <div className={`rounded-lg border p-3 ${colorClass}`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${titleClass}`}>{title}</p>
          <p className="mt-0.5 text-[11px] leading-4">{description}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
        <FiUsers size={20} />
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-700">
        No agent performance data
      </p>
      <p className="mt-0.5 text-xs text-gray-500">
        Try changing the selected date range.
      </p>
    </div>
  );
}

export default AgentPerformanceReport;
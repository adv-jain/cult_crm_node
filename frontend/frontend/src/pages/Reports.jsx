import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../api";

import {
  FiActivity,
  FiArrowDown,
  FiArrowUp,
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiChevronRight,
  FiDollarSign,
  FiFileText,
  FiRefreshCcw,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";

/* =========================================================
   CONSTANTS
========================================================= */

const REPORT_LINKS = [
  {
    title: "Sales Report",
    description: "Leads, enquiries, quotations and sales conversion",
    path: "/reports/sales",
    icon: FiTrendingUp,
  },
  {
    title: "Booking Report",
    description: "Booking volume, status, destinations and travel types",
    path: "/reports/bookings",
    icon: FiBriefcase,
  },
  {
    title: "Revenue Report",
    description: "Revenue collection and payment performance",
    path: "/reports/revenue",
    icon: FiDollarSign,
  },
  {
    title: "Expense Report",
    description: "Operational and business expenses",
    path: "/reports/expenses",
    icon: FiArrowDown,
  },
  {
    title: "Refund Report",
    description: "Refund requests and completed refunds",
    path: "/reports/refunds",
    icon: FiRefreshCcw,
  },
  {
    title: "Commission Report",
    description: "Sales commission and payout performance",
    path: "/reports/commissions",
    icon: FiUsers,
  },
  {
    title: "Profit & Loss",
    description: "Revenue, cost, expenses and net profitability",
    path: "/reports/profit-loss",
    icon: FiBarChart2,
  },
  {
    title: "Agent Performance",
    description: "Salesperson revenue, bookings and profit",
    path: "/reports/agent-performance",
    icon: FiActivity,
  },
  {
    title: "Destination Report",
    description: "Destination-wise booking and profitability",
    path: "/reports/destinations",
    icon: FiCalendar,
  },
];

/* =========================================================
   HELPERS
========================================================= */

const formatCurrency = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN").format(Number(value || 0));

const formatPercentage = (value) => `${Number(value || 0).toFixed(1)}%`;

const getCurrentMonthStart = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .split("T")[0];
};

const getToday = () => new Date().toISOString().split("T")[0];

/* =========================================================
   MAIN COMPONENT
========================================================= */

const Reports = () => {
  const [report, setReport] = useState(null);
  const [startDate, setStartDate] = useState(getCurrentMonthStart());
  const [endDate, setEndDate] = useState(getToday());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/reports/overview", {
        params: { startDate, endDate },
      });
      setReport(response.data);
    } catch (err) {
      console.error("Reports overview error:", err);
      setError(err.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const summary = report?.summary || {};

  const profitMargin = useMemo(() => {
    if (!summary.bookingRevenue) return 0;
    return (
      (Number(summary.netProfit || 0) / Number(summary.bookingRevenue)) * 100
    );
  }, [summary.bookingRevenue, summary.netProfit]);

  const statCards = [
    { title: "Leads", value: formatNumber(summary.leads), icon: <FiUsers size={16} />, iconClass: "bg-blue-50 text-blue-600" },
    { title: "Enquiries", value: formatNumber(summary.enquiries), icon: <FiFileText size={16} />, iconClass: "bg-indigo-50 text-indigo-600" },
    { title: "Quotations", value: formatNumber(summary.quotations), icon: <FiFileText size={16} />, iconClass: "bg-purple-50 text-purple-600" },
    { title: "Bookings", value: formatNumber(summary.bookings), icon: <FiBriefcase size={16} />, iconClass: "bg-emerald-50 text-emerald-600" },
  ];

  /* =========================================================
     LOADING SKELETON
  ========================================================= */
  if (loading && !report) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-gray-200 bg-white"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-white" />
          <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      </div>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* LEFT: DATE FILTER + REFRESH */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
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

          <button
            type="button"
            onClick={fetchReport}
            className="inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            <FiRefreshCcw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* RIGHT: HEADING (compact, matches app topbar pattern) */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <FiBarChart2 size={14} />
          <span>
            Report Period: <strong className="text-gray-700">{startDate} → {endDate}</strong>
          </span>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
          <span className="flex-1">{error}</span>
          <button
            onClick={fetchReport}
            className="text-red-600 hover:text-red-800 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <SummaryCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconClass={card.iconClass}
          />
        ))}
      </div>

      {/* FINANCIAL KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          title="Booking Revenue"
          value={formatCurrency(summary.bookingRevenue)}
          subtitle="Total booking value"
          icon={<FiTrendingUp size={16} />}
          iconClass="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          title="Collected Revenue"
          value={formatCurrency(summary.collectedRevenue)}
          subtitle="Completed payments"
          icon={<FiArrowUp size={16} />}
          iconClass="bg-emerald-50 text-emerald-600"
          valueClass="text-emerald-700"
        />
        <SummaryCard
          title="Gross Profit"
          value={formatCurrency(summary.grossProfit)}
          subtitle="Revenue − booking cost"
          icon={<FiDollarSign size={16} />}
          iconClass="bg-gray-100 text-gray-700"
        />
        <SummaryCard
          title="Net Profit"
          value={formatCurrency(summary.netProfit)}
          subtitle={`${formatPercentage(profitMargin)} margin`}
          icon={<FiActivity size={16} />}
          iconClass={
            Number(summary.netProfit || 0) >= 0
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }
          valueClass={
            Number(summary.netProfit || 0) >= 0
              ? "text-emerald-700"
              : "text-red-700"
          }
        />
      </div>

      {/* FINANCIAL OVERVIEW + FUNNEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Financial Overview */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800">
                Financial Overview
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Current period financial summary
              </p>
            </div>
            <FiDollarSign className="text-gray-400" size={18} />
          </div>

          <div className="space-y-2.5">
            <FinancialRow label="Booking Revenue" value={summary.bookingRevenue} />
            <FinancialRow label="Booking Cost" value={summary.bookingCost} negative />
            <FinancialRow label="Gross Profit" value={summary.grossProfit} highlight />
            <FinancialRow label="Completed Refunds" value={summary.refunds} negative />
            <FinancialRow label="Paid Expenses" value={summary.expenses} negative />
            <FinancialRow label="Paid Commissions" value={summary.commissions} negative />

            <div className="border-t border-gray-200 pt-3">
              <FinancialRow label="Net Profit" value={summary.netProfit} highlight large />
            </div>
          </div>
        </section>

        {/* Sales Funnel */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Sales Funnel</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Lead to booking conversion
              </p>
            </div>
            <FiTrendingUp className="text-gray-400" size={18} />
          </div>

          <div className="space-y-4">
            <FunnelRow label="Leads" value={summary.leads} percentage={100} />
            <FunnelRow
              label="Enquiries"
              value={summary.enquiries}
              percentage={summary.leads ? (summary.enquiries / summary.leads) * 100 : 0}
            />
            <FunnelRow
              label="Quotations"
              value={summary.quotations}
              percentage={summary.leads ? (summary.quotations / summary.leads) * 100 : 0}
            />
            <FunnelRow
              label="Bookings"
              value={summary.bookings}
              percentage={summary.leads ? (summary.bookings / summary.leads) * 100 : 0}
            />

            <div className="mt-4 rounded-lg bg-gray-50 p-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Overall Conversion</span>
              <span className="text-base font-bold text-gray-900">
                {formatPercentage(summary.conversionRate)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* SECONDARY FINANCIAL CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <SummaryCard
          title="Refunds"
          value={formatCurrency(summary.refunds)}
          subtitle="Completed refunds"
          icon={<FiRefreshCcw size={16} />}
          iconClass="bg-red-50 text-red-600"
          valueClass="text-red-700"
        />
        <SummaryCard
          title="Expenses"
          value={formatCurrency(summary.expenses)}
          subtitle="Paid business expenses"
          icon={<FiArrowDown size={16} />}
          iconClass="bg-amber-50 text-amber-600"
          valueClass="text-amber-700"
        />
        <SummaryCard
          title="Commissions"
          value={formatCurrency(summary.commissions)}
          subtitle="Paid sales commissions"
          icon={<FiUsers size={16} />}
          iconClass="bg-purple-50 text-purple-600"
          valueClass="text-purple-700"
        />
      </div>

      {/* REPORT DIRECTORY */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Detailed Reports</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Explore detailed reports across sales, operations and finance
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {REPORT_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-blue/30 hover:bg-brand-blue-50/40"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue-50 text-brand-blue transition group-hover:bg-brand-blue group-hover:text-white">
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-800 truncate">
                        {item.title}
                      </h3>
                      <FiChevronRight
                        size={15}
                        className="shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-brand-blue"
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-700">Report Period</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {startDate} → {endDate}
          </p>
        </div>
        <p className="text-xs text-gray-400">
          Data is generated from current CRM transactions.
        </p>
      </div>
    </div>
  );
};

/* =========================================================
   SUB-COMPONENTS
========================================================= */

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

function FinancialRow({ label, value, negative = false, highlight = false, large = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={`${large ? "text-sm font-semibold" : "text-xs"} ${
          highlight ? "text-gray-900" : "text-gray-500"
        }`}
      >
        {label}
      </span>
      <span
        className={`${large ? "text-base font-bold" : "text-sm font-semibold"} ${
          negative
            ? "text-red-600"
            : highlight
            ? "text-gray-900"
            : "text-gray-700"
        }`}
      >
        {negative ? "- " : ""}
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function FunnelRow({ label, value, percentage }) {
  const width = Math.min(Math.max(Number(percentage || 0), 0), 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span className="text-xs font-semibold text-gray-900">
          {formatNumber(value)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-brand-blue transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default Reports;
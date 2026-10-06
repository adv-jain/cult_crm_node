import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiDownload,
  FiRefreshCw,
  FiTrendingDown,
  FiTrendingUp,
} from "react-icons/fi";

import api from "../api";

/* =========================================================
   HELPERS
========================================================= */

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

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
};

const getNumber = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !Number.isNaN(Number(value))
    ) {
      return Number(value);
    }
  }
  return 0;
};

const getMonthLabel = (item) => {
  if (item?.label) return item.label;
  if (item?.monthName) return item.monthName;
  if (item?.month && item?.year) {
    return new Date(
      Number(item.year),
      Number(item.month) - 1,
      1
    ).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  }
  return "-";
};

const escapeCSV = (value) => {
  const stringValue = String(value ?? "");
  return `"${stringValue
    .replace(/"/g, '""')
    .replace(/\r?\n|\r/g, " ")}"`;
};

const formatCompactCurrency = (value) => {
  const number = Number(value || 0);
  const abs = Math.abs(number);

  if (abs >= 10000000) return `₹${(number / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `₹${(number / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(number / 1000).toFixed(0)}K`;
  return `₹${Math.round(number)}`;
};

/* =========================================================
   NORMALIZE API RESPONSE
========================================================= */

const normalizeReport = (response) => {
  const root = response?.data || response || {};
  const source = root?.data || root;

  const report = source?.report || source?.summary || source || {};

  const monthlyTrend = getArray(
    source?.monthlyTrend,
    source?.profitTrend,
    source?.trend,
    source?.monthlyProfit,
    source?.profitTrendData,
    report?.monthlyTrend,
    report?.profitTrend,
    report?.trend
  );

  return { ...report, monthlyTrend };
};

/* =========================================================
   SUMMARY CARD
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className={`mt-1.5 text-xl font-bold truncate ${valueClass}`}>
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

/* =========================================================
   DEDUCTION CARD
========================================================= */

function DeductionCard({
  title,
  subtitle,
  value,
  icon,
  iconClass,
  valueClass,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <p className={`mt-5 text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">
        Included in net profit calculation
      </p>
    </div>
  );
}

/* =========================================================
   MODERN PROFIT TREND CHART
========================================================= */

function ProfitTrendChart({ data }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      label: getMonthLabel(item),
      revenue: getNumber(item.revenue, item.bookingRevenue),
      bookingCost: getNumber(item.bookingCost, item.cost, item.totalCost),
      grossProfit: getNumber(item.grossProfit, item.gross),
      refunds: getNumber(item.refunds, item.refund, item.totalRefunds),
      expenses: getNumber(
        item.expenses,
        item.recordedExpenses,
        item.totalExpenses
      ),
      commissions: getNumber(
        item.commissions,
        item.commission,
        item.totalCommissions
      ),
      netProfit: getNumber(item.netProfit, item.profit, item.net),
    }));
  }, [data]);

  if (!chartData.length) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <FiBarChart2 size={24} />
        </div>
        <h3 className="mt-4 text-sm font-bold text-gray-800">
          No profit trend available
        </h3>
        <p className="mt-1 max-w-md text-xs text-gray-500">
          The backend did not return monthly trend data for this period.
        </p>
      </div>
    );
  }

  const width = 1000;
  const height = 340;
  const paddingLeft = 70;
  const paddingRight = 24;
  const paddingTop = 24;
  const paddingBottom = 48;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const allValues = chartData.flatMap((item) => [
    item.revenue,
    item.bookingCost,
    item.grossProfit,
    item.netProfit,
  ]);

  const rawMax = Math.max(...allValues, 1);
  const rawMin = Math.min(0, ...allValues);

  const niceMax = Math.ceil(rawMax / 10000) * 10000 || 10000;
  const niceMin = rawMin < 0 ? Math.floor(rawMin / 10000) * 10000 : 0;
  const range = niceMax - niceMin || 1;

  const getX = (index) => {
    if (chartData.length === 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (chartData.length - 1)) * chartWidth;
  };

  const getY = (value) => {
    return paddingTop + chartHeight - ((value - niceMin) / range) * chartHeight;
  };

  const buildPath = (key) => {
    return chartData
      .map((item, index) => {
        const x = getX(index);
        const y = getY(item[key]);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const buildAreaPath = (key) => {
    const top = chartData
      .map((item, index) => {
        const x = getX(index);
        const y = getY(item[key]);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    const baseline = getY(niceMin);
    const lastX = getX(chartData.length - 1);
    const firstX = getX(0);

    return `${top} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
  };

  const ySteps = 4;
  const gridLines = Array.from({ length: ySteps + 1 }, (_, index) => {
    const value = niceMin + (range / ySteps) * index;
    return { value, y: getY(value) };
  });

  const lines = [
    { key: "revenue", color: "#3b82f6", name: "Revenue" },
    { key: "bookingCost", color: "#f97316", name: "Booking Cost" },
    { key: "grossProfit", color: "#10b981", name: "Gross Profit" },
    { key: "netProfit", color: "#8b5cf6", name: "Net Profit" },
  ];

  return (
    <div className="w-full">
      {/* LEGEND */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        {lines.map((line) => (
          <div key={line.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: line.color }}
            />
            <span className="text-[11px] font-medium text-gray-600">
              {line.name}
            </span>
          </div>
        ))}
      </div>

      {/* CHART */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[720px]"
          preserveAspectRatio="none"
        >
          {/* GRADIENTS */}
          <defs>
            <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="netArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* GRID */}
          {gridLines.map((line, index) => (
            <g key={index}>
              <line
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={line.y}
                y2={line.y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 10}
                y={line.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9ca3af"
              >
                {formatCompactCurrency(line.value)}
              </text>
            </g>
          ))}

          {/* X AXIS */}
          <line
            x1={paddingLeft}
            x2={width - paddingRight}
            y1={getY(niceMin)}
            y2={getY(niceMin)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          {/* AREA FILLS */}
          <path d={buildAreaPath("revenue")} fill="url(#revenueArea)" />
          <path d={buildAreaPath("netProfit")} fill="url(#netArea)" />

          {/* LINES */}
          {lines.map((line) => (
            <path
              key={line.key}
              d={buildPath(line.key)}
              fill="none"
              stroke={line.color}
              strokeWidth={line.key === "revenue" || line.key === "netProfit" ? 2.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* POINTS + X LABELS + HOVER */}
          {chartData.map((item, index) => {
            const x = getX(index);
            const hoverWidth = chartWidth / Math.max(chartData.length - 1, 1);

            return (
              <g key={index}>
                {lines.map((line) => (
                  <circle
                    key={line.key}
                    cx={x}
                    cy={getY(item[line.key])}
                    r={activeIndex === index ? 5 : 3}
                    fill="white"
                    stroke={line.color}
                    strokeWidth="2"
                    style={{ transition: "r 120ms ease" }}
                  />
                ))}

                {/* HOVER ZONE */}
                <rect
                  x={x - hoverWidth / 2}
                  y={paddingTop}
                  width={hoverWidth}
                  height={chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                />

                {/* X LABEL */}
                <text
                  x={x}
                  y={paddingTop + chartHeight + 22}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {item.label}
                </text>
              </g>
            );
          })}

          {/* ACTIVE VERTICAL LINE */}
          {activeIndex !== null && (
            <line
              x1={getX(activeIndex)}
              x2={getX(activeIndex)}
              y1={paddingTop}
              y2={paddingTop + chartHeight}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* TOOLTIP */}
          {activeIndex !== null && chartData[activeIndex] && (
            <g
              transform={`translate(${Math.min(
                Math.max(getX(activeIndex) - 90, 10),
                width - 200
              )}, 12)`}
            >
              <rect
                width="185"
                height="152"
                rx="10"
                fill="white"
                stroke="#e5e7eb"
                filter="drop-shadow(0 4px 8px rgba(0,0,0,0.06))"
              />

              <text x="14" y="22" fontSize="11" fontWeight="700" fill="#111827">
                {chartData[activeIndex].label}
              </text>

              {lines.map((line, i) => (
                <g key={line.key} transform={`translate(14, ${42 + i * 22})`}>
                  <circle cx="4" cy="-3" r="3.5" fill={line.color} />
                  <text x="14" y="0" fontSize="10" fill="#6b7280">
                    {line.name}
                  </text>
                  <text
                    x="157"
                    y="0"
                    fontSize="10"
                    fontWeight="700"
                    fill="#111827"
                    textAnchor="end"
                  >
                    {formatCurrency(chartData[activeIndex][line.key])}
                  </text>
                </g>
              ))}

              <g transform="translate(14, 136)">
                <text x="0" y="0" fontSize="10" fill="#6b7280">
                  Net Margin
                </text>
                <text
                  x="157"
                  y="0"
                  fontSize="10"
                  fontWeight="700"
                  fill="#8b5cf6"
                  textAnchor="end"
                >
                  {chartData[activeIndex].revenue > 0
                    ? `${(
                        (chartData[activeIndex].netProfit /
                          chartData[activeIndex].revenue) *
                        100
                      ).toFixed(1)}%`
                    : "0%"}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

/* =========================================================
   ACCOUNTING ITEM
========================================================= */

function AccountingItem({ label, value, valueClass = "text-gray-800", bgClass = "bg-gray-50" }) {
  return (
    <div className={`rounded-lg p-4 ${bgClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className={`mt-1.5 text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function ProfitLossReport() {
  const [report, setReport] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     FETCH
  ======================================================= */

  const fetchReport = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const params = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await api.get("/reports/profit-loss", { params });
        setReport(response.data);
      } catch (err) {
        console.error("Profit loss report error:", err);
        setError(
          err?.response?.data?.message || "Unable to load profit and loss report."
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

  /* =======================================================
     NORMALIZE
  ======================================================= */

  const reportData = useMemo(() => normalizeReport(report), [report]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    const revenue = getNumber(
      reportData.revenue,
      reportData.bookingRevenue,
      reportData.totalRevenue
    );

    const bookingCost = getNumber(
      reportData.bookingCost,
      reportData.totalCost,
      reportData.cost
    );

    const grossProfit = getNumber(
      reportData.grossProfit,
      reportData.gross,
      revenue - bookingCost
    );

    const refunds = getNumber(
      reportData.refunds,
      reportData.totalRefunds,
      reportData.refundAmount
    );

    const expenses = getNumber(
      reportData.expenses,
      reportData.recordedExpenses,
      reportData.totalExpenses
    );

    const commissions = getNumber(
      reportData.commissions,
      reportData.totalCommissions,
      reportData.commissionAmount
    );

    const netProfit = getNumber(
      reportData.netProfit,
      reportData.net,
      reportData.profit,
      grossProfit - refunds - expenses - commissions
    );

    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const bookings = getNumber(reportData.bookings, reportData.totalBookings);

    return {
      revenue,
      bookingCost,
      grossProfit,
      refunds,
      expenses,
      commissions,
      netProfit,
      netMargin,
      bookings,
    };
  }, [reportData]);

  const profitTrend = useMemo(() => {
    return getArray(
      reportData.monthlyTrend,
      reportData.profitTrend,
      reportData.trend
    );
  }, [reportData]);

  const trendSummary = useMemo(() => {
    if (!profitTrend.length) {
      return { bestMonth: null, lowestMonth: null, averageProfit: 0 };
    }

    const normalized = profitTrend.map((item) => ({
      label: getMonthLabel(item),
      netProfit: getNumber(item.netProfit, item.profit, item.net),
    }));

    const bestMonth = [...normalized].sort(
      (a, b) => b.netProfit - a.netProfit
    )[0];

    const lowestMonth = [...normalized].sort(
      (a, b) => a.netProfit - b.netProfit
    )[0];

    const averageProfit =
      normalized.reduce((sum, item) => sum + item.netProfit, 0) /
      normalized.length;

    return { bestMonth, lowestMonth, averageProfit };
  }, [profitTrend]);

  /* =======================================================
     EXPORT CSV
  ======================================================= */

  const exportCSV = () => {
    if (!profitTrend.length) return;

    const headers = [
      "Month",
      "Revenue",
      "Booking Cost",
      "Gross Profit",
      "Refunds",
      "Expenses",
      "Commissions",
      "Net Profit",
      "Net Margin",
      "Bookings",
    ];

    const rows = profitTrend.map((item) => {
      const revenue = getNumber(item.revenue, item.bookingRevenue);
      const bookingCost = getNumber(item.bookingCost, item.totalCost, item.cost);
      const grossProfit = getNumber(item.grossProfit, revenue - bookingCost);
      const refunds = getNumber(item.refunds, item.refund);
      const expenses = getNumber(item.expenses, item.recordedExpenses);
      const commissions = getNumber(item.commissions, item.commission);
      const netProfit = getNumber(
        item.netProfit,
        item.profit,
        grossProfit - refunds - expenses - commissions
      );
      const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return [
        getMonthLabel(item),
        revenue,
        bookingCost,
        grossProfit,
        refunds,
        expenses,
        commissions,
        netProfit,
        `${netMargin.toFixed(2)}%`,
        getNumber(item.bookings),
      ];
    });

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `profit-loss-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Profit & Loss</h1>
          <p className="mt-1 text-xs text-gray-500">
            Track revenue, costs, deductions and profitability across your
            travel business.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
            <FiCalendar size={14} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm text-gray-700 outline-none"
            />
          </div>

          <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
            <FiCalendar size={14} className="text-gray-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm text-gray-700 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchReport(true)}
            disabled={refreshing}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiRefreshCw
              size={14}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-4 text-sm font-medium text-white shadow-brand transition hover:bg-brand-blue-dark"
          >
            <FiDownload size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <FiAlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Unable to load report</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white"
              />
            ))}
          </div>
          <div className="h-[430px] animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      ) : (
        <>
          {/* TOP SUMMARY */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Revenue"
              value={formatCurrency(summary.revenue)}
              subtitle="Total booking revenue"
              icon={<FiDollarSign size={17} />}
              iconClass="bg-blue-50 text-blue-600"
            />
            <SummaryCard
              title="Booking Cost"
              value={formatCurrency(summary.bookingCost)}
              subtitle="Total booking cost"
              icon={<FiTrendingDown size={17} />}
              iconClass="bg-orange-50 text-orange-600"
              valueClass="text-orange-700"
            />
            <SummaryCard
              title="Gross Profit"
              value={formatCurrency(summary.grossProfit)}
              subtitle="Revenue minus booking cost"
              icon={<FiTrendingUp size={17} />}
              iconClass="bg-emerald-50 text-emerald-600"
              valueClass="text-emerald-700"
            />
            <SummaryCard
              title="Net Profit"
              value={formatCurrency(summary.netProfit)}
              subtitle={`Net margin ${formatPercentage(summary.netMargin)}`}
              icon={<FiActivity size={17} />}
              iconClass={
                summary.netProfit >= 0
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-red-50 text-red-600"
              }
              valueClass={
                summary.netProfit >= 0 ? "text-emerald-700" : "text-red-700"
              }
            />
          </div>

          {/* DEDUCTIONS */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <DeductionCard
              title="Refunds"
              subtitle="Completed refund deductions"
              value={formatCurrency(summary.refunds)}
              icon={<FiTrendingDown size={17} />}
              iconClass="bg-red-50 text-red-600"
              valueClass="text-red-700"
            />
            <DeductionCard
              title="Expenses"
              subtitle="Paid business expenses"
              value={formatCurrency(summary.expenses)}
              icon={<FiTrendingDown size={17} />}
              iconClass="bg-orange-50 text-orange-600"
              valueClass="text-orange-700"
            />
            <DeductionCard
              title="Commissions"
              subtitle="Agent commissions"
              value={formatCurrency(summary.commissions)}
              icon={<FiTrendingDown size={17} />}
              iconClass="bg-purple-50 text-purple-600"
              valueClass="text-purple-700"
            />
          </div>

          {/* PROFIT TREND */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Profit Trend
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Profitability movement across the selected period
                </p>
              </div>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FiBarChart2 size={18} />
              </div>
            </div>

            <ProfitTrendChart data={profitTrend} />
          </div>

          {/* TREND INSIGHTS */}
          {profitTrend.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <SummaryCard
                title="Best Profit Month"
                value={trendSummary.bestMonth ? trendSummary.bestMonth.label : "-"}
                subtitle={
                  trendSummary.bestMonth
                    ? formatCurrency(trendSummary.bestMonth.netProfit)
                    : "No data"
                }
                icon={<FiTrendingUp size={17} />}
                iconClass="bg-emerald-50 text-emerald-600"
                valueClass="text-emerald-700"
              />
              <SummaryCard
                title="Lowest Profit Month"
                value={trendSummary.lowestMonth ? trendSummary.lowestMonth.label : "-"}
                subtitle={
                  trendSummary.lowestMonth
                    ? formatCurrency(trendSummary.lowestMonth.netProfit)
                    : "No data"
                }
                icon={<FiTrendingDown size={17} />}
                iconClass="bg-red-50 text-red-600"
                valueClass="text-red-700"
              />
              <SummaryCard
                title="Average Monthly Profit"
                value={formatCurrency(trendSummary.averageProfit)}
                subtitle={`Across ${formatNumber(profitTrend.length)} month${
                  profitTrend.length === 1 ? "" : "s"
                }`}
                icon={<FiBarChart2 size={17} />}
                iconClass="bg-purple-50 text-purple-600"
              />
            </div>
          )}

          {/* ACCOUNTING SUMMARY */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                <FiCheckCircle size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Accounting Summary
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Calculation used by the report
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <AccountingItem
                label="Revenue"
                value={formatCurrency(summary.revenue)}
                valueClass="text-blue-700"
                bgClass="bg-blue-50"
              />
              <AccountingItem
                label="Booking Cost"
                value={formatCurrency(summary.bookingCost)}
                valueClass="text-orange-700"
                bgClass="bg-orange-50"
              />
              <AccountingItem
                label="Gross Profit"
                value={formatCurrency(summary.grossProfit)}
                valueClass="text-emerald-700"
                bgClass="bg-emerald-50"
              />
              <AccountingItem
                label="Total Deductions"
                value={formatCurrency(
                  summary.refunds + summary.expenses + summary.commissions
                )}
                valueClass="text-red-700"
                bgClass="bg-red-50"
              />
              <AccountingItem
                label="Net Profit"
                value={formatCurrency(summary.netProfit)}
                valueClass={
                  summary.netProfit >= 0 ? "text-emerald-700" : "text-red-700"
                }
                bgClass={summary.netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}
              />
            </div>

            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Profit Calculation
              </p>
              <p className="mt-1.5 text-xs font-medium text-gray-600">
                Revenue − Booking Cost − Refunds − Expenses − Commissions = Net
                Profit
              </p>
            </div>
          </div>

          {/* BUSINESS SNAPSHOT */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              title="Total Bookings"
              value={formatNumber(summary.bookings)}
              subtitle="Bookings included in report"
              icon={<FiCheckCircle size={17} />}
              iconClass="bg-blue-50 text-blue-600"
            />
            <SummaryCard
              title="Net Margin"
              value={formatPercentage(summary.netMargin)}
              subtitle="Net profit as % of revenue"
              icon={<FiActivity size={17} />}
              iconClass="bg-purple-50 text-purple-600"
              valueClass={
                summary.netMargin >= 0 ? "text-purple-700" : "text-red-700"
              }
            />
            <SummaryCard
              title="Report Period"
              value={
                startDate || endDate
                  ? `${startDate || "Start"} → ${endDate || "Today"}`
                  : "All Time"
              }
              subtitle={
                report?.period?.startDate
                  ? `${formatDate(report.period.startDate)} to ${formatDate(
                      report.period.endDate
                    )}`
                  : "Current available financial data"
              }
              icon={<FiClock size={17} />}
              iconClass="bg-gray-100 text-gray-600"
            />
          </div>

          {/* NO TREND WARNING */}
          {!profitTrend.length && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle
                  size={18}
                  className="mt-0.5 flex-shrink-0 text-amber-600"
                />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Monthly profit trend is not available
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    The summary values are available, but the API response does
                    not contain monthlyTrend/profitTrend/trend data. Make sure
                    your backend
                    <span className="font-semibold"> /reports/profit-loss </span>
                    endpoint returns the monthly trend array.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProfitLossReport;
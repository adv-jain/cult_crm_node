
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiBarChart2,
  FiClock,
  FiCheckCircle,
  FiCreditCard,
  FiDollarSign,
  FiDownload,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiXCircle,
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

const getStatusClasses = (status) => {
  const value = String(status || "").toLowerCase();

  if (
    value.includes("completed") ||
    value.includes("paid") ||
    value.includes("success")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (value.includes("pending") || value.includes("partial")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (
    value.includes("failed") ||
    value.includes("cancel") ||
    value.includes("refund")
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-gray-50 text-gray-700 border-gray-200";
};

/* =====================================================
   REVENUE REPORT
===================================================== */

function RevenueReport() {
  const [report, setReport] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* ===================================================
     PAGINATION STATE
  =================================================== */

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* ===================================================
     FETCH
  =================================================== */

  const fetchRevenueReport = useCallback(
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

        const response = await api.get("/reports/revenue", {
          params,
        });

        setReport(response.data);
      } catch (err) {
        console.error("Revenue report error:", err);

        setError(
          err?.response?.data?.message ||
            "Unable to load revenue report."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [startDate, endDate]
  );

  useEffect(() => {
    fetchRevenueReport();
  }, [fetchRevenueReport]);

  /* ===================================================
     NORMALIZE
  =================================================== */

  const reportData = useMemo(
    () => extractReport(report),
    [report]
  );

  const payments = useMemo(() => {
    return getArray(
      reportData.payments,
      reportData.paymentData,
      reportData.transactions,
      reportData.details?.payments
    );
  }, [reportData]);

  /* ===================================================
     SUMMARY
  =================================================== */

  const summary = useMemo(() => {
    const source = reportData.summary || {};

    const totalRevenue = Number(
      source.totalRevenue ??
        source.collectedRevenue ??
        source.revenue ??
        reportData.totalRevenue ??
        reportData.collectedRevenue ??
        0
    );

    const completedRevenue = Number(
      source.completedRevenue ??
        source.collectedRevenue ??
        source.revenue ??
        totalRevenue
    );

    const transactionCount = Number(
      source.transactionCount ??
        source.totalPayments ??
        source.payments ??
        payments.length
    );

    const averagePayment =
      transactionCount > 0
        ? completedRevenue / transactionCount
        : 0;

    const pendingAmount = Number(
      source.pendingAmount ?? source.pendingRevenue ?? 0
    );

    const failedAmount = Number(source.failedAmount ?? 0);

    const refundedAmount = Number(
      source.refundedAmount ?? source.refunds ?? 0
    );

    return {
      totalRevenue,
      completedRevenue,
      transactionCount,
      averagePayment,
      pendingAmount,
      failedAmount,
      refundedAmount,
    };
  }, [reportData, payments]);

  const outstanding = useMemo(() => {
    const source = reportData.summary || {};

    return Number(
      source.outstandingAmount ??
        source.amountDue ??
        reportData.outstandingAmount ??
        0
    );
  }, [reportData]);

  /* ===================================================
     PAYMENT METHODS
  =================================================== */

  const paymentMethods = useMemo(() => {
    const apiData = getArray(
      reportData.paymentMethodBreakdown,
      reportData.paymentMethods,
      reportData.methodBreakdown
    );

    if (apiData.length) return apiData;

    const map = {};

    payments.forEach((payment) => {
      const method =
        payment.paymentMethod || payment.method || "Other";

      if (!map[method]) {
        map[method] = {
          method,
          count: 0,
          amount: 0,
        };
      }

      map[method].count += 1;

      if (
        String(payment.status || "").toLowerCase() === "completed"
      ) {
        map[method].amount += Number(payment.amount || 0);
      }
    });

    return Object.values(map);
  }, [reportData, payments]);

  /* ===================================================
     REVENUE TREND
  =================================================== */

  const revenueTrend = useMemo(() => {
    return getArray(
      reportData.revenueTrend,
      reportData.dailyRevenue,
      reportData.monthlyRevenue,
      reportData.trend,
      reportData.chartData
    );
  }, [reportData]);

  const maxTrendValue = useMemo(() => {
    if (!revenueTrend.length) return 0;

    return Math.max(
      ...revenueTrend.map((item) =>
        Number(item.amount ?? item.revenue ?? item.value ?? 0)
      )
    );
  }, [revenueTrend]);

  /* ===================================================
     STATUS BREAKDOWN
  =================================================== */

  const statusBreakdown = useMemo(() => {
    const apiData = getArray(
      reportData.statusBreakdown,
      reportData.paymentStatusBreakdown,
      reportData.statuses
    );

    if (apiData.length) return apiData;

    const map = {};

    payments.forEach((payment) => {
      const status = payment.status || "Unknown";

      if (!map[status]) {
        map[status] = {
          status,
          count: 0,
          amount: 0,
        };
      }

      map[status].count += 1;
      map[status].amount += Number(payment.amount || 0);
    });

    return Object.values(map);
  }, [reportData, payments]);

  /* ===================================================
     FILTERS
  =================================================== */

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const status = String(payment.status || "");
      const method = String(
        payment.paymentMethod || payment.method || ""
      );

      const matchesStatus =
        statusFilter === "All" ||
        status.toLowerCase() === statusFilter.toLowerCase();

      const matchesMethod =
        methodFilter === "All" ||
        method.toLowerCase() === methodFilter.toLowerCase();

      if (!matchesStatus || !matchesMethod) return false;
      if (!query) return true;

      const paymentNumber =
        payment.paymentNumber ||
        payment.paymentCode ||
        payment.code ||
        "";

      const transactionId = payment.transactionId || "";

      const customer =
        payment.customer?.name ||
        payment.customer?.fullName ||
        payment.customerName ||
        "";

      const booking =
        payment.booking?.bookingNumber ||
        payment.booking?.bookingCode ||
        payment.bookingNumber ||
        "";

      return [
        paymentNumber,
        transactionId,
        customer,
        booking,
        method,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [payments, search, statusFilter, methodFilter]);

  /* ===================================================
     PAGINATION LOGIC
  =================================================== */

  // Reset to page 1 whenever search or filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, methodFilter, startDate, endDate]);

  const totalPages = Math.ceil(
    filteredPayments.length / itemsPerPage
  );

  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;

    return filteredPayments.slice(
      startIndex,
      startIndex + itemsPerPage
    );
  }, [filteredPayments, currentPage]);

  const startItem =
    filteredPayments.length === 0
      ? 0
      : (currentPage - 1) * itemsPerPage + 1;

  const endItem = Math.min(
    currentPage * itemsPerPage,
    filteredPayments.length
  );

  // Show a compact group of page numbers for large reports.
  const visiblePages = useMemo(() => {
    const pages = new Set();

    pages.add(1);
    pages.add(totalPages);

    for (
      let page = Math.max(1, currentPage - 1);
      page <= Math.min(totalPages, currentPage + 1);
      page += 1
    ) {
      pages.add(page);
    }

    return [...pages]
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  const methodOptions = useMemo(() => {
    const methods = payments
      .map((payment) => payment.paymentMethod || payment.method)
      .filter(Boolean);

    return [...new Set(methods)];
  }, [payments]);

  /* ===================================================
     EXPORT CSV
     Exports all filtered payments, not only current page.
  =================================================== */

  const exportCSV = () => {
    const rowsData =
      filteredPayments.length > 0
        ? filteredPayments
        : payments;

    if (!rowsData.length) return;

    const headers = [
      "Payment Number",
      "Customer",
      "Booking",
      "Payment Method",
      "Transaction ID",
      "Amount",
      "Status",
      "Payment Date",
    ];

    const escapeCSV = (val) =>
      `"${String(val ?? "")
        .replace(/"/g, '""')
        .replace(/\r?\n/g, " ")}"`;

    const rows = rowsData.map((payment) => [
      payment.paymentNumber ||
        payment.paymentCode ||
        payment.code ||
        "",
      payment.customer?.name ||
        payment.customer?.fullName ||
        payment.customerName ||
        "",
      payment.booking?.bookingNumber ||
        payment.booking?.bookingCode ||
        payment.bookingNumber ||
        "",
      payment.paymentMethod || payment.method || "",
      payment.transactionId || "",
      Number(payment.amount || 0),
      payment.status || "",
      formatDate(payment.paymentDate || payment.createdAt),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `revenue-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ===================================================
     COLLECTION RATE
  =================================================== */

  const collectionRate = useMemo(() => {
    if (summary.totalRevenue <= 0) return 0;

    return (
      (summary.completedRevenue / summary.totalRevenue) * 100
    );
  }, [summary.totalRevenue, summary.completedRevenue]);

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto flex-wrap">
          <div className="flex items-center gap-2 h-9 rounded-lg border border-gray-200 bg-white px-3">
            <FiFilter
              className="text-gray-400 flex-shrink-0"
              size={14}
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm text-gray-700 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 h-9 rounded-lg border border-gray-200 bg-white px-3">
            <FiFilter
              className="text-gray-400 flex-shrink-0"
              size={14}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm text-gray-700 outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Partially Refunded">
              Partially Refunded
            </option>
            <option value="Refunded">Refunded</option>
            <option value="Failed">Failed</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
          >
            <option value="All">All Methods</option>

            {methodOptions.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-56">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={15}
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payments..."
              className="w-full pl-9 pr-8 h-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchRevenueReport(true)}
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

        {/* EXPORT CSV */}
        <button
          type="button"
          onClick={exportCSV}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto"
        >
          <FiDownload size={15} />
          Export CSV
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
          <FiAlertCircle
            className="flex-shrink-0 mt-0.5"
            size={18}
          />
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
              title="Total Revenue"
              value={formatCurrency(summary.totalRevenue)}
              subtitle="Revenue in selected period"
              icon={<FiDollarSign size={16} />}
              iconClass="bg-emerald-50 text-emerald-600"
              valueClass="text-emerald-700"
            />

            <SummaryCard
              title="Collected Revenue"
              value={formatCurrency(summary.completedRevenue)}
              subtitle="Completed payments"
              icon={<FiCheckCircle size={16} />}
              iconClass="bg-blue-50 text-blue-600"
              valueClass="text-blue-700"
            />

            <SummaryCard
              title="Outstanding"
              value={formatCurrency(outstanding)}
              subtitle="Amount still due"
              icon={<FiClock size={16} />}
              iconClass="bg-amber-50 text-amber-600"
              valueClass="text-amber-700"
            />

            <SummaryCard
              title="Transactions"
              value={formatNumber(summary.transactionCount)}
              subtitle={`Avg. ${formatCurrency(summary.averagePayment)}`}
              icon={<FiCreditCard size={16} />}
              iconClass="bg-purple-50 text-purple-600"
            />
          </div>

          {/* SECONDARY SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard
              title="Pending Amount"
              value={formatCurrency(summary.pendingAmount)}
              subtitle="Pending payments"
              icon={<FiClock size={16} />}
              iconClass="bg-amber-50 text-amber-600"
              valueClass="text-amber-700"
            />

            <SummaryCard
              title="Refunded Amount"
              value={formatCurrency(summary.refundedAmount)}
              subtitle="Refunded revenue"
              icon={<FiXCircle size={16} />}
              iconClass="bg-red-50 text-red-600"
              valueClass="text-red-700"
            />

            <SummaryCard
              title="Failed Amount"
              value={formatCurrency(summary.failedAmount)}
              subtitle="Failed attempts"
              icon={<FiAlertCircle size={16} />}
              iconClass="bg-gray-100 text-gray-600"
            />
          </div>

          {/* COLLECTION RATE */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Revenue Collection
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Percentage of revenue successfully collected
                </p>
              </div>

              <div className="text-left lg:text-right">
                <p className="text-2xl font-bold text-emerald-600">
                  {formatPercentage(collectionRate)}
                </p>

                <p className="text-xs text-gray-500">
                  Collection rate
                </p>
              </div>
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${Math.min(collectionRate, 100)}%`,
                }}
              />
            </div>

            <div className="mt-2.5 flex justify-between text-xs text-gray-500">
              <span>
                Collected:{" "}
                <strong className="text-gray-700">
                  {formatCurrency(summary.completedRevenue)}
                </strong>
              </span>

              <span>
                Total:{" "}
                <strong className="text-gray-700">
                  {formatCurrency(summary.totalRevenue)}
                </strong>
              </span>
            </div>
          </div>

          {/* TREND + METHODS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* REVENUE TREND */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">
                    Revenue Trend
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Revenue movement across the selected period
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <FiTrendingUp size={16} />
                </div>
              </div>

              {revenueTrend.length === 0 ? (
                <EmptyState title="No trend data available" />
              ) : (
                <div className="space-y-3">
                  {revenueTrend.slice(0, 12).map((item, index) => {
                    const label =
                      item.date ||
                      item.month ||
                      item.label ||
                      `Period ${index + 1}`;

                    const amount = Number(
                      item.amount ?? item.revenue ?? item.value ?? 0
                    );

                    const percentage =
                      maxTrendValue > 0
                        ? (amount / maxTrendValue) * 100
                        : 0;

                    return (
                      <div key={`${label}-${index}`}>
                        <div className="mb-1 flex items-center justify-between gap-4">
                          <span className="text-xs font-medium text-gray-600">
                            {label}
                          </span>

                          <span className="text-xs font-semibold text-gray-800">
                            {formatCurrency(amount)}
                          </span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PAYMENT METHODS */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">
                    Payment Methods
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Revenue collected through each method
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FiCreditCard size={16} />
                </div>
              </div>

              {paymentMethods.length === 0 ? (
                <EmptyState title="No payment method data" />
              ) : (
                <div className="space-y-2.5">
                  {paymentMethods.map((item, index) => {
                    const method =
                      item.method ||
                      item.paymentMethod ||
                      item._id ||
                      "Other";

                    const amount = Number(
                      item.amount ?? item.revenue ?? item.value ?? 0
                    );

                    const count = Number(item.count ?? item.total ?? 0);

                    const percentage =
                      summary.completedRevenue > 0
                        ? (amount / summary.completedRevenue) * 100
                        : 0;

                    return (
                      <div
                        key={`${method}-${index}`}
                        className="rounded-lg border border-gray-100 p-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {method}
                            </p>

                            <p className="mt-0.5 text-[11px] text-gray-400">
                              {formatNumber(count)} transaction
                              {count === 1 ? "" : "s"}
                            </p>
                          </div>

                          <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {formatCurrency(amount)}
                          </p>
                        </div>

                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{
                              width: `${Math.min(percentage, 100)}%`,
                            }}
                          />
                        </div>

                        <p className="mt-1 text-right text-[10px] text-gray-400">
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* STATUS BREAKDOWN */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-gray-800">
                Payment Status Breakdown
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                Distribution of payment transactions by status
              </p>
            </div>

            {statusBreakdown.length === 0 ? (
              <EmptyState title="No payment status data" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {statusBreakdown.map((item, index) => {
                  const status =
                    item.status || item._id || item.name || "Unknown";

                  const count = Number(item.count ?? item.total ?? 0);

                  const amount = Number(
                    item.amount ?? item.value ?? item.revenue ?? 0
                  );

                  return (
                    <div
                      key={`${status}-${index}`}
                      className="rounded-lg border border-gray-100 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                            status
                          )}`}
                        >
                          {status}
                        </span>

                        <span className="text-sm font-bold text-gray-800">
                          {formatNumber(count)}
                        </span>
                      </div>

                      <p className="mt-3 text-base font-bold text-gray-900">
                        {formatCurrency(amount)}
                      </p>

                      <p className="mt-0.5 text-[10px] text-gray-400">
                        Transaction value
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PAYMENT TABLE */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* TABLE HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Revenue Transactions
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Showing {formatNumber(filteredPayments.length)}{" "}
                  transaction
                  {filteredPayments.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="text-xs text-gray-500">
                Collected:{" "}
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(summary.completedRevenue)}
                </span>
              </div>
            </div>

            {/* TABLE BODY */}
            {filteredPayments.length === 0 ? (
              <EmptyState title="No revenue transactions found" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/60">
                      {[
                        "Payment",
                        "Customer",
                        "Booking",
                        "Method",
                        "Amount",
                        "Status",
                        "Date",
                      ].map((heading, index) => (
                        <th
                          key={index}
                          className={`px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${
                            heading === "Amount"
                              ? "text-right"
                              : "text-left"
                          }`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {paginatedPayments.map((payment, index) => {
                      const rowIndex =
                        (currentPage - 1) * itemsPerPage + index;

                      const paymentNumber =
                        payment.paymentNumber ||
                        payment.paymentCode ||
                        payment.code ||
                        `PAY-${rowIndex + 1}`;

                      const customer =
                        payment.customer?.name ||
                        payment.customer?.fullName ||
                        payment.customerName ||
                        "—";

                      const booking =
                        payment.booking?.bookingNumber ||
                        payment.booking?.bookingCode ||
                        payment.bookingNumber ||
                        "—";

                      const method =
                        payment.paymentMethod || payment.method || "—";

                      return (
                        <tr
                          key={
                            payment._id ||
                            payment.id ||
                            paymentNumber
                          }
                          className="hover:bg-brand-blue-50/40 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-800 truncate max-w-[180px]">
                              {paymentNumber}
                            </p>

                            {payment.transactionId && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">
                                {payment.transactionId}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-gray-700 text-xs truncate max-w-[160px]">
                            {customer}
                          </td>

                          <td className="px-5 py-4 text-gray-600 text-xs truncate max-w-[140px]">
                            {booking}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">
                              {method}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span className="font-semibold text-gray-800 whitespace-nowrap">
                              {formatCurrency(payment.amount)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                                payment.status
                              )}`}
                            >
                              {payment.status || "Unknown"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                            {formatDate(
                              payment.paymentDate || payment.createdAt
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION FOOTER */}
            {filteredPayments.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center sm:text-left">
                  Showing{" "}
                  <span className="font-semibold text-gray-800">
                    {formatNumber(startItem)}–{formatNumber(endItem)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-800">
                    {formatNumber(filteredPayments.length)}
                  </span>{" "}
                  payments
                </p>

                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {/* PREVIOUS */}
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.max(page - 1, 1)
                      )
                    }
                    disabled={currentPage === 1}
                    className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* PAGE NUMBERS */}
                  {visiblePages.map((page, index) => {
                    const previousPage = visiblePages[index - 1];

                    const showEllipsis =
                      previousPage && page - previousPage > 1;

                    return (
                      <span
                        key={page}
                        className="inline-flex items-center gap-1.5"
                      >
                        {showEllipsis && (
                          <span className="px-1 text-gray-400">
                            ...
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          aria-label={`Go to page ${page}`}
                          aria-current={
                            currentPage === page ? "page" : undefined
                          }
                          className={`min-w-8 h-8 px-2 rounded-lg border text-sm font-medium transition-colors ${
                            currentPage === page
                              ? "bg-brand-blue text-white border-brand-blue"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      </span>
                    );
                  })}

                  {/* NEXT */}
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(page + 1, totalPages)
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
          <p className="text-xs font-medium text-gray-500">
            {title}
          </p>

          <p className={`mt-1.5 text-lg font-bold truncate ${valueClass}`}>
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-[11px] text-gray-400">
              {subtitle}
            </p>
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

function EmptyState({ title = "No data found" }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
        <FiBarChart2 size={20} />
      </div>

      <p className="mt-3 text-sm font-semibold text-gray-700">
        {title}
      </p>

      <p className="mt-0.5 text-xs text-gray-500">
        Try changing the date range or search filters.
      </p>
    </div>
  );
}

export default RevenueReport;


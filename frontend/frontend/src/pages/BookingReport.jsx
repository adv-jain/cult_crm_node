import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiDownload,
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
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
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

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.bookings)) return data.bookings;
  if (Array.isArray(data?.data?.bookings)) return data.data.bookings;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const getStatusClasses = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized.includes("completed") ||
    normalized.includes("confirmed") ||
    normalized.includes("paid")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("partial") ||
    normalized.includes("processing")
  ) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("refund") ||
    normalized.includes("failed")
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-gray-50 text-gray-700 border-gray-200";
};

/* =====================================================
   BOOKING REPORT
===================================================== */

function BookingReport() {
  const [report, setReport] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
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

        const response = await api.get("/reports/bookings", { params });
        setReport(response.data);
      } catch (err) {
        console.error("Booking report error:", err);
        setError(
          err?.response?.data?.message || "Unable to load booking report."
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
     DATA
  =================================================== */

  const bookings = useMemo(() => getList(report), [report]);

  const summary = useMemo(() => {
    const source = report?.summary || report?.data?.summary || {};

    const totalBookings =
      source.totalBookings ?? source.bookings ?? bookings.length;

    const revenue =
      source.bookingRevenue ??
      source.revenue ??
      bookings.reduce(
        (sum, booking) =>
          sum +
          Number(booking.totalAmount ?? booking.total ?? booking.amount ?? 0),
        0
      );

    const cost =
      source.bookingCost ??
      source.cost ??
      bookings.reduce(
        (sum, booking) => sum + Number(booking.totalCost ?? booking.cost ?? 0),
        0
      );

    const profit = source.grossProfit ?? source.profit ?? revenue - cost;

    const confirmed =
      source.confirmed ??
      bookings.filter(
        (booking) =>
          String(booking.status || "").toLowerCase() === "confirmed"
      ).length;

    const completed =
      source.completed ??
      bookings.filter(
        (booking) =>
          String(booking.status || "").toLowerCase() === "completed"
      ).length;

    const pending =
      source.pending ??
      bookings.filter(
        (booking) =>
          String(booking.status || "").toLowerCase() === "pending"
      ).length;

    const cancelled =
      source.cancelled ??
      bookings.filter(
        (booking) =>
          String(booking.status || "").toLowerCase() === "cancelled"
      ).length;

    return {
      totalBookings,
      revenue,
      cost,
      profit,
      confirmed,
      completed,
      pending,
      cancelled,
    };
  }, [report, bookings]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const status = String(booking.status || "");

      const matchesStatus =
        statusFilter === "All" ||
        status.toLowerCase() === statusFilter.toLowerCase();

      if (!matchesStatus) return false;
      if (!query) return true;

      const bookingNumber =
        booking.bookingNumber || booking.bookingCode || booking.code || "";

      const customerName =
        booking.customer?.name || booking.customer?.fullName || "";

      const destination =
        booking.destination || booking.trip?.destination || "";

      const tripTitle =
        booking.trip?.title ||
        booking.trip?.tripTitle ||
        booking.tripTitle ||
        "";

      return [bookingNumber, customerName, destination, tripTitle]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [bookings, search, statusFilter]);

  const collectionStats = useMemo(() => {
    const collected = bookings.reduce(
      (sum, booking) =>
        sum + Number(booking.amountPaid ?? booking.paidAmount ?? 0),
      0
    );

    const outstanding = Math.max(summary.revenue - collected, 0);

    const collectionPercentage =
      summary.revenue > 0
        ? Math.min((collected / summary.revenue) * 100, 100)
        : 0;

    return { collected, outstanding, collectionPercentage };
  }, [bookings, summary.revenue]);

  /* ===================================================
     EXPORT CSV
  =================================================== */

  const exportCSV = () => {
    if (!filteredBookings.length) return;

    const headers = [
      "Booking Number",
      "Customer",
      "Destination",
      "Travel Date",
      "Status",
      "Payment Status",
      "Total Amount",
      "Amount Paid",
      "Amount Due",
      "Cost",
      "Profit",
    ];

    const rows = filteredBookings.map((booking) => {
      const totalAmount = Number(
        booking.totalAmount ?? booking.total ?? booking.amount ?? 0
      );
      const amountPaid = Number(
        booking.amountPaid ?? booking.paidAmount ?? 0
      );
      const amountDue = Number(
        booking.amountDue ?? Math.max(totalAmount - amountPaid, 0)
      );
      const cost = Number(booking.totalCost ?? booking.cost ?? 0);
      const profit = Number(booking.profit ?? totalAmount - cost);

      return [
        booking.bookingNumber || booking.bookingCode || booking.code || "",
        booking.customer?.name || booking.customer?.fullName || "",
        booking.destination || booking.trip?.destination || "",
        formatDate(
          booking.travelDate ||
            booking.departureDate ||
            booking.trip?.travelDate
        ),
        booking.status || "",
        booking.paymentStatus || "",
        totalAmount,
        amountPaid,
        amountDue,
        cost,
        profit,
      ];
    });

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
    link.download = "booking-report.csv";

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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
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
              placeholder="Search bookings..."
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
          disabled={!filteredBookings.length}
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
              title="Total Bookings"
              value={formatNumber(summary.totalBookings)}
              subtitle="In selected period"
              icon={<FiCalendar size={16} />}
              iconClass="bg-blue-50 text-blue-600"
              valueClass="text-blue-700"
            />
            <SummaryCard
              title="Booking Revenue"
              value={formatCurrency(summary.revenue)}
              subtitle="Total booking value"
              icon={<FiDollarSign size={16} />}
              iconClass="bg-emerald-50 text-emerald-600"
              valueClass="text-emerald-700"
            />
            <SummaryCard
              title="Booking Cost"
              value={formatCurrency(summary.cost)}
              subtitle="Total estimated cost"
              icon={<FiActivity size={16} />}
              iconClass="bg-amber-50 text-amber-600"
              valueClass="text-amber-700"
            />
            <SummaryCard
              title="Gross Profit"
              value={formatCurrency(summary.profit)}
              subtitle="Revenue − booking cost"
              icon={<FiTrendingUp size={16} />}
              iconClass="bg-purple-50 text-purple-600"
              valueClass="text-purple-700"
            />
          </div>

          {/* STATUS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatusTile
              title="Pending"
              value={formatNumber(summary.pending)}
              icon={<FiClock size={16} />}
              iconClass="bg-amber-50 text-amber-600"
            />
            <StatusTile
              title="Confirmed"
              value={formatNumber(summary.confirmed)}
              icon={<FiCheckCircle size={16} />}
              iconClass="bg-blue-50 text-blue-600"
            />
            <StatusTile
              title="Completed"
              value={formatNumber(summary.completed)}
              icon={<FiCheckCircle size={16} />}
              iconClass="bg-emerald-50 text-emerald-600"
            />
            <StatusTile
              title="Cancelled"
              value={formatNumber(summary.cancelled)}
              icon={<FiXCircle size={16} />}
              iconClass="bg-red-50 text-red-600"
            />
          </div>

          {/* BOOKINGS TABLE */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Booking Details
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Showing {formatNumber(filteredBookings.length)} booking
                  {filteredBookings.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="text-xs text-gray-500">
                Revenue:{" "}
                <span className="font-semibold text-gray-800">
                  {formatCurrency(summary.revenue)}
                </span>
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/60">
                      {[
                        "Booking",
                        "Customer",
                        "Destination",
                        "Travel Date",
                        "Status",
                        "Revenue",
                        "Paid",
                        "Due",
                        "Profit",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className={`px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${
                            i >= 5 ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredBookings.map((booking, index) => {
                      const totalAmount = Number(
                        booking.totalAmount ??
                          booking.total ??
                          booking.amount ??
                          0
                      );
                      const amountPaid = Number(
                        booking.amountPaid ?? booking.paidAmount ?? 0
                      );
                      const amountDue = Number(
                        booking.amountDue ??
                          Math.max(totalAmount - amountPaid, 0)
                      );
                      const cost = Number(
                        booking.totalCost ?? booking.cost ?? 0
                      );
                      const profit = Number(
                        booking.profit ?? totalAmount - cost
                      );

                      const bookingNumber =
                        booking.bookingNumber ||
                        booking.bookingCode ||
                        booking.code ||
                        `Booking ${index + 1}`;

                      const customerName =
                        booking.customer?.name ||
                        booking.customer?.fullName ||
                        booking.customerName ||
                        "—";

                      const destination =
                        booking.destination ||
                        booking.trip?.destination ||
                        "—";

                      const travelDate =
                        booking.travelDate ||
                        booking.departureDate ||
                        booking.trip?.travelDate;

                      return (
                        <tr
                          key={booking._id || booking.id || bookingNumber}
                          className="hover:bg-brand-blue-50/40 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-800 truncate max-w-[200px]">
                              {bookingNumber}
                            </p>
                            {booking.trip?.title && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                                {booking.trip.title}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-gray-700 text-xs truncate max-w-[160px]">
                            {customerName}
                          </td>

                          <td className="px-5 py-4 text-gray-600 text-xs truncate max-w-[150px]">
                            {destination}
                          </td>

                          <td className="px-5 py-4 text-gray-600 text-xs whitespace-nowrap">
                            {formatDate(travelDate)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                                booking.status
                              )}`}
                            >
                              {booking.status || "Unknown"}
                            </span>
                            {booking.paymentStatus && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Payment: {booking.paymentStatus}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <span className="font-semibold text-gray-800 whitespace-nowrap">
                              {formatCurrency(totalAmount)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right text-emerald-600 font-medium whitespace-nowrap">
                            {formatCurrency(amountPaid)}
                          </td>

                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <span
                              className={
                                amountDue > 0
                                  ? "text-amber-600 font-medium"
                                  : "text-gray-500 font-medium"
                              }
                            >
                              {formatCurrency(amountDue)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <span
                              className={
                                profit >= 0
                                  ? "text-emerald-600 font-semibold"
                                  : "text-red-600 font-semibold"
                              }
                            >
                              {formatCurrency(profit)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FINANCIAL SUMMARY + COLLECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Financial Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-gray-800">
                  Financial Summary
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Booking-level financial performance
                </p>
              </div>

              <div className="space-y-3">
                <FinancialLine label="Booking Revenue" value={summary.revenue} />
                <FinancialLine label="Booking Cost" value={summary.cost} negative />
                <div className="border-t border-gray-100 pt-3">
                  <FinancialLine
                    label="Gross Profit"
                    value={summary.profit}
                    highlight
                    strong
                  />
                </div>
              </div>
            </div>

            {/* Collection Overview */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-gray-800">
                  Collection Overview
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Amount received versus outstanding
                </p>
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-500">Collected</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">
                    {formatCurrency(collectionStats.collected)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="mt-1 text-lg font-bold text-amber-600">
                    {formatCurrency(collectionStats.outstanding)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-gray-500">Collection Rate</span>
                  <span className="font-semibold text-gray-700">
                    {collectionStats.collectionPercentage.toFixed(1)}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${collectionStats.collectionPercentage}%`,
                    }}
                  />
                </div>
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

function StatusTile({ title, value, icon, iconClass }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5 flex items-center gap-2.5">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${iconClass}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {title}
        </p>
        <p className="mt-0.5 text-base font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function FinancialLine({ label, value, negative = false, highlight = false, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={`text-xs ${highlight ? "text-gray-800 font-semibold" : "text-gray-500"}`}
      >
        {label}
      </span>
      <span
        className={`${strong ? "text-base" : "text-sm"} font-bold whitespace-nowrap ${
          negative
            ? "text-red-600"
            : highlight
            ? value >= 0
              ? "text-emerald-600"
              : "text-red-600"
            : "text-gray-800"
        }`}
      >
        {negative ? "- " : ""}
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
        <FiCalendar size={20} />
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-700">
        No bookings found
      </p>
      <p className="mt-0.5 text-xs text-gray-500">
        Try changing the date range or search filters.
      </p>
    </div>
  );
}

export default BookingReport;
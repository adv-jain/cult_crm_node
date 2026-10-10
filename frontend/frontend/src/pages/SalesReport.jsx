
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiDownload,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiSend,
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
  return new Intl.NumberFormat("en-IN").format(
    Number(value || 0)
  );
};

const formatPercentage = (value) => {
  return `${Number(value || 0).toFixed(1)}%`;
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const extractReport = (data) => {
  if (!data) return {};

  if (data.data && typeof data.data === "object") {
    return data.data;
  }

  return data;
};

const getArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
};

const getStatusClasses = (status) => {
  const value = String(status || "").toLowerCase();

  if (
    value.includes("accepted") ||
    value.includes("confirmed") ||
    value.includes("completed") ||
    value.includes("paid")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    value.includes("pending") ||
    value.includes("draft") ||
    value.includes("prepared") ||
    value.includes("sent") ||
    value.includes("negotiation")
  ) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (
    value.includes("cancel") ||
    value.includes("reject") ||
    value.includes("failed")
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-gray-50 text-gray-700 border-gray-200";
};

/* =====================================================
   SALES REPORT
===================================================== */

function SalesReport() {
  const [report, setReport] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* ===================================================
     PAGINATION STATE
  =================================================== */

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* ===================================================
     FETCH SALES REPORT
  =================================================== */

  const fetchSalesReport = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const params = {};

        if (startDate) {
          params.startDate = startDate;
        }

        if (endDate) {
          params.endDate = endDate;
        }

        const response = await api.get("/reports/sales", {
          params,
        });

        setReport(response.data);
      } catch (err) {
        console.error("Sales report error:", err);

        setError(
          err?.response?.data?.message ||
            "Unable to load sales report."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [startDate, endDate]
  );

  useEffect(() => {
    fetchSalesReport();
  }, [fetchSalesReport]);

  /* ===================================================
     NORMALIZE REPORT
  =================================================== */

  const reportData = useMemo(
    () => extractReport(report),
    [report]
  );

  /* ===================================================
     QUOTATION DATA
  =================================================== */

  const quotationData = useMemo(() => {
    return getArray(
      reportData.quotationsData,
      reportData.quotationData,
      reportData.quotations,
      reportData.details?.quotations
    );
  }, [reportData]);

  /* ===================================================
     BOOKING DATA
  =================================================== */

  const bookingData = useMemo(() => {
    return getArray(
      reportData.bookingsData,
      reportData.bookingData,
      reportData.bookings,
      reportData.details?.bookings
    );
  }, [reportData]);

  /* ===================================================
     ACCEPTED QUOTATION COUNT
  =================================================== */

  const acceptedQuotationCount = useMemo(() => {
    return quotationData.filter((quotation) => {
      return (
        String(quotation?.status || "")
          .trim()
          .toLowerCase() === "accepted"
      );
    }).length;
  }, [quotationData]);

  /* ===================================================
     SUMMARY
  =================================================== */

  const summary = useMemo(() => {
    const source = reportData.summary || {};

    const quotationCountFromData = quotationData.length;
    const bookingCountFromData = bookingData.length;

    return {
      leads: Number(
        source.leads ??
          source.totalLeads ??
          (Array.isArray(reportData.leads)
            ? reportData.leads.length
            : reportData.leads) ??
          0
      ),

      enquiries: Number(
        source.enquiries ??
          source.totalEnquiries ??
          (Array.isArray(reportData.enquiries)
            ? reportData.enquiries.length
            : reportData.enquiries) ??
          0
      ),

      quotations: Number(
        source.quotations ??
          source.totalQuotations ??
          quotationCountFromData ??
          0
      ),

      bookings: Number(
        source.bookings ??
          source.totalBookings ??
          bookingCountFromData ??
          0
      ),

      acceptedQuotations: Number(
        source.acceptedQuotations ??
          source.accepted ??
          acceptedQuotationCount
      ),

      bookingRevenue: Number(
        source.bookingRevenue ??
          source.revenue ??
          0
      ),

      quotationValue: Number(
        source.quotationValue ??
          source.totalQuotationValue ??
          0
      ),

      conversionRate: Number(
        source.conversionRate ??
          source.bookingConversionRate ??
          0
      ),
    };
  }, [
    reportData,
    quotationData,
    bookingData,
    acceptedQuotationCount,
  ]);

  /* ===================================================
     FILTER QUOTATIONS
  =================================================== */

  const filteredQuotations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return quotationData.filter((quotation) => {
      const status = String(quotation.status || "");

      const matchesStatus =
        statusFilter === "All" ||
        status.toLowerCase() ===
          statusFilter.toLowerCase();

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      const quotationNumber =
        quotation.quotationNumber ||
        quotation.quoteNumber ||
        quotation.code ||
        "";

      const title =
        quotation.title ||
        quotation.name ||
        "";

      const customer =
        quotation.customer?.name ||
        quotation.customer?.fullName ||
        quotation.customerName ||
        "";

      const destination =
        quotation.destination ||
        quotation.trip?.destination ||
        "";

      return [
        quotationNumber,
        title,
        customer,
        destination,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [quotationData, search, statusFilter]);

  /* ===================================================
     RESET PAGE WHEN FILTERS CHANGE
  =================================================== */

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, startDate, endDate]);

  /* ===================================================
     PAGINATION
  =================================================== */

  const totalPages = Math.ceil(
    filteredQuotations.length / itemsPerPage
  );

  const paginatedQuotations = useMemo(() => {
    const startIndex =
      (currentPage - 1) * itemsPerPage;

    return filteredQuotations.slice(
      startIndex,
      startIndex + itemsPerPage
    );
  }, [filteredQuotations, currentPage]);

  const startItem =
    filteredQuotations.length === 0
      ? 0
      : (currentPage - 1) * itemsPerPage + 1;

  const endItem = Math.min(
    currentPage * itemsPerPage,
    filteredQuotations.length
  );

  /* ===================================================
     STATUS BREAKDOWN
  =================================================== */

  const quotationStatuses = useMemo(() => {
    if (reportData.quotationStatusBreakdown) {
      return getArray(
        reportData.quotationStatusBreakdown
      );
    }

    if (reportData.quotationStatuses) {
      return getArray(reportData.quotationStatuses);
    }

    const map = {};

    quotationData.forEach((quotation) => {
      const status = quotation.status || "Unknown";
      map[status] = (map[status] || 0) + 1;
    });

    return Object.entries(map).map(([status, count]) => ({
      status,
      count,
    }));
  }, [reportData, quotationData]);

  const bookingStatuses = useMemo(() => {
    if (reportData.bookingStatusBreakdown) {
      return getArray(reportData.bookingStatusBreakdown);
    }

    if (reportData.bookingStatuses) {
      return getArray(reportData.bookingStatuses);
    }

    const map = {};

    bookingData.forEach((booking) => {
      const status = booking.status || "Unknown";
      map[status] = (map[status] || 0) + 1;
    });

    return Object.entries(map).map(([status, count]) => ({
      status,
      count,
    }));
  }, [reportData, bookingData]);

  /* ===================================================
     EXPORT CSV
     Exports ALL FILTERED quotations, not just this page.
  =================================================== */

  const exportCSV = useCallback(() => {
    if (filteredQuotations.length === 0) {
      return;
    }

    const headers = [
      "Quotation Number",
      "Title",
      "Customer",
      "Destination",
      "Status",
      "Quotation Value",
      "Created Date",
    ];

    const escapeCSV = (value) => {
      const stringValue = String(value ?? "");

      return `"${stringValue
        .replace(/"/g, '""')
        .replace(/\r?\n|\r/g, " ")}"`;
    };

    const rows = filteredQuotations.map((quotation) => {
      const quotationNumber =
        quotation.quotationNumber ||
        quotation.quoteNumber ||
        quotation.code ||
        "";

      const title =
        quotation.title ||
        quotation.name ||
        "";

      const customer =
        quotation.customer?.name ||
        quotation.customer?.fullName ||
        quotation.customerName ||
        "";

      const destination =
        quotation.destination ||
        quotation.trip?.destination ||
        "";

      const status = quotation.status || "";

      const quotationValue = Number(
        quotation.totalAmount ??
          quotation.grandTotal ??
          quotation.amount ??
          0
      );

      const createdDate = formatDate(
        quotation.createdAt ||
          quotation.quotationDate
      );

      return [
        quotationNumber,
        title,
        customer,
        destination,
        status,
        quotationValue,
        createdDate,
      ];
    });

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) =>
        row.map(escapeCSV).join(",")
      ),
    ].join("\r\n");

    const BOM = "\uFEFF";

    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    link.download = `sales-report-${today}.csv`;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }, [filteredQuotations]);

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">

      {/* HEADER AND FILTERS */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto flex-wrap">

          {/* START DATE */}

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

          {/* END DATE */}

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

          {/* STATUS */}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Prepared">Prepared</option>
            <option value="Sent">Sent</option>
            <option value="Viewed">Viewed</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Accepted">Accepted</option>
          </select>

          {/* SEARCH */}

          <div className="relative w-full sm:w-64">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={15}
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quotation..."
              className="w-full pl-9 pr-8 h-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>

          {/* REFRESH */}

          <button
            type="button"
            onClick={() => fetchSalesReport(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
          >
            <FiRefreshCw
              size={14}
              className={refreshing ? "animate-spin" : ""}
            />

            <span className="hidden sm:inline">
              Refresh
            </span>
          </button>
        </div>

        {/* EXPORT CSV */}

        <button
          type="button"
          onClick={exportCSV}
          disabled={filteredQuotations.length === 0}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-medium rounded-lg transition shadow-brand whitespace-nowrap self-start lg:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* LOADING */}

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

          {/* SUMMARY CARDS */}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

            <SummaryCard
              title="Total Leads"
              value={formatNumber(summary.leads)}
              subtitle="Sales opportunities"
              icon={<FiUsers size={16} />}
              iconClass="bg-blue-50 text-blue-600"
            />

            <SummaryCard
              title="Enquiries"
              value={formatNumber(summary.enquiries)}
              subtitle="Customer enquiries"
              icon={<FiSend size={16} />}
              iconClass="bg-purple-50 text-purple-600"
            />

            <SummaryCard
              title="Quotations"
              value={formatNumber(summary.quotations)}
              subtitle="Quotes created"
              icon={<FiBarChart2 size={16} />}
              iconClass="bg-amber-50 text-amber-600"
            />

            <SummaryCard
              title="Bookings"
              value={formatNumber(summary.bookings)}
              subtitle="Converted bookings"
              icon={<FiCheckCircle size={16} />}
              iconClass="bg-emerald-50 text-emerald-600"
              valueClass="text-emerald-700"
            />
          </div>

          {/* FINANCIAL SUMMARY */}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            <SummaryCard
              title="Quotation Value"
              value={formatCurrency(summary.quotationValue)}
              subtitle="Total quotation value"
              icon={<FiDollarSign size={16} />}
              iconClass="bg-cyan-50 text-cyan-600"
            />

            <SummaryCard
              title="Booking Revenue"
              value={formatCurrency(summary.bookingRevenue)}
              subtitle="Revenue from bookings"
              icon={<FiTrendingUp size={16} />}
              iconClass="bg-emerald-50 text-emerald-600"
              valueClass="text-emerald-700"
            />

            <SummaryCard
              title="Conversion Rate"
              value={formatPercentage(summary.conversionRate)}
              subtitle="Lead to booking"
              icon={<FiActivity size={16} />}
              iconClass="bg-indigo-50 text-indigo-600"
            />
          </div>

          {/* SALES FUNNEL */}

          <div className="rounded-xl border border-gray-200 bg-white p-5">

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Sales Funnel
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Overview of your sales journey from lead to booking
                </p>
              </div>

              <FiTrendingUp
                className="text-gray-400"
                size={18}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FunnelCard
                label="Leads"
                value={formatNumber(summary.leads)}
                hint="New opportunities"
                colorClass="border-blue-100 bg-blue-50 text-blue-700"
              />

              <FunnelCard
                label="Enquiries"
                value={formatNumber(summary.enquiries)}
                hint="Customer interest"
                colorClass="border-purple-100 bg-purple-50 text-purple-700"
              />

              <FunnelCard
                label="Quotations"
                value={formatNumber(summary.quotations)}
                hint="Offers prepared"
                colorClass="border-amber-100 bg-amber-50 text-amber-700"
              />

              <FunnelCard
                label="Bookings"
                value={formatNumber(summary.bookings)}
                hint="Successful conversions"
                colorClass="border-emerald-100 bg-emerald-50 text-emerald-700"
              />
            </div>
          </div>

          {/* STATUS BREAKDOWN */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            <StatusBreakdown
              title="Quotation Status"
              hint="Current quotation pipeline distribution"
              items={quotationStatuses}
              total={summary.quotations}
              barClass="bg-gray-700"
              emptyText="No quotation status data"
            />

            <StatusBreakdown
              title="Booking Status"
              hint="Booking conversion and completion status"
              items={bookingStatuses}
              total={summary.bookings}
              barClass="bg-emerald-500"
              emptyText="No booking status data"
            />
          </div>

          {/* QUOTATION TABLE */}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 gap-3">

              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Quotation Details
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Showing{" "}
                  {formatNumber(filteredQuotations.length)}{" "}
                  quotation
                  {filteredQuotations.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="text-xs text-gray-500 whitespace-nowrap">
                Accepted:{" "}
                <span className="font-semibold text-emerald-600">
                  {formatNumber(summary.acceptedQuotations)}
                </span>
              </div>
            </div>

            {filteredQuotations.length === 0 ? (
              <EmptyState title="No quotations found" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1000px]">

                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/60">
                        {[
                          "Quotation",
                          "Customer",
                          "Destination",
                          "Status",
                          "Value",
                          "Date",
                        ].map((h, i) => (
                          <th
                            key={i}
                            className={`px-5 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${
                              h === "Value"
                                ? "text-right"
                                : "text-left"
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {paginatedQuotations.map(
                        (quotation, index) => {
                          const quotationNumber =
                            quotation.quotationNumber ||
                            quotation.quoteNumber ||
                            quotation.code ||
                            `QT-${(currentPage - 1) * itemsPerPage + index + 1}`;

                          const customer =
                            quotation.customer?.name ||
                            quotation.customer?.fullName ||
                            quotation.customerName ||
                            "—";

                          const destination =
                            quotation.destination ||
                            quotation.trip?.destination ||
                            "—";

                          const value = Number(
                            quotation.totalAmount ??
                              quotation.grandTotal ??
                              quotation.amount ??
                              0
                          );

                          return (
                            <tr
                              key={
                                quotation._id ||
                                quotation.id ||
                                quotationNumber
                              }
                              className="hover:bg-brand-blue-50/40 transition-colors"
                            >
                              <td className="px-5 py-4">
                                <p className="font-semibold text-gray-800 truncate max-w-[180px]">
                                  {quotationNumber}
                                </p>

                                {quotation.title && (
                                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">
                                    {quotation.title}
                                  </p>
                                )}
                              </td>

                              <td className="px-5 py-4 text-gray-700 text-xs truncate max-w-[160px]">
                                {customer}
                              </td>

                              <td className="px-5 py-4 text-gray-600 text-xs truncate max-w-[160px]">
                                {destination}
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClasses(
                                    quotation.status
                                  )}`}
                                >
                                  {quotation.status || "Unknown"}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-right">
                                <span className="font-semibold text-gray-800 whitespace-nowrap">
                                  {formatCurrency(value)}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                                {formatDate(
                                  quotation.createdAt ||
                                    quotation.quotationDate
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION */}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200">

                  <p className="text-sm text-gray-500 text-center sm:text-left">
                    Showing{" "}
                    <span className="font-semibold text-gray-800">
                      {formatNumber(startItem)}-
                      {formatNumber(endItem)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-800">
                      {formatNumber(filteredQuotations.length)}
                    </span>{" "}
                    quotations
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-1.5">

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.max(prev - 1, 1)
                        )
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {Array.from(
                      { length: totalPages },
                      (_, index) => index + 1
                    ).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        aria-current={
                          currentPage === page ? "page" : undefined
                        }
                        className={`min-w-9 px-3 py-2 text-sm border rounded-lg transition ${
                          currentPage === page
                            ? "bg-brand-blue text-white border-brand-blue"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* QUICK METRICS */}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            <QuickMetricCard
              title="Active Pipeline"
              value={formatNumber(
                Math.max(
                  summary.quotations -
                    summary.acceptedQuotations,
                  0
                )
              )}
              icon={<FiClock size={16} />}
              iconClass="bg-blue-50 text-blue-600"
            />

            <QuickMetricCard
              title="Accepted Quotations"
              value={formatNumber(summary.acceptedQuotations)}
              icon={<FiCheckCircle size={16} />}
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <QuickMetricCard
              title="Lead → Booking"
              value={formatPercentage(summary.conversionRate)}
              icon={<FiTrendingUp size={16} />}
              iconClass="bg-purple-50 text-purple-600"
            />
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

          <p
            className={`mt-1.5 text-lg font-bold truncate ${valueClass}`}
          >
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

function FunnelCard({
  label,
  value,
  hint,
  colorClass,
}) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider">
        {label}
      </p>

      <p className="mt-1.5 text-xl font-bold">
        {value}
      </p>

      <p className="mt-0.5 text-[11px] opacity-80">
        {hint}
      </p>
    </div>
  );
}

function StatusBreakdown({
  title,
  hint,
  items,
  total,
  barClass,
  emptyText,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-gray-800">
          {title}
        </h2>

        <p className="mt-0.5 text-xs text-gray-500">
          {hint}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <div className="space-y-2.5">
          {items.map((item, index) => {
            const status =
              item.status ||
              item._id ||
              item.name ||
              "Unknown";

            const count = Number(
              item.count ??
                item.total ??
                item.value ??
                0
            );

            const percentage =
              total > 0 ? (count / total) * 100 : 0;

            return (
              <div
                key={`${status}-${index}`}
                className="rounded-lg border border-gray-100 p-3"
              >
                <div className="flex items-center justify-between gap-4">
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

                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all ${barClass}`}
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
  );
}

function QuickMetricCard({
  title,
  value,
  icon,
  iconClass,
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${iconClass}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">
          {title}
        </p>

        <p className="mt-0.5 text-lg font-bold text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  title = "No data found",
}) {
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

export default SalesReport;


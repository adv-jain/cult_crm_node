const mongoose = require("mongoose");

// =====================================================
// EXISTING CRM MODELS
// =====================================================

const Lead = require("../models/Lead");
const Contact = require("../models/Contact");
const Company = require("../models/Company");
const Trip = require("../models/Trip");
const Activity = require("../models/Activity");
const Task = require("../models/Task");
const User = require("../models/User");

// =====================================================
// TRAVEL CRM MODELS
// =====================================================

const Enquiry = require("../models/Enquiry");
const Customer = require("../models/Customer");
const Quotation = require("../models/Quotation");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Refund = require("../models/Refund");
const Expense = require("../models/Expense");
const Commission = require("../models/Commission");

// =====================================================
// HELPERS
// =====================================================

const toNumber = (value) => {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return 0;
  }

  return number;
};

// =====================================================
// DASHBOARD SCOPE
// =====================================================

const getDashboardScope = async (req) => {
  const role = req.user.role;
  const userId = req.user.id || req.user._id;

  // -------------------------------------------------
  // ADMIN
  // -------------------------------------------------

  if (role === "admin") {
    return {
      userIds: null,
      isAllAccess: true,
    };
  }

  // -------------------------------------------------
  // MANAGER
  // -------------------------------------------------

  if (role === "manager") {
    const salesUsers = await User.find({
      role: "sales",
      isActive: true,
    }).select("_id");

    return {
      userIds: salesUsers.map(
        (user) => user._id
      ),
      isAllAccess: false,
    };
  }

  // -------------------------------------------------
  // SALES
  // -------------------------------------------------

  if (role === "sales") {
    return {
      userIds: [
        new mongoose.Types.ObjectId(userId),
      ],
      isAllAccess: false,
    };
  }

  // -------------------------------------------------
  // ACCOUNTS
  // -------------------------------------------------

  if (role === "accounts") {
    return {
      userIds: null,
      isAllAccess: true,
    };
  }

  // -------------------------------------------------
  // OPERATIONS
  // -------------------------------------------------

  if (role === "operations") {
    return {
      userIds: null,
      isAllAccess: true,
    };
  }

  // -------------------------------------------------
  // NO ACCESS
  // -------------------------------------------------

  return {
    userIds: [],
    isAllAccess: false,
  };
};

// =====================================================
// OWNER FILTER
// =====================================================

const getOwnerFilter = (scope, field) => {
  if (scope.isAllAccess) {
    return {};
  }

  return {
    [field]: {
      $in: scope.userIds,
    },
  };
};

// =====================================================
// BOOKING FILTER
// =====================================================

const getBookingFilter = (scope) => {
  if (scope.isAllAccess) {
    return {};
  }

  return {
    salesOwner: {
      $in: scope.userIds,
    },
  };
};

// =====================================================
// DASHBOARD SUMMARY
// =====================================================

const getDashboardSummary = async (req, res) => {
  try {
    const scope =
      await getDashboardScope(req);

    // =================================================
    // LEADS
    // =================================================

    const leadFilter =
      getOwnerFilter(
        scope,
        "assignedTo"
      );

    const totalLeads =
      await Lead.countDocuments(
        leadFilter
      );

    const newLeads =
      await Lead.countDocuments({
        ...leadFilter,
        status: "New",
      });

    const qualifiedLeads =
      await Lead.countDocuments({
        ...leadFilter,
        status: "Qualified",
      });

    const convertedLeads =
      await Lead.countDocuments({
        ...leadFilter,
        status: {
          $in: [
            "Converted",
            "Converted to Customer",
          ],
        },
      });

    // =================================================
    // CONTACTS
    // =================================================

    const contactFilter =
      getOwnerFilter(
        scope,
        "owner"
      );

    const totalContacts =
      await Contact.countDocuments(
        contactFilter
      );

    // =================================================
    // TRIPS
    // =================================================

    const tripFilter =
      getOwnerFilter(
        scope,
        "owner"
      );

    const totalTrips =
      await Trip.countDocuments(
        tripFilter
      );

    const activeTrips =
      await Trip.countDocuments({
        ...tripFilter,
        status: {
          $nin: [
            "Completed",
            "Cancelled",
          ],
        },
      });

    const confirmedTrips =
      await Trip.countDocuments({
        ...tripFilter,
        status: "Confirmed",
      });

    // =================================================
    // TRIP PIPELINE VALUE
    // =================================================

    const tripPipelineResult =
      await Trip.aggregate([
        {
          $match: {
            ...tripFilter,

            status: {
              $nin: [
                "Completed",
                "Cancelled",
              ],
            },
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      {
                        $ifNull: [
                          "$totalAmount",
                          0,
                        ],
                      },
                      0,
                    ],
                  },

                  {
                    $ifNull: [
                      "$totalAmount",
                      0,
                    ],
                  },

                  {
                    $ifNull: [
                      "$estimatedValue",
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      ]);

    const pipelineValue =
      tripPipelineResult.length
        ? toNumber(
            tripPipelineResult[0].total
          )
        : 0;

    // =================================================
    // TRIP REVENUE
    // =================================================

    const tripRevenueResult =
      await Trip.aggregate([
        {
          $match: {
            ...tripFilter,

            status: {
              $in: [
                "Confirmed",
                "Upcoming",
                "Ongoing",
                "Completed",
              ],
            },
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const tripRevenue =
      tripRevenueResult.length
        ? toNumber(
            tripRevenueResult[0].total
          )
        : 0;

    // =================================================
    // ENQUIRIES
    // =================================================

    const totalEnquiries =
      scope.isAllAccess
        ? await Enquiry.countDocuments()
        : await Enquiry.countDocuments({
            $or: [
              {
                assignedTo: {
                  $in: scope.userIds,
                },
              },

              {
                owner: {
                  $in: scope.userIds,
                },
              },

              {
                salesOwner: {
                  $in: scope.userIds,
                },
              },
            ],
          });

    // =================================================
    // CUSTOMERS
    // =================================================

    const totalCustomers =
      scope.isAllAccess
        ? await Customer.countDocuments()
        : await Customer.countDocuments({
            owner: {
              $in: scope.userIds,
            },
          });

    // =================================================
    // QUOTATIONS
    // =================================================

    // IMPORTANT:
    // Quotation model has:
    // preparedBy
    // assignedTo
    //
    // It does NOT have:
    // createdBy
    // salesOwner

    const totalQuotations =
      scope.isAllAccess
        ? await Quotation.countDocuments()
        : await Quotation.countDocuments({
            $or: [
              {
                preparedBy: {
                  $in: scope.userIds,
                },
              },

              {
                assignedTo: {
                  $in: scope.userIds,
                },
              },
            ],
          });

    // =================================================
    // BOOKINGS
    // =================================================

    const bookingFilter =
      getBookingFilter(scope);

    const totalBookings =
      await Booking.countDocuments(
        bookingFilter
      );

    // =================================================
    // BOOKING REVENUE
    // =================================================

    const bookingRevenueResult =
      await Booking.aggregate([
        {
          $match: bookingFilter,
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const bookingRevenue =
      bookingRevenueResult.length
        ? toNumber(
            bookingRevenueResult[0].total
          )
        : 0;

    // =================================================
    // BOOKING COST
    // =================================================

    const bookingCostResult =
      await Booking.aggregate([
        {
          $match: bookingFilter,
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$totalCost",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const bookingCost =
      bookingCostResult.length
        ? toNumber(
            bookingCostResult[0].total
          )
        : 0;

    // =================================================
    // BOOKING PROFIT
    // =================================================

    const bookingProfitResult =
      await Booking.aggregate([
        {
          $match: bookingFilter,
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$profitAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const bookingProfit =
      bookingProfitResult.length
        ? toNumber(
            bookingProfitResult[0].total
          )
        : 0;

    // =================================================
    // PAYMENT
    // =================================================

    const bookingsForPayments =
      scope.isAllAccess
        ? null
        : await Booking.find(
            bookingFilter
          ).select("_id");

    const paymentFilter =
      scope.isAllAccess
        ? {}
        : {
            booking: {
              $in: bookingsForPayments.map(
                (booking) => booking._id
              ),
            },
          };

    const paymentResult =
      await Payment.aggregate([
        {
          $match: paymentFilter,
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "Completed",
                    ],
                  },

                  {
                    $ifNull: [
                      "$amount",
                      0,
                    ],
                  },

                  0,
                ],
              },
            },
          },
        },
      ]);

    const totalPayments =
      paymentResult.length
        ? toNumber(
            paymentResult[0].total
          )
        : 0;

    // =================================================
    // EXPENSE
    // =================================================

    const expenseResult =
      await Expense.aggregate([
        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const totalExpenses =
      expenseResult.length
        ? toNumber(
            expenseResult[0].total
          )
        : 0;

    // =================================================
    // REFUNDS
    // =================================================

    const refundResult =
      await Refund.aggregate([
        {
          $match: {
            status: "Completed",
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const totalRefunds =
      refundResult.length
        ? toNumber(
            refundResult[0].total
          )
        : 0;

    // =================================================
    // COMMISSION
    // =================================================

    const commissionResult =
      await Commission.aggregate([
        {
          $match: {
            status: {
              $in: [
                "Paid",
                "Payable",
                "Approved",
                "Pending",
              ],
            },
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$commissionAmount",
                  0,
                ],
              },
            },

            paid: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "Paid",
                    ],
                  },

                  {
                    $ifNull: [
                      "$commissionAmount",
                      0,
                    ],
                  },

                  0,
                ],
              },
            },
          },
        },
      ]);

    const totalCommission =
      commissionResult.length
        ? toNumber(
            commissionResult[0].total
          )
        : 0;

    const paidCommission =
      commissionResult.length
        ? toNumber(
            commissionResult[0].paid
          )
        : 0;

    // =================================================
    // PAYMENT DUE
    // =================================================

    const paymentDueResult =
      await Booking.aggregate([
        {
          $match: bookingFilter,
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: {
                $ifNull: [
                  "$amountDue",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const paymentDue =
      paymentDueResult.length
        ? toNumber(
            paymentDueResult[0].total
          )
        : 0;

    // =================================================
    // UPCOMING TRIPS
    // =================================================

    const upcomingTrips =
      await Trip.countDocuments({
        ...tripFilter,

        startDate: {
          $gte: new Date(),
        },

        status: {
          $nin: [
            "Completed",
            "Cancelled",
          ],
        },
      });

    // =================================================
    // NET PROFIT
    // =================================================

    const netProfit =
      bookingRevenue -
      totalExpenses -
      totalRefunds -
      totalCommission;

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      message:
        "Dashboard summary fetched successfully",

      role: req.user.role,

      summary: {
        totalLeads,
        newLeads,
        qualifiedLeads,
        convertedLeads,

        totalContacts,

        totalTrips,
        activeTrips,
        confirmedTrips,

        pipelineValue,
        tripRevenue,

        totalEnquiries,
        totalCustomers,
        totalQuotations,
        totalBookings,

        totalRevenue:
          bookingRevenue,

        totalPayments,
        totalExpenses,
        totalRefunds,

        totalCommission,
        paidCommission,

        paymentDue,

        bookingCost,
        bookingProfit,
        netProfit,

        upcomingTrips,
      },
    });
  } catch (error) {
    console.error(
      "Dashboard Summary Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch dashboard summary",

      error: error.message,
    });
  }
};

// =====================================================
// QUOTATION PIPELINE
// =====================================================

const getDashboardPipeline = async (
  req,
  res
) => {
  try {
    const scope =
      await getDashboardScope(req);

    // -------------------------------------------------
    // QUOTATION FILTER
    // -------------------------------------------------

    let quotationFilter = {};

    if (!scope.isAllAccess) {
      quotationFilter = {
        $or: [
          {
            preparedBy: {
              $in: scope.userIds,
            },
          },

          {
            assignedTo: {
              $in: scope.userIds,
            },
          },
        ],
      };
    }

    // -------------------------------------------------
    // QUOTATION AGGREGATION
    // -------------------------------------------------

    const pipeline =
      await Quotation.aggregate([
        {
          $match: quotationFilter,
        },

        {
          $group: {
            _id: "$status",

            quotationCount: {
              $sum: 1,
            },

            totalValue: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    // -------------------------------------------------
    // MAIN QUOTATION PIPELINE
    // -------------------------------------------------

    const stages = [
      "Draft",
      "Prepared",
      "Sent",
      "Viewed",
      "Negotiation",
      "Accepted",
    ];

    // -------------------------------------------------
    // FORMAT PIPELINE
    // -------------------------------------------------

    const formattedPipeline =
      stages.map((stage) => {
        const found =
          pipeline.find(
            (item) =>
              item._id === stage
          );

        return {
          stage,

          quotationCount:
            found
              ? found.quotationCount
              : 0,

          count:
            found
              ? found.quotationCount
              : 0,

          totalValue:
            found
              ? toNumber(
                  found.totalValue
                )
              : 0,
        };
      });

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(200).json({
      message:
        "Quotation pipeline fetched successfully",

      role: req.user.role,

      pipeline:
        formattedPipeline,
    });
  } catch (error) {
    console.error(
      "Dashboard Quotation Pipeline Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch quotation pipeline",

      error: error.message,
    });
  }
};

// =====================================================
// LEAD SOURCES
// =====================================================

const getDashboardLeadSources = async (
  req,
  res
) => {
  try {
    const scope =
      await getDashboardScope(req);

    const leadFilter =
      getOwnerFilter(
        scope,
        "assignedTo"
      );

    const leadSources =
      await Lead.aggregate([
        {
          $match: leadFilter,
        },

        {
          $group: {
            _id: "$source",

            leadCount: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            leadCount: -1,
          },
        },
      ]);

    const sources =
      leadSources.map(
        (item) => ({
          source:
            item._id ||
            "Unknown",

          leadCount:
            item.leadCount,

          count:
            item.leadCount,
        })
      );

    return res.status(200).json({
      message:
        "Lead sources fetched successfully",

      role: req.user.role,

      sources,
    });
  } catch (error) {
    console.error(
      "Dashboard Lead Sources Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch lead sources",

      error: error.message,
    });
  }
};

// =====================================================
// MONTHLY REVENUE
// =====================================================

const getDashboardMonthlyRevenue = async (
  req,
  res
) => {
  try {
    const scope =
      await getDashboardScope(req);

    const bookingFilter =
      getBookingFilter(scope);

    const currentYear =
      new Date().getFullYear();

    const monthlyRevenue =
      await Booking.aggregate([
        {
          $match: {
            ...bookingFilter,

            bookingDate: {
              $gte: new Date(
                `${currentYear}-01-01T00:00:00.000Z`
              ),

              $lte: new Date(
                `${currentYear}-12-31T23:59:59.999Z`
              ),
            },
          },
        },

        {
          $group: {
            _id: {
              $month: "$bookingDate",
            },

            revenue: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },

            bookings: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const result =
      monthNames.map(
        (month, index) => {
          const monthNumber =
            index + 1;

          const found =
            monthlyRevenue.find(
              (item) =>
                item._id ===
                monthNumber
            );

          return {
            month,

            monthNumber,

            revenue:
              found
                ? toNumber(
                    found.revenue
                  )
                : 0,

            bookings:
              found
                ? found.bookings
                : 0,
          };
        }
      );

    return res.status(200).json({
      message:
        "Monthly revenue fetched successfully",

      year: currentYear,

      monthlyRevenue:
        result,

      data:
        result,
    });
  } catch (error) {
    console.error(
      "Monthly Revenue Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch monthly revenue",

      error: error.message,
    });
  }
};

// =====================================================
// BOOKING STATUS
// =====================================================

const getDashboardBookingStatus = async (
  req,
  res
) => {
  try {
    const scope =
      await getDashboardScope(req);

    const bookingFilter =
      getBookingFilter(scope);

    const result =
      await Booking.aggregate([
        {
          $match:
            bookingFilter,
        },

        {
          $group: {
            _id: "$status",

            bookingCount: {
              $sum: 1,
            },

            totalAmount: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },

        {
          $sort: {
            bookingCount: -1,
          },
        },
      ]);

    const bookingStatus =
      result.map(
        (item) => ({
          status:
            item._id ||
            "Unknown",

          bookingCount:
            item.bookingCount,

          count:
            item.bookingCount,

          totalAmount:
            toNumber(
              item.totalAmount
            ),
        })
      );

    return res.status(200).json({
      message:
        "Booking status fetched successfully",

      bookingStatus,

      statuses:
        bookingStatus,
    });
  } catch (error) {
    console.error(
      "Booking Status Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch booking status",

      error: error.message,
    });
  }
};

// =====================================================
// PAYMENT STATUS
// =====================================================

const getDashboardPaymentStatus = async (
  req,
  res
) => {
  try {
    const scope =
      await getDashboardScope(req);

    const bookingFilter =
      getBookingFilter(scope);

    const bookings =
      await Booking.find(
        bookingFilter
      ).select("_id");

    const bookingIds =
      bookings.map(
        (booking) =>
          booking._id
      );

    const paymentFilter =
      scope.isAllAccess
        ? {}
        : {
            booking: {
              $in: bookingIds,
            },
          };

    const result =
      await Payment.aggregate([
        {
          $match:
            paymentFilter,
        },

        {
          $group: {
            _id: "$status",

            paymentCount: {
              $sum: 1,
            },

            totalAmount: {
              $sum: {
                $ifNull: [
                  "$amount",
                  0,
                ],
              },
            },
          },
        },

        {
          $sort: {
            paymentCount: -1,
          },
        },
      ]);

    const paymentStatus =
      result.map(
        (item) => ({
          status:
            item._id ||
            "Unknown",

          paymentCount:
            item.paymentCount,

          count:
            item.paymentCount,

          totalAmount:
            toNumber(
              item.totalAmount
            ),
        })
      );

    return res.status(200).json({
      message:
        "Payment status fetched successfully",

      paymentStatus,

      statuses:
        paymentStatus,
    });
  } catch (error) {
    console.error(
      "Payment Status Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch payment status",

      error: error.message,
    });
  }
};

// =====================================================
// TOP DESTINATIONS
// =====================================================

const getDashboardDestinations = async (
  req,
  res
) => {
  try {
    const scope =
      await getDashboardScope(req);

    const bookingFilter =
      getBookingFilter(scope);

    const destinations =
      await Booking.aggregate([
        {
          $match:
            bookingFilter,
        },

        {
          $group: {
            _id: "$destination",

            bookingCount: {
              $sum: 1,
            },

            revenue: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },

            profit: {
              $sum: {
                $ifNull: [
                  "$profitAmount",
                  0,
                ],
              },
            },
          },
        },

        {
          $sort: {
            bookingCount: -1,
          },
        },

        {
          $limit: 10,
        },
      ]);

    const result =
      destinations.map(
        (item) => ({
          destination:
            item._id ||
            "Unknown",

          bookingCount:
            item.bookingCount,

          count:
            item.bookingCount,

          revenue:
            toNumber(
              item.revenue
            ),

          profit:
            toNumber(
              item.profit
            ),
        })
      );

    return res.status(200).json({
      message:
        "Top destinations fetched successfully",

      destinations:
        result,
    });
  } catch (error) {
    console.error(
      "Dashboard Destination Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch destinations",

      error: error.message,
    });
  }
};

// =====================================================
// TRAVEL TYPES
// =====================================================

const getDashboardTravelTypes = async (
  req,
  res
) => {
  try {
    const scope =
      await getDashboardScope(req);

    const bookingFilter =
      getBookingFilter(scope);

    const travelTypes =
      await Booking.aggregate([
        {
          $match:
            bookingFilter,
        },

        {
          $group: {
            _id: "$travelType",

            bookingCount: {
              $sum: 1,
            },

            revenue: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },

        {
          $sort: {
            bookingCount: -1,
          },
        },
      ]);

    const result =
      travelTypes.map(
        (item) => ({
          travelType:
            item._id ||
            "Unknown",

          bookingCount:
            item.bookingCount,

          count:
            item.bookingCount,

          revenue:
            toNumber(
              item.revenue
            ),
        })
      );

    return res.status(200).json({
      message:
        "Travel type data fetched successfully",

      travelTypes:
        result,
    });
  } catch (error) {
    console.error(
      "Travel Type Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch travel type data",

      error: error.message,
    });
  }
};

// =====================================================
// RECENT ACTIVITIES + UPCOMING TASKS
// =====================================================

const getDashboardRecent = async (
  req,
  res
) => {
  try {
    const scope =
      await getDashboardScope(req);

    // =================================================
    // TASK FILTER
    // =================================================

    const taskFilter = {
      status: {
        $in: [
          "Pending",
          "In Progress",
        ],
      },

      dueDate: {
        $gte: new Date(),
      },
    };

    if (!scope.isAllAccess) {
      taskFilter.assignedTo = {
        $in: scope.userIds,
      };
    }

    // =================================================
    // UPCOMING TASKS
    // =================================================

    const upcomingTasks =
      await Task.find(taskFilter)
        .sort({
          dueDate: 1,
        })
        .limit(5)

        .populate(
          "assignedTo",
          "name email role"
        )

        .populate(
          "createdBy",
          "name email role"
        )

        .populate(
          "relatedLead",
          "firstName lastName email"
        )

        .populate(
          "relatedContact",
          "firstName lastName email"
        )

        .populate(
          "relatedCompany",
          "name email"
        )

        .populate(
          "relatedTrip",
          "title tripCode destination startDate endDate status totalAmount estimatedValue"
        )

        .populate(
          "relatedCustomer",
          "name email phone"
        )

        .populate(
          "relatedBooking",
          "bookingNumber destination status totalAmount amountDue"
        );

    // =================================================
    // ACTIVITY FILTER
    // =================================================

    let activityFilter = {};

    if (!scope.isAllAccess) {
      // ------------------------------------------------
      // SALES LEADS
      // ------------------------------------------------

      const salesLeads =
        await Lead.find({
          assignedTo: {
            $in: scope.userIds,
          },
        }).select("_id");

      const leadIds =
        salesLeads.map(
          (lead) => lead._id
        );

      // ------------------------------------------------
      // SALES CONTACTS
      // ------------------------------------------------

      const salesContacts =
        await Contact.find({
          owner: {
            $in: scope.userIds,
          },
        }).select("_id");

      const contactIds =
        salesContacts.map(
          (contact) =>
            contact._id
        );

      // ------------------------------------------------
      // SALES COMPANIES
      // ------------------------------------------------

      const salesCompanies =
        await Company.find({
          owner: {
            $in: scope.userIds,
          },
        }).select("_id");

      const companyIds =
        salesCompanies.map(
          (company) =>
            company._id
        );

      // ------------------------------------------------
      // SALES TRIPS
      // ------------------------------------------------

      const salesTrips =
        await Trip.find({
          owner: {
            $in: scope.userIds,
          },
        }).select("_id");

      const tripIds =
        salesTrips.map(
          (trip) =>
            trip._id
        );

      // ------------------------------------------------
      // ACTIVITY FILTER
      // ------------------------------------------------

      activityFilter = {
        $or: [
          {
            createdBy: {
              $in: scope.userIds,
            },
          },

          {
            lead: {
              $in: leadIds,
            },
          },

          {
            contact: {
              $in: contactIds,
            },
          },

          {
            company: {
              $in: companyIds,
            },
          },

          {
            trip: {
              $in: tripIds,
            },
          },
        ],
      };
    }

    // =================================================
    // RECENT ACTIVITIES
    // =================================================

    const recentActivities =
      await Activity.find(
        activityFilter
      )
        .sort({
          createdAt: -1,
        })
        .limit(5)

        .populate(
          "createdBy",
          "name email role"
        )

        .populate(
          "lead",
          "firstName lastName email"
        )

        .populate(
          "customer",
          "name email phone"
        )

        .populate(
          "contact",
          "firstName lastName email"
        )

        .populate(
          "company",
          "name email"
        )

        .populate(
          "trip",
          "title tripCode destination startDate endDate status totalAmount estimatedValue owner"
        )

        .populate(
          "booking",
          "bookingNumber destination status totalAmount amountDue"
        );

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      message:
        "Recent dashboard data fetched successfully",

      role:
        req.user.role,

      recentActivities,

      upcomingTasks,
    });
  } catch (error) {
    console.error(
      "Dashboard Recent Data Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch recent dashboard data",

      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getDashboardSummary,
  getDashboardPipeline,
  getDashboardLeadSources,
  getDashboardMonthlyRevenue,
  getDashboardBookingStatus,
  getDashboardPaymentStatus,
  getDashboardDestinations,
  getDashboardTravelTypes,
  getDashboardRecent,
};
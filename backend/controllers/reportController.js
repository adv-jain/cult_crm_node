const mongoose = require("mongoose");

const Lead = require("../models/Lead");
const Enquiry = require("../models/Enquiry");
const Quotation = require("../models/Quotation");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Expense = require("../models/Expense");
const Refund = require("../models/Refund");
const Commission = require("../models/Commission");
const Customer = require("../models/Customer");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value);

const toNumber = (value) =>
  Number(value || 0);

const getDateFilter = (
  query,
  field = "createdAt"
) => {
  const filter = {};

  if (query.startDate || query.endDate) {
    filter[field] = {};

    if (query.startDate) {
      const start = new Date(query.startDate);

      if (!Number.isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        filter[field].$gte = start;
      }
    }

    if (query.endDate) {
      const end = new Date(query.endDate);

      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        filter[field].$lte = end;
      }
    }

    if (!Object.keys(filter[field]).length) {
      delete filter[field];
    }
  }

  return filter;
};

const addObjectIdFilter = (
  filter,
  field,
  value
) => {
  if (
    value &&
    isValidObjectId(value)
  ) {
    filter[field] =
      new mongoose.Types.ObjectId(value);
  }
};

const addCommonBookingFilters = (
  filter,
  query
) => {
  if (query.status) {
    filter.status = query.status;
  }

  if (query.paymentStatus) {
    filter.paymentStatus =
      query.paymentStatus;
  }

  if (query.destination) {
    filter.destination = {
      $regex: query.destination,
      $options: "i",
    };
  }

  if (query.travelType) {
    filter.travelType =
      query.travelType;
  }

  addObjectIdFilter(
    filter,
    "salesOwner",
    query.salesOwner
  );

  addObjectIdFilter(
    filter,
    "customer",
    query.customer
  );

  return filter;
};

const getDateRangeLabel = (
  query
) => {
  if (
    query.startDate &&
    query.endDate
  ) {
    return {
      startDate: query.startDate,
      endDate: query.endDate,
    };
  }

  return {
    startDate: null,
    endDate: null,
  };
};

/*
|--------------------------------------------------------------------------
| OVERVIEW REPORT
|--------------------------------------------------------------------------
*/

const getOverviewReport = async (
  req,
  res
) => {
  try {
    const bookingFilter = {
      ...getDateFilter(
        req.query,
        "createdAt"
      ),
    };

    addCommonBookingFilters(
      bookingFilter,
      req.query
    );

    const paymentFilter = {
      ...getDateFilter(
        req.query,
        "paymentDate"
      ),
      status: "Completed",
    };

    const expenseFilter = {
      ...getDateFilter(
        req.query,
        "expenseDate"
      ),
      status: "Paid",
    };

    const refundFilter = {
      ...getDateFilter(
        req.query,
        "refundDate"
      ),
      status: "Completed",
    };

    const commissionFilter = {
      ...getDateFilter(
        req.query,
        "paymentDate"
      ),
      status: "Paid",
    };

    const [
      leads,
      enquiries,
      quotations,
      bookings,
      customers,
      revenue,
      bookingFinancials,
      expenses,
      refunds,
      commissions,
    ] = await Promise.all([
      Lead.countDocuments(
        getDateFilter(req.query)
      ),

      Enquiry.countDocuments(
        getDateFilter(req.query)
      ),

      Quotation.countDocuments(
        getDateFilter(req.query)
      ),

      Booking.countDocuments(
        bookingFilter
      ),

      Customer.countDocuments(
        getDateFilter(req.query)
      ),

      Payment.aggregate([
        {
          $match: paymentFilter,
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),

      Booking.aggregate([
        {
          $match: bookingFilter,
        },
        {
          $group: {
            _id: null,
            revenue: {
              $sum: "$totalAmount",
            },
            cost: {
              $sum: "$totalCost",
            },
            profit: {
              $sum: "$profit",
            },
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: expenseFilter,
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),

      Refund.aggregate([
        {
          $match: refundFilter,
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]),

      Commission.aggregate([
        {
          $match: commissionFilter,
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$commissionAmount",
            },
          },
        },
      ]),
    ]);

    const revenueTotal =
      toNumber(
        revenue[0]?.total
      );

    const bookingRevenue =
      toNumber(
        bookingFinancials[0]?.revenue
      );

    const bookingCost =
      toNumber(
        bookingFinancials[0]?.cost
      );

    const grossProfit =
      bookingRevenue -
      bookingCost;

    const expenseTotal =
      toNumber(
        expenses[0]?.total
      );

    const refundTotal =
      toNumber(
        refunds[0]?.total
      );

    const commissionTotal =
      toNumber(
        commissions[0]?.total
      );

    const netProfit =
      grossProfit -
      refundTotal -
      commissionTotal -
      expenseTotal;

    const conversionRate =
      leads > 0
        ? (bookings / leads) * 100
        : 0;

    res.json({
      success: true,

      period:
        getDateRangeLabel(
          req.query
        ),

      summary: {
        leads,
        enquiries,
        quotations,
        bookings,
        customers,

        bookingRevenue,

        collectedRevenue:
          revenueTotal,

        bookingCost,

        grossProfit,

        refunds:
          refundTotal,

        commissions:
          commissionTotal,

        expenses:
          expenseTotal,

        netProfit,

        conversionRate:
          Number(
            conversionRate.toFixed(2)
          ),
      },
    });
  } catch (error) {
    console.error(
      "Overview report error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to generate overview report",

      error:
        error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| SALES REPORT
|--------------------------------------------------------------------------
*/

const getSalesReport = async (
  req,
  res
) => {
  try {
    const leadFilter =
      getDateFilter(
        req.query,
        "createdAt"
      );

    const enquiryFilter =
      getDateFilter(
        req.query,
        "createdAt"
      );

    const quotationFilter =
      getDateFilter(
        req.query,
        "createdAt"
      );

    const bookingFilter = {
      ...getDateFilter(
        req.query,
        "createdAt"
      ),
    };

    addCommonBookingFilters(
      bookingFilter,
      req.query
    );

    const [
      leads,
      enquiries,
      quotationCount,
      bookings,
      bookingStats,
      quotations,
    ] = await Promise.all([
      Lead.countDocuments(
        leadFilter
      ),

      Enquiry.countDocuments(
        enquiryFilter
      ),

      Quotation.countDocuments(
        quotationFilter
      ),

      Booking.countDocuments(
        bookingFilter
      ),

      Booking.aggregate([
        {
          $match:
            bookingFilter,
        },

        {
          $group: {
            _id: null,

            totalRevenue: {
              $sum: "$totalAmount",
            },

            totalCost: {
              $sum: "$totalCost",
            },

            totalProfit: {
              $sum: "$profit",
            },
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | Detailed Quotations
      |--------------------------------------------------------------------------
      */

      Quotation.find(
        quotationFilter
      )
        .populate(
          "customer",
          "name email phone"
        )
        .populate(
          "enquiry",
          "title destination travelDate returnDate"
        )
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .lean(),
    ]);

    const totalRevenue =
      toNumber(
        bookingStats[0]
          ?.totalRevenue
      );

    const totalCost =
      toNumber(
        bookingStats[0]
          ?.totalCost
      );

    const totalProfit =
      toNumber(
        bookingStats[0]
          ?.totalProfit
      );

    const conversionRate =
      leads > 0
        ? (bookings / leads) * 100
        : 0;

    res.json({
      success: true,

      period:
        getDateRangeLabel(
          req.query
        ),

      summary: {
        leads,

        enquiries,

        quotations:
          quotationCount,

        bookings,

        conversionRate:
          Number(
            conversionRate.toFixed(2)
          ),

        totalRevenue,

        totalCost,

        totalProfit,
      },

      quotations,
    });
  } catch (error) {
    console.error(
      "Sales report error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to generate sales report",

      error:
        error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| BOOKING REPORT
|--------------------------------------------------------------------------
*/

const getBookingReport = async (
  req,
  res
) => {
  try {
    const filter = {
      ...getDateFilter(
        req.query,
        "createdAt"
      ),
    };

    addCommonBookingFilters(
      filter,
      req.query
    );

    const [
      summary,
      statusBreakdown,
      destinationBreakdown,
      travelTypeBreakdown,
      bookings,
    ] = await Promise.all([
      Booking.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: null,

            count: {
              $sum: 1,
            },

            totalAmount: {
              $sum: "$totalAmount",
            },

            totalCost: {
              $sum: "$totalCost",
            },

            totalProfit: {
              $sum: "$profit",
            },

            totalPaid: {
              $sum: "$amountPaid",
            },

            totalDue: {
              $sum: "$amountDue",
            },
          },
        },
      ]),

      Booking.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: "$status",

            count: {
              $sum: 1,
            },

            amount: {
              $sum: "$totalAmount",
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      Booking.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: "$destination",

            count: {
              $sum: 1,
            },

            revenue: {
              $sum: "$totalAmount",
            },

            profit: {
              $sum: "$profit",
            },
          },
        },

        {
          $sort: {
            revenue: -1,
          },
        },
      ]),

      Booking.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: "$travelType",

            count: {
              $sum: 1,
            },

            revenue: {
              $sum: "$totalAmount",
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      Booking.find(filter)
        .populate(
          "customer",
          "name email phone"
        )
        .populate(
          "salesOwner",
          "name email"
        )
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .lean(),
    ]);

    res.json({
      success: true,

      period:
        getDateRangeLabel(
          req.query
        ),

      summary:
        summary[0] || {
          count: 0,
          totalAmount: 0,
          totalCost: 0,
          totalProfit: 0,
          totalPaid: 0,
          totalDue: 0,
        },

      statusBreakdown,

      destinationBreakdown,

      travelTypeBreakdown,

      bookings,
    });
  } catch (error) {
    console.error(
      "Booking report error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to generate booking report",

      error:
        error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| REVENUE REPORT
|--------------------------------------------------------------------------
*/

const getRevenueReport = async (
  req,
  res
) => {
  try {
    const bookingFilter = {
      ...getDateFilter(
        req.query,
        "createdAt"
      ),
    };

    addCommonBookingFilters(
      bookingFilter,
      req.query
    );

    /*
    |--------------------------------------------------------------------------
    | ALL PAYMENTS
    |--------------------------------------------------------------------------
    */

    const allPaymentFilter = {
      ...getDateFilter(
        req.query,
        "paymentDate"
      ),
    };

    /*
    |--------------------------------------------------------------------------
    | COMPLETED PAYMENTS
    |--------------------------------------------------------------------------
    */

    const completedPaymentFilter = {
      ...getDateFilter(
        req.query,
        "paymentDate"
      ),

      status: "Completed",
    };

    const [
      bookingRevenue,
      paymentRevenue,
      monthlyRevenue,
      destinationRevenue,
      salespersonRevenue,
      payments,
    ] = await Promise.all([
      Booking.aggregate([
        {
          $match:
            bookingFilter,
        },

        {
          $group: {
            _id: null,

            totalRevenue: {
              $sum: "$totalAmount",
            },

            totalCost: {
              $sum: "$totalCost",
            },

            totalProfit: {
              $sum: "$profit",
            },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match:
            completedPaymentFilter,
        },

        {
          $group: {
            _id: null,

            totalCollected: {
              $sum: "$amount",
            },

            paymentCount: {
              $sum: 1,
            },
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | Monthly Revenue
      |--------------------------------------------------------------------------
      */

      Payment.aggregate([
        {
          $match:
            completedPaymentFilter,
        },

        {
          $group: {
            _id: {
              year: {
                $year:
                  "$paymentDate",
              },

              month: {
                $month:
                  "$paymentDate",
              },
            },

            amount: {
              $sum: "$amount",
            },
          },
        },

        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | Destination Revenue
      |--------------------------------------------------------------------------
      */

      Payment.aggregate([
        {
          $match:
            completedPaymentFilter,
        },

        {
          $lookup: {
            from: "bookings",

            localField: "booking",

            foreignField: "_id",

            as: "bookingData",
          },
        },

        {
          $unwind: {
            path:
              "$bookingData",

            preserveNullAndEmptyArrays:
              true,
          },
        },

        {
          $group: {
            _id:
              "$bookingData.destination",

            amount: {
              $sum: "$amount",
            },
          },
        },

        {
          $sort: {
            amount: -1,
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | Salesperson Revenue
      |--------------------------------------------------------------------------
      */

      Payment.aggregate([
        {
          $match:
            completedPaymentFilter,
        },

        {
          $lookup: {
            from: "bookings",

            localField: "booking",

            foreignField: "_id",

            as: "bookingData",
          },
        },

        {
          $unwind: {
            path:
              "$bookingData",

            preserveNullAndEmptyArrays:
              true,
          },
        },

        {
          $lookup: {
            from: "users",

            localField:
              "bookingData.salesOwner",

            foreignField: "_id",

            as: "salesOwnerData",
          },
        },

        {
          $unwind: {
            path:
              "$salesOwnerData",

            preserveNullAndEmptyArrays:
              true,
          },
        },

        {
          $group: {
            _id: {
              id:
                "$salesOwnerData._id",

              name:
                "$salesOwnerData.name",
            },

            amount: {
              $sum: "$amount",
            },
          },
        },

        {
          $sort: {
            amount: -1,
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | ALL PAYMENT RECORDS
      |--------------------------------------------------------------------------
      */

      Payment.find(
        allPaymentFilter
      )
        .populate(
          "customer",
          "name email phone"
        )
        .populate(
          "booking",
          "bookingNumber bookingCode destination totalAmount"
        )
        .populate(
          "invoice",
          "invoiceNumber totalAmount amountPaid amountDue"
        )
        .populate(
          "receivedBy",
          "name email"
        )
        .sort({
          paymentDate: -1,
        })
        .limit(100)
        .lean(),
    ]);

    res.json({
      success: true,

      period:
        getDateRangeLabel(
          req.query
        ),

      summary: {
        bookingRevenue:
          toNumber(
            bookingRevenue[0]
              ?.totalRevenue
          ),

        bookingCost:
          toNumber(
            bookingRevenue[0]
              ?.totalCost
          ),

        bookingProfit:
          toNumber(
            bookingRevenue[0]
              ?.totalProfit
          ),

        collectedRevenue:
          toNumber(
            paymentRevenue[0]
              ?.totalCollected
          ),

        paymentCount:
          toNumber(
            paymentRevenue[0]
              ?.paymentCount
          ),
      },

      monthlyRevenue,

      destinationRevenue,

      salespersonRevenue,

      payments,
    });
  } catch (error) {
    console.error(
      "Revenue report error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to generate revenue report",

      error:
        error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| EXPENSE REPORT
|--------------------------------------------------------------------------
*/

const getExpenseReport = async (
  req,
  res
) => {
  try {
    const filter = {
      ...getDateFilter(
        req.query,
        "expenseDate"
      ),
    };

    if (req.query.category) {
      filter.category =
        req.query.category;
    }

    if (req.query.status) {
      filter.status =
        req.query.status;
    }

    const [
      summary,
      categoryBreakdown,
      monthlyBreakdown,
      statusBreakdown,
      expenses,
    ] = await Promise.all([
      Expense.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: null,

            totalAmount: {
              $sum: "$amount",
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: {
            ...filter,
            status: "Paid",
          },
        },

        {
          $group: {
            _id: "$category",

            amount: {
              $sum: "$amount",
            },

            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            amount: -1,
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: {
            ...filter,
            status: "Paid",
          },
        },

        {
          $group: {
            _id: {
              year: {
                $year:
                  "$expenseDate",
              },

              month: {
                $month:
                  "$expenseDate",
              },
            },

            amount: {
              $sum: "$amount",
            },
          },
        },

        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: "$status",

            amount: {
              $sum: "$amount",
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Expense.find(filter)
        .populate(
          "supplier",
          "name"
        )
        .populate(
          "booking",
          "bookingNumber destination"
        )
        .populate(
          "createdBy",
          "name email"
        )
        .sort({
          expenseDate: -1,
        })
        .limit(100)
        .lean(),
    ]);

    const paidExpenseResult =
      await Expense.aggregate([
        {
          $match: {
            ...filter,
            status: "Paid",
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: "$amount",
            },
          },
        },
      ]);

    res.json({
      success: true,

      period:
        getDateRangeLabel(
          req.query
        ),

      summary: {
        totalRecorded:
          toNumber(
            summary[0]
              ?.totalAmount
          ),

        totalPaid:
          toNumber(
            paidExpenseResult[0]
              ?.total
          ),

        count:
          toNumber(
            summary[0]?.count
          ),
      },

      categoryBreakdown,

      monthlyBreakdown,

      statusBreakdown,

      expenses,
    });
  } catch (error) {
    console.error(
      "Expense report error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to generate expense report",

      error:
        error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| REFUND REPORT
|--------------------------------------------------------------------------
*/

const getRefundReport = async (
  req,
  res
) => {
  try {
    const filter = {
      ...getDateFilter(
        req.query,
        "refundDate"
      ),
    };

    if (req.query.status) {
      filter.status =
        req.query.status;
    }

    const [
      summary,
      statusBreakdown,
      monthlyBreakdown,
      refunds,
    ] = await Promise.all([
      Refund.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: null,

            totalRecorded: {
              $sum: "$amount",
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Refund.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: "$status",

            amount: {
              $sum: "$amount",
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Refund.aggregate([
        {
          $match: {
            ...filter,
            status: "Completed",
          },
        },

        {
          $group: {
            _id: {
              year: {
                $year:
                  "$refundDate",
              },

              month: {
                $month:
                  "$refundDate",
              },
            },

            amount: {
              $sum: "$amount",
            },
          },
        },

        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),

      Refund.find(filter)
        .populate(
          "booking",
          "bookingNumber destination"
        )
        .populate(
          "customer",
          "name email"
        )
        .populate(
          "payment",
          "paymentNumber amount"
        )
        .sort({
          refundDate: -1,
        })
        .limit(100)
        .lean(),
    ]);

    const completedRefund =
      await Refund.aggregate([
        {
          $match: {
            ...filter,
            status: "Completed",
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: "$amount",
            },
          },
        },
      ]);

    res.json({
      success: true,

      period:
        getDateRangeLabel(
          req.query
        ),

      summary: {
        totalRecorded:
          toNumber(
            summary[0]
              ?.totalRecorded
          ),

        completedRefund:
          toNumber(
            completedRefund[0]
              ?.total
          ),

        count:
          toNumber(
            summary[0]?.count
          ),
      },

      statusBreakdown,

      monthlyBreakdown,

      refunds,
    });
  } catch (error) {
    console.error(
      "Refund report error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to generate refund report",

      error:
        error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| COMMISSION REPORT
|--------------------------------------------------------------------------
*/

const getCommissionReport = async (
  req,
  res
) => {
  try {
    const filter = {
      ...getDateFilter(
        req.query,
        "createdAt"
      ),
    };

    if (req.query.status) {
      filter.status =
        req.query.status;
    }

    const [
      summary,
      statusBreakdown,
      salespersonBreakdown,
      commissions,
    ] = await Promise.all([
      Commission.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: null,

            totalRecorded: {
              $sum: "$commissionAmount",
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Commission.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: "$status",

            amount: {
              $sum: "$commissionAmount",
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Commission.aggregate([
        {
          $match: filter,
        },

        {
          $lookup: {
            from: "users",

            localField:
              "salesPerson",

            foreignField: "_id",

            as: "salesPersonData",
          },
        },

        {
          $unwind: {
            path:
              "$salesPersonData",

            preserveNullAndEmptyArrays:
              true,
          },
        },

        {
          $group: {
            _id: {
              id:
                "$salesPersonData._id",

              name:
                "$salesPersonData.name",
            },

            amount: {
              $sum: "$commissionAmount",
            },

            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            amount: -1,
          },
        },
      ]),

      Commission.find(filter)
        .populate(
          "booking",
          "bookingNumber destination totalAmount"
        )
        .populate(
          "salesPerson",
          "name email"
        )
        .populate(
          "customer",
          "name email"
        )
        .sort({
          createdAt: -1,
        })
        .limit(100)
        .lean(),
    ]);

    const paidCommission =
      await Commission.aggregate([
        {
          $match: {
            ...filter,
            status: "Paid",
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: "$commissionAmount",
            },
          },
        },
      ]);

    const payableCommission =
      await Commission.aggregate([
        {
          $match: {
            ...filter,
            status: "Payable",
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: "$commissionAmount",
            },
          },
        },
      ]);

    res.json({
      success: true,

      period:
        getDateRangeLabel(
          req.query
        ),

      summary: {
        totalRecorded:
          toNumber(
            summary[0]
              ?.totalRecorded
          ),

        paid:
          toNumber(
            paidCommission[0]
              ?.total
          ),

        payable:
          toNumber(
            payableCommission[0]
              ?.total
          ),

        count:
          toNumber(
            summary[0]?.count
          ),
      },

      statusBreakdown,

      salespersonBreakdown,

      commissions,
    });
  } catch (error) {
    console.error(
      "Commission report error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to generate commission report",

      error:
        error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| PROFIT & LOSS REPORT
|--------------------------------------------------------------------------
*/

const getProfitLossReport = async (
  req,
  res
) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | BOOKING FILTER
    |--------------------------------------------------------------------------
    */

    const bookingFilter = {
      ...getDateFilter(
        req.query,
        "createdAt"
      ),
    };

    addCommonBookingFilters(
      bookingFilter,
      req.query
    );

    /*
    |--------------------------------------------------------------------------
    | REFUND FILTER
    |--------------------------------------------------------------------------
    */

    const refundFilter = {
      ...getDateFilter(
        req.query,
        "refundDate"
      ),

      status: "Completed",
    };

    /*
    |--------------------------------------------------------------------------
    | EXPENSE FILTER
    |--------------------------------------------------------------------------
    */

    const expenseFilter = {
      ...getDateFilter(
        req.query,
        "expenseDate"
      ),

      status: "Paid",
    };

    /*
    |--------------------------------------------------------------------------
    | COMMISSION FILTER
    |--------------------------------------------------------------------------
    */

    const commissionFilter = {
      ...getDateFilter(
        req.query,
        "paymentDate"
      ),

      status: "Paid",
    };

    /*
    |--------------------------------------------------------------------------
    | MAIN SUMMARY + MONTHLY DATA
    |--------------------------------------------------------------------------
    */

    const [
      bookingData,
      refundData,
      expenseData,
      commissionData,
      monthlyBookingData,
      monthlyRefundData,
      monthlyExpenseData,
      monthlyCommissionData,
    ] = await Promise.all([
      /*
      |--------------------------------------------------------------------------
      | Booking Summary
      |--------------------------------------------------------------------------
      */

      Booking.aggregate([
        {
          $match:
            bookingFilter,
        },

        {
          $group: {
            _id: null,

            revenue: {
              $sum: "$totalAmount",
            },

            cost: {
              $sum: "$totalCost",
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | Completed Refunds
      |--------------------------------------------------------------------------
      */

      Refund.aggregate([
        {
          $match:
            refundFilter,
        },

        {
          $group: {
            _id: null,

            amount: {
              $sum: "$amount",
            },
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | Paid Expenses
      |--------------------------------------------------------------------------
      */

      Expense.aggregate([
        {
          $match:
            expenseFilter,
        },

        {
          $group: {
            _id: null,

            amount: {
              $sum: "$amount",
            },
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | Paid Commissions
      |--------------------------------------------------------------------------
      */

      Commission.aggregate([
        {
          $match:
            commissionFilter,
        },

        {
          $group: {
            _id: null,

            amount: {
              $sum: "$commissionAmount",
            },
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | MONTHLY BOOKING REVENUE + COST
      |--------------------------------------------------------------------------
      */

      Booking.aggregate([
        {
          $match:
            bookingFilter,
        },

        {
          $group: {
            _id: {
              year: {
                $year:
                  "$createdAt",
              },

              month: {
                $month:
                  "$createdAt",
              },
            },

            revenue: {
              $sum: "$totalAmount",
            },

            bookingCost: {
              $sum: "$totalCost",
            },

            bookingCount: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | MONTHLY REFUNDS
      |--------------------------------------------------------------------------
      */

      Refund.aggregate([
        {
          $match:
            refundFilter,
        },

        {
          $group: {
            _id: {
              year: {
                $year:
                  "$refundDate",
              },

              month: {
                $month:
                  "$refundDate",
              },
            },

            refunds: {
              $sum: "$amount",
            },
          },
        },

        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | MONTHLY EXPENSES
      |--------------------------------------------------------------------------
      */

      Expense.aggregate([
        {
          $match:
            expenseFilter,
        },

        {
          $group: {
            _id: {
              year: {
                $year:
                  "$expenseDate",
              },

              month: {
                $month:
                  "$expenseDate",
              },
            },

            expenses: {
              $sum: "$amount",
            },
          },
        },

        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),

      /*
      |--------------------------------------------------------------------------
      | MONTHLY COMMISSIONS
      |--------------------------------------------------------------------------
      */

      Commission.aggregate([
        {
          $match:
            commissionFilter,
        },

        {
          $group: {
            _id: {
              year: {
                $year:
                  "$paymentDate",
              },

              month: {
                $month:
                  "$paymentDate",
              },
            },

            commissions: {
              $sum: "$commissionAmount",
            },
          },
        },

        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),
    ]);

    /*
    |--------------------------------------------------------------------------
    | MAIN FINANCIAL CALCULATIONS
    |--------------------------------------------------------------------------
    */

    const revenue =
      toNumber(
        bookingData[0]?.revenue
      );

    const bookingCost =
      toNumber(
        bookingData[0]?.cost
      );

    const bookingCount =
      toNumber(
        bookingData[0]?.count
      );

    const grossProfit =
      revenue -
      bookingCost;

    const refunds =
      toNumber(
        refundData[0]?.amount
      );

    const expenses =
      toNumber(
        expenseData[0]?.amount
      );

    const commissions =
      toNumber(
        commissionData[0]?.amount
      );

    const netProfit =
      grossProfit -
      refunds -
      expenses -
      commissions;

    const profitMargin =
      revenue > 0
        ? (netProfit / revenue) *
          100
        : 0;

    /*
    |--------------------------------------------------------------------------
    | MONTHLY TREND
    |--------------------------------------------------------------------------
    |
    | We merge:
    |
    | Booking
    | Refund
    | Expense
    | Commission
    |
    | into one monthly array.
    |
    */

    const monthlyMap =
      new Map();

    /*
    |--------------------------------------------------------------------------
    | Add Monthly Booking Data
    |--------------------------------------------------------------------------
    */

    monthlyBookingData.forEach(
      (item) => {
        const year =
          item._id?.year;

        const month =
          item._id?.month;

        if (!year || !month) {
          return;
        }

        const key =
          `${year}-${month}`;

        monthlyMap.set(
          key,
          {
            year,
            month,

            revenue:
              toNumber(
                item.revenue
              ),

            bookingCost:
              toNumber(
                item.bookingCost
              ),

            refunds: 0,

            expenses: 0,

            commissions: 0,

            bookings:
              toNumber(
                item.bookingCount
              ),
          }
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Add Monthly Refund Data
    |--------------------------------------------------------------------------
    */

    monthlyRefundData.forEach(
      (item) => {
        const year =
          item._id?.year;

        const month =
          item._id?.month;

        if (!year || !month) {
          return;
        }

        const key =
          `${year}-${month}`;

        if (!monthlyMap.has(key)) {
          monthlyMap.set(
            key,
            {
              year,
              month,
              revenue: 0,
              bookingCost: 0,
              refunds: 0,
              expenses: 0,
              commissions: 0,
              bookings: 0,
            }
          );
        }

        const row =
          monthlyMap.get(key);

        row.refunds =
          toNumber(
            item.refunds
          );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Add Monthly Expense Data
    |--------------------------------------------------------------------------
    */

    monthlyExpenseData.forEach(
      (item) => {
        const year =
          item._id?.year;

        const month =
          item._id?.month;

        if (!year || !month) {
          return;
        }

        const key =
          `${year}-${month}`;

        if (!monthlyMap.has(key)) {
          monthlyMap.set(
            key,
            {
              year,
              month,
              revenue: 0,
              bookingCost: 0,
              refunds: 0,
              expenses: 0,
              commissions: 0,
              bookings: 0,
            }
          );
        }

        const row =
          monthlyMap.get(key);

        row.expenses =
          toNumber(
            item.expenses
          );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Add Monthly Commission Data
    |--------------------------------------------------------------------------
    */

    monthlyCommissionData.forEach(
      (item) => {
        const year =
          item._id?.year;

        const month =
          item._id?.month;

        if (!year || !month) {
          return;
        }

        const key =
          `${year}-${month}`;

        if (!monthlyMap.has(key)) {
          monthlyMap.set(
            key,
            {
              year,
              month,
              revenue: 0,
              bookingCost: 0,
              refunds: 0,
              expenses: 0,
              commissions: 0,
              bookings: 0,
            }
          );
        }

        const row =
          monthlyMap.get(key);

        row.commissions =
          toNumber(
            item.commissions
          );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Final Monthly Trend
    |--------------------------------------------------------------------------
    */

    const monthlyTrend =
      Array.from(
        monthlyMap.values()
      )
        .sort((a, b) => {
          if (
            a.year !== b.year
          ) {
            return (
              a.year -
              b.year
            );
          }

          return (
            a.month -
            b.month
          );
        })
        .map((item) => {
          const monthlyGrossProfit =
            item.revenue -
            item.bookingCost;

          const monthlyNetProfit =
            monthlyGrossProfit -
            item.refunds -
            item.expenses -
            item.commissions;

          const monthlyMargin =
            item.revenue > 0
              ? (
                  monthlyNetProfit /
                  item.revenue
                ) * 100
              : 0;

          return {
            year:
              item.year,

            month:
              item.month,

            revenue:
              Number(
                item.revenue.toFixed(2)
              ),

            bookingCost:
              Number(
                item.bookingCost.toFixed(2)
              ),

            grossProfit:
              Number(
                monthlyGrossProfit.toFixed(
                  2
                )
              ),

            refunds:
              Number(
                item.refunds.toFixed(2)
              ),

            expenses:
              Number(
                item.expenses.toFixed(2)
              ),

            commissions:
              Number(
                item.commissions.toFixed(
                  2
                )
              ),

            netProfit:
              Number(
                monthlyNetProfit.toFixed(
                  2
                )
              ),

            profitMargin:
              Number(
                monthlyMargin.toFixed(2)
              ),

            bookings:
              item.bookings,
          };
        });

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    res.json({
      success: true,

      period:
        getDateRangeLabel(
          req.query
        ),

      summary: {
        revenue,

        bookingCost,

        grossProfit,

        refunds,

        expenses,

        commissions,

        netProfit,

        profitMargin:
          Number(
            profitMargin.toFixed(2)
          ),

        /*
        |--------------------------------------------------------------
        | Additional frontend-friendly fields
        |--------------------------------------------------------------
        */

        bookings:
          bookingCount,

        totalBookings:
          bookingCount,
      },

      /*
      |--------------------------------------------------------------------------
      | Monthly Profit Trend
      |--------------------------------------------------------------------------
      */

      monthlyTrend,

      /*
      |--------------------------------------------------------------------------
      | Alias fields
      |
      | These make frontend integration easier if the component
      | checks different names.
      |--------------------------------------------------------------------------
      */

      profitTrend:
        monthlyTrend,

      trend:
        monthlyTrend,

      formula: {
        grossProfit:
          "Revenue - Booking Cost",

        netProfit:
          "Gross Profit - Refunds - Expenses - Commissions",
      },
    });
  } catch (error) {
    console.error(
      "Profit loss report error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to generate profit and loss report",

      error:
        error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| AGENT PERFORMANCE REPORT
|--------------------------------------------------------------------------
*/

const getAgentPerformanceReport =
  async (req, res) => {
    try {
      const filter = {
        ...getDateFilter(
          req.query,
          "createdAt"
        ),
      };

      addCommonBookingFilters(
        filter,
        req.query
      );

      const performance =
        await Booking.aggregate([
          {
            $match: filter,
          },

          {
            $lookup: {
              from: "users",

              localField:
                "salesOwner",

              foreignField: "_id",

              as: "agent",
            },
          },

          {
            $unwind: {
              path: "$agent",

              preserveNullAndEmptyArrays:
                true,
            },
          },

          {
            $group: {
              _id:
                "$agent._id",

              agentName: {
                $first:
                  "$agent.name",
              },

              email: {
                $first:
                  "$agent.email",
              },

              bookings: {
                $sum: 1,
              },

              revenue: {
                $sum: "$totalAmount",
              },

              cost: {
                $sum: "$totalCost",
              },

              profit: {
                $sum: "$profit",
              },

              paid: {
                $sum: "$amountPaid",
              },

              due: {
                $sum: "$amountDue",
              },
            },
          },

          {
            $sort: {
              revenue: -1,
            },
          },
        ]);

      res.json({
        success: true,

        period:
          getDateRangeLabel(
            req.query
          ),

        agents:
          performance,
      });
    } catch (error) {
      console.error(
        "Agent performance error:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Failed to generate agent performance report",

        error:
          error.message,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| DESTINATION REPORT
|--------------------------------------------------------------------------
*/

const getDestinationReport =
  async (req, res) => {
    try {
      const filter = {
        ...getDateFilter(
          req.query,
          "createdAt"
        ),
      };

      addCommonBookingFilters(
        filter,
        req.query
      );

      const destinations =
        await Booking.aggregate([
          {
            $match: filter,
          },

          {
            $group: {
              _id:
                "$destination",

              bookings: {
                $sum: 1,
              },

              revenue: {
                $sum: "$totalAmount",
              },

              cost: {
                $sum: "$totalCost",
              },

              profit: {
                $sum: "$profit",
              },

              paid: {
                $sum: "$amountPaid",
              },

              due: {
                $sum: "$amountDue",
              },
            },
          },

          {
            $sort: {
              revenue: -1,
            },
          },
        ]);

      res.json({
        success: true,

        period:
          getDateRangeLabel(
            req.query
          ),

        destinations,
      });
    } catch (error) {
      console.error(
        "Destination report error:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Failed to generate destination report",

        error:
          error.message,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  getOverviewReport,

  getSalesReport,

  getBookingReport,

  getRevenueReport,

  getExpenseReport,

  getRefundReport,

  getCommissionReport,

  getProfitLossReport,

  getAgentPerformanceReport,

  getDestinationReport,
};
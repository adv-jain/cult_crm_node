const mongoose = require("mongoose");

const Itinerary = require("../models/Itinerary");
const Deal = require("../models/Trip");
const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const Hotel = require("../models/Hotel");
const Transport = require("../models/Transport");
const User = require("../models/User");

// =====================================================
// HELPERS
// =====================================================

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const populateItinerary = (query) => {
  return query
    .populate("trip", "title tripCode destination startDate endDate status")
    .populate(
      "booking",
      "quotation customer destination travelStartDate travelEndDate status totalAmount amountPaid amountDue paymentStatus"
    )
    .populate("customer", "firstName lastName email phone owner")
    .populate("preparedBy", "name email role")
    .populate("approvedBy", "name email role")
    .populate("days.hotel.hotel", "name code destination city category rating")
    .populate(
      "days.transport.transport",
      "name code type provider departure arrival duration fare currency status"
    );
};

// Generate itinerary number
const generateItineraryNumber = async () => {
  const year = new Date().getFullYear();

  const lastItinerary = await Itinerary.findOne({
    itineraryNumber: new RegExp(`^IT-${year}-`),
  })
    .sort({ createdAt: -1 })
    .select("itineraryNumber")
    .lean();

  let nextNumber = 1;

  if (lastItinerary?.itineraryNumber) {
    const parts = lastItinerary.itineraryNumber.split("-");
    const lastNumber = parseInt(parts[2], 10);

    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `IT-${year}-${String(nextNumber).padStart(4, "0")}`;
};

// Calculate total days and nights
const calculateDuration = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return {
      totalDays: 0,
      totalNights: 0,
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const difference = end.getTime() - start.getTime();

  if (difference < 0) {
    return null;
  }

  const totalNights = Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );

  const totalDays = totalNights + 1;

  return {
    totalDays,
    totalNights,
  };
};

// =====================================================
// 🌟 HELPER: NORMALIZE DAYS
// Fixes empty enum values in transport.type and meals.type
// =====================================================

const normalizeDays = (days) => {
  if (!Array.isArray(days)) return [];

  const validTransportTypes = [
    "Flight",
    "Train",
    "Bus",
    "Private Cab",
    "Rental Car",
    "Cruise",
    "Other",
  ];

  const validMealTypes = [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Snacks",
    "Other",
  ];

  return days.map((day, index) => {
    // Transport normalize
    const transport = Array.isArray(day?.transport)
      ? day.transport
          .map((item) => {
            const trimmedType = String(item?.type || "").trim();

            return {
              transport: item?.transport || null,
              type: validTransportTypes.includes(trimmedType)
                ? trimmedType
                : "Other",
              from: String(item?.from || "").trim(),
              to: String(item?.to || "").trim(),
              departureTime: item?.departureTime || "",
              arrivalTime: item?.arrivalTime || "",
              notes: item?.notes || "",
            };
          })
          .filter((item) => item.from || item.to || item.type)
      : [];

    // Meals normalize
    const meals = Array.isArray(day?.meals)
      ? day.meals
          .map((meal) => {
            const trimmedType = String(meal?.type || "").trim();

            return {
              type: validMealTypes.includes(trimmedType)
                ? trimmedType
                : "Breakfast",
              included:
                meal?.included !== undefined
                  ? Boolean(meal.included)
                  : true,
              restaurant: meal?.restaurant || "",
              notes: meal?.notes || "",
            };
          })
          .filter((meal) => meal.type)
      : [];

    // Activities normalize
    const activities = Array.isArray(day?.activities)
      ? day.activities
          .map((activity) => {
            if (typeof activity === "string") {
              return {
                name: activity.trim(),
                description: "",
                startTime: "",
                endTime: "",
                location: "",
                duration: 0,
                amount: 0,
                included: true,
                notes: "",
              };
            }

            return {
              name: (activity?.name || "").trim(),
              description: activity?.description || "",
              startTime: activity?.startTime || "",
              endTime: activity?.endTime || "",
              location: activity?.location || "",
              duration: Number(activity?.duration) || 0,
              amount: Number(activity?.amount) || 0,
              included:
                activity?.included !== undefined
                  ? Boolean(activity.included)
                  : true,
              notes: activity?.notes || "",
            };
          })
          .filter((activity) => activity.name)
      : [];

    // Hotel normalize
    const hotel = day?.hotel
      ? {
          hotel: day.hotel.hotel || null,
          name: String(day.hotel.name || "").trim(),
          roomType: day.hotel.roomType || "",
          checkIn: day.hotel.checkIn || "",
          checkOut: day.hotel.checkOut || "",
          nights: Number(day.hotel.nights) || 0,
          notes: day.hotel.notes || "",
        }
      : {
          hotel: null,
          name: "",
          roomType: "",
          checkIn: "",
          checkOut: "",
          nights: 0,
          notes: "",
        };

    return {
      dayNumber: Number(day?.dayNumber) || index + 1,
      date: day?.date || null,
      title: String(day?.title || `Day ${index + 1}`).trim(),
      description: day?.description || "",
      city: day?.city || "",
      location: day?.location || "",
      activities,
      hotel,
      transport,
      meals,
      freeTime: day?.freeTime || "",
      notes: day?.notes || "",
    };
  });
};

// =====================================================
// CREATE ITINERARY
// =====================================================

const createItinerary = async (req, res) => {
  try {
    const {
      title,
      trip,
      booking,
      customer,
      destination,
      startDate,
      endDate,
      days = [],
      status = "Draft",
      inclusions = [],
      exclusions = [],
      importantNotes = [],
      emergencyContact,
      notes,
    } = req.body;

    // Required fields
    if (!title || !trip || !destination) {
      return res.status(400).json({
        message: "Title, trip and destination are required",
      });
    }

    // Validate trip
    if (!isValidObjectId(trip)) {
      return res.status(400).json({
        message: "Invalid trip ID",
      });
    }

    const tripData = await Deal.findById(trip);

    if (!tripData) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    // Validate booking
    let bookingData = null;

    if (booking) {
      if (!isValidObjectId(booking)) {
        return res.status(400).json({
          message: "Invalid booking ID",
        });
      }

      bookingData = await Booking.findById(booking);

      if (!bookingData) {
        return res.status(404).json({
          message: "Booking not found",
        });
      }
    }

    // Validate customer
    let customerData = null;

    if (customer) {
      if (!isValidObjectId(customer)) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      customerData = await Customer.findById(customer);

      if (!customerData) {
        return res.status(404).json({
          message: "Customer not found",
        });
      }
    }

    // If booking exists and customer not provided, use booking customer
    const finalCustomer =
      customer || bookingData?.customer || null;

    if (!finalCustomer) {
      return res.status(400).json({
        message: "Customer is required when booking has no customer",
      });
    }

    // Calculate duration
    const duration = calculateDuration(startDate, endDate);

    if (startDate && endDate && !duration) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }

    // Validate days
    if (!Array.isArray(days)) {
      return res.status(400).json({
        message: "Days must be an array",
      });
    }

    // 🔥 NORMALIZE DAYS (fix empty enum values)
    const normalizedDays = normalizeDays(days);

    // Validate day numbers
    const dayNumbers = normalizedDays.map((day) => day.dayNumber);

    const duplicateDay = dayNumbers.some(
      (day, index) => dayNumbers.indexOf(day) !== index
    );

    if (duplicateDay) {
      return res.status(400).json({
        message: "Duplicate day numbers are not allowed",
      });
    }

    // Validate hotels and transport references
    for (const day of normalizedDays) {
      if (day.hotel?.hotel) {
        if (!isValidObjectId(day.hotel.hotel)) {
          return res.status(400).json({
            message: `Invalid hotel ID for day ${day.dayNumber}`,
          });
        }

        const hotelExists = await Hotel.findById(day.hotel.hotel);

        if (!hotelExists) {
          return res.status(404).json({
            message: `Hotel not found for day ${day.dayNumber}`,
          });
        }
      }

      if (Array.isArray(day.transport)) {
        for (const transportItem of day.transport) {
          if (transportItem.transport) {
            if (!isValidObjectId(transportItem.transport)) {
              return res.status(400).json({
                message: `Invalid transport ID for day ${day.dayNumber}`,
              });
            }

            const transportExists = await Transport.findById(
              transportItem.transport
            );

            if (!transportExists) {
              return res.status(404).json({
                message: `Transport not found for day ${day.dayNumber}`,
              });
            }
          }
        }
      }
    }

    // Generate itinerary number
    const itineraryNumber = await generateItineraryNumber();

    const itinerary = await Itinerary.create({
      itineraryNumber,
      title,
      trip,
      booking: booking || null,
      customer: finalCustomer,
      destination,
      startDate: startDate || null,
      endDate: endDate || null,
      totalDays: duration?.totalDays || 0,
      totalNights: duration?.totalNights || 0,
      status,
      days: normalizedDays,
      inclusions,
      exclusions,
      importantNotes,
      emergencyContact,
      preparedBy: req.user.id,
      notes,
    });

    const populatedItinerary = await populateItinerary(
      Itinerary.findById(itinerary._id)
    );

    return res.status(201).json({
      message: "Itinerary created successfully",
      itinerary: populatedItinerary,
    });
  } catch (error) {
    console.error("Create itinerary error:", error);

    return res.status(500).json({
      message: "Failed to create itinerary",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL ITINERARIES
// =====================================================

const getItineraries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      destination,
      customer,
      booking,
      trip,
      search,
      startDate,
      endDate,
    } = req.query;

    const userId = req.user.id;
    const role = req.user.role;

    const filter = {};

    // Filters
    if (status) {
      filter.status = status;
    }

    if (destination) {
      filter.destination = {
        $regex: destination,
        $options: "i",
      };
    }

    if (customer) {
      if (!isValidObjectId(customer)) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      filter.customer = customer;
    }

    if (booking) {
      if (!isValidObjectId(booking)) {
        return res.status(400).json({
          message: "Invalid booking ID",
        });
      }

      filter.booking = booking;
    }

    if (trip) {
      if (!isValidObjectId(trip)) {
        return res.status(400).json({
          message: "Invalid trip ID",
        });
      }

      filter.trip = trip;
    }

    if (startDate || endDate) {
      filter.startDate = {};

      if (startDate) {
        filter.startDate.$gte = new Date(startDate);
      }

      if (endDate) {
        filter.startDate.$lte = new Date(endDate);
      }
    }

    if (search) {
      filter.$or = [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          itineraryNumber: {
            $regex: search,
            $options: "i",
          },
        },
        {
          destination: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    // Role-based access
    if (role === "sales") {
      const customerIds = await Customer.find({
        owner: userId,
      }).distinct("_id");

      const bookingIds = await Booking.find({
        salesOwner: userId,
      }).distinct("_id");

      filter.$and = [
        {
          $or: [
            { customer: { $in: customerIds } },
            { booking: { $in: bookingIds } },
            { preparedBy: userId },
          ],
        },
      ];
    }

    if (role === "manager") {
      const salesUsers = await User.find({
        role: "sales",
        isActive: true,
      }).distinct("_id");

      const customerIds = await Customer.find({
        owner: { $in: salesUsers },
      }).distinct("_id");

      const bookingIds = await Booking.find({
        salesOwner: { $in: salesUsers },
      }).distinct("_id");

      filter.$and = [
        {
          $or: [
            { customer: { $in: customerIds } },
            { booking: { $in: bookingIds } },
            { preparedBy: { $in: salesUsers } },
          ],
        },
      ];
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(
      Math.max(parseInt(limit, 10) || 50, 1),
      100
    );

    const skip = (pageNumber - 1) * limitNumber;

    const [itineraries, total] = await Promise.all([
      populateItinerary(
        Itinerary.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber)
      ),
      Itinerary.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Itineraries fetched successfully",
      count: itineraries.length,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber < Math.ceil(total / limitNumber),
      hasPreviousPage: pageNumber > 1,
      itineraries,
    });
  } catch (error) {
    console.error("Get itineraries error:", error);

    return res.status(500).json({
      message: "Failed to fetch itineraries",
      error: error.message,
    });
  }
};

// =====================================================
// GET SINGLE ITINERARY
// =====================================================

const getItineraryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid itinerary ID",
      });
    }

    const itinerary = await populateItinerary(
      Itinerary.findById(id)
    );

    if (!itinerary) {
      return res.status(404).json({
        message: "Itinerary not found",
      });
    }

    const role = req.user.role;
    const userId = req.user.id;

    // Sales access
    if (role === "sales") {
      const customerOwner =
        itinerary.customer?.owner?.toString();

      const bookingOwner =
        itinerary.booking?.salesOwner?.toString();

      const preparedBy =
        itinerary.preparedBy?._id?.toString();

      if (
        customerOwner !== userId &&
        bookingOwner !== userId &&
        preparedBy !== userId
      ) {
        return res.status(403).json({
          message: "Not authorized to access this itinerary",
        });
      }
    }

    // Manager access
    if (role === "manager") {
      const preparedByRole =
        itinerary.preparedBy?.role;

      if (
        preparedByRole !== "sales" &&
        itinerary.preparedBy?._id?.toString() !== userId
      ) {
        return res.status(403).json({
          message: "Not authorized to access this itinerary",
        });
      }
    }

    return res.status(200).json({
      message: "Itinerary fetched successfully",
      itinerary,
    });
  } catch (error) {
    console.error("Get itinerary error:", error);

    return res.status(500).json({
      message: "Failed to fetch itinerary",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE ITINERARY
// =====================================================

const updateItinerary = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid itinerary ID",
      });
    }

    const itinerary = await Itinerary.findById(id);

    if (!itinerary) {
      return res.status(404).json({
        message: "Itinerary not found",
      });
    }

    const role = req.user.role;
    const userId = req.user.id;

    // Sales can update only their own prepared itinerary
    if (
      role === "sales" &&
      itinerary.preparedBy.toString() !== userId
    ) {
      return res.status(403).json({
        message: "Sales user can update only their own itinerary",
      });
    }

    // Manager can update sales itineraries or own
    if (role === "manager") {
      const preparedUser = await User.findById(
        itinerary.preparedBy
      ).select("role");

      if (
        itinerary.preparedBy.toString() !== userId &&
        preparedUser?.role !== "sales"
      ) {
        return res.status(403).json({
          message: "Not authorized to update this itinerary",
        });
      }
    }

    const allowedFields = [
      "title",
      "destination",
      "startDate",
      "endDate",
      "days",
      "status",
      "inclusions",
      "exclusions",
      "importantNotes",
      "emergencyContact",
      "notes",
    ];

    // 🔥 NORMALIZE DAYS (fix empty enum values)
    if (Array.isArray(req.body.days)) {
      req.body.days = normalizeDays(req.body.days);
    }

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        itinerary[field] = req.body[field];
      }
    });

    // Recalculate duration
    if (
      req.body.startDate !== undefined ||
      req.body.endDate !== undefined
    ) {
      const duration = calculateDuration(
        itinerary.startDate,
        itinerary.endDate
      );

      if (
        itinerary.startDate &&
        itinerary.endDate &&
        !duration
      ) {
        return res.status(400).json({
          message: "End date cannot be before start date",
        });
      }

      itinerary.totalDays = duration?.totalDays || 0;
      itinerary.totalNights = duration?.totalNights || 0;
    }

    itinerary.updatedBy = userId;

    await itinerary.save();

    const populatedItinerary = await populateItinerary(
      Itinerary.findById(itinerary._id)
    );

    return res.status(200).json({
      message: "Itinerary updated successfully",
      itinerary: populatedItinerary,
    });
  } catch (error) {
    console.error("Update itinerary error:", error);

    return res.status(500).json({
      message: "Failed to update itinerary",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE ITINERARY
// =====================================================

const deleteItinerary = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid itinerary ID",
      });
    }

    const itinerary = await Itinerary.findById(id);

    if (!itinerary) {
      return res.status(404).json({
        message: "Itinerary not found",
      });
    }

    await Itinerary.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Itinerary deleted successfully",
    });
  } catch (error) {
    console.error("Delete itinerary error:", error);

    return res.status(500).json({
      message: "Failed to delete itinerary",
      error: error.message,
    });
  }
};

// =====================================================
// APPROVE ITINERARY
// =====================================================

const approveItinerary = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid itinerary ID",
      });
    }

    const itinerary = await Itinerary.findById(id);

    if (!itinerary) {
      return res.status(404).json({
        message: "Itinerary not found",
      });
    }

    if (
      !["admin", "manager"].includes(req.user.role)
    ) {
      return res.status(403).json({
        message: "Only admin or manager can approve itinerary",
      });
    }

    if (itinerary.status === "Cancelled") {
      return res.status(400).json({
        message: "Cancelled itinerary cannot be approved",
      });
    }

    itinerary.status = "Approved";
    itinerary.approvedBy = req.user.id;
    itinerary.approvedAt = new Date();
    itinerary.updatedBy = req.user.id;

    await itinerary.save();

    const populatedItinerary = await populateItinerary(
      Itinerary.findById(itinerary._id)
    );

    return res.status(200).json({
      message: "Itinerary approved successfully",
      itinerary: populatedItinerary,
    });
  } catch (error) {
    console.error("Approve itinerary error:", error);

    return res.status(500).json({
      message: "Failed to approve itinerary",
      error: error.message,
    });
  }
};

// =====================================================
// SHARE ITINERARY
// =====================================================

const shareItinerary = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid itinerary ID",
      });
    }

    const itinerary = await Itinerary.findById(id);

    if (!itinerary) {
      return res.status(404).json({
        message: "Itinerary not found",
      });
    }

    if (
      !["admin", "manager", "sales"].includes(req.user.role)
    ) {
      return res.status(403).json({
        message: "Not authorized to share itinerary",
      });
    }

    if (
      !["Approved", "Shared"].includes(itinerary.status)
    ) {
      return res.status(400).json({
        message:
          "Only approved itinerary can be shared with customer",
      });
    }

    itinerary.status = "Shared";
    itinerary.customerSharedAt = new Date();
    itinerary.updatedBy = req.user.id;

    await itinerary.save();

    const populatedItinerary = await populateItinerary(
      Itinerary.findById(itinerary._id)
    );

    return res.status(200).json({
      message: "Itinerary shared successfully",
      itinerary: populatedItinerary,
    });
  } catch (error) {
    console.error("Share itinerary error:", error);

    return res.status(500).json({
      message: "Failed to share itinerary",
      error: error.message,
    });
  }
};

// =====================================================
// GET ITINERARY USERS
// =====================================================

const getItineraryUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: {
        $in: ["admin", "manager", "sales", "operations"],
      },
      isActive: true,
    })
      .select("_id name email role")
      .sort({ name: 1 });

    return res.status(200).json({
      message: "Itinerary users fetched successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get itinerary users error:", error);

    return res.status(500).json({
      message: "Failed to fetch itinerary users",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createItinerary,
  getItineraries,
  getItineraryById,
  updateItinerary,
  deleteItinerary,
  approveItinerary,
  shareItinerary,
  getItineraryUsers,
};
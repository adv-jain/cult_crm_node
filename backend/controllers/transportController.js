const mongoose = require("mongoose");
const Transport = require("../models/Transport");
const Supplier = require("../models/Supplier");

// =====================================================
// CONSTANTS
// =====================================================

const TRANSPORT_TYPES = [
  "Flight",
  "Train",
  "Bus",
  "Private Cab",
  "Rental Car",
  "Cruise",
  "Other",
];

const TRANSPORT_CLASSES = [
  "Economy",
  "Premium Economy",
  "Business",
  "First Class",
  "Sleeper",
  "AC",
  "Non AC",
  "Standard",
  "Luxury",
  "Other",
];

const TRANSPORT_STATUSES = [
  "Available",
  "Reserved",
  "Confirmed",
  "Cancelled",
  "Completed",
  "Inactive",
];

// =====================================================
// HELPERS
// =====================================================

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validateDateRange = (departure, arrival) => {
  const departureDate = departure?.dateTime
    ? new Date(departure.dateTime)
    : null;

  const arrivalDate = arrival?.dateTime
    ? new Date(arrival.dateTime)
    : null;

  if (departureDate && Number.isNaN(departureDate.getTime())) {
    return "Invalid departure date/time";
  }

  if (arrivalDate && Number.isNaN(arrivalDate.getTime())) {
    return "Invalid arrival date/time";
  }

  if (departureDate && arrivalDate && arrivalDate < departureDate) {
    return "Arrival date/time cannot be before departure date/time";
  }

  return null;
};

const validateNumericValues = ({ duration, fare, vehicleDetails }) => {
  if (
    duration !== undefined &&
    duration !== null &&
    (!Number.isFinite(Number(duration)) || Number(duration) < 0)
  ) {
    return "Duration must be a valid non-negative number";
  }

  if (
    fare !== undefined &&
    fare !== null &&
    (!Number.isFinite(Number(fare)) || Number(fare) < 0)
  ) {
    return "Fare must be a valid non-negative number";
  }

  if (
    vehicleDetails?.capacity !== undefined &&
    vehicleDetails?.capacity !== null &&
    (!Number.isFinite(Number(vehicleDetails.capacity)) ||
      Number(vehicleDetails.capacity) < 0)
  ) {
    return "Vehicle capacity must be a valid non-negative number";
  }

  return null;
};

const validateEnumValues = ({ type, transportClass, status }) => {
  if (type !== undefined && !TRANSPORT_TYPES.includes(type)) {
    return "Invalid transport type";
  }

  if (
    transportClass !== undefined &&
    !TRANSPORT_CLASSES.includes(transportClass)
  ) {
    return "Invalid transport class";
  }

  if (status !== undefined && !TRANSPORT_STATUSES.includes(status)) {
    return "Invalid transport status";
  }

  return null;
};

const validateSupplier = async (supplier) => {
  if (supplier === undefined || supplier === null || supplier === "") {
    return null;
  }

  if (!isValidObjectId(supplier)) {
    return "Invalid supplier ID";
  }

  const supplierExists = await Supplier.findById(supplier);

  if (!supplierExists) {
    return "Supplier not found";
  }

  return null;
};

const populateTransport = (query) => {
  return query
    .populate("supplier", "name supplierCode type phone email")
    .populate("createdBy", "name email role");
};

// =====================================================
// CREATE TRANSPORT
// =====================================================

const createTransport = async (req, res) => {
  try {
    const {
      name,
      code,
      type,
      provider,
      providerCode,
      departure,
      arrival,
      duration,
      class: transportClass,
      vehicleDetails,
      fare,
      currency,
      cancellationPolicy,
      baggageAllowance,
      amenities,
      supplier,
      contactPerson,
      status,
      notes,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Transport name is required",
      });
    }

    if (!type) {
      return res.status(400).json({
        message: "Transport type is required",
      });
    }

    const enumError = validateEnumValues({
      type,
      transportClass,
      status,
    });

    if (enumError) {
      return res.status(400).json({ message: enumError });
    }

    const dateError = validateDateRange(departure, arrival);

    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    const numericError = validateNumericValues({
      duration,
      fare,
      vehicleDetails,
    });

    if (numericError) {
      return res.status(400).json({ message: numericError });
    }

    const supplierError = await validateSupplier(supplier);

    if (supplierError) {
      return res.status(400).json({ message: supplierError });
    }

    const normalizedCode = code ? code.trim().toUpperCase() : undefined;

    if (normalizedCode) {
      const existingTransport = await Transport.findOne({
        code: normalizedCode,
      });

      if (existingTransport) {
        return res.status(409).json({
          message: "Transport code already exists",
        });
      }
    }

    const transport = await Transport.create({
      name: name.trim(),
      code: normalizedCode,
      type,
      provider,
      providerCode: providerCode
        ? providerCode.trim().toUpperCase()
        : undefined,
      departure,
      arrival,
      duration: duration !== undefined ? Number(duration) : 0,
      class: transportClass,
      vehicleDetails,
      fare: fare !== undefined ? Number(fare) : 0,
      currency: currency || "INR",
      cancellationPolicy,
      baggageAllowance,
      amenities,
      supplier: supplier && supplier !== "" ? supplier : null,
      contactPerson,
      status: status || "Available",
      notes,
      createdBy: req.user.id,
    });

    const populatedTransport = await populateTransport(
      Transport.findById(transport._id)
    );

    return res.status(201).json({
      message: "Transport created successfully",
      transport: populatedTransport,
    });
  } catch (error) {
    console.error("Create transport error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Transport code already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Transport validation failed",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    return res.status(500).json({
      message: "Failed to create transport",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL TRANSPORTS
// =====================================================

const getTransports = async (req, res) => {
  try {
    const { type, provider, supplier, status, from, to, search } = req.query;

    let page = Number.parseInt(req.query.page || "1", 10);
    let limit = Number.parseInt(req.query.limit || "10", 10);

    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1) limit = 10;

    limit = Math.min(limit, 50);

    const filter = {};

    if (type) {
      if (!TRANSPORT_TYPES.includes(type)) {
        return res.status(400).json({
          message: "Invalid transport type",
        });
      }

      filter.type = type;
    }

    if (provider) {
      filter.provider = {
        $regex: escapeRegex(provider),
        $options: "i",
      };
    }

    if (supplier) {
      if (!isValidObjectId(supplier)) {
        return res.status(400).json({
          message: "Invalid supplier ID",
        });
      }

      filter.supplier = supplier;
    }

    if (status) {
      if (!TRANSPORT_STATUSES.includes(status)) {
        return res.status(400).json({
          message: "Invalid transport status",
        });
      }

      filter.status = status;
    }

    if (from) {
      filter["departure.location"] = {
        $regex: escapeRegex(from),
        $options: "i",
      };
    }

    if (to) {
      filter["arrival.location"] = {
        $regex: escapeRegex(to),
        $options: "i",
      };
    }

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { code: { $regex: safeSearch, $options: "i" } },
        { provider: { $regex: safeSearch, $options: "i" } },
        { providerCode: { $regex: safeSearch, $options: "i" } },
        { "departure.location": { $regex: safeSearch, $options: "i" } },
        { "arrival.location": { $regex: safeSearch, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [transports, total] = await Promise.all([
      populateTransport(
        Transport.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
      ),
      Transport.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Transports fetched successfully",
      total,
      count: transports.length,
      page,
      limit,
      pages: Math.ceil(total / limit),
      transports,
    });
  } catch (error) {
    console.error("Get transports error:", error);

    return res.status(500).json({
      message: "Failed to fetch transports",
      error: error.message,
    });
  }
};

// =====================================================
// GET TRANSPORT BY ID
// =====================================================

const getTransportById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid transport ID",
      });
    }

    const transport = await populateTransport(Transport.findById(id));

    if (!transport) {
      return res.status(404).json({
        message: "Transport not found",
      });
    }

    return res.status(200).json({
      message: "Transport fetched successfully",
      transport,
    });
  } catch (error) {
    console.error("Get transport error:", error);

    return res.status(500).json({
      message: "Failed to fetch transport",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE TRANSPORT
// =====================================================

const updateTransport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid transport ID",
      });
    }

    const transport = await Transport.findById(id);

    if (!transport) {
      return res.status(404).json({
        message: "Transport not found",
      });
    }

    const allowedFields = [
      "name",
      "code",
      "type",
      "provider",
      "providerCode",
      "departure",
      "arrival",
      "duration",
      "class",
      "vehicleDetails",
      "fare",
      "currency",
      "cancellationPolicy",
      "baggageAllowance",
      "amenities",
      "supplier",
      "contactPerson",
      "status",
      "notes",
    ];

    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (
      updateData.name !== undefined &&
      !String(updateData.name).trim()
    ) {
      return res.status(400).json({
        message: "Transport name cannot be empty",
      });
    }

    if (updateData.type !== undefined) {
      if (!TRANSPORT_TYPES.includes(updateData.type)) {
        return res.status(400).json({
          message: "Invalid transport type",
        });
      }
    }

    if (updateData.class !== undefined) {
      if (!TRANSPORT_CLASSES.includes(updateData.class)) {
        return res.status(400).json({
          message: "Invalid transport class",
        });
      }
    }

    if (updateData.status !== undefined) {
      if (!TRANSPORT_STATUSES.includes(updateData.status)) {
        return res.status(400).json({
          message: "Invalid transport status",
        });
      }
    }

    const mergedDeparture =
      updateData.departure !== undefined
        ? updateData.departure
        : transport.departure;

    const mergedArrival =
      updateData.arrival !== undefined
        ? updateData.arrival
        : transport.arrival;

    const dateError = validateDateRange(mergedDeparture, mergedArrival);

    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    const numericError = validateNumericValues({
      duration: updateData.duration,
      fare: updateData.fare,
      vehicleDetails: updateData.vehicleDetails,
    });

    if (numericError) {
      return res.status(400).json({ message: numericError });
    }

    if (updateData.supplier !== undefined) {
      if (updateData.supplier !== null && updateData.supplier !== "") {
        const supplierError = await validateSupplier(updateData.supplier);

        if (supplierError) {
          return res.status(400).json({ message: supplierError });
        }
      } else {
        updateData.supplier = null;
      }
    }

    if (updateData.code !== undefined) {
      const normalizedCode = updateData.code
        ? String(updateData.code).trim().toUpperCase()
        : null;

      if (normalizedCode) {
        const duplicateTransport = await Transport.findOne({
          code: normalizedCode,
          _id: { $ne: id },
        });

        if (duplicateTransport) {
          return res.status(409).json({
            message: "Transport code already exists",
          });
        }
      }

      updateData.code = normalizedCode;
    }

    if (updateData.providerCode !== undefined) {
      updateData.providerCode = updateData.providerCode
        ? String(updateData.providerCode).trim().toUpperCase()
        : updateData.providerCode;
    }

    if (updateData.duration !== undefined) {
      updateData.duration = Number(updateData.duration);
    }

    if (updateData.fare !== undefined) {
      updateData.fare = Number(updateData.fare);
    }

    if (updateData.name !== undefined) {
      updateData.name = String(updateData.name).trim();
    }

    Object.assign(transport, updateData);

    await transport.save();

    const updatedTransport = await populateTransport(
      Transport.findById(transport._id)
    );

    return res.status(200).json({
      message: "Transport updated successfully",
      transport: updatedTransport,
    });
  } catch (error) {
    console.error("Update transport error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Transport code already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Transport validation failed",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    return res.status(500).json({
      message: "Failed to update transport",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE TRANSPORT
// =====================================================

const deleteTransport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid transport ID",
      });
    }

    const transport = await Transport.findById(id);

    if (!transport) {
      return res.status(404).json({
        message: "Transport not found",
      });
    }

    if (
      transport.status === "Confirmed" ||
      transport.status === "Completed"
    ) {
      return res.status(400).json({
        message: "Confirmed or completed transport cannot be deleted",
      });
    }

    await Transport.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Transport deleted successfully",
    });
  } catch (error) {
    console.error("Delete transport error:", error);

    return res.status(500).json({
      message: "Failed to delete transport",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createTransport,
  getTransports,
  getTransportById,
  updateTransport,
  deleteTransport,
};
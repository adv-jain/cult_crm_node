const Hotel = require("../models/Hotel");
const Supplier = require("../models/Supplier");
// CREATE HOTEL
const createHotel = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      destination,
      city,
      state,
      country,
      address,
      postalCode,
      location,
      category,
      rating,
      checkInTime,
      checkOutTime,
      amenities,
      roomTypes,
      contactPerson,
      supplier,
      cancellationPolicy,
      paymentTerms,
      website,
      images,
      status,
      notes,
    } = req.body;

    if (!name || !destination || !country) {
      return res.status(400).json({
        message: "Name, destination and country are required",
      });
    }

    const hotel = await Hotel.create({
      name,
      code,
      description,
      destination,
      city,
      state,
      country,
      address,
      postalCode,
      location,
      category,
      rating,
      checkInTime,
      checkOutTime,
      amenities,
      roomTypes,
      contactPerson,
      supplier,
      cancellationPolicy,
      paymentTerms,
      website,
      images,
      status,
      notes,
      createdBy: req.user.id,
    });

    const populatedHotel = await Hotel.findById(hotel._id)
      .populate("supplier", "name type phone email")
      .populate("createdBy", "name email role");

    return res.status(201).json({
      message: "Hotel created successfully",
      hotel: populatedHotel,
    });
  } catch (error) {
    console.error("Create hotel error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Hotel code already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create hotel",
      error: error.message,
    });
  }
};


// GET ALL HOTELS
const getHotels = async (req, res) => {
  try {
    const {
      destination,
      city,
      category,
      supplier,
      status,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (destination) {
      filter.destination = {
        $regex: destination,
        $options: "i",
      };
    }

    if (city) {
      filter.city = {
        $regex: city,
        $options: "i",
      };
    }

    if (category) {
      filter.category = category;
    }

    if (supplier) {
      filter.supplier = supplier;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        {
          name: {
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
        {
          city: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [hotels, total] = await Promise.all([
      Hotel.find(filter)
        .populate("supplier", "name type phone email")
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),

      Hotel.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Hotels fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      hotels,
    });
  } catch (error) {
    console.error("Get hotels error:", error);

    return res.status(500).json({
      message: "Failed to fetch hotels",
      error: error.message,
    });
  }
};


// GET HOTEL BY ID
const getHotelById = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id)
      .populate("supplier", "name type phone email")
      .populate("createdBy", "name email role");

    if (!hotel) {
      return res.status(404).json({
        message: "Hotel not found",
      });
    }

    return res.status(200).json({
      message: "Hotel fetched successfully",
      hotel,
    });
  } catch (error) {
    console.error("Get hotel error:", error);

    return res.status(500).json({
      message: "Failed to fetch hotel",
      error: error.message,
    });
  }
};


// UPDATE HOTEL
const updateHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        message: "Hotel not found",
      });
    }

    const allowedFields = [
      "name",
      "code",
      "description",
      "destination",
      "city",
      "state",
      "country",
      "address",
      "postalCode",
      "location",
      "category",
      "rating",
      "checkInTime",
      "checkOutTime",
      "amenities",
      "roomTypes",
      "contactPerson",
      "supplier",
      "cancellationPolicy",
      "paymentTerms",
      "website",
      "images",
      "status",
      "notes",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        hotel[field] = req.body[field];
      }
    });

    await hotel.save();

    const updatedHotel = await Hotel.findById(hotel._id)
      .populate("supplier", "name type phone email")
      .populate("createdBy", "name email role");

    return res.status(200).json({
      message: "Hotel updated successfully",
      hotel: updatedHotel,
    });
  } catch (error) {
    console.error("Update hotel error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Hotel code already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update hotel",
      error: error.message,
    });
  }
};


// DELETE HOTEL
const deleteHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        message: "Hotel not found",
      });
    }

    await Hotel.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Hotel deleted successfully",
    });
  } catch (error) {
    console.error("Delete hotel error:", error);

    return res.status(500).json({
      message: "Failed to delete hotel",
      error: error.message,
    });
  }
};


module.exports = {
  createHotel,
  getHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
};
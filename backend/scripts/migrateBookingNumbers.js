require("dotenv").config();
const mongoose = require("mongoose");
const crypto = require("crypto");
const Booking = require("../models/Booking");

const MONGO_URI = process.env.MONGO_URI;

// ============================================
// GENERATE BOOKING NUMBER
// Format: BK-XXXXXX
// Example: BK-FC2FD8
// ============================================

function generateBookingNumber() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let code = "";

  const bytes = crypto.randomBytes(6);

  for (let i = 0; i < 6; i++) {
    code += characters[bytes[i] % characters.length];
  }

  return `BK-${code}`;
}

// ============================================
// GET UNIQUE BOOKING NUMBER
// ============================================

async function getUniqueBookingNumber() {
  let bookingNumber;
  let exists = true;

  while (exists) {
    bookingNumber = generateBookingNumber();

    exists = await Booking.exists({
      bookingNumber,
    });
  }

  return bookingNumber;
}

// ============================================
// MIGRATE BOOKING NUMBERS
// ============================================

async function migrateBookingNumbers() {
  try {
    if (!MONGO_URI) {
      throw new Error(
        "MONGO_URI is not defined in environment variables."
      );
    }

    console.log("Connecting to MongoDB...");

    await mongoose.connect(MONGO_URI);

    console.log("MongoDB connected successfully.\n");

    // Get all bookings
    const bookings = await Booking.find({})
      .select("_id bookingNumber")
      .lean();

    console.log(`Total bookings found: ${bookings.length}\n`);

    if (bookings.length === 0) {
      console.log("No bookings found.");
      await mongoose.disconnect();
      return;
    }

    // Exact required format
    const validFormat = /^BK-[A-Z0-9]{6}$/;

    let updated = 0;
    let skipped = 0;

    for (const booking of bookings) {
      const currentNumber = String(
        booking.bookingNumber || ""
      )
        .trim()
        .toUpperCase();

      // Already correct format
      if (validFormat.test(currentNumber)) {
        skipped++;

        console.log(
          `SKIPPED -> ${booking._id} -> ${currentNumber}`
        );

        continue;
      }

      // Generate new unique number
      const newBookingNumber =
        await getUniqueBookingNumber();

      // Update booking
      await Booking.updateOne(
        { _id: booking._id },
        {
          $set: {
            bookingNumber: newBookingNumber,
          },
        }
      );

      updated++;

      console.log(
        `UPDATED -> ${booking._id} -> ${newBookingNumber}`
      );
    }

    console.log("\n================================");
    console.log("Migration completed successfully");
    console.log("================================");
    console.log(`Total bookings : ${bookings.length}`);
    console.log(`Updated        : ${updated}`);
    console.log(`Skipped        : ${skipped}`);
    console.log("================================\n");

    await mongoose.disconnect();

    console.log("MongoDB disconnected.");
  } catch (error) {
    console.error("\nMigration failed:");
    console.error(error);

    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error("Error disconnecting MongoDB:", disconnectError);
    }

    process.exit(1);
  }
}

// Run migration
migrateBookingNumbers();
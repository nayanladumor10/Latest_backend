const mongoose = require("mongoose")

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Driver name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    unique: true,
    trim: true,
  },
  vehicle: {
    type: String,
    required: [true, "Vehicle information is required"], // This is causing the error
    trim: true,
  },
  vehicleType: {
    type: String,
    required: [true, "Vehicle type is required"],
    trim: true,
  },
  licensePlate: {
    type: String,
    required: [true, "License plate is required"],
    trim: true,
    uppercase: true,
  },
  kycStatus: {
    type: String,
    enum: ["Pending", "Verified", "Rejected"],
    default: "Pending",
  },
  status: {
    type: String,
    enum: ["active", "idle", "offline", "emergency"],
    default: "idle",
  },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  speed: {
    type: Number,
    default: 0,
  },
  batteryLevel: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  completedTrips: {
    type: Number,
    default: 0,
  },
  isOnline: {
    type: Boolean,
    default: true,
  },
  joinDate: {
    type: Date,
    default: Date.now,
  },
  lastUpdate: {
    type: Date,
    default: Date.now,
  },
  // Optional fields for trip management
  destination: String,
  eta: String,
  tripId: String,
  passenger: String,
  // File upload paths
  licensePhoto: String,
  panPhoto: String,
})

module.exports = mongoose.model("Driver", driverSchema)

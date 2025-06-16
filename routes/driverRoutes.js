const express = require("express")
const Driverrouter = express.Router()
const {
  getAllDrivers,
  createDriver,
  deleteDriver,
  updateDriver,
  getDriverStats,
  updateDriverLocation,
  getDriver,
  resetWithIndianNames,
  bulkKycVerification,
} = require("../controllers/driverController")
const upload = require("../middlewares/upload")

// Stats route should come BEFORE /:id route to avoid conflicts
Driverrouter.get("/stats", getDriverStats)

// Reset route for development
Driverrouter.post("/reset", resetWithIndianNames)

// Get all drivers
Driverrouter.get("/", getAllDrivers)

// Create new driver with file uploads and error handling
Driverrouter.post(
  "/add",
  (req, res, next) => {
    console.log("📝 Received driver creation request")
    console.log("Body:", req.body)
    next()
  },
  upload.fields([
    { name: "license", maxCount: 1 },
    { name: "pan", maxCount: 1 },
  ]),
  (error, req, res, next) => {
    if (error) {
      console.error("❌ Upload error:", error.message)
      return upload.handleUploadError(error, req, res, next)
    }
    next()
  },
  createDriver,
)

// Get single driver (this should come after specific routes like /stats)
Driverrouter.get("/:id", getDriver)

// Update driver
Driverrouter.put("/edit/:id", updateDriver)

// Update driver location
Driverrouter.patch("/:id/location", updateDriverLocation)

// Delete driver
Driverrouter.delete("/delete/:id", deleteDriver)

// Bulk KYC verification route
Driverrouter.put(
  "/kyc/bulk",
  upload.fields([
    { name: "license", maxCount: 1 },
    { name: "pan", maxCount: 1 },
  ]),
  (error, req, res, next) => {
    if (error) {
      return upload.handleUploadError(error, req, res, next)
    }
    next()
  },
  bulkKycVerification,
)

module.exports = Driverrouter

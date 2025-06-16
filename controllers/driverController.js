const Driver = require("../models/TRdriverModel")

// Get all drivers with improved error handling
const getAllDrivers = async (req, res) => {
  try {
    const { status, search } = req.query
    const query = {}

    // Filter by status if provided
    if (status && status !== "all") {
      query.status = status
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { vehicle: { $regex: search, $options: "i" } },
        { vehicleType: { $regex: search, $options: "i" } },
        { licensePlate: { $regex: search, $options: "i" } },
      ]
    }

    const drivers = await Driver.find(query).sort({ lastUpdate: -1 })

    res.json({
      success: true,
      count: drivers.length,
      data: drivers,
    })
  } catch (error) {
    console.error("Error fetching drivers:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch drivers",
      error: error.message,
    })
  }
}

// Get single driver
const getDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      })
    }

    res.json({
      success: true,
      data: driver,
    })
  } catch (error) {
    console.error("Error fetching driver:", error)

    // Handle invalid ObjectId error
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID format",
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch driver",
      error: error.message,
    })
  }
}

// Create new driver with proper validation
const createDriver = async (req, res) => {
  try {
    console.log("📝 Creating new driver with data:", req.body)
    console.log("📁 Files received:", req.files)

    // Validate required fields
    const { name, email, phone, vehicleType, licensePlate } = req.body

    if (!name || !email || !phone || !vehicleType || !licensePlate) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, email, phone, vehicleType, licensePlate",
        receivedData: req.body,
      })
    }

    // Check for existing driver with same email or phone
    const existingDriver = await Driver.findOne({
      $or: [{ email: email }, { phone: phone }],
    })

    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: "Driver with this email or phone already exists",
      })
    }

    // Create the vehicle field by combining vehicleType and licensePlate
    const vehicle = `${vehicleType.trim()} - ${licensePlate.trim().toUpperCase()}`

    const driverData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      vehicle: vehicle, // This is the required field that was missing!
      vehicleType: vehicleType.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      kycStatus: "Pending",
      joinDate: new Date(),
      isOnline: true,
      status: "idle",
      batteryLevel: Math.floor(Math.random() * 30) + 70, // Random battery 70-100%
      rating: 0,
      completedTrips: 0,
      lastUpdate: new Date(),
      // Add default location (you can change this to your city)
      location: {
        lat: 24.8607 + (Math.random() - 0.5) * 0.01, // Small random offset
        lng: 67.0011 + (Math.random() - 0.5) * 0.01,
      },
      speed: 0,
    }

    // Add file paths if files were uploaded
    if (req.files) {
      if (req.files.license && req.files.license[0]) {
        driverData.licensePhoto = req.files.license[0].path
        console.log("📄 License photo uploaded:", driverData.licensePhoto)
      }
      if (req.files.pan && req.files.pan[0]) {
        driverData.panPhoto = req.files.pan[0].path
        console.log("📄 PAN photo uploaded:", driverData.panPhoto)
      }
    }

    console.log("💾 Saving driver data:", driverData)

    const driver = new Driver(driverData)
    const savedDriver = await driver.save()

    console.log("✅ Driver created successfully:", savedDriver._id)

    res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: savedDriver,
    })
  } catch (error) {
    console.error("❌ Error creating driver:", error)

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => err.message)
      console.log("Validation errors:", validationErrors)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
        details: error.message,
      })
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({
        success: false,
        message: `Driver with this ${field} already exists`,
        field: field,
      })
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: "Failed to create driver",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}

// Update driver with validation
const updateDriver = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      lastUpdate: new Date(),
    }

    // If vehicleType or licensePlate is being updated, update the vehicle field too
    if (updateData.vehicleType || updateData.licensePlate) {
      const currentDriver = await Driver.findById(req.params.id)
      if (currentDriver) {
        const vehicleType = updateData.vehicleType || currentDriver.vehicleType
        const licensePlate = updateData.licensePlate || currentDriver.licensePlate
        updateData.vehicle = `${vehicleType} - ${licensePlate.toUpperCase()}`
      }
    }

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined || updateData[key] === "") {
        delete updateData[key]
      }
    })

    const driver = await Driver.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    })

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      })
    }

    res.json({
      success: true,
      message: "Driver updated successfully",
      data: driver,
    })
  } catch (error) {
    console.error("Error updating driver:", error)

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID format",
      })
    }

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      })
    }

    res.status(400).json({
      success: false,
      message: "Failed to update driver",
      error: error.message,
    })
  }
}

// Update driver location with fallback implementation
const updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng, speed } = req.body

    // Validate coordinates
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      })
    }

    const driver = await Driver.findById(req.params.id)
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      })
    }

    // Update location data
    const updateData = {
      location: { lat: Number.parseFloat(lat), lng: Number.parseFloat(lng) },
      lastUpdate: new Date(),
    }

    if (speed !== undefined && !isNaN(speed)) {
      updateData.speed = Number.parseFloat(speed)
    }

    // Check if driver has updateLocation method, otherwise use findByIdAndUpdate
    let updatedDriver
    if (typeof driver.updateLocation === "function") {
      await driver.updateLocation(lat, lng, speed)
      updatedDriver = driver
    } else {
      updatedDriver = await Driver.findByIdAndUpdate(req.params.id, updateData, { new: true })
    }

    res.json({
      success: true,
      message: "Driver location updated successfully",
      data: updatedDriver,
    })
  } catch (error) {
    console.error("Error updating driver location:", error)

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID format",
      })
    }

    res.status(400).json({
      success: false,
      message: "Failed to update driver location",
      error: error.message,
    })
  }
}

// Delete driver
const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id)

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      })
    }

    res.json({
      success: true,
      message: "Driver deleted successfully",
      data: { deletedId: req.params.id },
    })
  } catch (error) {
    console.error("Error deleting driver:", error)

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID format",
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete driver",
      error: error.message,
    })
  }
}

// Get driver statistics
const getDriverStats = async (req, res) => {
  try {
    const stats = await Driver.aggregate([
      {
        $group: {
          _id: null,
          totalDrivers: { $sum: 1 },
          activeDrivers: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          idleDrivers: {
            $sum: { $cond: [{ $eq: ["$status", "idle"] }, 1, 0] },
          },
          emergencyDrivers: {
            $sum: { $cond: [{ $eq: ["$status", "emergency"] }, 1, 0] },
          },
          offlineDrivers: {
            $sum: { $cond: [{ $eq: ["$status", "offline"] }, 1, 0] },
          },
          verifiedDrivers: {
            $sum: { $cond: [{ $eq: ["$kycStatus", "Verified"] }, 1, 0] },
          },
          pendingDrivers: {
            $sum: { $cond: [{ $eq: ["$kycStatus", "Pending"] }, 1, 0] },
          },
          avgRating: { $avg: "$rating" },
          totalTrips: { $sum: "$completedTrips" },
          avgBatteryLevel: { $avg: "$batteryLevel" },
        },
      },
    ])

    const result = stats[0] || {
      totalDrivers: 0,
      activeDrivers: 0,
      idleDrivers: 0,
      emergencyDrivers: 0,
      offlineDrivers: 0,
      verifiedDrivers: 0,
      pendingDrivers: 0,
      avgRating: 0,
      totalTrips: 0,
      avgBatteryLevel: 0,
    }

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error fetching driver stats:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch driver statistics",
      error: error.message,
    })
  }
}

// Reset and initialize with Indian names - FORCE UPDATE
const resetWithIndianNames = async (req, res) => {
  try {
    // Delete all existing drivers
    await Driver.deleteMany({})
    console.log("🗑️ Cleared existing drivers")

    // Create new drivers with Indian names
    const indianDrivers = [
      {
        name: "Harsh Prajapati",
        email: "harsh.prajapati@example.com",
        phone: "+91 98765 43210",
        vehicle: "Toyota Corolla - MH 01 AB 1234", // Include the vehicle field
        vehicleType: "Car",
        licensePlate: "MH 01 AB 1234",
        status: "active",
        location: { lat: 24.8607, lng: 67.0011 },
        destination: "Andheri East",
        eta: "15 mins",
        tripId: "TRP001",
        passenger: "Priya Sharma",
        speed: 45,
        batteryLevel: 85,
        rating: 4.8,
        completedTrips: 156,
        isOnline: true,
        kycStatus: "Verified",
        joinDate: new Date(),
        lastUpdate: new Date(),
      },
      {
        name: "Bhavesh Kumar",
        email: "bhavesh.kumar@example.com",
        phone: "+91 98765 43211",
        vehicle: "Honda City - DL 02 CD 5678", // Include the vehicle field
        vehicleType: "Car",
        licensePlate: "DL 02 CD 5678",
        status: "active",
        location: { lat: 24.8615, lng: 67.0025 },
        destination: "Bandra West",
        eta: "8 mins",
        tripId: "TRP002",
        passenger: "Rahul Gupta",
        speed: 32,
        batteryLevel: 92,
        rating: 4.6,
        completedTrips: 203,
        isOnline: true,
        kycStatus: "Verified",
        joinDate: new Date(),
        lastUpdate: new Date(),
      },
      {
        name: "Nayan Ladumore",
        email: "nayan.ladumore@example.com",
        phone: "+91 98765 43212",
        vehicle: "Suzuki Alto - GJ 03 EF 9012", // Include the vehicle field
        vehicleType: "Car",
        licensePlate: "GJ 03 EF 9012",
        status: "idle",
        location: { lat: 24.859, lng: 67.004 },
        speed: 0,
        batteryLevel: 78,
        rating: 4.9,
        completedTrips: 89,
        isOnline: true,
        kycStatus: "Pending",
        joinDate: new Date(),
        lastUpdate: new Date(),
      },
      {
        name: "Mahi Panchal",
        email: "mahi.panchal@example.com",
        phone: "+91 98765 43213",
        vehicle: "Honda Civic - KA 04 GH 3456", // Include the vehicle field
        vehicleType: "Car",
        licensePlate: "KA 04 GH 3456",
        status: "emergency",
        location: { lat: 24.858, lng: 67.003 },
        destination: "Powai",
        eta: "20 mins",
        tripId: "TRP003",
        passenger: "Sneha Patel",
        speed: 0,
        batteryLevel: 45,
        rating: 4.7,
        completedTrips: 134,
        isOnline: true,
        kycStatus: "Verified",
        joinDate: new Date(),
        lastUpdate: new Date(),
      },
      {
        name: "Raj Kumar Singh",
        email: "raj.singh@example.com",
        phone: "+91 98765 43214",
        vehicle: "Hyundai Elantra - UP 05 IJ 7890", // Include the vehicle field
        vehicleType: "Car",
        licensePlate: "UP 05 IJ 7890",
        status: "idle",
        location: { lat: 24.862, lng: 67.008 },
        speed: 0,
        batteryLevel: 95,
        rating: 4.5,
        completedTrips: 67,
        isOnline: true,
        kycStatus: "Pending",
        joinDate: new Date(),
        lastUpdate: new Date(),
      },
    ]

    const createdDrivers = await Driver.insertMany(indianDrivers)
    console.log("✅ Successfully created drivers with Indian names!")

    if (res) {
      res.json({
        success: true,
        message: "Drivers reset successfully",
        data: createdDrivers,
        count: createdDrivers.length,
      })
    }

    return true
  } catch (error) {
    console.error("❌ Error resetting drivers:", error)

    if (res) {
      res.status(500).json({
        success: false,
        message: "Failed to reset drivers",
        error: error.message,
      })
    }

    return false
  }
}

// Initialize sample drivers with proper Indian names
const initializeSampleDrivers = async () => {
  try {
    // Check if drivers already exist
    const existingDrivers = await Driver.countDocuments()

    if (existingDrivers === 0) {
      console.log("No drivers found, initializing sample drivers...")
      await resetWithIndianNames()
    } else {
      console.log(`Found ${existingDrivers} existing drivers, skipping initialization`)
    }
  } catch (error) {
    console.error("❌ Error initializing sample drivers:", error)
  }
}

// Handle bulk KYC verification
const bulkKycVerification = async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || !req.files.license || !req.files.pan) {
      return res.status(400).json({
        success: false,
        message: "Both license and PAN card files are required",
      })
    }

    // In a real application, you would process these files
    // For now, we'll just update all pending drivers to verified
    const result = await Driver.updateMany({ kycStatus: "Pending" }, { kycStatus: "Verified", lastUpdate: new Date() })

    res.json({
      success: true,
      message: `${result.modifiedCount} drivers verified successfully`,
      data: { modifiedCount: result.modifiedCount },
    })
  } catch (error) {
    console.error("Error in bulk KYC verification:", error)
    res.status(500).json({
      success: false,
      message: "Failed to process bulk KYC verification",
      error: error.message,
    })
  }
}

module.exports = {
  getAllDrivers,
  getDriver,
  createDriver,
  updateDriver,
  updateDriverLocation,
  deleteDriver,
  getDriverStats,
  initializeSampleDrivers,
  resetWithIndianNames,
  bulkKycVerification,
}

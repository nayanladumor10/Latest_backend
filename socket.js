const Ride = require("./models/Ride")
const Driver = require("./models/TRdriverModel")
const Vehicle = require("./models/Vehicle") // Add Vehicle model
const dashboardController = require("./controllers/dashboardController")
const driverController = require("./controllers/driverController")
const locationSimulator = require("./utils/locationSimulator")

/**
 * Unified Socket.IO setup that combines all functionality:
 * - Dashboard real-time updates
 * - Ride tracking and location updates
 * - Admin management events
 * - Reports and analytics
 * - Driver tracking and simulation
 * - Vehicle management events
 * @param {Object} io - Socket.IO server instance
 * @param {Object} app - Express app instance for accessing controllers
 */
function setupSocket(io, app) {
  // Track connected clients by type
  const clients = {
    dashboard: new Set(),
    admin: new Set(),
    rides: new Set(),
    reports: new Set(),
    drivers: new Set(),
    vehicles: new Set(), // Add vehicles room
    all: new Set(),
  }

  // Simulation intervals
  let locationInterval
  let dashboardInterval
  let driverSimulationInterval

  io.on("connection", (socket) => {
    clients.all.add(socket)
    console.log("Client connected:", socket.id)

    // ---- CONNECTION MANAGEMENT ----

    // Handle room joining for different features
    socket.on("join-room", (room) => {
      socket.join(room)
      console.log(`🏠 Socket ${socket.id} joined room: ${room}`)

      // Track clients by feature type
      switch (room) {
        case "dashboard":
          clients.dashboard.add(socket)
          sendInitialDashboardData(socket)
          break
        case "admin-management":
          clients.admin.add(socket)
          socket.emit("connected", {
            message: "Connected to admin management system",
            timestamp: new Date().toISOString(),
          })
          break
        case "rides":
          clients.rides.add(socket)
          break
        case "reports":
          clients.reports.add(socket)
          break
        case "drivers":
          clients.drivers.add(socket)
          sendInitialDriverData(socket)
          break
        case "vehicles":
          clients.vehicles.add(socket)
          sendInitialVehicleData(socket)
          break
      }
    })

    // Auto-join dashboard room for backward compatibility
    socket.join("dashboard")
    clients.dashboard.add(socket)
    sendInitialDashboardData(socket)

    // ---- VEHICLE-SPECIFIC SOCKET EVENTS ----

    // Get latest vehicles
    socket.on("getLatestVehicles", async () => {
      try {
        const vehicles = await Vehicle.find().sort({ updatedAt: -1 }).populate("assignedDriver", "name phone")
        socket.emit("vehiclesUpdate", {
          success: true,
          data: vehicles,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Error fetching vehicles for socket:", error)
        socket.emit("error", {
          message: "Failed to fetch vehicle data",
          error: error.message,
        })
      }
    })

    // Handle vehicle status updates from client
    socket.on("updateVehicleStatus", async (data) => {
      try {
        const { vehicleId, status } = data
        const vehicle = await Vehicle.findByIdAndUpdate(
          vehicleId,
          { status, updatedAt: new Date() },
          { new: true },
        ).populate("assignedDriver", "name phone")

        if (vehicle) {
          // Broadcast the update to all clients
          io.emit("vehicleStatusChanged", {
            vehicleId,
            status,
            vehicle,
            timestamp: new Date().toISOString(),
          })

          socket.emit("statusUpdateSuccess", {
            message: `Vehicle ${vehicle.registrationNumber} status updated to ${status}`,
            vehicle,
          })
        }
      } catch (error) {
        console.error("Error updating vehicle status:", error)
        socket.emit("error", {
          message: "Failed to update vehicle status",
          error: error.message,
        })
      }
    })

    // Handle vehicle assignment to driver
    socket.on("assignVehicleToDriver", async (data) => {
      try {
        const { vehicleId, driverId } = data

        // Update vehicle with assigned driver
        const vehicle = await Vehicle.findByIdAndUpdate(
          vehicleId,
          { assignedDriver: driverId, status: "Active", updatedAt: new Date() },
          { new: true },
        ).populate("assignedDriver", "name phone")

        if (vehicle) {
          // Broadcast the assignment to all clients
          io.emit("vehicleAssigned", {
            vehicleId,
            driverId,
            vehicle,
            timestamp: new Date().toISOString(),
          })

          socket.emit("assignmentSuccess", {
            message: `Vehicle ${vehicle.registrationNumber} assigned to driver`,
            vehicle,
          })
        }
      } catch (error) {
        console.error("Error assigning vehicle:", error)
        socket.emit("error", {
          message: "Failed to assign vehicle",
          error: error.message,
        })
      }
    })

    // ---- RIDE-SPECIFIC SOCKET EVENTS ----

    // Handle chat messages
    socket.on("chatMessage", ({ rideId, message }) => {
      io.emit("chatMessage", { rideId, message })
      console.log(`💬 Chat message for ride ${rideId}:`, message)
    })

    // Handle ride status updates
    socket.on("rideStatusUpdate", async ({ rideId, status }) => {
      console.log("Broadcasting ride status update", rideId, status)
      io.emit("rideStatusUpdate", { rideId, status })

      // Also update dashboard if ride status affects stats
      setTimeout(() => sendDashboardUpdates(io), 1000)
    })

    // ---- DRIVER-SPECIFIC SOCKET EVENTS ----

    // Send initial driver data
    socket.on("getLatestDrivers", async () => {
      try {
        const drivers = await Driver.find().sort({ lastUpdate: -1 })
        socket.emit("driversUpdate", {
          success: true,
          data: drivers,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Error fetching drivers for socket:", error)
        socket.emit("error", {
          message: "Failed to fetch driver data",
          error: error.message,
        })
      }
    })

    // Handle driver status updates from client
    socket.on("updateDriverStatus", async (data) => {
      try {
        const { driverId, status } = data
        const driver = await Driver.findByIdAndUpdate(driverId, { status, lastUpdate: new Date() }, { new: true })

        if (driver) {
          // Broadcast the update to all clients
          io.emit("driverStatusChanged", {
            driverId,
            status,
            driver,
            timestamp: new Date().toISOString(),
          })

          socket.emit("statusUpdateSuccess", {
            message: `Driver ${driver.name} status updated to ${status}`,
            driver,
          })
        }
      } catch (error) {
        console.error("Error updating driver status:", error)
        socket.emit("error", {
          message: "Failed to update driver status",
          error: error.message,
        })
      }
    })

    // Handle emergency alerts
    socket.on("emergencyAlert", async (data) => {
      try {
        const { driverId, message } = data
        const driver = await Driver.findByIdAndUpdate(
          driverId,
          { status: "emergency", lastUpdate: new Date() },
          { new: true },
        )

        if (driver) {
          // Broadcast emergency alert to all clients
          io.emit("emergencyAlert", {
            driverId,
            driver,
            message: message || `Emergency alert from ${driver.name}`,
            timestamp: new Date().toISOString(),
            priority: "high",
          })

          console.log(`🚨 Emergency alert from driver ${driver.name} (${driverId})`)
        }
      } catch (error) {
        console.error("Error handling emergency alert:", error)
        socket.emit("error", {
          message: "Failed to process emergency alert",
          error: error.message,
        })
      }
    })

    // Handle location updates from driver apps
    socket.on("updateLocation", async (data) => {
      try {
        const { driverId, lat, lng, speed } = data
        const driver = await Driver.findById(driverId)

        if (driver) {
          // Check if updateLocation method exists on the driver model
          if (typeof driver.updateLocation === "function") {
            await driver.updateLocation(lat, lng, speed)
          } else {
            // Fallback if method doesn't exist
            await Driver.findByIdAndUpdate(driverId, {
              location: { lat, lng },
              speed,
              lastUpdate: new Date(),
            })
          }

          // Broadcast location update to all clients
          io.emit("locationUpdate", {
            driverId,
            location: { lat, lng },
            speed,
            timestamp: new Date().toISOString(),
          })
        }
      } catch (error) {
        console.error("Error updating location:", error)
        socket.emit("error", {
          message: "Failed to update location",
          error: error.message,
        })
      }
    })

    // Handle trip assignments
    socket.on("assignTrip", async (data) => {
      try {
        const { driverId, destination, passenger, tripId } = data

        // Use the generateETA function if available, otherwise use a default value
        let eta = "15 mins"
        if (locationSimulator && typeof locationSimulator.generateETA === "function") {
          eta = locationSimulator.generateETA(5, 40) // Assume 5km average distance
        }

        const driver = await Driver.findByIdAndUpdate(
          driverId,
          {
            status: "active",
            destination,
            passenger,
            tripId,
            eta,
            lastUpdate: new Date(),
          },
          { new: true },
        )

        if (driver) {
          io.emit("tripAssigned", {
            driverId,
            driver,
            tripDetails: { destination, passenger, tripId },
            timestamp: new Date().toISOString(),
          })

          socket.emit("tripAssignmentSuccess", {
            message: `Trip ${tripId} assigned to ${driver.name}`,
            driver,
          })
        }
      } catch (error) {
        console.error("Error assigning trip:", error)
        socket.emit("error", {
          message: "Failed to assign trip",
          error: error.message,
        })
      }
    })

    // ---- ADMIN MANAGEMENT EVENTS ----

    // Join admin management room automatically for admin clients
    socket.join("admin-management")
    console.log(`📋 Socket ${socket.id} joined admin-management room`)

    // ---- CLEANUP ON DISCONNECT ----
    socket.on("disconnect", () => {
      // Remove from all client sets
      Object.values(clients).forEach((clientSet) => clientSet.delete(socket))
      console.log("Client disconnected:", socket.id)
    })
  })

  // ---- PERIODIC UPDATES ----

  // Initialize sample drivers and start simulation
  initializeAndStartSimulation()

  // Simulate location updates every 10s (for rides)
  locationInterval = setInterval(async () => {
    try {
      const rides = await Ride.find().limit(5)
      for (const ride of rides) {
        const lat = 12 + Math.random()
        const lng = 77 + Math.random()

        const updated = await Ride.findByIdAndUpdate(
          ride._id,
          {
            currentLocation: {
              lat,
              lng,
              address: `Lat: ${lat.toFixed(3)}, Lng: ${lng.toFixed(3)}`,
              updatedAt: new Date().toLocaleTimeString(),
            },
          },
          { new: true },
        )

        // Emit to rides room
        io.to("rides").emit("locationUpdate", {
          rideId: updated._id,
          lat,
          lng,
          address: updated.currentLocation.address,
        })
      }
    } catch (err) {
      console.error("Error updating ride locations:", err)
    }
  }, 10000)

  // Periodically send dashboard updates (every 15 seconds)
  dashboardInterval = setInterval(async () => {
    try {
      await sendDashboardUpdates(io)
    } catch (err) {
      console.error("Error sending dashboard updates:", err)
    }
  }, 15000)

  // Driver simulation interval (every 3 seconds)
  // Only set up if the required functions exist
  if (
    locationSimulator &&
    typeof locationSimulator.simulateMovement === "function" &&
    typeof locationSimulator.simulateBatteryDrain === "function"
  ) {
    driverSimulationInterval = setInterval(async () => {
      try {
        const drivers = await Driver.find({ isOnline: true })
        const updatedDrivers = []

        for (const driver of drivers) {
          // Default values in case simulation functions fail
          let location = driver.location || { lat: 24.8607, lng: 67.0011 }
          let speed = driver.speed || 0
          let batteryLevel = driver.batteryLevel || 80

          try {
            // Simulate movement based on current status
            const movementResult = locationSimulator.simulateMovement(driver.location, driver.status, driver.speed)
            if (movementResult && movementResult.location) {
              location = movementResult.location
              speed = movementResult.speed
            }

            // Simulate battery drain
            batteryLevel = locationSimulator.simulateBatteryDrain(driver.batteryLevel, driver.status, speed)
          } catch (simError) {
            console.error("Error in driver simulation functions:", simError)
            // Continue with default values
          }

          // Update ETA for active drivers
          let eta = driver.eta
          if (driver.status === "active" && driver.destination) {
            // Simulate decreasing ETA
            const currentETA = Number.parseInt(driver.eta?.replace(/\D/g, "") || "0")
            if (currentETA > 1) {
              eta = `${Math.max(1, currentETA - Math.floor(Math.random() * 2))} mins`
            } else {
              // Trip completed - reset driver to idle
              driver.status = "idle"
              driver.destination = null
              driver.passenger = null
              driver.tripId = null
              eta = null
              driver.completedTrips = (driver.completedTrips || 0) + 1
            }
          }

          // Randomly assign new trips to idle drivers (10% chance per update)
          if (driver.status === "idle" && Math.random() < 0.1) {
            driver.status = "active"

            // Use the utility functions if available, otherwise use defaults
            driver.destination = locationSimulator.getRandomDestination
              ? locationSimulator.getRandomDestination()
              : "Random Location"

            driver.passenger = locationSimulator.getRandomPassenger
              ? locationSimulator.getRandomPassenger()
              : "Random Passenger"

            driver.tripId = `TRP${Date.now().toString().slice(-6)}`

            eta = locationSimulator.generateETA
              ? locationSimulator.generateETA(Math.random() * 10 + 2, speed || 40)
              : "15 mins"
          }

          // Randomly create emergency situations (0.5% chance per update)
          if (driver.status === "active" && Math.random() < 0.005) {
            driver.status = "emergency"

            // Emit emergency alert
            io.emit("emergencyAlert", {
              driverId: driver._id,
              driver,
              message: `Emergency alert from ${driver.name} - Immediate assistance required`,
              timestamp: new Date().toISOString(),
              priority: "high",
            })
          }

          // Auto-resolve emergency after some time (20% chance per update)
          if (driver.status === "emergency" && Math.random() < 0.2) {
            driver.status = "active"
          }

          // Update driver in database
          const updatedDriver = await Driver.findByIdAndUpdate(
            driver._id,
            {
              location,
              speed,
              batteryLevel,
              eta,
              status: driver.status,
              destination: driver.destination,
              passenger: driver.passenger,
              tripId: driver.tripId,
              completedTrips: driver.completedTrips || 0,
              lastUpdate: new Date(),
            },
            { new: true },
          )

          updatedDrivers.push(updatedDriver)
        }

        // Broadcast updates to all connected clients
        if (updatedDrivers.length > 0) {
          io.emit("driversUpdate", {
            success: true,
            data: updatedDrivers,
            timestamp: new Date().toISOString(),
            updateType: "simulation",
          })

          // Send individual location updates for active drivers
          updatedDrivers.forEach((driver) => {
            if (driver.status === "active") {
              io.emit("locationUpdate", {
                driverId: driver._id,
                location: driver.location,
                speed: driver.speed,
                eta: driver.eta,
                timestamp: new Date().toISOString(),
              })
            }
          })
        }
      } catch (error) {
        console.error("❌ Error in driver simulation:", error)
      }
    }, 3000)

    console.log("🔄 Driver simulation interval started (3s updates)")
  } else {
    console.warn("⚠️ Driver simulation disabled - required functions not available")
  }

  // Clean up intervals if the server shuts down
  io.engine.on("close", () => {
    clearInterval(locationInterval)
    clearInterval(dashboardInterval)
    if (driverSimulationInterval) {
      clearInterval(driverSimulationInterval)
    }
  })

  // ---- HELPER FUNCTIONS FOR EMITTING EVENTS ----

  // Emit events to specific rooms
  const emitToRoom = (room, event, data) => {
    console.log(`📡 Emitting ${event} to room ${room}:`, data)
    io.to(room).emit(event, data)
  }

  // Emit admin-specific events
  const emitAdminEvent = (event, data) => {
    emitToRoom("admin-management", event, {
      ...data,
      timestamp: new Date().toISOString(),
    })
  }

  // Emit dashboard events
  const emitDashboardEvent = (event, data) => {
    emitToRoom("dashboard", event, {
      ...data,
      timestamp: new Date().toISOString(),
    })
  }

  // Emit reports events
  const emitReportsEvent = (event, data) => {
    emitToRoom("reports", event, {
      ...data,
      timestamp: new Date().toISOString(),
    })
  }

  // Emit driver events
  const emitDriverEvent = (event, data) => {
    emitToRoom("drivers", event, {
      ...data,
      timestamp: new Date().toISOString(),
    })
  }

  // Emit vehicle events
  const emitVehicleEvent = (event, data) => {
    emitToRoom("vehicles", event, {
      ...data,
      timestamp: new Date().toISOString(),
    })
  }

  // Make emit functions available to the app
  app.set("socketEmitters", {
    emitToRoom,
    emitAdminEvent,
    emitDashboardEvent,
    emitReportsEvent,
    emitDriverEvent,
    emitVehicleEvent,
    getClients: () => clients,
  })

  // Initialize driver simulation
  async function initializeAndStartSimulation() {
    try {
      // Initialize sample drivers if none exist
      if (driverController && typeof driverController.initializeSampleDrivers === "function") {
        await driverController.initializeSampleDrivers()
        console.log("🎯 Driver simulation initialized")
      } else {
        console.warn("⚠️ Driver initialization skipped - function not available")
      }
    } catch (error) {
      console.error("❌ Error initializing driver simulation:", error)
    }
  }

  // Return a cleanup function
  return () => {
    clearInterval(locationInterval)
    clearInterval(dashboardInterval)
    if (driverSimulationInterval) {
      clearInterval(driverSimulationInterval)
    }
  }
}

/**
 * Send initial dashboard data to a newly connected client
 * @param {Object} socket - Socket.IO client socket
 */
async function sendInitialDashboardData(socket) {
  try {
    // Send dashboard stats
    const stats = await getDashboardStats()
    if (stats) {
      socket.emit("dashboardStats", stats)
      console.log("📊 Initial dashboard stats sent to new client")
    }
  } catch (err) {
    console.error("Error sending initial dashboard data:", err)
  }
}

/**
 * Send initial driver data to a newly connected client
 * @param {Object} socket - Socket.IO client socket
 */
async function sendInitialDriverData(socket) {
  try {
    const Driver = require("./models/TRdriverModel")
    const drivers = await Driver.find().sort({ lastUpdate: -1 })
    socket.emit("driversUpdate", {
      success: true,
      data: drivers,
      timestamp: new Date().toISOString(),
    })
    console.log("🚗 Initial driver data sent to new client")
  } catch (error) {
    console.error("Error sending initial driver data:", error)
    socket.emit("error", {
      message: "Failed to fetch driver data",
      error: error.message,
    })
  }
}

/**
 * Send initial vehicle data to a newly connected client
 * @param {Object} socket - Socket.IO client socket
 */
async function sendInitialVehicleData(socket) {
  try {
    const vehicles = await Vehicle.find().sort({ updatedAt: -1 }).populate("assignedDriver", "name phone")
    socket.emit("vehiclesUpdate", {
      success: true,
      data: vehicles,
      timestamp: new Date().toISOString(),
    })
    console.log("🚙 Initial vehicle data sent to new client")
  } catch (error) {
    console.error("Error sending initial vehicle data:", error)
    socket.emit("error", {
      message: "Failed to fetch vehicle data",
      error: error.message,
    })
  }
}

/**
 * Send dashboard updates to all connected clients
 * @param {Object} io - Socket.IO server instance
 */
async function sendDashboardUpdates(io) {
  try {
    const stats = await getDashboardStats()

    // Only emit if we have valid data
    if (stats && validateStatsData(stats)) {
      io.to("dashboard").emit("dashboardStats", stats)
      console.log("📊 Dashboard stats updated and broadcasted")
    } else {
      console.warn("⚠️ Skipping dashboard update - no valid data")
    }
  } catch (err) {
    console.error("Error sending dashboard updates:", err)
  }
}

/**
 * Validate stats data before sending
 * @param {Object} stats - Dashboard statistics
 * @returns {boolean} Whether the data is valid
 */
function validateStatsData(stats) {
  if (!stats || typeof stats !== "object") {
    return false
  }

  // Check if at least some meaningful data exists
  const hasValidData =
    (stats.todayRides !== undefined && stats.todayRides >= 0) ||
    (stats.totalDrivers !== undefined && stats.totalDrivers >= 0) ||
    (stats.todayIncome !== undefined && stats.todayIncome >= 0)

  return hasValidData
}

/**
 * Get dashboard stats from controller with better error handling
 * @returns {Object} Dashboard statistics
 */
async function getDashboardStats() {
  try {
    const dashboardController = require("./controllers/dashboardController")

    // Create a mock response object to capture the data
    let statsData = null
    const mockRes = {
      json: (data) => {
        statsData = data
        return data
      },
      status: (code) => ({
        json: (data) => {
          statsData = data
          return data
        },
      }),
    }

    if (dashboardController && typeof dashboardController.getDashboardStats === "function") {
      await dashboardController.getDashboardStats({}, mockRes)

      // Validate the data before returning
      if (validateStatsData(statsData)) {
        return {
          ...statsData,
          timestamp: new Date().toISOString(),
        }
      }
    }

    console.warn("⚠️ Invalid dashboard stats received or function not available")
    return null
  } catch (error) {
    console.error("❌ Error getting dashboard stats:", error)
    return null
  }
}

module.exports = setupSocket
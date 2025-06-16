// const express = require("express")
// require("dotenv").config()
// const mongoose = require("mongoose")
// const cors = require("cors")
// const http = require("http")
// const { Server } = require("socket.io")

// // Import routes and controllers
// const authRoutes = require("./routes/authRoutes")
// const dashboardRoutes = require("./routes/dashboardRoutes")
// const adminRoutes = require("./routes/adminRoutes")
// const reportsRoutes = require("./routes/reportsRoutes")
// const ridesRoutes = require("./routes/rides")
// const invoiceRoutes = require("./routes/invoiceRoutes")
// const vehicleRoutes = require("./routes/vehicleRoutes") // Add vehicle routes

// const dashboardController = require("./controllers/dashboardController")
// const db = require("./config/db")

// // Import models for change streams
// const Ride = require("./models/Ride1")
// const Driver = require("./models/Driver")
// const Admin = require("./models/adminModel")
// const Vehicle = require("./models/Vehicle") // Add Vehicle model

// const ReportsSocketService = require("./services/reportsSocketService")
// const { validateDateRange, validateTimeRange, validateDriverFilter } = require("./middlewares/reportsMiddleware")
// const setupSocket = require("./socket") // Import our unified socket handler
// const driverRoutes = require("./routes/driverRoutes")

// // --- App & Server Setup ---
// const app = express()
// const server = http.createServer(app)

// // Enhanced Socket.IO configuration
// const io = new Server(server, {
//   cors: {
//     origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//     credentials: true,
//     allowedHeaders: ["Content-Type", "Authorization"],
//   },
//   allowEIO3: true,
//   transports: ["websocket", "polling"],
//   pingTimeout: 60000,
//   pingInterval: 25000,
//   connectTimeout: 45000,
//   maxHttpBufferSize: 1e8, // 100MB
//   path: "/socket.io", // Default path
//   serveClient: false, // Don't serve client files
// })

// // Track connected clients
// const connectedClients = new Map()

// // --- Enhanced CORS Middleware ---
// app.use(
//   cors({
//     origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   }),
// )

// app.use(express.json())

// // Add a test endpoint to verify server is running
// app.get("/api/test", (req, res) => {
//   res.json({
//     message: "Server is running",
//     timestamp: new Date().toISOString(),
//     socketConnected: io.engine.clientsCount > 0,
//   })
// })

// // --- REST API Routes ---
// app.use("/api/auth", authRoutes)
// app.use("/api/dashboard", dashboardRoutes)
// app.use("/api/admins", adminRoutes)
// app.use("/api/reports", validateDateRange, validateTimeRange, validateDriverFilter, reportsRoutes)
// app.use("/api/rides", ridesRoutes)
// app.use("/api/invoices", invoiceRoutes)
// app.use("/api/driver", driverRoutes)
// app.use("/api/vehicles", vehicleRoutes) // Add vehicle routes

// // --- Enhanced WebSocket Logic ---
// io.on("connection", (socket) => {
//   console.log(`🔌 New client connected: ${socket.id}`)
//   console.log(`👥 Total clients connected: ${io.engine.clientsCount}`)

//   // Store client connection time
//   connectedClients.set(socket.id, {
//     connectedAt: new Date(),
//     rooms: [],
//     lastActivity: new Date(),
//   })

//   // Send immediate connection confirmation
//   socket.emit("test-response", {
//     message: "Connection successful",
//     socketId: socket.id,
//     timestamp: new Date().toISOString(),
//   })

//   // Handle client connection confirmation
//   socket.on("client-connected", (data) => {
//     console.log("👋 Client connection confirmed:", data)

//     // Update client info
//     if (connectedClients.has(socket.id)) {
//       const clientInfo = connectedClients.get(socket.id)
//       clientInfo.page = data.page
//       clientInfo.lastActivity = new Date()
//       connectedClients.set(socket.id, clientInfo)
//     }

//     // Send welcome message
//     socket.emit("server-welcome", {
//       message: "Welcome to the vehicle management system",
//       serverTime: new Date().toISOString(),
//       clientId: socket.id,
//     })
//   })

//   // Handle client heartbeat
//   socket.on("client-heartbeat", (data) => {
//     console.log("💓 Client heartbeat received:", data)

//     // Update client last activity
//     if (connectedClients.has(socket.id)) {
//       const clientInfo = connectedClients.get(socket.id)
//       clientInfo.lastActivity = new Date()
//       connectedClients.set(socket.id, clientInfo)
//     }

//     socket.emit("server-heartbeat", {
//       message: "Server is alive",
//       serverTime: new Date().toISOString(),
//       clientId: data.clientId,
//       uptime: process.uptime(),
//     })
//   })

//   // Handle room joining with better tracking
//   socket.on("join-room", (room) => {
//     console.log(`📍 Client ${socket.id} joined room: ${room}`)
//     socket.join(room)

//     // Track room membership
//     if (connectedClients.has(socket.id)) {
//       const clientInfo = connectedClients.get(socket.id)
//       if (!clientInfo.rooms.includes(room)) {
//         clientInfo.rooms.push(room)
//         connectedClients.set(socket.id, clientInfo)
//       }
//     }

//     // Send current vehicle data when joining vehicles room
//     if (room === "vehicles") {
//       setTimeout(async () => {
//         try {
//           const vehicles = await Vehicle.find().sort({ updatedAt: -1 }).populate("assignedDriver", "name phone")

//           socket.emit("vehiclesUpdate", {
//             success: true,
//             data: vehicles,
//             timestamp: new Date().toISOString(),
//             message: "Initial vehicle data loaded",
//           })
//         } catch (error) {
//           console.error("Error sending initial vehicles:", error)
//           socket.emit("error", {
//             message: "Failed to load initial vehicle data",
//             error: error.message,
//           })
//         }
//       }, 500)
//     }
//   })

//   // Handle get latest vehicles request
//   socket.on("getLatestVehicles", async () => {
//     console.log(`📊 Client ${socket.id} requested latest vehicles`)

//     // Update client last activity
//     if (connectedClients.has(socket.id)) {
//       const clientInfo = connectedClients.get(socket.id)
//       clientInfo.lastActivity = new Date()
//       connectedClients.set(socket.id, clientInfo)
//     }

//     try {
//       const vehicles = await Vehicle.find().sort({ updatedAt: -1 }).populate("assignedDriver", "name phone")

//       socket.emit("vehiclesUpdate", {
//         success: true,
//         data: vehicles,
//         timestamp: new Date().toISOString(),
//         message: "Latest vehicle data",
//       })
//     } catch (error) {
//       console.error("Error fetching latest vehicles:", error)
//       socket.emit("error", {
//         message: "Failed to fetch latest vehicles",
//         error: error.message,
//       })
//     }
//   })

//   // Handle vehicle status updates
//   socket.on("updateVehicleStatus", async (data) => {
//     console.log(`🔄 Status update request from ${socket.id}:`, data)

//     // Update client last activity
//     if (connectedClients.has(socket.id)) {
//       const clientInfo = connectedClients.get(socket.id)
//       clientInfo.lastActivity = new Date()
//       connectedClients.set(socket.id, clientInfo)
//     }

//     try {
//       const { vehicleId, status } = data
//       const vehicle = await Vehicle.findByIdAndUpdate(
//         vehicleId,
//         { status, updatedAt: new Date() },
//         { new: true },
//       ).populate("assignedDriver", "name phone")

//       if (vehicle) {
//         // Emit to all clients in vehicles room
//         io.to("vehicles").emit("vehicleStatusChanged", {
//           vehicleId,
//           status,
//           vehicle,
//           message: `Vehicle status updated to ${status}`,
//           timestamp: new Date().toISOString(),
//         })

//         // Confirm to sender
//         socket.emit("statusUpdateSuccess", {
//           message: `Vehicle status updated to ${status}`,
//           vehicle,
//         })
//       } else {
//         socket.emit("error", {
//           message: "Vehicle not found",
//         })
//       }
//     } catch (error) {
//       console.error("Error updating vehicle status:", error)
//       socket.emit("error", {
//         message: "Failed to update vehicle status",
//         error: error.message,
//       })
//     }
//   })

//   // Handle disconnection
//   socket.on("disconnect", (reason) => {
//     console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`)

//     // Remove client from tracking
//     connectedClients.delete(socket.id)

//     console.log(`👥 Total clients connected: ${io.engine.clientsCount}`)
//   })

//   // Handle errors
//   socket.on("error", (error) => {
//     console.error(`❌ Socket error from ${socket.id}:`, error)
//   })
// })

// // Periodic cleanup of stale connections (optional)
// setInterval(() => {
//   const now = new Date()
//   connectedClients.forEach((clientInfo, socketId) => {
//     // If no activity for 5 minutes, consider connection stale
//     if (now - clientInfo.lastActivity > 5 * 60 * 1000) {
//       console.log(`🧹 Cleaning up stale connection: ${socketId}`)
//       const socket = io.sockets.sockets.get(socketId)
//       if (socket) {
//         socket.disconnect(true)
//       }
//       connectedClients.delete(socketId)
//     }
//   })
// }, 60000) // Check every minute

// // Initialize our unified socket handler
// const socketCleanup = setupSocket(io, app)

// // Make reportsSocketService available to trigger updates when data changes
// const reportsSocketService = new ReportsSocketService(io)
// app.set("reportsSocketService", reportsSocketService)

// // Make io available to other parts of the app
// app.set("io", io)

// // --- MongoDB Change Streams ---
// // Setup MongoDB Change Streams for real-time updates
// const setupChangeStreams = () => {
//   try {
//     // Watch for changes in Ride collection
//     const rideChangeStream = Ride.watch([], { fullDocument: "updateLookup" })

//     rideChangeStream.on("change", (change) => {
//       console.log("🔄 Ride collection changed:", change.operationType)

//       // Send updates for all dashboard data when rides change
//       setTimeout(() => {
//         const reportsService = app.get("reportsSocketService")
//         if (reportsService) {
//           reportsService.triggerReportsUpdate()
//         }
//       }, 1000) // Small delay to ensure database consistency
//     })

//     rideChangeStream.on("error", (error) => {
//       console.error("❌ Ride change stream error:", error)
//     })

//     // Watch for changes in Driver collection
//     const driverChangeStream = Driver.watch([], { fullDocument: "updateLookup" })

//     driverChangeStream.on("change", (change) => {
//       console.log("🔄 Driver collection changed:", change.operationType)

//       setTimeout(() => {
//         const reportsService = app.get("reportsSocketService")
//         if (reportsService) {
//           reportsService.triggerReportsUpdate()
//         }
//       }, 1000)
//     })

//     driverChangeStream.on("error", (error) => {
//       console.error("❌ Driver change stream error:", error)
//     })

//     // Watch for changes in Admin collection
//     const adminChangeStream = Admin.watch([], { fullDocument: "updateLookup" })

//     adminChangeStream.on("change", (change) => {
//       console.log("🔄 Admin collection changed:", change.operationType)

//       // Emit admin events through the unified socket system
//       const emitters = app.get("socketEmitters")
//       if (emitters) {
//         const { document } = change
//         switch (change.operationType) {
//           case "insert":
//             emitters.emitAdminEvent("admin:created", {
//               action: "create",
//               admin: document,
//               message: `New admin "${document.name}" has been created`,
//             })
//             break
//           case "update":
//           case "replace":
//             emitters.emitAdminEvent("admin:updated", {
//               action: "update",
//               admin: document,
//               message: `Admin "${document.name}" has been updated`,
//             })
//             break
//           case "delete":
//             emitters.emitAdminEvent("admin:deleted", {
//               action: "delete",
//               admin: change.documentKey,
//               message: `Admin has been deleted`,
//             })
//             break
//         }
//       }
//     })

//     adminChangeStream.on("error", (error) => {
//       console.error("❌ Admin change stream error:", error)
//     })

//     // Add Vehicle change stream
//     const vehicleChangeStream = Vehicle.watch([], { fullDocument: "updateLookup" })

//     vehicleChangeStream.on("change", (change) => {
//       console.log("🔄 Vehicle collection changed:", change.operationType)

//       // Emit vehicle events through the unified socket system
//       const emitters = app.get("socketEmitters")
//       if (emitters) {
//         const fullDocument = change.fullDocument

//         switch (change.operationType) {
//           case "insert":
//             emitters.emitVehicleEvent("vehicleAdded", {
//               action: "create",
//               vehicle: fullDocument,
//               message: `New vehicle "${fullDocument.registrationNumber}" has been added`,
//             })
//             break
//           case "update":
//           case "replace":
//             emitters.emitVehicleEvent("vehicleUpdated", {
//               action: "update",
//               vehicle: fullDocument,
//               message: `Vehicle "${fullDocument.registrationNumber}" has been updated`,
//             })
//             break
//           case "delete":
//             emitters.emitVehicleEvent("vehicleDeleted", {
//               action: "delete",
//               vehicleId: change.documentKey._id,
//               message: `Vehicle has been deleted`,
//             })
//             break
//         }

//         // Trigger a refresh of all vehicles data
//         setTimeout(async () => {
//           try {
//             const vehicles = await Vehicle.find().sort({ updatedAt: -1 }).populate("assignedDriver", "name phone")
//             emitters.emitVehicleEvent("vehiclesUpdate", {
//               success: true,
//               data: vehicles,
//               timestamp: new Date().toISOString(),
//             })
//           } catch (error) {
//             console.error("Error fetching vehicles after change:", error)
//           }
//         }, 500)
//       }
//     })

//     vehicleChangeStream.on("error", (error) => {
//       console.error("❌ Vehicle change stream error:", error)
//     })

//     console.log("✅ MongoDB Change Streams initialized for real-time updates")
//   } catch (error) {
//     console.error("❌ Error setting up change streams:", error)
//     console.log("📡 Falling back to polling method...")
//   }
// }

// // Initialize change streams after MongoDB connection is established
// mongoose.connection.once("open", () => {
//   console.log("📡 MongoDB connected, setting up change streams...")
//   setupChangeStreams()
// })

// mongoose.connection.on("error", (error) => {
//   console.error("❌ MongoDB connection error:", error)
// })

// // --- Start Server ---
// const PORT = process.env.PORT || 5000
// server.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`)
//   console.log(`🌐 Server URL: http://localhost:${PORT}`)
//   console.log(`🔌 Socket.IO ready for connections`)
// })

// // Clean up resources on process termination
// process.on("SIGTERM", () => {
//   console.log("SIGTERM received, shutting down gracefully")
//   if (socketCleanup) {
//     socketCleanup()
//   }
//   server.close(() => {
//     console.log("Server closed")
//     process.exit(0)
//   })
// })

// process.on("SIGINT", () => {
//   console.log("SIGINT received, shutting down gracefully")
//   if (socketCleanup) {
//     socketCleanup()
//   }
//   server.close(() => {
//     console.log("Server closed")
//     process.exit(0)
//   })
// })
const express = require("express")
require("dotenv").config()
const mongoose = require("mongoose")
const cors = require("cors")
const http = require("http")
const { Server } = require("socket.io")

// Import routes and controllers
const authRoutes = require("./routes/authRoutes")
const dashboardRoutes = require("./routes/dashboardRoutes")
const adminRoutes = require("./routes/adminRoutes")
const reportsRoutes = require("./routes/reportsRoutes")
const ridesRoutes = require("./routes/rides")
const invoiceRoutes = require("./routes/invoiceRoutes")
const vehicleRoutes = require("./routes/vehicleRoutes") // Add vehicle routes

const dashboardController = require("./controllers/dashboardController")
const db = require("./config/db")

// Import models for change streams
const Ride = require("./models/Ride1")
const Driver = require("./models/TRdriverModel")
const Admin = require("./models/adminModel")
const Vehicle = require("./models/Vehicle") // Add Vehicle model


const ReportsSocketService = require("./services/reportsSocketService")
const { validateDateRange, validateTimeRange, validateDriverFilter } = require("./middlewares/reportsMiddleware")
const setupSocket = require("./socket") // Import our unified socket handler
const driverRoutes = require("./routes/driverRoutes")

// --- App & Server Setup ---
const app = express()
const server = http.createServer(app)

// Enhanced Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for testing - restrict this in production
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  allowEIO3: true,
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e8, // 100MB
  path: "/socket.io", // Default path
  serveClient: false, // Don't serve client files
})

// Debug logging for socket connection events
io.engine.on("connection_error", (err) => {
  console.error("❌ Socket.IO connection error:", err)
})

// Track connected clients
const connectedClients = new Map()

// Create a unified real-time event system
const realTimeEvents = {
  // Broadcast to all clients or specific rooms
  broadcast: (event, data, room = null) => {
    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
    }

    if (room) {
      io.to(room).emit(event, payload)
      console.log(`📡 Broadcasting ${event} to room ${room}`)
    } else {
      io.emit(event, payload)
      console.log(`📡 Broadcasting ${event} to all clients`)
    }
  },

  // Send real-time updates for specific models
  sendModelUpdates: async (modelName) => {
    try {
      let data
      switch (modelName) {
        case "vehicles":
          data = await Vehicle.find().sort({ updatedAt: -1 }).populate("assignedDriver", "name phone")
          break
        case "drivers":
          data = await Driver.find().sort({ lastUpdate: -1 })
          break
        case "rides":
          data = await Ride.find().sort({ createdAt: -1 }).limit(50)
          break
        case "admins":
          data = await Admin.find().sort({ updatedAt: -1 })
          break
        default:
          return
      }

      // Emit to both the specific room and to all clients
      io.emit(`${modelName}Update`, {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })

      console.log(`📊 Sent ${modelName} updates to all connected clients (${io.engine.clientsCount})`)
    } catch (error) {
      console.error(`❌ Error sending ${modelName} updates:`, error)
    }
  },
}

// Make real-time events available to the app
app.set("realTimeEvents", realTimeEvents)

// --- Enhanced CORS Middleware ---
app.use(
  cors({
    origin: "*", // Allow all origins for testing
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

app.use(express.json())

// Add a test endpoint to verify server is running
app.get("/api/test", (req, res) => {
  res.json({
    message: "Server is running",
    timestamp: new Date().toISOString(),
    socketConnected: io.engine.clientsCount > 0,
  })
})

// --- REST API Routes ---
app.use("/api/auth", authRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/admins", adminRoutes)
app.use("/api/reports", validateDateRange, validateTimeRange, validateDriverFilter, reportsRoutes)
app.use("/api/rides", ridesRoutes)
app.use("/api/invoices", invoiceRoutes)
app.use("/api/driver", driverRoutes)
app.use("/api/vehicles", vehicleRoutes) // Add vehicle routes

// --- Enhanced WebSocket Logic ---
io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`)
  console.log(`👥 Total clients connected: ${io.engine.clientsCount}`)

  // Store client connection time
  connectedClients.set(socket.id, {
    connectedAt: new Date(),
    rooms: [],
    lastActivity: new Date(),
  })

  // Send immediate connection confirmation
  socket.emit("connection-established", {
    message: "Connection successful",
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  })

  // Handle client connection confirmation
  socket.on("client-connected", (data) => {
    console.log("👋 Client connection confirmed:", data)

    // Update client info
    if (connectedClients.has(socket.id)) {
      const clientInfo = connectedClients.get(socket.id)
      clientInfo.page = data.page
      clientInfo.lastActivity = new Date()
      connectedClients.set(socket.id, clientInfo)
    }

    // Send welcome message
    socket.emit("server-welcome", {
      message: "Welcome to the vehicle management system",
      serverTime: new Date().toISOString(),
      clientId: socket.id,
    })

    // Send initial data for all models
    sendInitialData(socket)
  })

  // Handle room joining with better tracking
  socket.on("join-room", (room) => {
    console.log(`📍 Client ${socket.id} joined room: ${room}`)
    socket.join(room)

    // Track room membership
    if (connectedClients.has(socket.id)) {
      const clientInfo = connectedClients.get(socket.id)
      if (!clientInfo.rooms.includes(room)) {
        clientInfo.rooms.push(room)
        connectedClients.set(socket.id, clientInfo)
      }
    }

    // Send current data when joining specific rooms
    sendRoomData(socket, room)
  })

  // Handle get latest vehicles request
  socket.on("getLatestVehicles", async () => {
    console.log(`📊 Client ${socket.id} requested latest vehicles`)

    // Update client last activity
    if (connectedClients.has(socket.id)) {
      const clientInfo = connectedClients.get(socket.id)
      clientInfo.lastActivity = new Date()
      connectedClients.set(socket.id, clientInfo)
    }

    try {
      const vehicles = await Vehicle.find().sort({ updatedAt: -1 }).populate("assignedDriver", "name phone")

      socket.emit("vehiclesUpdate", {
        success: true,
        data: vehicles,
        timestamp: new Date().toISOString(),
        message: "Latest vehicle data",
      })
    } catch (error) {
      console.error("Error fetching latest vehicles:", error)
      socket.emit("error", {
        message: "Failed to fetch latest vehicles",
        error: error.message,
      })
    }
  })

  // Handle get latest data requests for any model
  socket.on("getLatestData", async ({ model }) => {
    console.log(`📊 Client ${socket.id} requested latest ${model} data`)

    // Update client last activity
    if (connectedClients.has(socket.id)) {
      const clientInfo = connectedClients.get(socket.id)
      clientInfo.lastActivity = new Date()
      connectedClients.set(socket.id, clientInfo)
    }

    // Send the requested model data
    await realTimeEvents.sendModelUpdates(model)
  })

  // Handle vehicle status updates
  socket.on("updateVehicleStatus", async (data) => {
    console.log(`🔄 Status update request from ${socket.id}:`, data)

    try {
      const { vehicleId, status } = data
      const vehicle = await Vehicle.findByIdAndUpdate(
        vehicleId,
        { status, updatedAt: new Date() },
        { new: true },
      ).populate("assignedDriver", "name phone")

      if (vehicle) {
        // Emit to all clients
        io.emit("vehicleStatusChanged", {
          vehicleId,
          status,
          vehicle,
          message: `Vehicle status updated to ${status}`,
          timestamp: new Date().toISOString(),
        })

        // Also send a full vehicles update
        await realTimeEvents.sendModelUpdates("vehicles")

        // Confirm to sender
        socket.emit("statusUpdateSuccess", {
          message: `Vehicle status updated to ${status}`,
          vehicle,
        })
      } else {
        socket.emit("error", {
          message: "Vehicle not found",
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

  // Handle client heartbeat
  socket.on("client-heartbeat", (data) => {
    if (connectedClients.has(socket.id)) {
      const clientInfo = connectedClients.get(socket.id)
      clientInfo.lastActivity = new Date()
      connectedClients.set(socket.id, clientInfo)
    }

    socket.emit("server-heartbeat", {
      message: "Server is alive",
      serverTime: new Date().toISOString(),
      clientId: data.clientId,
      uptime: process.uptime(),
    })
  })

  // Handle manual refresh request
  socket.on("refresh-data", async (data) => {
    console.log(`🔄 Manual refresh requested by ${socket.id}:`, data)

    try {
      const { models } = data || { models: ["vehicles", "drivers", "rides", "admins"] }

      // Update all requested models
      for (const model of models) {
        await realTimeEvents.sendModelUpdates(model)
      }

      // Also update dashboard stats
      await sendDashboardStats(io)

      socket.emit("refresh-complete", {
        success: true,
        message: "Data refreshed successfully",
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error during manual refresh:", error)
      socket.emit("error", {
        message: "Failed to refresh data",
        error: error.message,
      })
    }
  })

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`)

    // Remove client from tracking
    connectedClients.delete(socket.id)

    console.log(`👥 Total clients connected: ${io.engine.clientsCount}`)
  })

  // Handle errors
  socket.on("error", (error) => {
    console.error(`❌ Socket error from ${socket.id}:`, error)
  })
})

// Helper function to send initial data to a newly connected client
async function sendInitialData(socket) {
  try {
    // Send vehicles data
    const vehicles = await Vehicle.find().sort({ updatedAt: -1 }).populate("assignedDriver", "name phone")
    socket.emit("vehiclesUpdate", {
      success: true,
      data: vehicles,
      timestamp: new Date().toISOString(),
      message: "Initial vehicle data loaded",
    })

    // Send drivers data
    const drivers = await Driver.find().sort({ lastUpdate: -1 })
    socket.emit("driversUpdate", {
      success: true,
      data: drivers,
      timestamp: new Date().toISOString(),
      message: "Initial driver data loaded",
    })

    // Send dashboard stats
    await sendDashboardStats(socket)

    console.log(`📊 Initial data sent to client ${socket.id}`)
  } catch (error) {
    console.error("Error sending initial data:", error)
    socket.emit("error", {
      message: "Failed to load initial data",
      error: error.message,
    })
  }
}

// Helper function to send room-specific data
async function sendRoomData(socket, room) {
  try {
    switch (room) {
      case "vehicles":
        const vehicles = await Vehicle.find().sort({ updatedAt: -1 }).populate("assignedDriver", "name phone")
        socket.emit("vehiclesUpdate", {
          success: true,
          data: vehicles,
          timestamp: new Date().toISOString(),
          message: "Room-specific vehicle data loaded",
        })
        break

      case "drivers":
        const drivers = await Driver.find().sort({ lastUpdate: -1 })
        socket.emit("driversUpdate", {
          success: true,
          data: drivers,
          timestamp: new Date().toISOString(),
          message: "Room-specific driver data loaded",
        })
        break

      case "dashboard":
        await sendDashboardStats(socket)
        break

      case "rides":
        const rides = await Ride.find().sort({ createdAt: -1 }).limit(50)
        socket.emit("ridesUpdate", {
          success: true,
          data: rides,
          timestamp: new Date().toISOString(),
          message: "Room-specific rides data loaded",
        })
        break

      case "admin-management":
        const admins = await Admin.find().sort({ updatedAt: -1 })
        socket.emit("adminsUpdate", {
          success: true,
          data: admins,
          timestamp: new Date().toISOString(),
          message: "Room-specific admin data loaded",
        })
        break
    }
  } catch (error) {
    console.error(`Error sending ${room} data:`, error)
    socket.emit("error", {
      message: `Failed to load ${room} data`,
      error: error.message,
    })
  }
}

// Helper function to send dashboard stats
async function sendDashboardStats(target) {
  try {
    // Create a mock response object to capture dashboard data
    let dashboardData = null
    const mockRes = {
      json: (data) => {
        dashboardData = data
        return data
      },
      status: (code) => ({
        json: (data) => {
          dashboardData = data
          return data
        },
      }),
    }

    await dashboardController.getDashboardStats({}, mockRes)

    if (dashboardData) {
      const statsWithTimestamp = {
        ...dashboardData,
        timestamp: new Date().toISOString(),
      }

      if (target === io) {
        // Broadcast to all clients
        io.emit("dashboardStats", statsWithTimestamp)
      } else {
        // Send to specific socket
        target.emit("dashboardStats", statsWithTimestamp)
      }
    }
  } catch (error) {
    console.error("Error sending dashboard stats:", error)
  }
}

// Periodic cleanup of stale connections (optional)
setInterval(() => {
  const now = new Date()
  connectedClients.forEach((clientInfo, socketId) => {
    // If no activity for 5 minutes, consider connection stale
    if (now - clientInfo.lastActivity > 5 * 60 * 1000) {
      console.log(`🧹 Cleaning up stale connection: ${socketId}`)
      const socket = io.sockets.sockets.get(socketId)
      if (socket) {
        socket.disconnect(true)
      }
      connectedClients.delete(socketId)
    }
  })
}, 60000) // Check every minute

// Periodic data refresh to ensure all clients have the latest data
setInterval(async () => {
  if (io.engine.clientsCount > 0) {
    console.log("🔄 Periodic data refresh for all connected clients")

    try {
      // Update all model data
      await realTimeEvents.sendModelUpdates("vehicles")
      await realTimeEvents.sendModelUpdates("drivers")
      await realTimeEvents.sendModelUpdates("rides")
      await realTimeEvents.sendModelUpdates("admins")

      // Update dashboard stats
      await sendDashboardStats(io)

      console.log("✅ Periodic data refresh complete")
    } catch (error) {
      console.error("❌ Error during periodic data refresh:", error)
    }
  }
}, 5000) // Refresh every 5 seconds (changed from 10)

// --- MongoDB Change Streams ---
// Setup MongoDB Change Streams for real-time updates with enhanced error handling and reconnection
const setupChangeStreams = () => {
  try {
    // Enhanced change stream setup with reconnection logic
    const setupModelChangeStream = (Model, modelName) => {
      let changeStream
      let isConnected = false

      const setupStream = () => {
        try {
          // Close existing stream if any
          if (changeStream) {
            try {
              changeStream.close()
            } catch (err) {
              console.error(`Error closing previous ${modelName} change stream:`, err)
            }
          }

          console.log(`🔄 Setting up ${modelName} change stream...`)

          // Create new change stream with full document lookup
          changeStream = Model.watch([], {
            fullDocument: "updateLookup",
          })

          // Handle change events
          changeStream.on("change", async (change) => {
            console.log(`🔄 ${modelName} collection changed:`, change.operationType)

            try {
              // Get the full document (either the updated doc or the document key for deletions)
              const document = change.fullDocument || change.documentKey

              // Broadcast the specific change event
              io.emit(`${modelName}:${change.operationType}`, {
                data: document,
                timestamp: new Date().toISOString(),
              })

              // Wait a moment to ensure database consistency
              await new Promise((resolve) => setTimeout(resolve, 100))

              // Then broadcast a full data update to all clients
              await realTimeEvents.sendModelUpdates(modelName.toLowerCase())

              // If this is a vehicle or driver change, also update dashboard stats
              if (["vehicles", "drivers", "rides"].includes(modelName.toLowerCase())) {
                await sendDashboardStats(io)
              }

              console.log(`✅ ${modelName} change processed and broadcasted`)
            } catch (error) {
              console.error(`❌ Error processing ${modelName} change:`, error)
            }
          })

          // Handle errors
          changeStream.on("error", (error) => {
            console.error(`❌ ${modelName} change stream error:`, error)
            isConnected = false

            // Try to reconnect after a delay
            setTimeout(() => {
              if (!isConnected) {
                console.log(`🔄 Attempting to reconnect ${modelName} change stream...`)
                setupStream()
              }
            }, 5000)
          })

          // Handle close events
          changeStream.on("close", () => {
            console.log(`🔌 ${modelName} change stream closed`)
            isConnected = false

            // Try to reconnect after a delay
            setTimeout(() => {
              if (!isConnected) {
                console.log(`🔄 Attempting to reconnect ${modelName} change stream...`)
                setupStream()
              }
            }, 5000)
          })

          isConnected = true
          console.log(`✅ ${modelName} change stream connected`)
        } catch (error) {
          console.error(`❌ Error setting up ${modelName} change stream:`, error)
          isConnected = false

          // Try to reconnect after a delay
          setTimeout(() => {
            if (!isConnected) {
              console.log(`🔄 Attempting to reconnect ${modelName} change stream...`)
              setupStream()
            }
          }, 5000)
        }
      }

      // Initial setup
      setupStream()

      // Return cleanup function
      return () => {
        if (changeStream) {
          try {
            changeStream.close()
          } catch (err) {
            console.error(`Error closing ${modelName} change stream during cleanup:`, err)
          }
        }
      }
    }

    // Setup change streams for all models
    const cleanupFunctions = [
      setupModelChangeStream(Ride, "Rides"),
      setupModelChangeStream(Driver, "Drivers"),
      setupModelChangeStream(Admin, "Admins"),
      setupModelChangeStream(Vehicle, "Vehicles"),
    ]

    console.log("✅ MongoDB Change Streams initialized for real-time updates")

    // Return combined cleanup function
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup())
    }
  } catch (error) {
    console.error("❌ Error setting up change streams:", error)
    console.log("📡 Falling back to polling method...")

    // Set up polling fallback
    setupPollingFallback()

    // Return empty cleanup function
    return () => {}
  }
}

// Add this section right after the setupChangeStreams function to enhance MongoDB change detection

// Enhanced MongoDB change stream setup specifically for direct database changes
const setupDirectDbChangeDetection = () => {
  console.log("🔍 Setting up enhanced detection for direct MongoDB changes...")

  // Configure change streams with specific options for detecting direct DB changes
  const changeStreamOptions = {
    fullDocument: "updateLookup", // Always fetch the full document after changes
    fullDocumentBeforeChange: "whenAvailable", // Get the document before changes when possible
  }

  // Watch all collections with a single pipeline that includes direct changes
  const watchPipeline = [
    {
      $match: {
        // This matches operations from any source, including direct MongoDB changes
        operationType: { $in: ["insert", "update", "replace", "delete"] },
      },
    },
  ]

  // Setup Vehicle change detection
  const vehicleChangeStream = Vehicle.watch(watchPipeline, changeStreamOptions)
  vehicleChangeStream.on("change", async (change) => {
    console.log("🔔 Direct MongoDB change detected in Vehicles collection:", change.operationType)

    try {
      // Broadcast to all clients immediately
      io.emit("directDbChange", {
        collection: "vehicles",
        operation: change.operationType,
        timestamp: new Date().toISOString(),
        documentId: change.documentKey._id,
      })

      // Small delay to ensure consistency
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Send full data update
      await realTimeEvents.sendModelUpdates("vehicles")

      console.log("✅ Vehicle data broadcasted after direct MongoDB change")
    } catch (error) {
      console.error("❌ Error processing direct Vehicle change:", error)
    }
  })

  // Setup Driver change detection
  const driverChangeStream = Driver.watch(watchPipeline, changeStreamOptions)
  driverChangeStream.on("change", async (change) => {
    console.log("🔔 Direct MongoDB change detected in Drivers collection:", change.operationType)

    try {
      // Broadcast to all clients immediately
      io.emit("directDbChange", {
        collection: "drivers",
        operation: change.operationType,
        timestamp: new Date().toISOString(),
        documentId: change.documentKey._id,
      })

      // Small delay to ensure consistency
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Send full data update
      await realTimeEvents.sendModelUpdates("drivers")

      console.log("✅ Driver data broadcasted after direct MongoDB change")
    } catch (error) {
      console.error("❌ Error processing direct Driver change:", error)
    }
  })

  // Setup Ride change detection
  const rideChangeStream = Ride.watch(watchPipeline, changeStreamOptions)
  rideChangeStream.on("change", async (change) => {
    console.log("🔔 Direct MongoDB change detected in Rides collection:", change.operationType)

    try {
      // Broadcast to all clients immediately
      io.emit("directDbChange", {
        collection: "rides",
        operation: change.operationType,
        timestamp: new Date().toISOString(),
        documentId: change.documentKey._id,
      })

      // Small delay to ensure consistency
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Send full data update
      await realTimeEvents.sendModelUpdates("rides")

      console.log("✅ Ride data broadcasted after direct MongoDB change")
    } catch (error) {
      console.error("❌ Error processing direct Ride change:", error)
    }
  })

  // Setup Admin change detection
  const adminChangeStream = Admin.watch(watchPipeline, changeStreamOptions)
  adminChangeStream.on("change", async (change) => {
    console.log("🔔 Direct MongoDB change detected in Admins collection:", change.operationType)

    try {
      // Broadcast to all clients immediately
      io.emit("directDbChange", {
        collection: "admins",
        operation: change.operationType,
        timestamp: new Date().toISOString(),
        documentId: change.documentKey._id,
      })

      // Small delay to ensure consistency
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Send full data update
      await realTimeEvents.sendModelUpdates("admins")

      console.log("✅ Admin data broadcasted after direct MongoDB change")
    } catch (error) {
      console.error("❌ Error processing direct Admin change:", error)
    }
  })

  console.log("✅ Enhanced direct MongoDB change detection initialized")

  // Return cleanup function
  return () => {
    try {
      vehicleChangeStream.close()
      driverChangeStream.close()
      rideChangeStream.close()
      adminChangeStream.close()
      console.log("🧹 Direct DB change streams closed")
    } catch (error) {
      console.error("❌ Error closing direct DB change streams:", error)
    }
  }
}

// Fallback to polling when change streams aren't available
const setupPollingFallback = () => {
  console.log("⚠️ Setting up polling fallback for real-time updates")

  // Store last update timestamps to detect changes
  const lastUpdates = {
    vehicles: new Date(),
    drivers: new Date(),
    rides: new Date(),
    admins: new Date(),
  }

  // Poll for vehicle changes
  setInterval(async () => {
    try {
      const latestVehicle = await Vehicle.findOne().sort({ updatedAt: -1 })

      if (latestVehicle && latestVehicle.updatedAt > lastUpdates.vehicles) {
        console.log("🔄 Vehicle changes detected via polling")
        lastUpdates.vehicles = latestVehicle.updatedAt
        await realTimeEvents.sendModelUpdates("vehicles")
      }
    } catch (error) {
      console.error("❌ Error polling vehicles:", error)
    }
  }, 2000)

  // Poll for driver changes
  setInterval(async () => {
    try {
      const latestDriver = await Driver.findOne().sort({ lastUpdate: -1 })

      if (latestDriver && latestDriver.lastUpdate > lastUpdates.drivers) {
        console.log("🔄 Driver changes detected via polling")
        lastUpdates.drivers = latestDriver.lastUpdate
        await realTimeEvents.sendModelUpdates("drivers")
      }
    } catch (error) {
      console.error("❌ Error polling drivers:", error)
    }
  }, 2000)

  // Poll for ride changes
  setInterval(async () => {
    try {
      const latestRide = await Ride.findOne().sort({ updatedAt: -1 })

      if (latestRide && latestRide.updatedAt > lastUpdates.rides) {
        console.log("🔄 Ride changes detected via polling")
        lastUpdates.rides = latestRide.updatedAt
        await realTimeEvents.sendModelUpdates("rides")
      }
    } catch (error) {
      console.error("❌ Error polling rides:", error)
    }
  }, 2000)

  // Poll for admin changes
  setInterval(async () => {
    try {
      const latestAdmin = await Admin.findOne().sort({ updatedAt: -1 })

      if (latestAdmin && latestAdmin.updatedAt > lastUpdates.admins) {
        console.log("🔄 Admin changes detected via polling")
        lastUpdates.admins = latestAdmin.updatedAt
        await realTimeEvents.sendModelUpdates("admins")
      }
    } catch (error) {
      console.error("❌ Error polling admins:", error)
    }
  }, 2000)

  // Poll for dashboard updates
  setInterval(async () => {
    try {
      await sendDashboardStats(io)
    } catch (error) {
      console.error("❌ Error polling dashboard stats:", error)
    }
  }, 5000)
}

// Initialize change streams after MongoDB connection is established
let changeStreamCleanup = null
mongoose.connection.once("open", () => {
  console.log("📡 MongoDB connected, setting up change streams...")
  changeStreamCleanup = setupChangeStreams()

  // Add direct DB change detection
  const directDbChangeCleanup = setupDirectDbChangeDetection()

  // Update the changeStreamCleanup to include both cleanup functions
  const originalCleanup = changeStreamCleanup
  changeStreamCleanup = () => {
    if (originalCleanup) originalCleanup()
    if (directDbChangeCleanup) directDbChangeCleanup()
  }
})

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB connection error:", error)
})

// Add a diagnostic endpoint for WebSocket testing
app.get("/api/websocket-test", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WebSocket Test</title>
      <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        #status { font-weight: bold; }
        #log { height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-top: 10px; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        button { margin: 5px; padding: 8px 16px; }
      </style>
    </head>
    <body>
      <h1>WebSocket Connection Test</h1>
      <p>Status: <span id="status">Disconnected</span></p>
      <div>
        <button id="connect">Connect</button>
        <button id="disconnect" disabled>Disconnect</button>
        <button id="test" disabled>Send Test Message</button>
        <button id="refresh" disabled>Refresh Data</button>
      </div>
      <div id="log"></div>
      
      <script>
        const statusEl = document.getElementById('status');
        const logEl = document.getElementById('log');
        const connectBtn = document.getElementById('connect');
        const disconnectBtn = document.getElementById('disconnect');
        const testBtn = document.getElementById('test');
        const refreshBtn = document.getElementById('refresh');
        let socket;
        
        function log(message, type = 'info') {
          const entry = document.createElement('div');
          entry.className = type;
          entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
          logEl.appendChild(entry);
          logEl.scrollTop = logEl.scrollHeight;
        }
        
        connectBtn.addEventListener('click', () => {
          try {
            log('Attempting connection...');
            
            // Create socket with detailed options and error handling
            socket = io({
              transports: ['websocket', 'polling'],
              reconnection: true,
              reconnectionAttempts: 5,
              reconnectionDelay: 1000,
              timeout: 20000,
              autoConnect: true,
              forceNew: true
            });
            
            socket.on('connect', () => {
              statusEl.textContent = 'Connected';
              statusEl.style.color = 'green';
              log('Socket connected successfully!', 'success');
              connectBtn.disabled = true;
              disconnectBtn.disabled = false;
              testBtn.disabled = false;
              refreshBtn.disabled = false;
              
              // Register client
              socket.emit('client-connected', {
                page: 'test-page',
                browser: navigator.userAgent
              });
              log('Sent client-connected event', 'info');
            });
            
            socket.on('connection-established', (data) => {
              log(\`Connection established: \${JSON.stringify(data)}\`, 'success');
            });
            
            socket.on('server-welcome', (data) => {
              log(\`Server welcome: \${JSON.stringify(data)}\`, 'success');
            });
            
            socket.on('vehiclesUpdate', (data) => {
              log(\`Received vehicles update with \${data.data ? data.data.length : 0} vehicles\`, 'info');
            });
            
            socket.on('driversUpdate', (data) => {
              log(\`Received drivers update with \${data.data ? data.data.length : 0} drivers\`, 'info');
            });
            
            socket.on('dashboardStats', (data) => {
              log(\`Received dashboard stats: \${JSON.stringify(data)}\`, 'info');
            });
            
            socket.on('connect_error', (err) => {
              log(\`Connection error: \${err.message}\`, 'error');
              statusEl.textContent = \`Error: \${err.message}\`;
              statusEl.style.color = 'red';
            });
            
            socket.on('disconnect', (reason) => {
              log(\`Disconnected: \${reason}\`, 'info');
              statusEl.textContent = \`Disconnected: \${reason}\`;
              statusEl.style.color = 'orange';
              connectBtn.disabled = false;
              disconnectBtn.disabled = true;
              testBtn.disabled = true;
              refreshBtn.disabled = true;
            });
            
            socket.on('error', (err) => {
              log(\`Socket error: \${err}\`, 'error');
            });
            
            // Listen for any event
            socket.onAny((event, ...args) => {
              if (!['vehiclesUpdate', 'driversUpdate', 'dashboardStats'].includes(event)) {
                log(\`Received event: \${event}\`, 'info');
              }
            });
            
          } catch (err) {
            log(\`Error creating socket: \${err.message}\`, 'error');
          }
        });
        
        disconnectBtn.addEventListener('click', () => {
          if (socket) {
            socket.disconnect();
            log('Manually disconnected', 'info');
          }
        });
        
        testBtn.addEventListener('click', () => {
          if (socket && socket.connected) {
            socket.emit('test-event', { message: 'Hello from browser!' });
            log('Sent test message', 'info');
          } else {
            log('Cannot send message: not connected', 'error');
          }
        });
        
        refreshBtn.addEventListener('click', () => {
          if (socket && socket.connected) {
            socket.emit('refresh-data', { models: ['vehicles', 'drivers'] });
            log('Requested data refresh', 'info');
          } else {
            log('Cannot refresh data: not connected', 'error');
          }
        });
        
        // Log connection details
        log(\`Page URL: \${window.location.href}\`, 'info');
      </script>
    </body>
    </html>
  `)
})

// --- Start Server ---
const PORT = process.env.PORT || 8989 // IMPORTANT: Changed to match client port
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🌐 Server URL: http://localhost:${PORT}`)
  console.log(`🔌 Socket.IO ready for connections`)
  console.log(`🧪 WebSocket test page: http://localhost:${PORT}/api/websocket-test`)
})

// Clean up resources on process termination
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully")
  if (changeStreamCleanup) {
    changeStreamCleanup()
  }
  server.close(() => {
    console.log("Server closed")
    process.exit(0)
  })
})

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully")
  if (changeStreamCleanup) {
    changeStreamCleanup()
  }
  server.close(() => {
    console.log("Server closed")
    process.exit(0)
  })
})

// Make io available to other parts of the app
app.set("io", io)

// Make reportsSocketService available to trigger updates when data changes
const reportsSocketService = new ReportsSocketService(io)
app.set("reportsSocketService", reportsSocketService)

// Initialize our unified socket handler
const socketCleanup = setupSocket(io, app)

// Location: /services/reportsSocketService.js
// Enhanced Socket.IO service with better data validation and no empty broadcasts

const reportsController = require("../controllers/reportsController")

class ReportsSocketService {
  constructor(io) {
    this.io = io
    this.connectedClients = new Map()
    this.lastDataCache = new Map()
    this.broadcastInProgress = false
    this.setupSocketHandlers()
    this.startPeriodicUpdates()
  }

  setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`📊 Reports client connected: ${socket.id}`)
      this.connectedClients.set(socket.id, {
        socket,
        lastActivity: new Date(),
        filters: {},
      })

      // Send cached data immediately if available
      this.sendCachedDataToClient(socket)

      // Handle client requesting specific report data
      socket.on("requestEarningsReport", async (params) => {
        try {
          console.log(`📊 Client ${socket.id} requesting earnings report:`, params)
          this.connectedClients.get(socket.id).filters = params
          this.connectedClients.get(socket.id).lastActivity = new Date()

          const mockReq = {
            query: params || {},
            app: { get: () => this.io },
          }
          const mockRes = {
            json: (data) => {
              // Validate data before sending
              if (this.isValidData(data, "earnings")) {
                this.lastDataCache.set("earningsReport", data)
                socket.emit("earningsReportData", data)
                console.log(`✅ Sent earnings report to ${socket.id}`)
              } else {
                console.warn(`⚠️ Invalid earnings data, not sending to ${socket.id}`)
                // Send cached data instead
                const cachedData = this.lastDataCache.get("earningsReport")
                if (cachedData) {
                  socket.emit("earningsReportData", cachedData)
                }
              }
            },
            status: () => ({
              json: (error) => {
                console.error(`❌ Earnings report error for ${socket.id}:`, error)
                socket.emit("reportError", error)
              },
            }),
          }
          await reportsController.getEarningsReport(mockReq, mockRes)
        } catch (error) {
          console.error(`❌ Error handling earnings report request from ${socket.id}:`, error)
          socket.emit("reportError", { message: "Failed to fetch earnings report" })
        }
      })

      socket.on("requestDriverPerformance", async (params) => {
        try {
          console.log(`📊 Client ${socket.id} requesting driver performance:`, params)
          this.connectedClients.get(socket.id).lastActivity = new Date()

          const mockReq = {
            query: params || {},
            app: { get: () => this.io },
          }
          const mockRes = {
            json: (data) => {
              // Validate data before sending
              if (this.isValidData(data, "drivers")) {
                this.lastDataCache.set("driverPerformance", data)
                socket.emit("driverPerformanceData", data)
                console.log(`✅ Sent driver performance to ${socket.id}`)
              } else {
                console.warn(`⚠️ Invalid driver data, not sending to ${socket.id}`)
                // Send cached data instead
                const cachedData = this.lastDataCache.get("driverPerformance")
                if (cachedData) {
                  socket.emit("driverPerformanceData", cachedData)
                }
              }
            },
            status: () => ({
              json: (error) => {
                console.error(`❌ Driver performance error for ${socket.id}:`, error)
                socket.emit("reportError", error)
              },
            }),
          }
          await reportsController.getDriverPerformanceReport(mockReq, mockRes)
        } catch (error) {
          console.error(`❌ Error handling driver performance request from ${socket.id}:`, error)
          socket.emit("reportError", { message: "Failed to fetch driver performance" })
        }
      })

      socket.on("requestRidesAnalysis", async (params) => {
        try {
          console.log(`📊 Client ${socket.id} requesting rides analysis:`, params)
          this.connectedClients.get(socket.id).lastActivity = new Date()

          const mockReq = {
            query: params || {},
            app: { get: () => this.io },
          }
          const mockRes = {
            json: (data) => {
              // Validate data before sending
              if (this.isValidData(data, "rides")) {
                this.lastDataCache.set("ridesAnalysis", data)
                socket.emit("ridesAnalysisData", data)
                console.log(`✅ Sent rides analysis to ${socket.id}`)
              } else {
                console.warn(`⚠️ Invalid rides data, not sending to ${socket.id}`)
                // Send cached data instead
                const cachedData = this.lastDataCache.get("ridesAnalysis")
                if (cachedData) {
                  socket.emit("ridesAnalysisData", cachedData)
                }
              }
            },
            status: () => ({
              json: (error) => {
                console.error(`❌ Rides analysis error for ${socket.id}:`, error)
                socket.emit("reportError", error)
              },
            }),
          }
          await reportsController.getRidesAnalysisReport(mockReq, mockRes)
        } catch (error) {
          console.error(`❌ Error handling rides analysis request from ${socket.id}:`, error)
          socket.emit("reportError", { message: "Failed to fetch rides analysis" })
        }
      })

      socket.on("requestReportsSummary", async () => {
        try {
          console.log(`📊 Client ${socket.id} requesting reports summary`)
          this.connectedClients.get(socket.id).lastActivity = new Date()

          const mockReq = {
            query: {},
            app: { get: () => this.io },
          }
          const mockRes = {
            json: (data) => {
              // Validate data before sending
              if (this.isValidData(data, "summary")) {
                this.lastDataCache.set("reportsSummary", data)
                socket.emit("reportsSummaryData", data)
                console.log(`✅ Sent reports summary to ${socket.id}`)
              } else {
                console.warn(`⚠️ Invalid summary data, not sending to ${socket.id}`)
                // Send cached data instead
                const cachedData = this.lastDataCache.get("reportsSummary")
                if (cachedData) {
                  socket.emit("reportsSummaryData", cachedData)
                }
              }
            },
            status: () => ({
              json: (error) => {
                console.error(`❌ Reports summary error for ${socket.id}:`, error)
                socket.emit("reportError", error)
              },
            }),
          }
          await reportsController.getReportsSummary(mockReq, mockRes)
        } catch (error) {
          console.error(`❌ Error handling reports summary request from ${socket.id}:`, error)
          socket.emit("reportError", { message: "Failed to fetch reports summary" })
        }
      })

      socket.on("disconnect", () => {
        console.log(`📊 Reports client disconnected: ${socket.id}`)
        this.connectedClients.delete(socket.id)
      })

      socket.on("error", (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error)
      })
    })
  }

  // Validate data before sending to prevent empty/invalid data
  isValidData(data, type) {
    if (!data || typeof data !== "object") {
      console.warn(`⚠️ Invalid ${type} data: not an object`)
      return false
    }

    switch (type) {
      case "summary":
        // Summary is valid if it has meaningful data or is explicitly zero
        return data.totalEarnings !== undefined && data.totalRides !== undefined

      case "earnings":
        // Earnings is valid if it has chartData array (even if empty) and summary
        return data.chartData && Array.isArray(data.chartData) && data.summary

      case "drivers":
        // Drivers is valid if it has tableData array (even if empty)
        return data.tableData && Array.isArray(data.tableData)

      case "rides":
        // Rides is valid if it has chartData array (even if empty)
        return data.chartData && Array.isArray(data.chartData)

      default:
        return true
    }
  }

  // Send cached data to newly connected client
  sendCachedDataToClient(socket) {
    try {
      const cachedSummary = this.lastDataCache.get("reportsSummary")
      const cachedEarnings = this.lastDataCache.get("earningsReport")
      const cachedDrivers = this.lastDataCache.get("driverPerformance")

      if (cachedSummary && this.isValidData(cachedSummary, "summary")) {
        socket.emit("reportsSummaryData", cachedSummary)
        console.log(`📊 Sent cached summary to ${socket.id}`)
      }

      if (cachedEarnings && this.isValidData(cachedEarnings, "earnings")) {
        socket.emit("earningsReportData", cachedEarnings)
        console.log(`📊 Sent cached earnings to ${socket.id}`)
      }

      if (cachedDrivers && this.isValidData(cachedDrivers, "drivers")) {
        socket.emit("driverPerformanceData", cachedDrivers)
        console.log(`📊 Sent cached drivers to ${socket.id}`)
      }
    } catch (error) {
      console.error(`❌ Error sending cached data to ${socket.id}:`, error)
    }
  }

  // Send periodic updates to all connected clients (REDUCED FREQUENCY)
  startPeriodicUpdates() {
    // Update reports summary every 5 minutes (much less frequent)
    setInterval(async () => {
      try {
        if (this.connectedClients.size > 0 && !this.broadcastInProgress) {
          console.log(`🔄 Periodic summary update (${this.connectedClients.size} clients)`)
          await this.broadcastReportsSummary()
        }
      } catch (error) {
        console.error("❌ Error in periodic summary update:", error)
      }
    }, 300000) // 5 minutes

    // Update earnings report every 10 minutes (much less frequent)
    setInterval(async () => {
      try {
        if (this.connectedClients.size > 0 && !this.broadcastInProgress) {
          console.log(`🔄 Periodic earnings update (${this.connectedClients.size} clients)`)
          await this.broadcastEarningsReport()
        }
      } catch (error) {
        console.error("❌ Error in periodic earnings update:", error)
      }
    }, 600000) // 10 minutes

    // Clean up inactive connections every 15 minutes
    setInterval(() => {
      this.cleanupInactiveConnections()
    }, 900000) // 15 minutes
  }

  async broadcastReportsSummary() {
    if (this.connectedClients.size === 0 || this.broadcastInProgress) return

    this.broadcastInProgress = true
    
    // Check if any clients have specific filters set or use default
    let clientFilters = {};
    for (const clientData of this.connectedClients.values()) {
      if (clientData.filters && Object.keys(clientData.filters).length > 0) {
        clientFilters = clientData.filters;
        break;
      }
    }

    const mockReq = { 
      query: clientFilters.timeRange ? { timeRange: clientFilters.timeRange } : {}, 
      app: { get: () => this.io } 
    }
    const mockRes = {
      json: (data) => {
        // Only broadcast if data is valid and meaningful
        if (this.isValidData(data, "summary") && (data.totalEarnings > 0 || data.totalRides > 0)) {
          this.lastDataCache.set("reportsSummary", data)
          this.io.emit("reportsSummaryUpdate", data)
          console.log(`📊 Reports summary broadcasted to ${this.connectedClients.size} clients`)
        } else {
          console.log(`⚠️ Skipping summary broadcast - no meaningful data`)
        }
        this.broadcastInProgress = false
      },
      status: () => ({
        json: () => {
          this.broadcastInProgress = false
        },
      }),
    }

    try {
      await reportsController.getReportsSummary(mockReq, mockRes)
    } catch (error) {
      console.error("❌ Error in broadcastReportsSummary:", error)
      this.broadcastInProgress = false
    }
  }

  async broadcastEarningsReport() {
    if (this.connectedClients.size === 0 || this.broadcastInProgress) return

    this.broadcastInProgress = true
    
    // Instead of using hardcoded timeRange, check if any clients have specific filters set
    // or use a default timeRange as fallback
    let clientFilters = {};
    for (const clientData of this.connectedClients.values()) {
      if (clientData.filters && Object.keys(clientData.filters).length > 0) {
        clientFilters = clientData.filters;
        break;
      }
    }

    // Use client filters or fall back to basic parameters
    const mockReq = { 
      query: clientFilters.timeRange ? clientFilters : { timeRange: "day" },
      app: { get: () => this.io } 
    }
    const mockRes = {
      json: (data) => {
        // Only broadcast if data is valid and has content
        if (this.isValidData(data, "earnings") && data.hasData) {
          // Include the timeRange in the broadcasted data for client-side verification
          const dataWithTimeRange = {
            ...data,
            timeRange: mockReq.query.timeRange || "day"
          };
          this.lastDataCache.set("earningsReport", dataWithTimeRange)
          this.io.emit("earningsReportUpdate", dataWithTimeRange)
          console.log(`📊 Earnings report (${dataWithTimeRange.timeRange}) broadcasted to ${this.connectedClients.size} clients`)
        } else {
          console.log(`⚠️ Skipping earnings broadcast - no data or invalid`)
        }
        this.broadcastInProgress = false
      },
      status: () => ({
        json: () => {
          this.broadcastInProgress = false
        },
      }),
    }

    try {
      await reportsController.getEarningsReport(mockReq, mockRes)
    } catch (error) {
      console.error("❌ Error in broadcastEarningsReport:", error)
      this.broadcastInProgress = false
    }
  }

  // Method to trigger updates when data changes (but validate first)
  async triggerReportsUpdate() {
    try {
      if (!this.broadcastInProgress) {
        console.log(`🔄 Triggering reports update...`)
        await this.broadcastReportsSummary()
        // Small delay between broadcasts
        setTimeout(async () => {
          await this.broadcastEarningsReport()
        }, 1000)
      }
    } catch (error) {
      console.error("❌ Error in triggerReportsUpdate:", error)
    }
  }

  // Clean up inactive connections
  cleanupInactiveConnections() {
    const now = new Date()
    const timeout = 30 * 60 * 1000 // 30 minutes

    for (const [socketId, clientInfo] of this.connectedClients.entries()) {
      if (now - clientInfo.lastActivity > timeout) {
        console.log(`🧹 Cleaning up inactive connection: ${socketId}`)
        this.connectedClients.delete(socketId)
      }
    }
  }

  // Get connection stats
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      cachedDataTypes: Array.from(this.lastDataCache.keys()),
      lastUpdate: new Date(),
      broadcastInProgress: this.broadcastInProgress,
    }
  }
}

module.exports = ReportsSocketService

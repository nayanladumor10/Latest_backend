const Admin = require("../models/adminModel")
const mongoose = require("mongoose")

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  if (!id || id === "undefined" || id === "null" || id === "" || id === undefined || id === null) {
    return false
  }
  return mongoose.Types.ObjectId.isValid(id)
}

// Helper function to transform admin data for frontend
const transformAdmin = (admin) => ({
  id: admin._id.toString(),
  _id: admin._id.toString(),
  name: admin.name,
  email: admin.email,
  role: admin.role,
  status: admin.status,
  permissions: admin.permissions,
  lastLogin: admin.lastLogin,
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt,
})

const getAdmins = async (req, res) => {
  try {
    const { search, role, status, sort } = req.query
    const query = {}

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
      ]
    }

    // Filter by role
    if (role && role !== "all") {
      query.role = role
    }

    // Filter by status
    if (status && status !== "all") {
      query.status = status
    }

    // Sort options
    let sortOptions = { createdAt: -1 }
    if (sort) {
      switch (sort) {
        case "name_asc":
          sortOptions = { name: 1 }
          break
        case "name_desc":
          sortOptions = { name: -1 }
          break
        case "email_asc":
          sortOptions = { email: 1 }
          break
        case "email_desc":
          sortOptions = { email: -1 }
          break
        case "role_asc":
          sortOptions = { role: 1 }
          break
        case "role_desc":
          sortOptions = { role: -1 }
          break
        case "date_asc":
          sortOptions = { createdAt: 1 }
          break
        case "date_desc":
          sortOptions = { createdAt: -1 }
          break
        default:
          sortOptions = { createdAt: -1 }
      }
    }

    const admins = await Admin.find(query).sort(sortOptions).select("-password")
    const transformedAdmins = admins.map(transformAdmin)

    res.json({
      success: true,
      count: transformedAdmins.length,
      admins: transformedAdmins,
    })
  } catch (error) {
    console.error("Error in getAdmins:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch admins",
      error: error.message,
    })
  }
}

const getAdminById = async (req, res) => {
  try {
    const { id } = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID provided",
        error: "Please provide a valid admin ID",
      })
    }

    const admin = await Admin.findById(id).select("-password")

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
        error: "No admin found with the provided ID",
      })
    }

    res.json({
      success: true,
      data: transformAdmin(admin),
    })
  } catch (error) {
    console.error("Error in getAdminById:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin",
      error: error.message,
    })
  }
}

const createAdmin = async (req, res) => {
  try {
    const { name, email, password, role, status, permissions } = req.body

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
        error: "Missing required fields",
      })
    }

    // Check if admin exists
    const adminExists = await Admin.findOne({ email })
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: "Admin with this email already exists",
        error: "Duplicate email address",
      })
    }

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password,
      role: role || "support",
      status: status || "active",
      permissions: permissions || {
        users: { read: false, write: false, delete: false },
        vehicles: { read: false, write: false, delete: false },
        bookings: { read: false, write: false, delete: false },
        payments: { read: false, write: false, delete: false },
        settings: { read: false, write: false, delete: false },
      },
    })

    const newAdmin = await Admin.findById(admin._id).select("-password")
    const transformedAdmin = transformAdmin(newAdmin)

    // 🔥 EMIT REAL-TIME EVENT through unified socket system
    const emitters = req.app.get("socketEmitters")
    if (emitters) {
      emitters.emitAdminEvent("admin:created", {
        action: "create",
        admin: transformedAdmin,
        message: `New admin "${transformedAdmin.name}" has been created`,
      })
    }

    console.log(`✅ Admin created: ${transformedAdmin.name} (${transformedAdmin.email})`)

    res.status(201).json(transformedAdmin)
  } catch (error) {
    console.error("Error in createAdmin:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create admin",
      error: error.message,
    })
  }
}

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, password, role, status, permissions } = req.body

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID provided",
        error: `Received ID: "${id}" - Please provide a valid admin ID`,
      })
    }

    const admin = await Admin.findById(id)
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
        error: "No admin found with the provided ID",
      })
    }

    // Store old data for comparison
    const oldData = {
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    }

    // Check if email is taken by another admin
    if (email && email !== admin.email) {
      const emailExists = await Admin.findOne({ email })
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use by another admin",
          error: "Duplicate email address",
        })
      }
    }

    // Update fields
    admin.name = name || admin.name
    admin.email = email || admin.email
    if (password) admin.password = password
    admin.role = role || admin.role
    admin.status = status || admin.status
    if (permissions) admin.permissions = permissions

    const updatedAdmin = await admin.save()
    const adminResponse = await Admin.findById(updatedAdmin._id).select("-password")
    const transformedAdmin = transformAdmin(adminResponse)

    // 🔥 EMIT REAL-TIME EVENT through unified socket system
    const emitters = req.app.get("socketEmitters")
    if (emitters) {
      emitters.emitAdminEvent("admin:updated", {
        action: "update",
        admin: transformedAdmin,
        oldData,
        changes: {
          name: oldData.name !== transformedAdmin.name,
          email: oldData.email !== transformedAdmin.email,
          role: oldData.role !== transformedAdmin.role,
          status: oldData.status !== transformedAdmin.status,
          password: !!password,
        },
        message: `Admin "${transformedAdmin.name}" has been updated`,
      })
    }

    console.log(`✅ Admin updated: ${transformedAdmin.name} (${transformedAdmin.email})`)

    res.json(transformedAdmin)
  } catch (error) {
    console.error("Error in updateAdmin:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update admin",
      error: error.message,
    })
  }
}

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params

    if (!id || id === "undefined" || id === "null" || id.trim() === "" || id === undefined || id === null) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required",
        error: `Received invalid ID: "${id}" - Please provide a valid admin ID to delete`,
      })
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID format",
        error: `Received ID: "${id}" - The provided ID is not a valid MongoDB ObjectId`,
      })
    }

    // Find admin first
    const admin = await Admin.findById(id)
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
        error: "No admin found with the provided ID",
      })
    }

    // Store admin data before deletion
    const deletedAdminData = {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: admin.role,
    }

    // Delete the admin
    await Admin.findByIdAndDelete(id)

    // 🔥 EMIT REAL-TIME EVENT through unified socket system
    const emitters = req.app.get("socketEmitters")
    if (emitters) {
      emitters.emitAdminEvent("admin:deleted", {
        action: "delete",
        admin: deletedAdminData,
        message: `Admin "${deletedAdminData.name}" has been deleted`,
      })
    }

    console.log(`✅ Admin deleted: ${deletedAdminData.name} (${deletedAdminData.email})`)

    res.json({
      success: true,
      message: "Admin deleted successfully",
      data: {
        deletedId: id,
        deletedAdmin: deletedAdminData,
      },
    })
  } catch (error) {
    console.error("Error in deleteAdmin:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete admin",
      error: error.message,
    })
  }
}

const updateAdminStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID provided",
        error: `Received ID: "${id}" - Please provide a valid admin ID`,
      })
    }

    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status provided",
        error: "Status must be either 'active' or 'inactive'",
      })
    }

    const admin = await Admin.findById(id)
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
        error: "No admin found with the provided ID",
      })
    }

    const oldStatus = admin.status
    admin.status = status
    await admin.save()

    const updatedAdmin = await Admin.findById(admin._id).select("-password")
    const transformedAdmin = transformAdmin(updatedAdmin)

    // 🔥 EMIT REAL-TIME EVENT through unified socket system
    const emitters = req.app.get("socketEmitters")
    if (emitters) {
      emitters.emitAdminEvent("admin:status-changed", {
        action: "status-change",
        admin: transformedAdmin,
        oldStatus,
        newStatus: status,
        message: `Admin "${transformedAdmin.name}" status changed from ${oldStatus} to ${status}`,
      })
    }

    console.log(`✅ Admin status updated: ${transformedAdmin.name} (${oldStatus} → ${status})`)

    res.json({
      success: true,
      message: `Admin status updated to ${status}`,
      data: transformedAdmin,
    })
  } catch (error) {
    console.error("Error in updateAdminStatus:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update admin status",
      error: error.message,
    })
  }
}

module.exports = {
  getAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateAdminStatus,
}

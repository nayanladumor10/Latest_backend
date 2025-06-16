const express = require("express")
const router = express.Router()
const {
  getAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateAdminStatus,
} = require("../controllers/adminController")

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log("=== ADMIN ROUTE DEBUG ===")
  console.log(`${req.method} ${req.originalUrl}`)
  console.log("Params:", req.params)
  console.log("Body:", req.body)
  console.log("Query:", req.query)
  console.log("========================")
  next()
})

// Routes for /api/admins
router.route("/").get(getAdmins).post(createAdmin)

// Routes for /api/admins/:id
router.route("/:id").get(getAdminById).put(updateAdmin).delete(deleteAdmin)

// Route for updating admin status
router.route("/:id/status").patch(updateAdminStatus)



module.exports = router

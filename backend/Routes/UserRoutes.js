import express from "express"
import { Authenticated } from "../Middlewares/authMiddleware.js"
import { 
    Authentication, 
    ForgotPassword,
    GetUserInfo, 
    GoogleAuthController, 
    Login, 
    Logout, 
    Signup, 
    updateHomeLocation // Added this
} from "../Controllers/UserController.js"

const router = express.Router()

router.post("/signup", Signup)
router.post("/login", Login)
router.post("/forgot-password", ForgotPassword)
router.post("/googleLogin", GoogleAuthController)
router.post("/logout", Logout)
router.get("/auth-check", Authentication)
router.get("/get-data", GetUserInfo)

// NEW: Route to update home coordinates and complete safety profile
router.patch("/update-home", updateHomeLocation)

export default router

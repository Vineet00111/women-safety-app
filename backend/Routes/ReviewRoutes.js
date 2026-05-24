import express from "express"
import { AddReview, DeleteReview, GetAllReviews } from "../Controllers/ReviewController.js"
const router = express.Router()

router.post("/addreview", AddReview)
router.get("/allreviews", GetAllReviews)
router.delete("/delete-review", DeleteReview)

export default router

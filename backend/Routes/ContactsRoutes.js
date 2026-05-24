import express from "express";
import { 
    AddContact, 
    DeleteContact, 
    SendCancelledEmergencyInfo,
    SendEmergencyInfo, 
    SendVideoEvidence // Import the new controller
} from "../Controllers/ContactsController.js";
import { upload } from "../Middlewares/Multer.js";

const router = express.Router();

// 1. Existing Contact Management
router.post("/addcontact", upload.single("photo"), async (req, res, next) => {
  try {
    await AddContact(req, res);
  } catch (error) {
    next(error); 
  }
});

router.delete("/delete-contact", DeleteContact);

// 2. SOS Phase 1: Send Location & Alert Nearby Guardians
router.post("/emergency", SendEmergencyInfo);
router.post("/emergency/cancel", SendCancelledEmergencyInfo);

// 3. SOS Phase 2: Upload Video Evidence & Send URL
// We use upload.single("video") because the frontend will send a 'blob' under the field name 'video'
router.post("/emergency/video", upload.single("video"), SendVideoEvidence);

export default router;

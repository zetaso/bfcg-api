import { Router } from "express";
import { getTestimonials, createTestimonial } from "../controllers/testimonialController.js";
import { getSiteSettings, createSiteSetting } from "../controllers/siteSettingController.js";
import { getServices } from "../controllers/serviceController.js";
import { createServiceHighlight } from "../controllers/serviceController.js"
// import { uploadImage } from "../controllers/imageController.js";
import multer from "multer";

// configure multer to handle file in memory temporarily for Supabase upload
const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get("/testimonials", getTestimonials)
router.post("/testimonials", createTestimonial)

router.get("/sitesettings", getSiteSettings)
router.post("/sitesettings", createSiteSetting)

router.get("/services", getServices);

router.post("/servicehighlights", createServiceHighlight);

// router.post("/upload", upload.single("image"), uploadImage);

export default router;

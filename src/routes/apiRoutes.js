import { Router } from "express";
import multer from "multer";
import { getTestimonials } from "../controllers/testimonialController.js";
import { getSiteSettings } from "../controllers/siteSettingController.js";
import { getServices, getService } from "../controllers/serviceController.js";
import { login, me, logout, logoutOthers } from "../controllers/authController.js";
import { loginRateLimit, requireTrustedOrigin } from "../middleware/security.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  IMAGE_LIMITS,
  listSettings,
  updateSettings,
  listServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  reorderServices,
  createHighlight,
  updateHighlight,
  deleteHighlight,
  listTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  reorderTestimonials,
  uploadImage,
} from "../controllers/adminController.js";

// keep uploads in memory just long enough to forward them to Supabase Storage
const upload = multer({ storage: multer.memoryStorage(), limits: IMAGE_LIMITS });
const router = Router();

// ── Public (read-only) ──
router.get("/testimonials", getTestimonials);
router.get("/sitesettings", getSiteSettings);
router.get("/services", getServices);
router.get("/services/:slug", getService);

// ── Auth ── (session lives in httpOnly cookies scoped to /api/v1/admin)
router.post("/auth/login", requireTrustedOrigin, loginRateLimit, login);

// ── Admin (signed-in admins only) ──
const admin = Router();
admin.use(requireTrustedOrigin, requireAdmin);

admin.get("/me", me);
admin.post("/logout", logout);
admin.post("/sessions/revoke-others", logoutOthers);

admin.get("/sitesettings", listSettings);
admin.put("/sitesettings", updateSettings);

admin.get("/services", listServices);
admin.post("/services", createService);
admin.put("/services/order", reorderServices);
admin.get("/services/:id", getServiceById);
admin.put("/services/:id", updateService);
admin.delete("/services/:id", deleteService);

admin.post("/services/:id/highlights", createHighlight);
admin.put("/highlights/:id", updateHighlight);
admin.delete("/highlights/:id", deleteHighlight);

admin.get("/testimonials", listTestimonials);
admin.post("/testimonials", createTestimonial);
admin.put("/testimonials/order", reorderTestimonials);
admin.put("/testimonials/:id", updateTestimonial);
admin.delete("/testimonials/:id", deleteTestimonial);

admin.post("/upload", upload.single("image"), uploadImage);

router.use("/admin", admin);

export default router;

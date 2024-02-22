import express from "express";
import { auth, verifyOTPUser } from "../controllers/user.js";
const router = express.Router();

router.post("/auth", auth);
router.post("/verify", verifyOTPUser);

export default router;

import User from "../models/user.js";
import { generateJwt, generateOTP, sendOTP } from "../utils/otpManager.js";
import { validate as uuid } from "uuid";

export const auth = async (req, res) => {
  try {
    const email = req.body.email;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    const [username, mail] = email.split("@");
    if(mail === process.env.CLG_MAIL){
      let user = await User.findOne({ email: email });
      if (!user) {
        const newUser = new User({ name: username, email });
        const otp = generateOTP();
        // sendOTP(email, "register-user", otp);
        newUser.otp = otp;
        newUser.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await newUser.save();
        return res.status(200).json({
          message: "created new account and otp send successfully",
          email: email,
        });
      }
      const otp = generateOTP();
      // sendOTP(email, "register-user", otp);
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      return res
        .status(200)
        .json({ message: "already a user otp send successfully", email });
    }else{
      res.status(403).json({
        message: "Only college mails accepted"
      })
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


export const verifyOTPUser = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    console.log(email, "mail")
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.otp || user.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }
    const currentTime = new Date();
    if (currentTime > user.otpExpiresAt) {
      return res.status(401).json({ message: "OTP has expired" });
    }
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();
    const token = generateJwt(user._id);
    return res.json({
      message: "OTP verification successful",
      token,
      randRoomId: genRoomId(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

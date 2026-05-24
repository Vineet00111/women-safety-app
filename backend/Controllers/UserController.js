import User from "../Models/UserModel.js";
import bcrypt from "bcryptjs";
import CreateToken from "../Utils/CreateToken.js";
import { OAuth2Client } from 'google-auth-library';
import jwt from "jsonwebtoken";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper for Cookie Settings
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
};

const Signup = async (req, res) => {
    const { username, email, password, MobileNo } = req.body;
    const sanitizedMobileNo = String(MobileNo || "").trim();

    if (!username || !email || !password || !sanitizedMobileNo) {
        return res.status(400).json({ message: "Please enter all the fields" });
    }

    try {
        const emailExits = await User.findOne({ email });
        if (emailExits) {
            return res.status(409).json({ message: "Email already exists" });
        }

        const mobileExists = await User.findOne({ MobileNo: sanitizedMobileNo });
        if (mobileExists) {
            return res.status(409).json({ message: "This mobile number is already registered. Please use a different mobile number." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const NewUser = await User.create({
            username,
            email,
            password: hashedPassword,
            MobileNo: sanitizedMobileNo,
            isGoogleUser: false
        });

        const token = CreateToken(NewUser._id);
        res.cookie("jwt", token, cookieOptions)
            .status(200).json({
                _id: NewUser._id,
                email: NewUser.email,
                profilephoto: NewUser.profilePhoto,
                isProfileComplete: NewUser.isProfileComplete
            });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.MobileNo) {
            return res.status(409).json({ message: "This mobile number is already registered. Please use a different mobile number." });
        }
        res.status(500).json({ message: "An error occurred during signup" });
    }
};

const Login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const existsEmail = await User.findOne({ email });

        if (!existsEmail || existsEmail.isGoogleUser) {
            return res.status(401).json({ message: !existsEmail ? "No User Found" : "Use Google Login for this account" });
        }

        const comparePassword = await bcrypt.compare(password, existsEmail.password);
        if (comparePassword) {
            const token = CreateToken(existsEmail._id);
            res.cookie("jwt", token, cookieOptions)
                .status(200).json({
                    _id: existsEmail._id,
                    email: existsEmail.email,
                    profilephoto: existsEmail.profilePhoto,
                    isProfileComplete: existsEmail.isProfileComplete
                });
        } else {
            res.status(409).json({ message: "Invalid Credentials" });
        }
    } catch (error) {
        res.status(500).json({ message: "Login Error" });
    }
};

const ForgotPassword = async (req, res) => {
    const { email, MobileNo, newPassword } = req.body;
    const sanitizedMobileNo = String(MobileNo || "").trim();

    if (!email || !sanitizedMobileNo || !newPassword) {
        return res.status(400).json({ message: "Email, mobile number, and new password are required" });
    }

    if (!/^\d{10}$/.test(sanitizedMobileNo)) {
        return res.status(400).json({ message: "Please enter a valid 10-digit mobile number" });
    }

    if (String(newPassword).length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    try {
        const user = await User.findOne({ email, MobileNo: sanitizedMobileNo });

        if (!user) {
            return res.status(404).json({ message: "No account found with this email and mobile number" });
        }

        if (user.isGoogleUser) {
            return res.status(400).json({ message: "This account uses Google sign-in. Please log in with Google." });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        return res.status(200).json({ message: "Password updated successfully. Please sign in with your new password." });
    } catch (error) {
        return res.status(500).json({ message: "Could not reset password" });
    }
};

const updateHomeLocation = async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) return res.status(401).json({ message: "Session expired" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded.userId;

        const { coordinates, longitude, latitude, MobileNo } = req.body;

        const parsedLongitude = Number(
            Array.isArray(coordinates) ? coordinates[0] : longitude
        );
        const parsedLatitude = Number(
            Array.isArray(coordinates) ? coordinates[1] : latitude
        );
        const sanitizedMobileNo = String(MobileNo || "").trim();

        if (Number.isNaN(parsedLongitude) || Number.isNaN(parsedLatitude)) {
            return res.status(400).json({ message: "Valid longitude and latitude are required" });
        }

        if (!/^\d{10}$/.test(sanitizedMobileNo)) {
            return res.status(400).json({ message: "Mobile number must be exactly 10 digits" });
        }

        const existingMobileOwner = await User.findOne({
            MobileNo: sanitizedMobileNo,
            _id: { $ne: userId }
        }).select("_id");

        if (existingMobileOwner) {
            return res.status(409).json({ message: "This mobile number is already registered with another account" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    "homeLocation.type": "Point",
                    "homeLocation.coordinates": [
                        parsedLongitude,
                        parsedLatitude
                    ],
                    "homeAddress.type": "Point",
                    "homeAddress.coordinates": [
                        parsedLongitude,
                        parsedLatitude
                    ],
                    MobileNo: sanitizedMobileNo,
                    isProfileComplete: true
                }
            },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message: "User not found" });
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Update error:", error.message);
        if (error.code === 11000 && error.keyPattern?.MobileNo) {
            return res.status(409).json({ message: "This mobile number is already registered with another account" });
        }
        res.status(500).json({ message: "Failed to update profile" });
    }
};

const GoogleAuthController = async (req, res) => {
    try {
        const { email, name, googleId, picture, MobileNo } = req.body;
        let existingUser = await User.findOne({ email });

        if (existingUser) {
            if (!existingUser.isGoogleUser) {
                return res.status(400).json({ message: "Use email/password to login" });
            }
            existingUser.googleId = googleId;
            if (picture) existingUser.profilePhoto = picture;
            await existingUser.save();

            const token = CreateToken(existingUser._id);
            return res.cookie("jwt", token, cookieOptions).status(200).json(existingUser);
        }

        const newUser = await User.create({
            username: name,
            email,
            googleId,
            MobileNo: MobileNo || "",
            profilePhoto: picture || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvFbJHIvlkPWSvsJ1rWRbr64ZPiCCdb1SCLg&s",
            isGoogleUser: true,
            isProfileComplete: false
        });

        const token = CreateToken(newUser._id);
        res.cookie("jwt", token, cookieOptions).status(200).json(newUser);
    } catch (error) {
        res.status(500).json({ message: "Google Auth error" });
    }
};

const Logout = async (req, res) => {
    res.cookie("jwt", "", {
        httpOnly: true,
        expires: new Date(0),
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production"
    }).json({ message: "Logout Successfully" });
};

const Authentication = async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) return res.status(401).json({ authenticated: false });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userData = await User.findById(decoded.id || decoded.userId);

        if (!userData) return res.status(404).json({ authenticated: false });

        return res.status(200).json({
            authenticated: true,
            user: { id: userData._id, email: userData.email, isProfileComplete: userData.isProfileComplete },
        });
    } catch (error) {
        return res.status(401).json({ authenticated: false });
    }
};

const GetUserInfo = async (req, res) => {
    try {
        const { email } = req.query;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "No User Found" });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Retrieval error" });
    }
};

export { Signup, Login, ForgotPassword, Logout, GoogleAuthController, Authentication, GetUserInfo, updateHomeLocation };

import User from "../Models/UserModel.js";
import { cloudinaryUpload } from "../Utils/Cloudinary.js";
import fs from "fs";
import getPublicIdFromUrl from "../Utils/getPublicIdFromUrl.js";
import { v2 as cloudinary } from "cloudinary";
import {
    getNearbyUsers,
    notifyNearbyContacts,
    normalizePhoneNumber,
    sendSmsNotification,
} from "../Utils/AlertUtils.js";

const NEARBY_RADIUS_METERS = 2000;

const deleteLocalFileIfExists = (filePath) => {
    if (!filePath) return;

    fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") {
            console.error("Error deleting local file:", err);
        }
    });
};

const filterUniqueNearbyRecipients = (nearbyUsers = [], directNumbers = []) => {
    const directNumberSet = new Set(directNumbers.map((number) => normalizePhoneNumber(number)));
    const seenNearbyNumbers = new Set();

    return nearbyUsers.filter((user) => {
        const normalized = normalizePhoneNumber(user.MobileNo);
        if (!normalized || directNumberSet.has(normalized) || seenNearbyNumbers.has(normalized)) {
            return false;
        }

        seenNearbyNumbers.add(normalized);
        return true;
    });
};

const dedupePhoneNumbers = (numbers = []) => {
    const seen = new Set();

    return numbers.filter((number) => {
        const normalized = normalizePhoneNumber(number);
        if (!normalized || seen.has(normalized)) {
            return false;
        }

        seen.add(normalized);
        return true;
    });
};

// --- EXISTING FUNCTIONS ---
const AddContact = async (req, res) => {
    const { MobileNo, name, userId } = req.body;
    if (!MobileNo || !name || !userId) return res.status(400).json({ message: "Please enter all the fields" });

    let photo;
    try {
        if (req.file) {
            photo = await cloudinaryUpload(req.file.path);
            deleteLocalFileIfExists(req.file.path);
        } else {
            photo = "https://via.placeholder.com/150";
        }

        const linkedUser = await User.findOne({
            MobileNo,
            _id: { $ne: userId },
        }).select("_id homeAddress");

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    contacts: {
                        user: userId,
                        photo,
                        name,
                        MobileNo,
                        linkedUser: linkedUser?._id,
                        homeAddress: linkedUser?.homeAddress?.coordinates?.length === 2
                            ? linkedUser.homeAddress
                            : undefined,
                    },
                },
            },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message: "User not found" });
        res.status(201).json({ message: "Contact added successfully", contact: updatedUser.contacts[updatedUser.contacts.length - 1] });
    } catch (error) {
        console.error("AddContact error:", error);
        res.status(500).json({ message: "An error occurred in Adding Contact" });
    }
};

const DeleteContact = async (req, res) => {
    const { userId, contactId } = req.query;
    if (!userId || !contactId) return res.status(400).json({ message: "User ID and Contact ID are required" });

    try {
        const user = await User.findById(userId);
        const ContactToDelete = user.contacts.find((contact) => contact._id.toString() === contactId);
        if (!ContactToDelete) return res.status(404).json({ message: "Contact not found" });

        if (ContactToDelete.photo) {
            try {
                const publicId = getPublicIdFromUrl(ContactToDelete.photo);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            } catch (cloudinaryError) { console.error("Cloudinary Delete Error:", cloudinaryError); }
        }

        const updatedUser = await User.findByIdAndUpdate(userId, { $pull: { contacts: { _id: contactId } } }, { new: true });
        res.status(200).json({ message: "Contact deleted successfully", user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "An error occurred while deleting the contact" });
    }
};

// --- UPGRADED: SEND LOCATION + NEARBY GUARDIANS ---
const SendEmergencyInfo = async (req, res) => {
    try {
        const { userId, contactNumbers, location } = req.body;

        const latitude = Number(location?.latitude);
        const longitude = Number(location?.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(400).json({ message: "Location is required" });
        }

        const user = await User.findById(userId).select("contacts username");
        if (!user) return res.status(404).json({ message: "User not found" });

        const allRecipients = dedupePhoneNumbers(contactNumbers || []);
        const nearbyUsers = await getNearbyUsers(
            { latitude, longitude },
            userId,
            NEARBY_RADIUS_METERS
        );
        const nearbyContacts = filterUniqueNearbyRecipients(nearbyUsers, allRecipients);

        const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
        const senderName = user.username || "Your contact";
        const generalAlertMessage = `SOS ${senderName}. Track:${mapsLink}`;
        const nearbyAlertMessage = `SOS near you:${senderName}. Track:${mapsLink} Ask someone nearby to help.`;

        console.log("[SOS] Direct recipients count:", allRecipients.length);
        console.log("[SOS] Nearby recipients count:", nearbyContacts.length);
        console.log("[SOS] Direct message:", generalAlertMessage);
        console.log("[SOS] Nearby message:", nearbyAlertMessage);

        await Promise.all(allRecipients.map((number) => sendSmsNotification(number, generalAlertMessage)));

        await notifyNearbyContacts(nearbyContacts, {
            title: "Nearby SOS Alert",
            body: nearbyAlertMessage,
            data: {
                type: "SOS_NEARBY",
                latitude: String(latitude),
                longitude: String(longitude),
                mapsLink,
                senderName,
            },
        });

        res.status(200).json({
            message: "Emergency alerts sent",
            nearbyContactsCount: nearbyContacts.length,
            directRecipientsCount: allRecipients.length,
            nearbyContacts: nearbyContacts.map((contact) => ({
                id: contact._id,
                username: contact.username,
                MobileNo: contact.MobileNo,
            })),
        });

    } catch (error) {
        console.error("SendEmergencyInfo error:", error);
        res.status(500).json({ message: "Error sending emergency alerts", error: error.message });
    }
};

const SendCancelledEmergencyInfo = async (req, res) => {
    try {
        const { userId, contactNumbers, location } = req.body;

        const latitude = Number(location?.latitude);
        const longitude = Number(location?.longitude);
        const user = await User.findById(userId).select("username contacts");

        if (!user) return res.status(404).json({ message: "User not found" });

        const allRecipients = dedupePhoneNumbers(contactNumbers || []);
        const nearbyUsers = Number.isFinite(latitude) && Number.isFinite(longitude)
            ? await getNearbyUsers(
                { latitude, longitude },
                userId,
                NEARBY_RADIUS_METERS
            )
            : [];
        const nearbyContacts = filterUniqueNearbyRecipients(nearbyUsers, allRecipients);

        const senderName = user.username || "Your contact";
        const cancelMessage = `${senderName}: Previous SOS alert was sent by mistake. No emergency assistance is needed now.`;

        console.log("[SOS Cancel] Direct recipients count:", allRecipients.length);
        console.log("[SOS Cancel] Nearby recipients count:", nearbyContacts.length);
        console.log("[SOS Cancel] Message:", cancelMessage);

        await Promise.all(allRecipients.map((number) => sendSmsNotification(number, cancelMessage)));

        await notifyNearbyContacts(nearbyContacts, {
            title: "SOS Cancelled",
            body: cancelMessage,
            data: {
                type: "SOS_CANCELLED",
            },
        });

        res.status(200).json({
            message: "SOS cancellation message sent",
            recipientsCount: allRecipients.length,
            nearbyContactsCount: nearbyContacts.length,
        });
    } catch (error) {
        console.error("SendCancelledEmergencyInfo error:", error);
        res.status(500).json({ message: "Error sending cancellation alert", error: error.message });
    }
};

// --- NEW: UPLOAD VIDEO + SEND EVIDENCE LINK ---
const SendVideoEvidence = async (req, res) => {
    try {
        const { userId, contactNumbers, location } = req.body;
        const latitude = Number(location?.latitude);
        const longitude = Number(location?.longitude);

        if (!req.file) return res.status(400).json({ message: "No video file provided" });
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(400).json({ message: "Valid location is required for video evidence" });
        }

        // 1. Upload Video to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: "video",
            folder: "Emergency_Videos"
        });

        const videoUrl = result.secure_url;
        deleteLocalFileIfExists(req.file.path);

        const user = await User.findById(userId).select("contacts username");
        if (!user) return res.status(404).json({ message: "User not found" });

        const allRecipients = dedupePhoneNumbers(contactNumbers || []);
        const nearbyUsers = await getNearbyUsers(
            { latitude, longitude },
            userId,
            NEARBY_RADIUS_METERS
        );
        const nearbyContacts = filterUniqueNearbyRecipients(nearbyUsers, allRecipients);

        const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
        const senderName = user.username || "Your contact";
        const messageText = `SOS ${senderName}. Track:${mapsLink} SOS Video:${videoUrl}`;
        const nearbyMessage = `SOS near you:${senderName}. Track:${mapsLink} SOS Video:${videoUrl} Can't go? Ask someone nearby to help.`;

        console.log("[SOS Final] Direct recipients count:", allRecipients.length);
        console.log("[SOS Final] Nearby recipients count:", nearbyContacts.length);
        console.log("[SOS Final] Direct message:", messageText);
        console.log("[SOS Final] Nearby message:", nearbyMessage);

        await Promise.all(allRecipients.map((number) => sendSmsNotification(number, messageText)));

        await notifyNearbyContacts(nearbyContacts, {
            title: "SOS Video Evidence",
            body: nearbyMessage,
            data: {
                type: "SOS_VIDEO",
                videoUrl,
                senderName,
            },
        });

        res.status(200).json({ message: "Video evidence sent successfully", videoUrl });

    } catch (error) {
        console.error("SendVideoEvidence error:", error);
        if (req.file?.path) {
            deleteLocalFileIfExists(req.file.path);
        }
        res.status(500).json({ message: "Video evidence failed", error: error.message });
    }
};

export { AddContact, DeleteContact, SendEmergencyInfo, SendCancelledEmergencyInfo, SendVideoEvidence };

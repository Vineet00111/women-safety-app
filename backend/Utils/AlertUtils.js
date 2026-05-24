import axios from "axios";
import mongoose from "mongoose";
import User from "../Models/UserModel.js";

const normalizePhoneNumber = (value = "") => String(value).replace(/\D/g, "");

const isValidCoordinatePair = (longitude, latitude) =>
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90;

const buildContactLookup = (contactList = []) => {
    const userIds = [];
    const phoneNumbers = [];

    contactList.forEach((contact) => {
        if (!contact) return;

        if (typeof contact === "string") {
            if (mongoose.Types.ObjectId.isValid(contact)) {
                userIds.push(new mongoose.Types.ObjectId(contact));
            } else {
                const normalizedPhone = normalizePhoneNumber(contact);
                if (normalizedPhone) phoneNumbers.push(normalizedPhone);
            }
            return;
        }

        if (contact.linkedUser && mongoose.Types.ObjectId.isValid(contact.linkedUser)) {
            userIds.push(new mongoose.Types.ObjectId(contact.linkedUser));
        }

        if (contact._id && mongoose.Types.ObjectId.isValid(contact._id) && contact.isRegisteredUser) {
            userIds.push(new mongoose.Types.ObjectId(contact._id));
        }

        const normalizedPhone = normalizePhoneNumber(contact.MobileNo || contact.phone || contact.mobileNo);
        if (normalizedPhone) phoneNumbers.push(normalizedPhone);
    });

    return {
        userIds: [...new Set(userIds.map(String))].map((id) => new mongoose.Types.ObjectId(id)),
        phoneNumbers: [...new Set(phoneNumbers)],
    };
};

const getNearbyContacts = async (userCoords, contactList = [], excludeUserId = null, radiusInMeters = 1000) => {
    const longitude = Number(userCoords?.longitude);
    const latitude = Number(userCoords?.latitude);

    if (!isValidCoordinatePair(longitude, latitude)) {
        throw new Error("Valid user coordinates are required");
    }

    const { userIds, phoneNumbers } = buildContactLookup(contactList);
    const contactFilters = [];

    if (userIds.length > 0) {
        contactFilters.push({ _id: { $in: userIds } });
    }

    if (phoneNumbers.length > 0) {
        contactFilters.push({
            MobileNo: {
                $in: phoneNumbers,
            },
        });
    }

    if (contactFilters.length === 0) {
        return [];
    }

    const query = {
        $or: contactFilters,
        homeAddress: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                $maxDistance: radiusInMeters,
            },
        },
    };

    if (excludeUserId && mongoose.Types.ObjectId.isValid(excludeUserId)) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeUserId) };
    }

    try {
        return await User.find(query).select("username MobileNo fcmToken homeAddress");
    } catch (error) {
        console.error("Nearby contact lookup failed:", error.message);
        return [];
    }
};

const getNearbyUsers = async (userCoords, excludeUserId = null, radiusInMeters = 1000) => {
    const longitude = Number(userCoords?.longitude);
    const latitude = Number(userCoords?.latitude);

    if (!isValidCoordinatePair(longitude, latitude)) {
        throw new Error("Valid user coordinates are required");
    }

    const query = {
        homeAddress: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                },
                $maxDistance: radiusInMeters,
            },
        },
    };

    if (excludeUserId && mongoose.Types.ObjectId.isValid(excludeUserId)) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeUserId) };
    }

    try {
        return await User.find(query).select("username MobileNo fcmToken homeAddress");
    } catch (error) {
        console.error("Nearby user lookup failed:", error.message);
        return [];
    }
};

const sendSmsNotification = async (to, body) => {
    const normalizedPhone = normalizePhoneNumber(to);
    if (!normalizedPhone || !body) return;

    try {
        if (
            process.env.TWILIO_ACCOUNT_SID &&
            process.env.TWILIO_AUTH_TOKEN &&
            process.env.TWILIO_PHONE_NUMBER
        ) {
            const payload = new URLSearchParams({
                To: normalizedPhone.startsWith("91") ? `+${normalizedPhone}` : `+91${normalizedPhone}`,
                From: process.env.TWILIO_PHONE_NUMBER,
                Body: body,
            });

            const response = await axios.post(
                `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
                payload.toString(),
                {
                    auth: {
                        username: process.env.TWILIO_ACCOUNT_SID,
                        password: process.env.TWILIO_AUTH_TOKEN,
                    },
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );
            console.log(`[SMS] Twilio accepted for ${normalizedPhone}:`, response.data?.sid || response.status);
            return;
        }

        if (process.env.FAST2SMS_API_KEY) {
            const response = await axios({
                method: "post",
                url: "https://www.fast2sms.com/dev/bulkV2",
                headers: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    "Content-Type": "application/json",
                },
                data: {
                    route: "q",
                    message: body,
                    numbers: normalizedPhone,
                },
            });
            console.log(`[SMS] Fast2SMS response for ${normalizedPhone}:`, response.data);
            return;
        }

        console.warn(`SMS provider not configured. Skipped SMS for ${normalizedPhone}`);
    } catch (error) {
        console.error(
            `SMS notification failed for ${normalizedPhone}:`,
            error.response?.data || error.message
        );
    }
};

const sendPushNotification = async ({ token, title, body, data = {} }) => {
    if (!token) return;

    try {
        if (process.env.FIREBASE_SERVER_KEY) {
            await axios.post(
                "https://fcm.googleapis.com/fcm/send",
                {
                    to: token,
                    notification: { title, body },
                    data,
                },
                {
                    headers: {
                        Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            return;
        }

        console.warn(`Firebase server key missing. Skipped push notification for token ${token}`);
    } catch (error) {
        console.error(
            `Push notification failed for token ${token}:`,
            error.response?.data || error.message
        );
    }
};

const notifyNearbyContacts = async (nearbyContacts = [], { title, body, data = {} }) => {
    await Promise.all(
        nearbyContacts.map(async (contact) => {
            const tasks = [sendSmsNotification(contact.MobileNo, body)];

            if (contact.fcmToken) {
                tasks.push(
                    sendPushNotification({
                        token: contact.fcmToken,
                        title,
                        body,
                        data,
                    })
                );
            }

            await Promise.all(tasks);
        })
    );
};

export {
    getNearbyContacts,
    getNearbyUsers,
    notifyNearbyContacts,
    normalizePhoneNumber,
    sendPushNotification,
    sendSmsNotification,
};

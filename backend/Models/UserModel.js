import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    location: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    review: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const ContactSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    photo: {
        type: String,
        default: "../Utils/woman.webp"
    },
    name: {
        type: String,
        required: true
    },
    MobileNo: {
        type: String,
        required: true
    },
    linkedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    homeAddress: {
        type: {
            type: String,
            enum: ['Point'],
            required: false
        },
        coordinates: {
            type: [Number],
            required: false
        }
    }
}, {
    timestamps: true
})

const UserSchema = mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function () {
            return !this.isGoogleUser;
        }
    },
    MobileNo: {
        type: String,
        required: false,
        unique: true,
        sparse: true 
    },
    profilePhoto: {
        type: String,
        default: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvFbJHIvlkPWSvsJ1rWRbr64ZPiCCdb1SCLg&s"
    },
    reviews: {
        type: [ReviewSchema],
        default: []
    },
    contacts: {
        type: [ContactSchema],
        default: []
    },
    googleId: {
        type: String,
        sparse: true
    },
    fcmToken: {
        type: String,
        required: false
    },
    isGoogleUser: {
        type: Boolean,
        default: false
    },
    // --- NEW FIELDS FOR GUARDIAN FEATURE ---
    isProfileComplete: {
        type: Boolean,
        default: false
    },
    homeLocation: {
    type: {
        type: String,
        enum: ['Point'],
        // Remove the default 'Point' so it doesn't trigger 
        // validation if the user hasn't set a location yet.
        required: false 
    },
    coordinates: {
        type: [Number], // [longitude, latitude]
        // REMOVE default: ''
        required: false
    }
  },
    homeAddress: {
    type: {
        type: String,
        enum: ['Point'],
        required: false 
    },
    coordinates: {
        type: [Number],
        required: false
    }
  }
}, {
    timestamps: true
});

// CRITICAL: Indexes for performance and search
UserSchema.index({ googleId: 1 }, { sparse: true });
UserSchema.index({ homeLocation: "2dsphere" });
UserSchema.index({ homeAddress: "2dsphere" });

const User = mongoose.model("User", UserSchema);

export default User;

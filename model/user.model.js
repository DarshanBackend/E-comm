import mongoose from "mongoose";


export const UserAddressSchema = new mongoose.Schema({
    firstName: { type: String, trim: true, default: null },
    lastName: { type: String, trim: true, default: null },
    phone: {
        type: String,
        default: null,
        match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"]
    },
    zipcode: { type: String, default: null },
    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    saveAs: {
        type: String,
        enum: ["Home", "Office", "Other"],
        default: "Home"
    }
});

export const UserBillingAddressSchema = new mongoose.Schema({
    firstName: { type: String, trim: true, default: null },
    lastName: { type: String, trim: true, default: null },
    phone: {
        type: String,
        default: null,
        match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"]
    },
    zipcode: { type: String, default: null },
    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    saveAs: {
        type: String,
        enum: ["Home", "Office", "Other"],
        default: "Home"
    }
});


const UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "firstName is required"],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, "lastName is required"],
        trim: true
    },
    mobileNo: {
        type: String,
        default: null,
        match: [/^[0-9]{10}$/, "Please enter a valid mobile number"]
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/.+@.+\..+/, "Please enter a valid email address"]
    },
    password: {
        type: String,
        select: false
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    isAdmin: {
        type: Boolean
    },
    address: [UserAddressSchema],
    billingaddress: [UserBillingAddressSchema],
    selectedAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user.address",
        default: null
    },
    selectedBillingAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user.billingaddress",
        default: null
    },
    otp: { type: Number, default: null },
    avatar: { type: String, default: null },
    resetOtpExpiry: { type: Date, default: null },
    verified: { type: Boolean, default: false }
}, { timestamps: true });


const UserModel = mongoose.model("user", UserSchema);

export default UserModel;

import mongoose from "mongoose";

const contactUsSchema = mongoose.Schema({
    firstName: {
        type: String,
        require: true
    },
    lastName: {
        type: String,
        require: true
    },
    email: {
        type: String,
        require: true
    },
    subject: {
        type: String,
        enum: ["General Inquiry", "Order Tracking", "Payment Issues", "Returns & Exchanges", "Product Information", "Other"],
        require: true
    },
    comments: {
        type: String,
        require: true
    }
}, { timestamps: true })

export default mongoose.model("ContactUs", contactUsSchema)
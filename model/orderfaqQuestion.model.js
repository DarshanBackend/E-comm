import mongoose from "mongoose";

const orderfaqQuestionSchema = mongoose.Schema({
    orderfaqCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "orderfaqCategory"
    },
    orderfaqQuestion: {
        type: String
    },
    orderfaqAnswer: {
        type: String
    },
    orderfaqQuestionLower: {
        type: String,
        lowercase: true
    },
}, { timestamps: true })

export default mongoose.model("orderfaqQuestion", orderfaqQuestionSchema)
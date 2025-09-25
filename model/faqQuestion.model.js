import mongoose from "mongoose";

const faqQuestionSchema = mongoose.Schema({
    faqCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "faqCategory"
    },
    faqQuestion: {
        type: String
    },
    faqAnswer: {
        type: String
    },
    faqQuestionLower: {
        type: String,
        lowercase: true
    },
}, { timestamps: true })

export default mongoose.model("faqQuestion", faqQuestionSchema)
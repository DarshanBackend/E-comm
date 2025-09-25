import mongoose from "mongoose";

const faqCategorySchema = mongoose.Schema({
    faqCategoryName: {
        type: String
    }
}, { timestamps: true })

export default mongoose.model("faqCategory", faqCategorySchema)
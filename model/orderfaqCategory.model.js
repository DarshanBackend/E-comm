import mongoose from "mongoose";

const orderfaqCategorySchema = mongoose.Schema({
    orderfaqCategoryName: {
        type: String
    }
}, { timestamps: true })

export default mongoose.model("orderfaqCategory", orderfaqCategorySchema)
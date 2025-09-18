import mongoose from "mongoose";

const mainCategorySchema = mongoose.Schema({
    mainCategoryName: {
        type: String,
        required: true,
    }
}, { timestamps: true })

export default mongoose.model("MainCategory", mainCategorySchema)
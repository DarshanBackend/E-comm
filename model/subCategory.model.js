import mongoose from "mongoose";

const subCategorySchema = mongoose.Schema({
    mainCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MainCategory"
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        re: "Category"
    },
    subCategoryName: {
        type: String,
        default: null
    }
}, { timestamps: true })

export default mongoose.model("SubCategory", subCategorySchema)
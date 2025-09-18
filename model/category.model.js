import mongoose from "mongoose"

const categorySchema = new mongoose.Schema({
    mainCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MainCategory"
    },
    categoryName: {
        type: String,
        default: null
    },
}, { timestamps: true })

export default mongoose.model("Category", categorySchema);


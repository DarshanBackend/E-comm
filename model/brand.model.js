import mongoose from "mongoose";

const brandSchema = mongoose.Schema({
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "seller"
    },
    mainCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MainCategory"
    },
    brandImage: {
        type: String
    },
    brandName: {
        type: String
    }
}, { timestamps: true })

export default mongoose.model("Brand", brandSchema)
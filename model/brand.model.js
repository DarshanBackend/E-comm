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
    },
    isFeatured: {
        type: Boolean,
        default: true
    },
    isTrustable: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

export default mongoose.model("Brand", brandSchema)
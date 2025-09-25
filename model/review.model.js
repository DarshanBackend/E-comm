import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    overallRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: { validator: Number.isInteger, message: 'Rating must be an integer 1-5' }
    },
    love_about: [
        { point: { type: String, required: true }, rate: { type: Number, min: 1, max: 5 } }
    ],
    comment: { type: String, trim: true, maxlength: 1000, default: "" },
    media: {
        images: [{ url: String, key: String, uploadDate: { type: Date, default: Date.now } }],
        videos: [{ url: String, key: String, uploadDate: { type: Date, default: Date.now } }]
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
}, { timestamps: true });

// Ensure one review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// Static: get average rating and totalReviews
reviewSchema.statics.getRatingStats = async function (productId) {
    const result = await this.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(productId) } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: "$overallRating" },
                totalReviews: { $sum: 1 }
            }
        }
    ]);
    return {
        averageRating: result.length ? Math.round(result[0].averageRating * 10) / 10 : 0,
        totalReviews: result.length ? result[0].totalReviews : 0
    };
};

export default mongoose.model("Review", reviewSchema);

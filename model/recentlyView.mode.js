import mongoose from 'mongoose';

const recentlyViewedSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        viewedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

recentlyViewedSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model('RecentlyViewed', recentlyViewedSchema);
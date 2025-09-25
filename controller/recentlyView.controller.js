import RecentlyViewed from '../model/recentlyView.mode.js';
import { ThrowError } from '../utils/Error.utils.js';
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from '../utils/Response.utils.js';

export const addRecentlyView = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user?._id;

        if (!productId) {
            return sendBadRequestResponse(res, "Product ID is required");
        }

        if (!userId) {
            return sendBadRequestResponse(res, "User authentication required");
        }

        // Find or create recently viewed document for user
        let recentlyViewed = await RecentlyViewed.findOne({ userId });

        if (!recentlyViewed) {
            // Create new document
            recentlyViewed = new RecentlyViewed({
                userId,
                products: [{
                    productId,
                    viewedAt: new Date()
                }]
            });
        } else {
            // Remove existing product if present
            recentlyViewed.products = recentlyViewed.products.filter(
                item => item.productId.toString() !== productId
            );

            // Add new product to beginning
            recentlyViewed.products.unshift({
                productId,
                viewedAt: new Date()
            });

            // Keep only last 6 products
            if (recentlyViewed.products.length > 6) {
                recentlyViewed.products = recentlyViewed.products.slice(0, 6);
            }
        }

        // Save to database
        await recentlyViewed.save();

        // Populate product details if needed
        await recentlyViewed.populate('products.productId', 'name price images');

        return sendSuccessResponse(res, "Product added to recently viewed", { data: recentlyViewed.products })

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getRecentlyView = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return sendBadRequestResponse(res, "User authentication required")
        }

        const recentlyViewed = await RecentlyViewed.findOne({ userId })
            .populate('products.productId', 'name price images')
            .sort({ 'products.viewedAt': -1 });

        return sendSuccessResponse(res, "fetched Susscessfully..", { data: recentlyViewed ? recentlyViewed.products : [] })
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
import mongoose from "mongoose";
import wishlistModel from "../model/wishlist.model.js";
import { ThrowError } from "../utils/Error.utils.js";
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js";
import productModel from "../model/product.model.js";

export const addToWishlist = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { productId } = req.params;

        // Validate productId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return sendBadRequestResponse(res, "Invalid product ID!");
        }

        const product = await productModel.findById(productId);
        if (!product) return sendNotFoundResponse(res, "Product not found!");

        // Find or create wishlist
        let wishlist = await wishlistModel.findOne({ userId });
        if (!wishlist) {
            wishlist = new wishlistModel({ userId, items: [] });
        }

        // Ensure items array exists
        if (!Array.isArray(wishlist.items)) {
            wishlist.items = [];
        }

        // Check duplicate
        const exists = wishlist.items.some(
            (item) => item.productId.toString() === productId
        );
        if (exists) {
            return sendBadRequestResponse(res, "Product already in wishlist!");
        }

        wishlist.items.push({ productId });
        await wishlist.save();

        return sendSuccessResponse(res, "✅ Added to wishlist!", wishlist);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getWishlist = async (req, res) => {
    try {
        const { id: userId } = req.user;

        const wishlist = await wishlistModel.findOne({ userId })
            .populate("items.productId", "name price image")
            .lean();

        if (!wishlist || wishlist.items.length === 0) {
            return sendNotFoundResponse(res, "Your wishlist is empty!");
        }

        return sendSuccessResponse(res, "✅ Wishlist fetched successfully!", wishlist);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return sendBadRequestResponse(res, "Invalid product ID!");
        }

        const wishlist = await wishlistModel.findOne({ userId });
        if (!wishlist) return sendNotFoundResponse(res, "Wishlist not found!");

        const exists = wishlist.items.some(
            (item) => item.productId.toString() === productId
        );
        if (!exists) {
            return sendNotFoundResponse(res, "Product not found in wishlist!");
        }

        wishlist.items = wishlist.items.filter(
            (item) => item.productId.toString() !== productId
        );
        await wishlist.save();

        return sendSuccessResponse(res, "✅ Product removed from wishlist!", wishlist);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}
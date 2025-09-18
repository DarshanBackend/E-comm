import mongoose from "mongoose";
import Product from "../model/product.model.js";
import sellerModel from "../model/seller.model.js";
import { ThrowError } from "../utils/Error.utils.js";
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js";

export const createProduct = async (req, res) => {
    try {
        const {
            brand,
            title,
            mainCategory,
            category,
            subCategory,
            description,
            productDetails,
            shippingReturn,
            warrantySupport
        } = req.body;

        const sellerId = req.user?._id;

        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return sendBadRequestResponse(res, "Invalid or missing seller ID. Please login first!");
        }

        if (!title || !mainCategory || !category || !subCategory) {
            return sendBadRequestResponse(res, "title, mainCategory, category and subCategory are required!");
        }

        if (!mongoose.Types.ObjectId.isValid(mainCategory)) {
            return sendBadRequestResponse(res, "Invalid mainCategory ID!");
        }
        if (!mongoose.Types.ObjectId.isValid(category)) {
            return sendBadRequestResponse(res, "Invalid category ID!");
        }
        if (!mongoose.Types.ObjectId.isValid(subCategory)) {
            return sendBadRequestResponse(res, "Invalid subCategory ID!");
        }

        if (productDetails) {
            const { material, fit, closure, weight } = productDetails;
            if (material && typeof material !== "string") return sendBadRequestResponse(res, "Material must be a string!");
            if (fit && typeof fit !== "string") return sendBadRequestResponse(res, "Fit must be a string!");
            if (closure && typeof closure !== "string") return sendBadRequestResponse(res, "Closure must be a string!");
            if (weight && typeof weight !== "string") return sendBadRequestResponse(res, "Weight must be a string!");
        }

        if (warrantySupport?.customerSupport) {
            const { email, phone, available } = warrantySupport.customerSupport;
            if (email && typeof email !== "string") return sendBadRequestResponse(res, "Customer support email must be a string!");
            if (phone && typeof phone !== "string") return sendBadRequestResponse(res, "Customer support phone must be a string!");
            if (available && typeof available !== "string") return sendBadRequestResponse(res, "Customer support availability must be a string!");
        }

        const seller = await sellerModel.findById(sellerId);
        if (!seller) {
            return sendNotFoundResponse(res, "Seller not found or unauthorized!");
        }

        const existingProduct = await Product.findOne({ title, sellerId, category });
        if (existingProduct) {
            return sendBadRequestResponse(res, "This product is already added!");
        }

        const newProduct = await Product.create({
            sellerId,
            brand,
            title,
            mainCategory,
            category,
            subCategory,
            description,
            productDetails,
            shippingReturn,
            warrantySupport
        });

        await sellerModel.findByIdAndUpdate(
            sellerId,
            { $push: { products: newProduct._id } },
            { new: true }
        );

        return sendSuccessResponse(res, "✅ Product created successfully!", newProduct);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
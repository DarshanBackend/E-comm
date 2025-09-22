import mongoose from "mongoose";
import cartModel from "../model/cart.model.js";
import productModel from "../model/product.model.js";
import ProductVariant from "../model/productvarient.model.js";
import { sendSuccessResponse, sendErrorResponse, sendBadRequestResponse, sendNotFoundResponse } from "../utils/Response.utils.js";


export const toggleCartItemController = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { productId } = req.params;
        const { productVarientId, quantity = 1 } = req.body;

        // === Validation ===
        if (!mongoose.Types.ObjectId.isValid(productId))
            return sendBadRequestResponse(res, "Invalid product ID");
        if (!mongoose.Types.ObjectId.isValid(productVarientId))
            return sendBadRequestResponse(res, "Invalid product variant ID");

        // === Product & Variant Check ===
        const product = await productModel.findById(productId);
        if (!product) return sendNotFoundResponse(res, "Product not found");

        const variant = await ProductVariant.findOne({ _id: productVarientId, productId });
        if (!variant) return sendNotFoundResponse(res, "Product variant not found");

        // === Cart Check ===
        let cart = await cartModel.findOne({ userId });
        if (!cart) cart = new cartModel({ userId, items: [] });

        // === Toggle logic ===
        const itemIndex = cart.items.findIndex(
            (item) => item.productId.toString() === productId && item.productVarientId.toString() === productVarientId
        );

        if (itemIndex > -1) {
            // Item exists → remove it
            cart.items.splice(itemIndex, 1);
        } else {
            // Item does not exist → add it
            cart.items.push({
                productId: new mongoose.Types.ObjectId(productId),
                productVarientId: new mongoose.Types.ObjectId(productVarientId),
                quantity: Number(quantity),
            });
        }

        await cart.save();
        await cart.populate([
            { path: "items.productId", select: "productName description brand mainCategory category subCategory" },
            { path: "items.productVarientId", select: "size color price stock" },
        ]);

        // === Calculate totalAmount ===
        let totalAmount = 0;
        cart.items.forEach((i) => {
            if (i.productVarientId?.price) {
                const { original, discounted } = i.productVarientId.price;
                const effectivePrice = discounted && discounted > 0 ? discounted : original;
                totalAmount += effectivePrice * i.quantity;
            }
        });

        return sendSuccessResponse(res, itemIndex > -1 ? "Removed from cart" : "Added to cart", {
            items: cart.items,
            totalAmount
        });

    } catch (err) {
        console.error("Toggle cart item error:", err);
        return sendErrorResponse(res, 500, "Error toggling cart item", err.message);
    }
};

export const getMyCartController = async (req, res) => {
    try {
        const { id: userId } = req.user;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return sendBadRequestResponse(res, "User ID not found or invalid!");
        }

        const cart = await cartModel.findOne({ userId })
            .populate("userId", "-password -__v")
            .populate({ path: "items.productId", select: "productName description brand mainCategory category subCategory" })
            .populate({ path: "items.productVarientId", select: "size color price stock" });

        if (!cart) return sendNotFoundResponse(res, "User cart not found");

        if (cart.items.length === 0) {
            return sendSuccessResponse(res, "Cart is empty! Please add products first.", { items: [], totalAmount: 0 });
        }

        let totalAmount = 0;
        const updatedItems = cart.items.map((item) => {
            const product = item.productId?.toObject?.() || item.productId;
            const variant = item.productVarientId?.toObject?.() || item.productVarientId;

            if (variant?.price) {
                const { original, discounted } = variant.price;
                const effectivePrice = discounted && discounted > 0 ? discounted : original;
                totalAmount += effectivePrice * item.quantity;
            }

            return {
                ...item.toObject(),
                productId: product,
                productVarientId: variant
            };
        });

        return sendSuccessResponse(res, "My cart items fetched successfully", { items: updatedItems, totalAmount });
    } catch (error) {
        console.error(`Error during getMyCartController: ${error.message}`);
        return sendErrorResponse(res, 500, "Error fetching cart", error.message);
    }
};
import mongoose from "mongoose";
import Order from "../model/order.model.js";
import Product from "../model/product.model.js";
import ProductVariant from "../model/productvarient.model.js";
import { sendErrorResponse, sendSuccessResponse } from "../utils/Response.utils.js";
import { nanoid } from "nanoid";
import orderModel from "../model/order.model.js";
import UserModel from "../model/user.model.js";
import sellerModel from "../model/seller.model.js";

export const newOrderController = async (req, res) => {
    try {
        const { id: userId } = req?.user;
        console.log("User ID:", userId);
        const {
            productId,
            variantId,
            quantity,
            price,
            sku,
            billingAddressId,
            method,
        } = req?.body;

        if (!productId || !variantId || !quantity || !price || !sku) {
            return sendErrorResponse(res, 400, "Missing required product details");
        }
        if (!billingAddressId && !mongoose.Types.ObjectId.isValid(billingAddressId)) {
            return sendErrorResponse(res, 400, "Billing addressID is required");
        }
        const isBillingExist = await UserModel.findOne({ _id: userId });
        if (!isBillingExist) {
            return sendErrorResponse(res, 404, "Billing address not found");
        }

        if (!method) {
            return sendErrorResponse(res, 400, "Payment method is required");
        }

        const product = await Product.findById(productId);
        if (!product) {
            return sendErrorResponse(res, 404, "Product not found");
        }

        const variant = await ProductVariant.findById(variantId);
        if (!variant) {
            return sendErrorResponse(res, 404, "Product variant not found");
        }

        const sellerId = product.sellerId;


        let totalAmount = quantity * price;

        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const orderId = `ORD-${datePart}-${nanoid(6)}`;


        const newOrder = await Order.create({
            orderId,
            userId,
            sellerId,
            products: [
                {
                    productId,
                    variantId,
                    quantity,
                    price,
                    sku,
                },
            ],
            totalAmount,
            couponCode: null,
            isCouponApplied: false,

            deliveryAddress: billingAddressId,

            payment: {
                method,
                status: method === "COD" ? "Pending" : "Paid",
            },
        });
        newOrder.save();

        const seller = await sellerModel.findByIdAndUpdate({ _id: sellerId }, {
            $push: {
                orders: newOrder._id
            }
        });

        return sendSuccessResponse(res, 201, "Order placed successfully", newOrder);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Error during new order placement", error.message);
    }
};

export const myOrderController = async (req, res) => {
    try {
        const { id } = req?.user;
        if (!id && !mongoose.Types.ObjectId.isValid(id)) {
            return sendErrorResponse(res, 400, "UserID is required");
        }

        const orders = await orderModel.find().populate("userId");
        const populatedOrders = orders.map(order => {
            const user = order.userId;
            const deliveryAddress = user.billingaddress.find(addr =>
                addr._id.toString() === order.deliveryAddress.toString()
            );

            return {
                ...order.toObject(),
                deliveryAddress
            };
        });


        if (!orders || orders.length === 0) {
            return sendErrorResponse(res, 404, "No orders found for this user");
        }
        return sendSuccessResponse(res, "User orders fetched successfully", orders);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Error during fetching user orders", error.message);
    }
}

export const getAllOrders = async (req, res) => {
    try {

    } catch (err) {
        console.log(err);
        return sendErrorResponse(res, 500, "Error during getAllOrders", err);
    }
}

export const getSellerAllOrdersController = async (req, res) => {
    try {
        const { _id: sellerId } = req?.user;
        if (!sellerId && !mongoose.Types.ObjectId.isValid(sellerId)) {
            return sendErrorResponse(res, 400, "SellerID is required");
        }
        const orders = await orderModel.find({ sellerId }).populate("userId");
        const populatedOrders = orders.map(order => {
            const user = order.userId;
            const deliveryAddress = user.billingaddress.find(addr =>
                addr._id.toString() === order.deliveryAddress.toString()
            );
            return {
                ...order.toObject(),
                deliveryAddress
            };
        });

        if (!orders || orders.length === 0) {
            return sendErrorResponse(res, 404, "No orders found for this seller");
        }
        return sendSuccessResponse(res, "Seller orders fetched successfully", orders);
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Error during getSellerAllOrdersController", error);
    }
}

export const updateOrderStatusController = async (req, res) => {
    try {
        const { orderId } = req?.params;
        const { status } = req?.body;
        if (!orderId && !mongoose.Types.ObjectId.isValid(orderId)) {
            return sendErrorResponse(res, 400, "OrderID is required");
        }
        if (!status) {
            return sendErrorResponse(res, 400, "Status is required");
        }
        const order = await orderModel.findById(orderId);
        if (!order) {
            return sendErrorResponse(res, 404, "Order not found");
        }
        order.orderStatus = status;
        await order.save();
        return sendSuccessResponse(res, "Order status updated successfully", order);

    } catch (error) {
        console.log(error.message);
        return sendErrorResponse(res, 500, "Error during updateOrderStatusController", error.message);
    }
}

export const cancelMyOrderController = async (req, res) => {
    try {
        const { orderId } = req?.params;
        const { id: userId } = req?.user;
        if (!orderId && !mongoose.Types.ObjectId.isValid(orderId)) {
            return sendErrorResponse(res, 400, "OrderID is required");
        }
        const order = await orderModel.findById(orderId);
        if (!order) {
            return sendErrorResponse(res, 404, "Order not found");
        }
        if (order.userId.toString() !== userId) {
            return sendErrorResponse(res, 403, "You are not authorized to cancel this order");
        }
        if (order.orderStatus === "Cancelled") {
            return sendErrorResponse(res, 400, "Order is already cancelled");
        }
        order.orderStatus = "Cancelled";
        await order.save();
        return sendSuccessResponse(res, "Order cancelled successfully", order);
    } catch (error) {
        console.log(error.message);
        return sendErrorResponse(res, 500, "Error during cancelMyOrderController", error.message);
    }
};

export const orderSummeryController = async (req, res) => {
    try {
        const { id: userId } = req?.user;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return sendErrorResponse(res, 400, "Valid UserID is required");
        }

        // Fetch user's orders
        const orders = await orderModel
            .find({ userId })
            .populate({ path: "products.productId", model: "Product" })
            .populate({ path: "products.variantId", model: "ProductVariant" });

        if (!orders || orders.length === 0) {
            return sendErrorResponse(res, 404, "No orders found for this user");
        }

        // Flatten all products across orders
        const allProducts = orders.flatMap(order => order.products);

        // Calculate totals
        const totalItems = allProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);

        const subtotal = allProducts.reduce(
            (sum, p) => sum + ((p.price || 0) * (p.quantity || 0)),
            0
        );

        // Example fees
        const estimatedDelivery = 100; // AU$
        const platformFee = 13;        // AU$
        const total = subtotal + estimatedDelivery + platformFee;

        const summary = {
            items: totalItems,
            subtotal,
            estimatedDelivery,
            platformFee,
            total
        };

        return sendSuccessResponse(res, "Order summary fetched successfully", summary);

    } catch (error) {
        console.error(error.message);
        return sendErrorResponse(res, 500, "Error during orderSummeryController", error.message);
    }
};


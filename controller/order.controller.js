import mongoose from "mongoose";
import Order from "../model/order.model.js";
import Product from "../model/product.model.js";
import ProductVariant from "../model/productvarient.model.js";
import { sendBadRequestResponse, sendErrorResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js";
import { nanoid } from "nanoid";
import orderModel from "../model/order.model.js";
import UserModel from "../model/user.model.js";
import sellerModel from "../model/seller.model.js";
import couponModel from "../model/coupon.model.js";

const roundToTwo = (num) => Math.round(num * 100) / 100;

export const newOrderController = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const { id: userId } = req?.user;
        const {
            productId,
            variantId,
            quantity,
            couponCode,
            isCouponApplied,
            sku,
            billingAddressId,
            method,
        } = req.body;

        // --- Validations ---
        if (!productId || !variantId || !quantity || !sku) {
            return sendErrorResponse(res, 400, "Missing required product details");
        }
        if (!billingAddressId || !mongoose.Types.ObjectId.isValid(billingAddressId)) {
            return sendErrorResponse(res, 400, "Valid billing address ID is required");
        }
        if (!["COD", "Card", "UPI", "PayPal", "Bank"].includes(method)) {
            return sendErrorResponse(res, 400, "Invalid payment method");
        }
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return sendErrorResponse(res, 400, "Invalid user ID");
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
            return sendErrorResponse(res, 400, "Quantity must be a positive integer");
        }

        // --- Fetch DB records ---
        const user = await UserModel.findById(userId).session(session);
        if (!user) return sendErrorResponse(res, 404, "User not found");

        const billingAddress = user.billingaddress.id(billingAddressId);
        if (!billingAddress) return sendErrorResponse(res, 404, "Billing address not found");

        const product = await Product.findById(productId).session(session);
        if (!product) return sendErrorResponse(res, 404, "Product not found");

        const variant = await ProductVariant.findById(variantId).session(session);
        if (!variant) return sendErrorResponse(res, 404, "Product variant not found");

        if (variant.productId.toString() !== productId) {
            return sendErrorResponse(res, 400, "Variant does not belong to product");
        }
        if (variant.stock < quantity) {
            return sendErrorResponse(res, 400, `Insufficient stock. Available: ${variant.stock}`);
        }
        if (variant.sku !== sku) {
            return sendErrorResponse(res, 400, "SKU does not match variant");
        }

        // --- Prepare product object ---
        const orderProduct = {
            productId,
            variantId,
            sku: variant.sku,
            name: product.name,
            quantity,
            price: variant.price.original,
        };
        const unitPrice = Number(variant.price.original);
        if (isNaN(unitPrice)) {
            return sendErrorResponse(res, 400, "Invalid variant price");
        }

        // --- Coupon logic ---
        let discountAmount = 0;
        const productSubtotal = roundToTwo(unitPrice * quantity);

        if (isCouponApplied && couponCode) {
            const coupon = await couponModel.findOne({ code: couponCode.toUpperCase() }).session(session);
            if (!coupon) return sendErrorResponse(res, 400, "Invalid coupon code");
            if (!coupon.isActive) return sendErrorResponse(res, 400, "Coupon is inactive");
            if (coupon.expiryDate < new Date()) return sendErrorResponse(res, 400, "Coupon expired");
            if (coupon.minOrderValue > productSubtotal) {
                return sendErrorResponse(res, 400, `Minimum order value is ₹${coupon.minOrderValue}`);
            }
            if (coupon.sellerId && coupon.sellerId.toString() !== product.sellerId.toString()) {
                return sendErrorResponse(res, 400, "Coupon not valid for this seller");
            }

            const discountValue = Number(coupon.discountValue || 0);
            if (discountValue > 0) {
                if (coupon.discountType === "percentage") {
                    discountAmount = roundToTwo((discountValue / 100) * productSubtotal);
                    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                        discountAmount = Number(coupon.maxDiscount);
                    }
                } else if (coupon.discountType === "fixed") {
                    discountAmount = Math.min(discountValue, productSubtotal);
                }
            }

            // Track usage
            await couponModel.findByIdAndUpdate(
                coupon._id,
                { $addToSet: { usedBy: userId } },
                { session }
            );
        }

        const totalAmount = roundToTwo(productSubtotal - discountAmount);

        // --- Delivery ---
        const deliveryExpected = new Date();
        deliveryExpected.setDate(deliveryExpected.getDate() + 7);

        // --- Create Order ---
        const newOrder = new Order({
            userId,
            sellerId: product.sellerId,
            products: [orderProduct],
            discountAmount,
            couponCode: couponCode || null,
            isCouponApplied: !!(isCouponApplied && couponCode),
            totalAmount,
            deliveryAddress: { ...billingAddress.toObject() }, // snapshot
            deliveryExpected,
            payment: {
                method,
                status: method === "COD" ? "Pending" : "Paid",
                transactionId: method !== "COD" ? `TXN-${Date.now()}-${nanoid(8)}` : null,
            },
        });

        const savedOrder = await newOrder.save({ session });

        // --- Update stock & seller ---
        const stockUpdate = await ProductVariant.updateOne(
            { _id: variantId, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { session }
        );
        if (stockUpdate.modifiedCount === 0) {
            throw new Error("Stock update failed due to concurrency");
        }

        await sellerModel.findByIdAndUpdate(
            product.sellerId,
            { $push: { orders: savedOrder._id } },
            { session }
        );

        await session.commitTransaction();

        return sendSuccessResponse(res, 201, "Order placed successfully", {
            orderId: savedOrder._id,
            totalAmount: savedOrder.totalAmount,
            payment: savedOrder.payment,
            products: savedOrder.products,
            deliveryExpected: savedOrder.deliveryExpected,
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Order Error:", error);
        return sendErrorResponse(res, 500, "Error placing order", error.message);
    } finally {
        session.endSession();
    }
};

export const myOrderController = async (req, res) => {
    try {
        const { id: userId } = req?.user;

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return sendErrorResponse(res, 400, "Valid UserID is required");
        }

        // Fetch orders for this user and populate user details
        const orders = await orderModel.find({ userId }).populate("userId").sort({ createdAt: -1 });

        if (!orders || orders.length === 0) {
            return sendErrorResponse(res, 404, "No orders found for this user");
        }

        // Map orders to include the delivery address object
        const formattedOrders = orders.map((order) => {
            const user = order.userId;
            const deliveryAddress = user?.billingaddress?.find(
                (addr) => addr._id.toString() === order.deliveryAddress.toString()
            );

            return {
                _id: order._id,
                orderId: order.orderId,
                products: order.products,
                billingAmount: order.billingAmount,
                discountAmount: order.discountAmount,
                totalAmount: order.totalAmount,
                couponCode: order.couponCode,
                isCouponApplied: order.isCouponApplied,
                orderStatus: order.orderStatus,
                deliveryExpected: order.deliveryExpected,
                createdAt: order.createdAt,
                orderInstruction: order.orderInstruction,
                payment: order.payment,
                deliveryAddress: deliveryAddress || null,
            };
        });

        return sendSuccessResponse(res, "User orders fetched successfully", {
            orders: formattedOrders,
        });

    } catch (error) {
        console.error("Error fetching user orders:", error);
        return sendErrorResponse(res, 500, "Error fetching user orders", error.message);
    }
};


export const getAllOrders = async (req, res) => {
    try {
        const orders = await orderModel.find().populate("userId").populate("sellerId").sort({ createdAt: -1 });
        if (!orders || orders.length === 0) {
            return sendErrorResponse(res, 404, "No orders found");
        }
        return sendSuccessResponse(res, "All orders fetched successfully", orders);
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
        const { orderId } = req.params;
        const { id: userId } = req.user;
        const { reasonForCancel, comment } = req.body;

        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            return sendErrorResponse(res, 400, "Valid OrderID is required");
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
        order.reasonForCancel = reasonForCancel;
        order.comment = comment;

        await order.save();

        return sendSuccessResponse(res, "Order cancelled successfully", order);
    } catch (error) {
        console.error(error.message);
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

export const addOrderInstructionsController = async (req, res) => {
    try {
        const { orderId } = req?.params
        const { order_notes } = req?.body;
        if (!order_notes && !req.body && !id) {
            return sendBadRequestResponse(res, "order_notes or userId iS require to Request");
        }

        const orderNotes = await orderModel.findByIdAndUpdate({ _id: orderId }, {
            orderInstruction: order_notes
        }, { new: true });

        if (!orderNotes) {
            return sendNotFoundResponse(res, "Order Not Found");
        }

        return sendSuccessResponse(res, "Order instruction (notes) add successfull", orderNotes);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Error during Add order instruction", error)
    }
}
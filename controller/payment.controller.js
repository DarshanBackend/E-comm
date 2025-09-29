import mongoose from "mongoose";
import { sendErrorResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js";
import orderModel from "../model/order.model.js";
import paymentModel from "../model/payment.model.js";
import cartModel from "../model/cart.model.js";
import PDFDocument from "pdfkit";
import productModel from "../model/product.model.js";

export const makeNewPaymentController = async (req, res) => {
    try {
        const userId = req?.user?.id;
        const {
            orderId,
            paymentMethod,
            transactionId,
            cardDetails,
            paypalDetails,
            bankTransferDetails,
        } = req.body;

        // ✅ Validate required fields
        if (!userId || !orderId || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: userId, orderId, paymentMethod"
            });
        }

        // ✅ Fetch order and check if it belongs to the user
        const order = await orderModel.findOne({ _id: orderId, userId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found or does not belong to user"
            });
        }

        // ✅ Check if payment already exists for this order
        const existingPayment = await paymentModel.findOne({ orderId });
        if (existingPayment) {
            return res.status(409).json({
                success: false,
                message: "Payment already exists for this order"
            });
        }

        // ✅ Use order.totalAmount as the payment amount
        const amount = order.totalAmount;

        // ✅ Create Payment record with initial status "pending"
        let payment = await paymentModel.create({
            userId,
            orderId,
            amount,
            paymentMethod,
            transactionId: transactionId || null,
            cardDetails,
            paypalDetails,
            bankTransferDetails,
            paymentStatus: "pending", // initial state
        });

        // ✅ Remove ordered items from user's cart
        if (order.items && order.items.length > 0) {
            const productIds = order.items.map(item => item.productId);
            const packSizeIds = order.items.map(item => item.packSizeId).filter(Boolean);

            await cartModel.updateOne(
                { userId },
                {
                    $pull: {
                        items: {
                            $or: [
                                { productId: { $in: productIds } },
                                { packSizeId: { $in: packSizeIds } }
                            ]
                        }
                    }
                }
            );
        }

        // ✅ Update order status to pending
        await orderModel.findByIdAndUpdate(orderId, {
            status: "pending",
            paymentStatus: "pending"
        });

        await payment.save();

        // ✅ Update order status to completed
        await orderModel.findByIdAndUpdate(orderId, {
            status: "completed",
            paymentStatus: "completed"
        });

        // ✅ Update sold count for each product in the order
        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.productId,
                    { $inc: { sold: item.quantity || 1 } },
                    { new: true }
                );
                console.log(`✅ Updated sold count for product: ${item.productId}`);
            }
        }

        return res.status(201).json({
            success: true,
            message: "Payment completed successfully & items removed from cart",
            data: {
                paymentId: payment._id,
                orderId: order._id,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                paymentStatus: payment.paymentStatus, // "completed"
                transactionId: payment.transactionId
            },
        });

    } catch (error) {
        console.error("Payment Error:", error);
        return res.status(500).json({
            success: false,
            message: "Payment processing failed",
            error: error.message,
        });
    }
};

export const myPaymentController = async (req, res) => {
    try {
        const userId = req?.user?.id;
        if (!userId) {
            return sendErrorResponse(res, 400, "User ID is required");
        }

        const payments = await paymentModel.find({ userId })
            .populate("userId", "email mobileNo firstName lastName address billingaddress") // include addresses
            .populate({
                path: "orderId",
                select: "-payment -__v -updatedAt",
                populate: [
                    {
                        path: "sellerId",
                        model: "seller",
                        select: "email mobileNo avatar"
                    },
                    {
                        path: "products.productId",
                        model: "Product",
                        select: "mainCategory subCategory title",
                        populate: {
                            path: "brand",
                            model: "Brand",
                            select: "brandName brandImage"
                        }
                    },
                    {
                        path: "products.variantId",
                        model: "ProductVariant",
                        select: "color size price stock"
                    }
                ]
            });

        // Map through payments and manually resolve deliveryAddress
        // const result = payments.map(payment => {
        //     const order = payment.orderId;
        //     if (order && order.userId && Array.isArray(order.userId.address)) {
        //         const address = order.userId.address.id(order.deliveryAddress);
        //         order.deliveryAddress = address || null;
        //     } else {
        //         order.deliveryAddress = null; 
        //     }
        //     return payment;
        // });

        return sendSuccessResponse(res, "User payments fetched", payments);
    } catch (error) {
        console.log(error.message);
        return sendErrorResponse(res, 500, "Server error", error.message);
    }
};

export const getSellerPaymentsController = async (req, res) => {
    try {
        const sellerId = req.user._id;
        if (!sellerId) {
            return res.status(400).json({ success: false, message: "Seller ID is required" });
        }

        // Fetch payments with nested order and items
        const payments = await paymentModel.find()
            .populate("userId", "name email mobileNo")
            .populate({ path: "orderId", select: "-payment" })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: payments.length,
            data: payments
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};


export const downloadInvoiceController = async (req, res) => {
    let doc;
    try {
        const { paymentId } = req.params;

        if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
            return res.status(400).json({ success: false, message: "Valid payment ID is required" });
        }

        const payment = await paymentModel.findById(paymentId)
            .populate({
                path: "userId",
                select: "firstName lastName email billingaddress"
            })
            .populate({
                path: "orderId",
                populate: [
                    { path: "products.productId", select: "title brand mainCategory subCategory" },
                    { path: "products.variantId" }
                ]
            });

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found" });
        }

        // --- PDF Setup ---
        doc = new PDFDocument({ size: "A4", margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=INVOICE_${paymentId}.pdf`);
        doc.pipe(res);

        // ===== Logo & Title =====
        doc
            .fillColor("#2E86C1")
            .fontSize(26)
            .text("CORALBY CHOICE", { align: "left" })
            .moveUp()
            .fontSize(24)
            .text("INVOICE", { align: "right", underline: true });
        doc.moveDown(1.5);

        // ===== Invoice & Customer Info Table =====
        const tableStartX = 50;
        let y = doc.y;

        // Draw Invoice & Customer Info Table
        const invoiceTableWidth = 500;
        const rowHeight = 20;

        const user = payment.userId;
        const addr = user.billingaddress?.[0];

        const invoiceData = [
            ["Invoice ID", payment._id.toString()],
            ["Payment Method", payment.paymentMethod],
            ["Payment Status", payment.paymentStatus],
            ["Payment Date", new Date(payment.paymentDate).toLocaleDateString()],
            ["Customer Name", `${user.firstName} ${user.lastName}`],
            ["Email", user.email],
        ];

        if (addr) {
            invoiceData.push(
                ["Address", `${addr.firstName} ${addr.lastName}, ${addr.address}, ${addr.city}, ${addr.state} - ${addr.zipcode}`],
                ["Phone", addr.phone]
            );
        }

        // Draw table header background
        doc.fillColor("#1E90FF");
        invoiceData.forEach((row, i) => {
            doc.rect(tableStartX, y, invoiceTableWidth, rowHeight).fillOpacity(0.1).fill("#1E90FF").fillOpacity(1);

            doc.fillColor("#000").fontSize(12).font("Helvetica-Bold")
                .text(row[0], tableStartX + 5, y + 5, { width: 150, align: "left" });
            doc.font("Helvetica").text(row[1], tableStartX + 160, y + 5, { width: 335, align: "left" });

            // Draw borders
            doc.rect(tableStartX, y, invoiceTableWidth, rowHeight).stroke();

            y += rowHeight;
        });

        y += 20; // Space before products table

        // ===== Products Table =====
        const products = payment.orderId.products;
        const tableColWidths = { no: 50, product: 220, qty: 60, price: 80, subtotal: 90 };
        const tableWidth = tableColWidths.no + tableColWidths.product + tableColWidths.qty + tableColWidths.price + tableColWidths.subtotal;

        // Header
        const headers = ["No", "Product", "Qty", "Price", "Subtotal"];
        let x = tableStartX;

        // Draw header background
        doc.fillColor("#1E90FF").font("Helvetica-Bold").fontSize(12);
        headers.forEach((header, index) => {
            const w = Object.values(tableColWidths)[index];
            doc.rect(x, y, w, rowHeight).fillOpacity(0.2).fill("#1E90FF").fillOpacity(1);
            doc.fillColor("#000").text(header, x + 5, y + 5, { width: w - 10, align: "left" });
            x += w;
        });

        // Draw header border
        x = tableStartX;
        Object.values(tableColWidths).forEach(w => {
            doc.rect(x, y, w, rowHeight).stroke();
            x += w;
        });

        y += rowHeight;

        // Rows
        products.forEach((item, index) => {
            const product = item.productId;
            const variant = item.variantId;

            // Alternating row background
            if (index % 2 === 0) {
                doc.rect(tableStartX, y, tableWidth, rowHeight).fillOpacity(0.05).fill("#1E90FF").fillOpacity(1);
            }

            x = tableStartX;
            const rowValues = [
                index + 1,
                `${product.title} (${variant.color || "N/A"}, Size: ${variant.size || "N/A"})`,
                item.quantity,
                `${variant.price.original || 0} ${variant.price.currency || "AUD"}`,
                `${item.subtotal || 0} ${variant.price.currency || "AUD"}`
            ];

            rowValues.forEach((val, i) => {
                const w = Object.values(tableColWidths)[i];
                doc.fillColor("#000").font("Helvetica").fontSize(12).text(val.toString(), x + 5, y + 5, { width: w - 10, align: "left" });
                doc.rect(x, y, w, rowHeight).stroke();
                x += w;
            });

            y += rowHeight;
        });
        y += 20;

        // ===== Totals Table =====
        const totalsData = [
            ["Billing Amount", `${payment.orderId.billingAmount || 0} AUD`],
            ["Discount", `${payment.orderId.discountAmount || 0} AUD`],
            ["Coupon", payment.orderId.couponCode || "N/A`"],
            ["Total Amount", `${payment.amount || 0} AUD`]
        ];

        totalsData.forEach((row, i) => {
            const isTotal = row[0] === "Total Amount";
            const rowHeightTotal = 20;

            // Background for total
            if (isTotal) doc.rect(tableStartX + 300, y, 200, rowHeightTotal).fillOpacity(0.1).fill("#228B22").fillOpacity(1);

            doc.fillColor("#000").font(isTotal ? "Helvetica-Bold" : "Helvetica").fontSize(12)
                .text(row[0], tableStartX + 300 + 5, y + 5, { width: 100, align: "left" })
                .text(row[1], tableStartX + 400 + 5, y + 5, { width: 100, align: "left" });

            // Border
            doc.rect(tableStartX + 300, y, 200, rowHeightTotal).stroke();

            y += rowHeightTotal;
        });

        doc.end();

    } catch (error) {
        if (doc) doc.end();
        console.error("Invoice error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const paymentStatusChangeController = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { paymentStatus } = req.body;

        // ✅ Validate paymentId
        if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
            return res.status(400).json({
                success: false,
                message: "Valid payment ID is required"
            });
        }

        // ✅ Validate paymentStatus
        const allowedStatuses = ["pending", "completed", "failed", "refunded"];
        if (!paymentStatus || !allowedStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: `Payment status must be one of: ${allowedStatuses.join(", ")}`
            });
        }

        // ✅ Find payment
        const payment = await paymentModel.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }
        // if(paymentStatus === "completed"){
        //     await productModel        }
        // ✅ Update payment status
        payment.paymentStatus = paymentStatus;
        await payment.save();

        // ✅ Update linked order status
        const order = await orderModel.findById(payment.orderId);
        if (order) {
            if (paymentStatus === "completed") {
                order.status = "completed";
                order.paymentStatus = "completed";

                // ✅ Update sold count for each product
                if (order.items && order.items.length > 0) {
                    for (const item of order.items) {
                        await Product.findByIdAndUpdate(
                            item.productId,
                            { $inc: { sold: item.quantity || 1 } },
                            { new: true }
                        );
                        console.log(`✅ Sold count updated for product: ${item.productId}`);
                    }
                }
            } else if (paymentStatus === "failed") {
                order.status = "cancelled";
                order.paymentStatus = "failed";
            } else if (paymentStatus === "refunded") {
                order.status = "refunded";
                order.paymentStatus = "refunded";
            } else {
                order.status = "pending";
                order.paymentStatus = "pending";
            }

            await order.save();
        }

        return res.status(200).json({
            success: true,
            message: `Payment status updated to ${paymentStatus}`,
            payment,
            order
        });

    } catch (error) {
        console.error("Payment Status Change Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};
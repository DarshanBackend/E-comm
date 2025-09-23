import mongoose from "mongoose";
import { nanoid } from "nanoid"; // lightweight package for unique IDs

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: false,
  },

  userId: {
    type: mongoose.Types.ObjectId,
    ref: "user",
    required: [true, "userId is required"],
  },
  sellerId: {
    type: mongoose.Types.ObjectId,
    ref: "seller",
    required: [true, "sellerId is required"],
  },

  products: [
    {
      productId: { type: mongoose.Types.ObjectId, ref: "Product" },
      variantId: { type: mongoose.Types.ObjectId, ref: "ProductVariant" },
      quantity: { type: Number, required: true, default: 1 },
      price: { type: Number, required: true },
      sku: { type: String, required: true },
    }
  ],

  totalAmount: { type: Number, default: 0 },
  couponCode: { type: String, default: null },
  isCouponApplied: { type: Boolean, default: false },

  deliveryAddress: {
    type: mongoose.Types.ObjectId,
    ref: "user.selectedBillingAddress",
    default: null
  },

  orderStatus: {
    type: String,
    enum: [
      "Order Confirmed",
      "Processing",
      "Shipped Expected",
      "Out For Delivery",
      "Delivered",
      "Cancelled"
    ],
    default: "Order Confirmed",
  },

  timeline: {
    confirmedAt: { type: Date, default: Date.now },
    processingAt: { type: Date },
    shippedAt: { type: Date },
    outForDeliveryAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
  },

  deliveryExpected: { type: Date },

  payment: {
    method: {
      type: String,
      enum: ["COD", "Card", "UPI", "PayPal", "Bank"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    transactionId: { type: String },
  },
}, { timestamps: true });


orderSchema.pre("save", function (next) {
  if (this.isNew && !this.orderId) {
    // Generate unique orderId → example: ORD-20250923-5fGh7K
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    this.orderId = `ORD-${datePart}-${nanoid(6)}`;
  }

  if (this.isModified("orderStatus")) {
    const now = new Date();
    switch (this.orderStatus) {
      case "Order Confirmed":
        this.timeline.confirmedAt = now;
        break;
      case "Processing":
        this.timeline.processingAt = now;
        break;
      case "Shipped Expected":
        this.timeline.shippedAt = now;
        break;
      case "Out For Delivery":
        this.timeline.outForDeliveryAt = now;
        break;
      case "Delivered":
        this.timeline.deliveredAt = now;
        break;
      case "Cancelled":
        this.timeline.cancelledAt = now;
        break;
    }
  }
  next();
});

export default mongoose.model("Order", orderSchema);

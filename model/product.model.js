import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  brand: { type: String },
  title: { type: String, required: true },

  mainCategory: { type: mongoose.Schema.Types.ObjectId, ref: "MainCategory", required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required: true },

  description: { type: String },

  rating: {
    average: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 }
  },

  productDetails: {
    material: { type: String },
    fit: { type: String },
    closure: { type: String },
    weight: { type: String },
    careInstructions: { type: String },
    origin: { type: String },
    additionalFeatures: [{ type: String }],
  },

  shippingReturn: {
    freeShipping: { type: String },
    returnPolicy: { type: String },
    internationalShipping: { type: String },
    packaging: { type: String },
    deliveryTracking: { type: String },
    orderProcessing: { type: String }
  },

  warrantySupport: {
    warranty: { type: String },
    careTips: { type: String },
    customerSupport: {
      email: { type: String },
      phone: { type: String },
      available: { type: String }
    },
    faqs: [{ type: String }]
  },

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Product", productSchema);

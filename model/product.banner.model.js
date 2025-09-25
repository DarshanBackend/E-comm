import mongoose from "mongoose";

const productBannerSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
      index: true,
    },
    bannerDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: [300, "Banner description cannot exceed 300 characters"],
    },
    bannerImages: {
      type: [String],
      validate: [
        {
          validator: function (v) {
            return v.length <= 10;
          },
          message: "You can only add up to 10 images",
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const ProductBanner = mongoose.model("ProductBanner", productBannerSchema);

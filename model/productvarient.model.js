const productVariantSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

    sku: { type: String, unique: true },

    images: [String],

    color: { type: String, required: true },
    size: { type: String, required: true },

    price: {
        original: { type: Number, required: true },
        discounted: { type: Number },
        currency: { type: String, default: "AUD" }
    },

    stock: { type: Number, default: 0 },
    weight: { type: String },

}, { timestamps: true });

export const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);

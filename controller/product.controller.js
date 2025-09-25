import mongoose from "mongoose";
import Product from "../model/product.model.js";
import sellerModel from "../model/seller.model.js";
import MainCategoryModel from "../model/mainCategory.model.js";
import CategoryModel from "../model/category.model.js";
import SubCategoryModel from "../model/subCategory.model.js";
import ProductVariant from "../model/productvarient.model.js";
import { ThrowError } from "../utils/Error.utils.js";
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js";
import brandModel from "../model/brand.model.js";
import productModel from "../model/product.model.js";
import Wishlist from '../model/wishlist.model.js';

// Assign badges: NEW, TRENDING, TOP RATED
export const assignBadges = async () => {
    try {
        // ===== 1️⃣ NEW BADGE (Last 3 products per seller) =====
        const sellers = await Product.distinct("sellerId");

        for (let sellerId of sellers) {
            // Get last 3 products for this seller, sorted by createdAt descending
            const last3 = await Product.find({ sellerId })
                .sort({ createdAt: -1 })
                .limit(3);

            for (let p of last3) {
                // Assign NEW only if badge is null (preserve manual badges)
                if (!p.badge) {
                    p.badge = "NEW";
                    await p.save();
                }
            }
        }

        // ===== 2️⃣ TRENDING BADGE (Based on sales) =====
        const orders = await OrderModal.find();
        const productSalesCount = {};

        orders.forEach((order) => {
            order.items?.forEach((item) => {
                const productId = item._id.toString();
                const quantity = item.qty || 1;
                productSalesCount[productId] = (productSalesCount[productId] || 0) + quantity;
            });
        });

        const topSellingIds = Object.entries(productSalesCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([id]) => id);

        for (let id of topSellingIds) {
            const p = await Product.findById(id);
            // Only assign TRENDING if badge is null
            if (p && !p.badge) {
                p.badge = "TRENDING";
                await p.save();
            }
        }

        // ===== 3️⃣ TOP RATED BADGE =====
        const topRatedProducts = await Product.find({ "rating.average": { $gt: 0 } })
            .sort({ "rating.average": -1 })
            .limit(10);

        for (let p of topRatedProducts) {
            if (!p.badge) {
                p.badge = "TOP RATED";
                await p.save();
            }
        }

        console.log("Badges assigned successfully!");
    } catch (err) {
        console.error("Error assigning badges:", err.message);
    }
};

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
            warrantySupport,
            love_about
        } = req.body;

        const sellerId = req.user?._id;

        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return sendBadRequestResponse(res, "Invalid or missing seller ID. Please login first!");
        }

        const seller = await sellerModel.findById(sellerId).populate("brandId");
        if (!seller) return sendNotFoundResponse(res, "Seller not found or unauthorized!");
        if (!seller.brandId || seller.brandId.length === 0) {
            return sendBadRequestResponse(res, "Please add a brand first before creating a product.");
        }

        let selectedBrand;
        if (brand) {
            const isValidBrand = seller.brandId.some(b => b._id.toString() === brand);
            if (!isValidBrand) {
                return sendBadRequestResponse(res, "This brand does not belong to you!");
            }
            selectedBrand = brand;
        } else {
            selectedBrand = seller.brandId[0]._id;
        }

        if (!title || !mainCategory || !category || !subCategory) {
            return sendBadRequestResponse(res, "title, mainCategory, category and subCategory are required!");
        }

        if (!mongoose.Types.ObjectId.isValid(mainCategory)) return sendBadRequestResponse(res, "Invalid mainCategory ID!");
        if (!mongoose.Types.ObjectId.isValid(category)) return sendBadRequestResponse(res, "Invalid category ID!");
        if (!mongoose.Types.ObjectId.isValid(subCategory)) return sendBadRequestResponse(res, "Invalid subCategory ID!");

        const [mainCatExists, catExists, subCatExists] = await Promise.all([
            MainCategoryModel.findById(mainCategory),
            CategoryModel.findById(category),
            SubCategoryModel.findById(subCategory),
        ]);

        if (!mainCatExists) return sendNotFoundResponse(res, "Main category does not exist!");
        if (!catExists) return sendNotFoundResponse(res, "Category does not exist!");
        if (!subCatExists) return sendNotFoundResponse(res, "Sub category does not exist!");

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

        // ✅ Validate love_about (Required from Seller)
        if (!love_about || !Array.isArray(love_about) || love_about.length === 0) {
            return sendBadRequestResponse(res, "love_about is required and must be a non-empty array!");
        }

        for (const item of love_about) {
            if (typeof item !== 'object' || item === null) {
                return sendBadRequestResponse(res, "Each love_about item must be an object!");
            }
            if (!item.point || typeof item.point !== 'string') {
                return sendBadRequestResponse(res, "Each love_about item must have a 'point' string!");
            }
            // Seller rate not required
        }

        const existingProduct = await Product.findOne({ title, sellerId, category });
        if (existingProduct) return sendBadRequestResponse(res, "This product is already added!");

        const newProduct = await Product.create({
            sellerId,
            brand: selectedBrand,
            title,
            mainCategory,
            category,
            subCategory,
            description,
            productDetails,
            shippingReturn,
            warrantySupport,
            love_about // User will add ratings when reviewing
        });

        await sellerModel.findByIdAndUpdate(
            sellerId,
            { $push: { products: newProduct._id } },
            { new: true }
        );

        const populatedProduct = await Product.findById(newProduct._id)
            .populate("brand", "brandName")
            .populate("mainCategory", "mainCategoryName")
            .populate("category", "categoryName")
            .populate("subCategory", "subCategoryName");

        return sendSuccessResponse(res, "✅ Product created successfully!", populatedProduct);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getAllProduct = async (req, res) => {
    try {
        const product = await Product.find()

        if (!product || !product.length === 0) {
            return sendNotFoundResponse(res, 500, error.message)
        }

        return sendSuccessResponse(res, "Product fetched Successfully...", product)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid ProductId!!!!")
        }

        const exitsProduct = await Product.findById(id)
        if (!exitsProduct) {
            return sendNotFoundResponse(res, "No any Product found!!!")
        }

        return sendSuccessResponse(res, "Product fetched Successfully...", exitsProduct)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            brand,
            title,
            mainCategory,
            category,
            subCategory,
            description,
            productDetails,
            shippingReturn,
            warrantySupport,
            love_about
        } = req.body;

        const sellerId = req.user?._id;

        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return sendBadRequestResponse(res, "Invalid or missing seller ID. Please login first!");
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid product ID!");
        }

        if (!mongoose.Types.ObjectId.isValid(mainCategory)) return sendBadRequestResponse(res, "Invalid mainCategory ID!");
        if (!mongoose.Types.ObjectId.isValid(category)) return sendBadRequestResponse(res, "Invalid category ID!");
        if (!mongoose.Types.ObjectId.isValid(subCategory)) return sendBadRequestResponse(res, "Invalid subCategory ID!");

        const [mainCatExists, catExists, subCatExists] = await Promise.all([
            MainCategoryModel.findById(mainCategory),
            CategoryModel.findById(category),
            SubCategoryModel.findById(subCategory),
        ]);

        if (!mainCatExists) return sendNotFoundResponse(res, "Main category does not exist!");
        if (!catExists) return sendNotFoundResponse(res, "Category does not exist!");
        if (!subCatExists) return sendNotFoundResponse(res, "Sub category does not exist!");

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

        // 🔹 Validate love_about if passed
        if (love_about) {
            if (!Array.isArray(love_about)) {
                return sendBadRequestResponse(res, "love_about must be an array!");
            }

            for (const item of love_about) {
                if (typeof item !== 'object' || item === null) {
                    return sendBadRequestResponse(res, "Each love_about item must be an object!");
                }
                if (!item.point || typeof item.point !== 'string') {
                    return sendBadRequestResponse(res, "Each love_about item must have a 'point' string!");
                }
            }
        }

        const seller = await sellerModel.findById(sellerId);
        if (!seller) {
            return sendNotFoundResponse(res, "Seller not found or unauthorized!");
        }

        const product = await Product.findOne({ _id: id, sellerId });
        if (!product) {
            return sendNotFoundResponse(res, "Product not found or unauthorized!");
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            {
                brand,
                title,
                mainCategory,
                category,
                subCategory,
                description,
                productDetails,
                shippingReturn,
                warrantySupport,
                love_about: love_about || product.love_about // keep existing if not passed
            },
            { new: true, runValidators: true }
        );

        return sendSuccessResponse(res, "✅ Product updated successfully!", updatedProduct);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const updateLoveAboutPoints = async (req, res) => {
    try {
        const { id } = req.params;
        const { updates } = req.body;
        const sellerId = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid product ID!");
        }
        if (!sellerId) return sendBadRequestResponse(res, "Seller ID required!");
        if (!Array.isArray(updates) || updates.length === 0) {
            return sendBadRequestResponse(res, "updates must be a non-empty array!");
        }

        // Find product
        const product = await Product.findOne({ _id: id, sellerId });
        if (!product) return sendNotFoundResponse(res, "Product not found or unauthorized!");

        const updatedItems = [];

        for (const update of updates) {
            const { love_aboutId, point } = update;
            if (!love_aboutId || !point) continue;

            const itemIndex = product.love_about.findIndex(item => item._id.toString() === love_aboutId);
            if (itemIndex === -1) continue;

            product.love_about[itemIndex].point = point;
            updatedItems.push(product.love_about[itemIndex]);
        }

        await product.save();

        return sendSuccessResponse(res, "✅ love_about points updated successfully!", updatedItems);

    } catch (error) {
        console.error('Update Love About Points Error:', error);
        return ThrowError(res, 500, error.message);
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const sellerId = req.user?._id;

        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return sendBadRequestResponse(res, "Invalid or missing seller ID. Please login first!");
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid ProductId")
        }

        const checkProduct = await Product.findById(id)
        if (!checkProduct) {
            return sendNotFoundResponse(res, "Product not found!!!")
        }

        await Product.findByIdAndDelete(id)

        await sellerModel.findByIdAndUpdate(
            sellerId,
            { $pull: { products: checkProduct._id } },
            { new: true }
        );

        return sendSuccessResponse(res, "Product deleted Successfully...", checkProduct)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getProductBySubCategory = async (req, res) => {
    try {
        const { subCategoryId } = req.params;

        if (!subCategoryId || !mongoose.Types.ObjectId.isValid(subCategoryId)) {
            return sendBadRequestResponse(res, "Valid subCategoryId is required!");
        }

        const products = await Product.find({ subCategory: subCategoryId })
            .select("brand title description mainCategory category subCategory");

        if (!products || products.length === 0) {
            return sendNotFoundResponse(res, "No products found for this subCategory!");
        }

        return sendSuccessResponse(res, "✅ Products fetched successfully!", products);

    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

export const getCategoryHierarchy = async (req, res) => {
    try {
        // Fetch all main categories
        const mainCategories = await MainCategoryModel.find().select("_id mainCategoryName");

        // Fetch all categories
        const categories = await CategoryModel.find().select("_id categoryName mainCategoryId");

        // Fetch all subcategories
        const subCategories = await SubCategoryModel.find().select("_id subCategoryName categoryId");

        // Fetch all products
        const products = await Product.find().select("_id title brand description subCategory");

        // Fetch all product variants
        const productVariants = await ProductVariant.find().select("_id productId color size price stock images");

        // Build hierarchy
        const data = mainCategories.map(mainCat => {
            const catList = categories
                .filter(cat => cat.mainCategoryId.toString() === mainCat._id.toString())
                .map(cat => {
                    const subCatList = subCategories
                        .filter(sub => sub.categoryId.toString() === cat._id.toString())
                        .map(sub => {
                            const productList = products
                                .filter(p => p.subCategory.toString() === sub._id.toString())
                                .map(p => {
                                    const variants = productVariants.filter(
                                        v => v.productId.toString() === p._id.toString()
                                    );
                                    return {
                                        _id: p._id,
                                        title: p.title,
                                        brand: p.brand,
                                        description: p.description,
                                        subCategory: p.subCategory,
                                        variants
                                    };
                                });

                            return {
                                _id: sub._id,
                                subCategoryName: sub.subCategoryName,
                                products: productList
                            };
                        });

                    return {
                        _id: cat._id,
                        categoryName: cat.categoryName,
                        subCategories: subCatList
                    };
                });

            return {
                _id: mainCat._id,
                mainCategoryName: mainCat.mainCategoryName,
                categories: catList
            };
        });

        return sendSuccessResponse(res, "✅ Categories hierarchy fetched successfully!", data);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getProductsByBrand = async (req, res) => {
    try {
        const { brandId } = req.params;

        // Validate brandId
        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return sendBadRequestResponse(res, "Invalid brand ID");
        }

        // Check if brand exists
        const brand = await brandModel.findById(brandId).lean();
        if (!brand) {
            return sendNotFoundResponse(res, "Brand not found");
        }

        // Fetch products for this brand
        const products = await Product.find({ brand: brandId, isActive: true })
            .select("title mainCategory category subCategory description")
            .lean();

        return sendSuccessResponse(res, `Products for brand ${brand.brandName} fetched successfully`, {
            brandId: brand._id,
            brandName: brand.brandName,
            brandImage: brand.brandImage || null,
            products
        });

    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

export const getProductAll = async (req, res) => {
    const userId = req.user?.id;

    try {
        // Assign badges before fetching
        await assignBadges();

        // Fetch all products
        const products = await Product.find({ isActive: true })
            .populate("brand")
            .populate("mainCategory")
            .populate("category")
            .populate("subCategory")
            .lean();

        // Fetch default variants
        const productIds = products.map((p) => p._id);
        const variants = await ProductVariant.find({ productId: { $in: productIds } }).lean();

        // Map default variant
        const productData = products.map((p) => {
            const defaultVariant = variants.find(
                (v) => v.productId.toString() === p._id.toString()
            );
            return {
                ...p,
                defaultVariant: defaultVariant || null,
            };
        });

        // Wishlist for user
        let wishlistProductIds = [];
        if (userId) {
            const wishlistItems = await WishlistModal.find({ userId }).select("productId");
            wishlistProductIds = wishlistItems.map((item) => item.productId?.toString());
        }

        const productsWithWishlist = productData.map((product) => ({
            ...product,
            isWishlist: wishlistProductIds.includes(product._id.toString()),
        }));

        return res.status(200).json({
            status: true,
            message: "Products fetched successfully",
            data: productsWithWishlist,
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({
            status: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

export const getSimilarProducts = async (req, res) => {
    try {
        const { productId } = req.params;
        const { limit = 12, fields } = req.query;

        // ✅ Validate productId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return sendBadRequestResponse(res, "Invalid product ID!");
        }

        // ✅ Build dynamic select string
        let selectFields = "";
        if (fields) {
            const parts = fields.split(",");
            parts.forEach(f => {
                if (f.startsWith("+")) {
                    selectFields += " " + f.substring(1); // add field
                } else if (f.startsWith("-")) {
                    selectFields += " -" + f.substring(1); // remove field
                }
            });
        }

        // ✅ Get current product
        const currentProduct = await productModel.findById(productId)
            .select(selectFields || "") // 🔥 dynamic select
            .populate("brand", "brandName brandImage")
            .populate("category", "categoryName")
            .populate("subCategory", "subCategoryName")
            .populate("mainCategory", "mainCategoryName");

        if (!currentProduct) {
            return sendNotFoundResponse(res, "Product not found!");
        }

        // ✅ Get similar products (same subCategory but exclude current one)
        let similarProducts = await productModel.find({
            isActive: true,
            subCategory: currentProduct.subCategory?._id,
            _id: { $ne: currentProduct._id }
        })
            .select(selectFields || "") // 🔥 dynamic select
            .populate("brand", "brandName brandImage")
            .populate("mainCategory", "mainCategoryName")
            .populate("category", "categoryName")
            .populate("subCategory", "subCategoryName")
            .sort({ "rating.average": -1, createdAt: -1 })
            .limit(parseInt(limit));

        // ✅ Attach variants & price (NO filter remove for stock)
        const productsWithVariants = await Promise.all(
            similarProducts.map(async (product) => {
                const variants = await ProductVariant.find({
                    productId: product._id
                })
                    .sort({ "price.original": 1 })
                    .limit(1);

                return {
                    ...product.toObject(),
                    variants,
                    minPrice: variants.length > 0 ? variants[0].price.original : 0,
                    hasStock: variants.length > 0 && variants[0].stock > 0
                };
            })
        );

        // ✅ Final Response
        return sendSuccessResponse(res, "Similar products fetched successfully!", {
            currentProduct: {
                ...currentProduct.toObject(),
                strategy: "Same SubCategory"
            },
            similarProducts: productsWithVariants,
            totalSimilar: productsWithVariants.length
        });

    } catch (error) {
        console.error("Get Similar Products Error:", error);
        return ThrowError(res, 500, "Server error while fetching similar products");
    }
};

export const getMostWishlistedProducts = async (req, res) => {
    try {
        // Aggregate to get products with highest wishlist count
        const mostWishlisted = await Wishlist.aggregate([
            {
                $group: {
                    _id: '$productId',
                    wishlistCount: { $sum: 1 }
                }
            },
            {
                $sort: { wishlistCount: -1 }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$productDetails'
            },
            {
                $project: {
                    _id: '$productDetails._id',
                    name: '$productDetails.name',
                    price: '$productDetails.price',
                    salePrice: '$productDetails.salePrice',
                    images: '$productDetails.images',
                    store: '$productDetails.store',
                    rating: '$productDetails.rating',
                    wishlistCount: 1
                }
            }
        ]);

        return sendSuccessResponse(res, "Most wishlisted products fetched successfully", {
            data: mostWishlisted
        });

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
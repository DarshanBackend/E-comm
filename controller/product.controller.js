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

        // Validate sellerId
        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return sendBadRequestResponse(res, "Invalid or missing seller ID. Please login first!");
        }

        // Fetch seller and their brands
        const seller = await sellerModel.findById(sellerId).populate("brandId");
        if (!seller) return sendNotFoundResponse(res, "Seller not found or unauthorized!");

        // Check if seller has at least one brand
        if (!seller.brandId || seller.brandId.length === 0) {
            return sendBadRequestResponse(res, "Please add a brand first before creating a product.");
        }

        // Use the provided brand or default to the first seller brand
        let selectedBrand;
        if (brand) {
            const isValidBrand = seller.brandId.some(b => b._id.toString() === brand);
            if (!isValidBrand) {
                return sendBadRequestResponse(res, "This brand does not belong to you!");
            }
            selectedBrand = brand;
        } else {
            selectedBrand = seller.brandId[0]._id; // auto select first seller brand
        }

        // Validate required fields
        if (!title || !mainCategory || !category || !subCategory) {
            return sendBadRequestResponse(res, "title, mainCategory, category and subCategory are required!");
        }

        if (!mongoose.Types.ObjectId.isValid(mainCategory)) return sendBadRequestResponse(res, "Invalid mainCategory ID!");
        if (!mongoose.Types.ObjectId.isValid(category)) return sendBadRequestResponse(res, "Invalid category ID!");
        if (!mongoose.Types.ObjectId.isValid(subCategory)) return sendBadRequestResponse(res, "Invalid subCategory ID!");

        // Check categories existence
        const [mainCatExists, catExists, subCatExists] = await Promise.all([
            MainCategoryModel.findById(mainCategory),
            CategoryModel.findById(category),
            SubCategoryModel.findById(subCategory),
        ]);

        if (!mainCatExists) return sendNotFoundResponse(res, "Main category does not exist!");
        if (!catExists) return sendNotFoundResponse(res, "Category does not exist!");
        if (!subCatExists) return sendNotFoundResponse(res, "Sub category does not exist!");

        // Validate productDetails fields
        if (productDetails) {
            const { material, fit, closure, weight } = productDetails;
            if (material && typeof material !== "string") return sendBadRequestResponse(res, "Material must be a string!");
            if (fit && typeof fit !== "string") return sendBadRequestResponse(res, "Fit must be a string!");
            if (closure && typeof closure !== "string") return sendBadRequestResponse(res, "Closure must be a string!");
            if (weight && typeof weight !== "string") return sendBadRequestResponse(res, "Weight must be a string!");
        }

        // Validate customerSupport
        if (warrantySupport?.customerSupport) {
            const { email, phone, available } = warrantySupport.customerSupport;
            if (email && typeof email !== "string") return sendBadRequestResponse(res, "Customer support email must be a string!");
            if (phone && typeof phone !== "string") return sendBadRequestResponse(res, "Customer support phone must be a string!");
            if (available && typeof available !== "string") return sendBadRequestResponse(res, "Customer support availability must be a string!");
        }

        // Check duplicate product
        const existingProduct = await Product.findOne({ title, sellerId, category });
        if (existingProduct) return sendBadRequestResponse(res, "This product is already added!");

        // Create product
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
            warrantySupport
        });

        // Add product to seller
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
            warrantySupport
        } = req.body;

        const sellerId = req.user?._id;

        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return sendBadRequestResponse(res, "Invalid or missing seller ID. Please login first!");
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid product ID!");
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

        const [mainCatExists, catExists, subCatExists] = await Promise.all([
            MainCategoryModel.findById(mainCategory),
            CategoryModel.findById(category),
            SubCategoryModel.findById(subCategory),
        ]);

        if (!mainCatExists) {
            return sendNotFoundResponse(res, "Main category does not exist!");
        }
        if (!catExists) {
            return sendNotFoundResponse(res, "Category does not exist!");
        }
        if (!subCatExists) {
            return sendNotFoundResponse(res, "Sub category does not exist!");
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
                warrantySupport
            },
            { new: true, runValidators: true }
        );

        return sendSuccessResponse(res, "✅ Product updated successfully!", updatedProduct);

    } catch (error) {
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
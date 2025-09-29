import mongoose from "mongoose";
import MainCategoryModel from "../model/mainCategory.model.js";
import { ThrowError } from "../utils/Error.utils.js"
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js"
import { uploadFile } from "../middleware/imageupload.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../utils/aws.config.js";

export const createMainCategory = async (req, res) => {
    try {
        const { mainCategoryName } = req.body;

        if (!mainCategoryName) {
            return sendBadRequestResponse(res, "MainCategoryName are required!!!")
        }

        const checkMainCategory = await MainCategoryModel.findOne({ mainCategoryName })
        if (checkMainCategory) {
            return sendBadRequestResponse(res, "This Category already added...")
        }

        // === Upload mainCategoryImage to S3 ===
        let mainCategoryImage = null;
        const mainFile = req.file || req.files?.mainCategoryImage?.[0];

        if (mainFile) {
            const result = await uploadFile(mainFile);
            mainCategoryImage = result.url;
        }

        // Validate that image is provided (since it's required in schema)
        if (!mainCategoryImage) {
            return sendBadRequestResponse(res, "mainCategoryImage is required!!!")
        }

        // Create main category with image
        const newMainCategory = await MainCategoryModel.create({
            mainCategoryName,
            mainCategoryImage
        })

        return sendSuccessResponse(res, "MainCategory add successfully...", newMainCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllMainCategory = async (req, res) => {
    try {
        const mainCategory = await MainCategoryModel.find({})

        if (!mainCategory || mainCategory.length === 0) {
            return sendNotFoundResponse(res, "No any MainCategory found!!!")
        }

        return sendSuccessResponse(res, "MainCategory fetched Successfully...", mainCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getMainCategoryById = async (req, res) => {
    try {

        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid MainCategoryId!!!")
        }

        const mainCategory = await MainCategoryModel.findById(id)
        if (!mainCategory) {
            return sendNotFoundResponse(res, "MainCategory Not found...")
        }

        return sendSuccessResponse(res, "MainCategory fetched Successfully...", mainCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updateMainCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const { mainCategoryName } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid MainCategoryId!!!");
        }

        const mainCategory = await MainCategoryModel.findById(id);
        if (!mainCategory) {
            return sendNotFoundResponse(res, "MainCategory Not found...");
        }

        // Check if mainCategoryName is being updated and if it already exists
        if (mainCategoryName && mainCategoryName !== mainCategory.mainCategoryName) {
            const existingCategory = await MainCategoryModel.findOne({
                mainCategoryName: { $regex: new RegExp(`^${mainCategoryName}$`, "i") },
                _id: { $ne: id }
            });

            if (existingCategory) {
                return sendBadRequestResponse(res, "This Category name already exists...");
            }
        }

        // === Handle image update ===
        let mainCategoryImage = mainCategory.mainCategoryImage;
        const imageFile = req.files?.mainCategoryImage?.[0];

        if (imageFile) {
            // Delete old image from S3 if exists - DEBUGGING VERSION
            if (mainCategoryImage) {
                try {
                    console.log("🔄 Old Image URL:", mainCategoryImage);

                    // Method 1: Extract key properly
                    const urlParts = mainCategoryImage.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    const oldImageKey = `uploads/${fileName}`;

                    console.log("🔑 Extracted Key:", oldImageKey);

                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: oldImageKey,
                        })
                    );
                    console.log("✅ Deleted old main category image:", oldImageKey);
                } catch (err) {
                    console.error("❌ Failed to delete old image:", err.message);
                    console.error("❌ Error details:", err);
                }
            }

            // Upload new image
            const result = await uploadFile(imageFile);
            mainCategoryImage = result.url;
            console.log("✅ Uploaded new image:", result.key);
        }

        // Update main category
        const updatedMainCategory = await MainCategoryModel.findByIdAndUpdate(
            id,
            {
                mainCategoryName: mainCategoryName || mainCategory.mainCategoryName,
                mainCategoryImage: mainCategoryImage
            },
            { new: true, runValidators: true }
        );

        return sendSuccessResponse(res, "MainCategory updated Successfully...", updatedMainCategory);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteMainCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid MainCategoryId!!!");
        }

        const mainCategory = await MainCategoryModel.findById(id);
        if (!mainCategory) {
            return sendNotFoundResponse(res, "MainCategory Not found...");
        }

        // === Delete main category image from S3 if exists ===
        if (mainCategory.mainCategoryImage) {
            try {
                // Extract key from full URL
                const url = new URL(mainCategory.mainCategoryImage);
                const imageKey = url.pathname.substring(1); // Remove leading slash

                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: imageKey,
                    })
                );
                console.log("🗑️ Deleted main category image:", imageKey);
            } catch (err) {
                console.error("Failed to delete main category image from S3:", err.message);
            }
        }

        // === Delete main category from DB ===
        const deletedMainCategory = await MainCategoryModel.findByIdAndDelete(id);

        return sendSuccessResponse(res, "MainCategory deleted Successfully...", deletedMainCategory);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
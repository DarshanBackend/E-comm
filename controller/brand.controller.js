import mongoose from "mongoose";
import BrandModel from "../model/brand.model.js";
import sellerModel from "../model/seller.model.js";
import { ThrowError } from "../utils/Error.utils.js";
import { sendBadRequestResponse, sendSuccessResponse } from "../utils/Response.utils.js";
import { uploadFile } from "../middleware/imageupload.js";

export const createBrand = async (req, res) => {
    try {
        const sellerId = req.user?._id;

        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return sendBadRequestResponse(res, "Invalid sellerId in token!");
        }

        const { brandName } = req.body;
        if (!brandName) {
            return sendBadRequestResponse(res, "brandName is required!");
        }

        const existingBrand = await BrandModel.findOne({ brandName, sellerId });
        if (existingBrand) {
            return sendBadRequestResponse(res, "This brand already exists for you!");
        }

        let brandImage = null;

        if (req.file) {
            const result = await uploadFile(req.file);
            brandImage = result.url;
        }
        console.log("req.files:", req.files);
        
        const newBrand = await BrandModel.create({
            sellerId,
            brandName,
            brandImage
        });

        await sellerModel.findByIdAndUpdate(
            sellerId,
            { $push: { brandId: newBrand._id } },
            { new: true }
        );

        return sendSuccessResponse(res, "✅ Brand created successfully!", newBrand);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

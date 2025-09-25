import mongoose from "mongoose";
import faqCategoryModel from "../model/faqCategory.model.js";
import { ThrowError } from "../utils/Error.utils.js"
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js"

export const createfaqCategory = async (req, res) => {
    try {
        const { faqCategoryName } = req.body;

        if (!faqCategoryName) {
            return sendBadRequestResponse(res, "faqCategoryName are required!!!")
        }

        const checkfaqCategory = await faqCategoryModel.findOne({ faqCategoryName })
        if (checkfaqCategory) {
            return sendBadRequestResponse(res, "This Category already added...")
        }

        const newfaqCategory = await faqCategoryModel.create({ faqCategoryName })

        return sendSuccessResponse(res, "faqCategory add successfully...", newfaqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllfaqCategory = async (req, res) => {
    try {
        const faqCategory = await faqCategoryModel.find({})

        if (!faqCategory || faqCategory.length === 0) {
            return sendNotFoundResponse(res, "No any faqCategory found!!!")
        }

        return sendSuccessResponse(res, "faqCategory fetched Successfully...", faqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getfaqCategoryById = async (req, res) => {
    try {

        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid faqCategoryId!!!")
        }

        const faqCategory = await faqCategoryModel.findById(id)
        if (!faqCategory) {
            return sendNotFoundResponse(res, "faqCategory Not found...")
        }

        return sendSuccessResponse(res, "faqCategory fetched Successfully...", faqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updatefaqCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid faqCategoryId!!!");
        }

        const faqCategory = await faqCategoryModel.findById(id);
        if (!faqCategory) {
            return sendNotFoundResponse(res, "faqCategory Not found...");
        }

        const { faqCategoryName } = req.body;

        if (faqCategoryName) {
            const checkfaqCategory = await faqCategoryModel.findOne({
                faqCategoryName,
                _id: { $ne: id }
            });
            if (checkfaqCategory) {
                return sendBadRequestResponse(res, "This Category already added...");
            }
        }

        const updatedata = req.body;
        const newfaqCategory = await faqCategoryModel.findByIdAndUpdate(
            id,
            updatedata,
            { new: true }
        );

        return sendSuccessResponse(
            res,
            "faqCategory updated Successfully...",
            newfaqCategory
        );

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deletefaqCategoryById = async (req, res) => {
    try {

        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid faqCategoryId!!!")
        }

        const faqCategory = await faqCategoryModel.findById(id)
        if (!faqCategory) {
            return sendNotFoundResponse(res, "faqCategory Not found...")
        }

        const newfaqCategory = await faqCategoryModel.findByIdAndDelete(id)

        return sendSuccessResponse(res, "faqCategory deleted Successfully...", newfaqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}
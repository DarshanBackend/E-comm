import mongoose from "mongoose";
import orderfaqCategoryModel from "../model/orderfaqCategory.model.js";
import { ThrowError } from "../utils/Error.utils.js"
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js"

export const createorderfaqCategory = async (req, res) => {
    try {
        const { orderfaqCategoryName } = req.body;

        if (!orderfaqCategoryName) {
            return sendBadRequestResponse(res, "orderfaqCategoryName are required!!!")
        }

        const checkorderfaqCategory = await orderfaqCategoryModel.findOne({ orderfaqCategoryName })
        if (checkorderfaqCategory) {
            return sendBadRequestResponse(res, "This Category already added...")
        }

        const neworderfaqCategory = await orderfaqCategoryModel.create({ orderfaqCategoryName })

        return sendSuccessResponse(res, "orderfaqCategory add successfully...", neworderfaqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllorderfaqCategory = async (req, res) => {
    try {
        const orderfaqCategory = await orderfaqCategoryModel.find({})

        if (!orderfaqCategory || orderfaqCategory.length === 0) {
            return sendNotFoundResponse(res, "No any orderfaqCategory found!!!")
        }

        return sendSuccessResponse(res, "orderfaqCategory fetched Successfully...", orderfaqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getorderfaqCategoryById = async (req, res) => {
    try {

        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid orderfaqCategoryId!!!")
        }

        const orderfaqCategory = await orderfaqCategoryModel.findById(id)
        if (!orderfaqCategory) {
            return sendNotFoundResponse(res, "orderfaqCategory Not found...")
        }

        return sendSuccessResponse(res, "orderfaqCategory fetched Successfully...", orderfaqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updateorderfaqCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid orderfaqCategoryId!!!");
        }

        const orderfaqCategory = await orderfaqCategoryModel.findById(id);
        if (!orderfaqCategory) {
            return sendNotFoundResponse(res, "orderfaqCategory Not found...");
        }

        const { orderfaqCategoryName } = req.body;

        if (orderfaqCategoryName) {
            const checkorderfaqCategory = await orderfaqCategoryModel.findOne({
                orderfaqCategoryName,
                _id: { $ne: id }
            });
            if (checkorderfaqCategory) {
                return sendBadRequestResponse(res, "This Category already added...");
            }
        }

        const updatedata = req.body;
        const neworderfaqCategory = await orderfaqCategoryModel.findByIdAndUpdate(
            id,
            updatedata,
            { new: true }
        );

        return sendSuccessResponse(
            res,
            "orderfaqCategory updated Successfully...",
            neworderfaqCategory
        );

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteorderfaqCategoryById = async (req, res) => {
    try {

        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid orderfaqCategoryId!!!")
        }

        const orderfaqCategory = await orderfaqCategoryModel.findById(id)
        if (!orderfaqCategory) {
            return sendNotFoundResponse(res, "orderfaqCategory Not found...")
        }

        const neworderfaqCategory = await orderfaqCategoryModel.findByIdAndDelete(id)

        return sendSuccessResponse(res, "orderfaqCategory deleted Successfully...", neworderfaqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}
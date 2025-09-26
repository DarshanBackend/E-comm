import mongoose from "mongoose";
import Subcribe from "../model/subcribe.model.js";
import { ThrowError } from "../utils/Error.utils.js"
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js"

export const createSubcribe = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return sendBadRequestResponse(res, "Email are required!!!")
        }

        const checkEmail = await Subcribe.findOne({ email })
        if (checkEmail) {
            return sendBadRequestResponse(res, "This email already added...")
        }

        const newEmail = await Subcribe.create({ email })

        return sendSuccessResponse(res, "email add successfully...", newEmail)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllSubcribe = async (req, res) => {
    try {
        const subcribe = await Subcribe.find({})

        if (!subcribe || subcribe.length === 0) {
            return sendNotFoundResponse(res, "No any subcribe  found!!!")
        }

        return sendSuccessResponse(res, "subcribe fetched Successfully...", subcribe)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getSubcribeById = async (req, res) => {
    try {

        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid SubcribeId!!!")
        }

        const subcribe = await Subcribe.findById(id)
        if (!subcribe) {
            return sendNotFoundResponse(res, "Subcribe Not found...")
        }

        return sendSuccessResponse(res, "Subcribe fetched Successfully...", subcribe)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updateSubcribeById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid SubcribeId!!!");
        }

        const subcribe = await Subcribe.findById(id);
        if (!subcribe) {
            return sendNotFoundResponse(res, "Subcribe Not found...");
        }

        const { email } = req.body;

        if (email) {
            const checkEmail = await Subcribe.findOne({
                email,
                _id: { $ne: id }
            });
            if (checkEmail) {
                return sendBadRequestResponse(res, "This Email already added...");
            }
        }

        const updatedata = req.body;
        const newSubcribe = await Subcribe.findByIdAndUpdate(
            id,
            updatedata,
            { new: true }
        );

        return sendSuccessResponse(
            res,
            "Subcribe updated Successfully...",
            newSubcribe
        );

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteSubcribeById = async (req, res) => {
    try {

        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid SubcribeId!!!")
        }

        const subcribe = await Subcribe.findById(id)
        if (!subcribe) {
            return sendNotFoundResponse(res, "Subcribe Not found...")
        }

        const newSubcribe = await Subcribe.findByIdAndDelete(id)

        return sendSuccessResponse(res, "Subcribe deleted Successfully...", newSubcribe)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}
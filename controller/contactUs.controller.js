import mongoose from "mongoose";
import contactUsModel from "../model/contactUs.model.js";
import { ThrowError } from "../utils/Error.utils.js"
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js"

export const createContactUs = async (req, res) => {
    try {
        const { firstName, lastName, email, subject, comments } = req.body

        if (!firstName || !lastName || !email || !subject || !comments) {
            return sendBadRequestResponse(res, "All field are Required...")
        }

        const addData = await contactUsModel.create({
            firstName,
            lastName,
            email,
            subject,
            comments
        })

        return sendSuccessResponse(res, "Contactus add Successfully...", addData)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllContactUs = async (req, res) => {
    try {
        const contactUs = await contactUsModel.find()

        if (!contactUs || contactUs.length === 0) {
            return sendNotFoundResponse(res, "No any ContactUs found...")
        }

        return sendSuccessResponse(res, "ContactUs fethced Successfully...", contactUs)
    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getContactUsById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid ContactUsId")
        }

        const checkContactUs = await contactUsModel.findById(id)
        if (!checkContactUs) {
            return sendNotFoundResponse(res, "ContactUs not found...")
        }

        return sendSuccessResponse(res, "ContactUs fetched Successfully...", checkContactUs)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updateContactUs = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid ContactUId")
        }

        const checkContactUs = await contactUsModel.findById(id)
        if (!checkContactUs) {
            return sendNotFoundResponse(res, "ContactUs not found...")
        }

        const updataContactUs = (req.body)
        const newData = await contactUsModel.findByIdAndUpdate(id, updataContactUs, { new: true })

        return sendSuccessResponse(res, "ContactUs updated Successfuly...", newData)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const deleteContactUs = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid ContactUsId")
        }

        const checkContactUs = await contactUsModel.findById(id)
        if (!checkContactUs) {
            return sendNotFoundResponse(res, "ContactUs not found...")
        }

        const deleteContactUs = await contactUsModel.findByIdAndDelete(id)

        return sendSuccessResponse(res, "ContactUs deleted Successflly...", deleteContactUs)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}
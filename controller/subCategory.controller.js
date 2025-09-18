import mongoose from "mongoose";
import MainCategoryModel from "../model/mainCategory.model.js";
import CategoryModel from "../model/category.model.js";
import SubCategoryModel from "../model/subCategory.model.js";
import { ThrowError } from "../utils/Error.utils.js"
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js"

export const createSubCategory = async (req, res) => {
    try {
        const { subCategoryName, mainCategoryId, categoryId } = req.body;

        if (!subCategoryName || !mainCategoryId || !categoryId) {
            return sendBadRequestResponse(res, "subCategoryName & mainCategoryId & categoryId are required!!!")
        }

        if (mainCategoryId && !mongoose.Types.ObjectId.isValid(mainCategoryId)) {
            return sendBadRequestResponse(res, "Invalid mainCategoryId!");
        }

        if (mainCategoryId) {
            const checkMainCategory = await MainCategoryModel.findById(mainCategoryId);
            if (!checkMainCategory) {
                return sendBadRequestResponse(res, "MainCategory does not exist!");
            }
        }

        if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
            return sendBadRequestResponse(res, "Invalid categoryId!");
        }

        if (categoryId) {
            const checkCategory = await CategoryModel.findById(categoryId);
            if (!checkCategory) {
                return sendBadRequestResponse(res, "Category does not exist!");
            }
        }

        if (subCategoryName) {
            const checkSubCategory = await SubCategoryModel.findOne({
                subCategoryName,
            });
            if (checkSubCategory) {
                return sendBadRequestResponse(res, "This SubCategory already exists!");
            }
        }

        const newSubCategory = await SubCategoryModel.create({ mainCategoryId, categoryId, subCategoryName })

        return sendSuccessResponse(res, "SubCategory add successfully...", newSubCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllSubCategory = async (req, res) => {
    try {
        const subCategory = await SubCategoryModel.find({})

        if (!subCategory || subCategory.length === 0) {
            return sendNotFoundResponse(res, "No any subCategory found!!!")
        }

        return sendSuccessResponse(res, "subCategory fetched Successfully...", subCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getSubCategoryById = async (req, res) => {
    try {

        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid SubCategoryId!!!")
        }

        const subCategory = await SubCategoryModel.findById(id)
        if (!subCategory) {
            return sendNotFoundResponse(res, "subCategory Not found...")
        }

        return sendSuccessResponse(res, "subCategory fetched Successfully...", subCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updateSubCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const { subCategoryName, mainCategoryId, categoryId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid category id!");
        }

        if (mainCategoryId && !mongoose.Types.ObjectId.isValid(mainCategoryId)) {
            return sendBadRequestResponse(res, "Invalid mainCategoryId!");
        }

        if (mainCategoryId) {
            const checkMainCategory = await MainCategoryModel.findById(mainCategoryId);
            if (!checkMainCategory) {
                return sendBadRequestResponse(res, "MainCategory does not exist!");
            }
        }

        if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
            return sendBadRequestResponse(res, "Invalid categoryId!");
        }

        if (categoryId) {
            const checkCategory = await CategoryModel.findById(categoryId);
            if (!checkCategory) {
                return sendBadRequestResponse(res, "Category does not exist!");
            }
        }

        if (subCategoryName) {
            const checkSubCategory = await SubCategoryModel.findOne({
                subCategoryName,
                _id: { $ne: id }
            });
            if (checkSubCategory) {
                return sendBadRequestResponse(res, "This SubCategory already exists!");
            }
        }

        const updatedSubCategory = await SubCategoryModel.findByIdAndUpdate(
            id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!updatedSubCategory) {
            return sendBadRequestResponse(res, "SubCategory not found!");
        }

        return sendSuccessResponse(res, "SubCategory updated successfully!", updatedSubCategory);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteSubCategoryById = async (req, res) => {
    try {

        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid SubCategoryId!!!")
        }

        const subCategory = await SubCategoryModel.findById(id)
        if (!subCategory) {
            return sendNotFoundResponse(res, "subCategory Not found...")
        }

        const newSubCategory = await SubCategoryModel.findByIdAndDelete(id)

        return sendSuccessResponse(res, "SubCategory deleted Successfully...", newSubCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}
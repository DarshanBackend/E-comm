import mongoose from "mongoose";
import MainCategoryModel from "../model/mainCategory.model.js";
import CategoryModel from "../model/category.model.js";
import { ThrowError } from "../utils/Error.utils.js"
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js"

export const createCategory = async (req, res) => {
    try {
        const { categoryName, mainCategoryId } = req.body;

        if (!categoryName || !mainCategoryId) {
            return sendBadRequestResponse(res, "categoryName & mainCategoryId are required!!!")
        }

        if (!mongoose.Types.ObjectId.isValid(mainCategoryId)) {
            return sendBadRequestResponse(res, "Invalid mainCategoryId!!!")
        }

        const checkMainCategory = await MainCategoryModel.findById(mainCategoryId)
        if (!checkMainCategory) {
            return sendBadRequestResponse(res, "MainCategory not exits!!!")
        }


        const checkCategory = await CategoryModel.findOne({ categoryName })
        if (checkCategory) {
            return sendBadRequestResponse(res, "This Category already added...")
        }

        const newCategory = await CategoryModel.create({ mainCategoryId, categoryName })

        return sendSuccessResponse(res, "Category add successfully...", newCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllCategory = async (req, res) => {
    try {
        const category = await CategoryModel.find({})

        if (!category || category.length === 0) {
            return sendNotFoundResponse(res, "No any category found!!!")
        }

        return sendSuccessResponse(res, "category fetched Successfully...", category)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getCategoryById = async (req, res) => {
    try {

        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid CategoryId!!!")
        }

        const category = await CategoryModel.findById(id)
        if (!category) {
            return sendNotFoundResponse(res, "category Not found...")
        }

        return sendSuccessResponse(res, "category fetched Successfully...", category)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updateCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryName, mainCategoryId } = req.body;

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

        if (categoryName) {
            const checkCategory = await CategoryModel.findOne({
                categoryName,
                _id: { $ne: id }
            });
            if (checkCategory) {
                return sendBadRequestResponse(res, "This Category already exists!");
            }
        }

        const updatedCategory = await CategoryModel.findByIdAndUpdate(
            id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            return sendBadRequestResponse(res, "Category not found!");
        }

        return sendSuccessResponse(res, "Category updated successfully!", updatedCategory);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteCategoryById = async (req, res) => {
    try {

        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid CategoryId!!!")
        }

        const category = await CategoryModel.findById(id)
        if (!category) {
            return sendNotFoundResponse(res, "Category Not found...")
        }

        const newCategory = await CategoryModel.findByIdAndDelete(id)

        return sendSuccessResponse(res, "Category deleted Successfully...", newCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}
import orderFAQQuestion from '../model/orderfaqQuestion.model.js';
import orderFAQCategory from '../model/orderfaqCategory.model.js';
import mongoose from 'mongoose';
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from '../utils/Response.utils.js';
import { ThrowError } from '../utils/Error.utils.js';


export const createorderFAQQuestion = async (req, res) => {
    try {
        const { orderfaqCategoryId, orderfaqQuestion, orderfaqAnswer } = req.body;

        if (!orderfaqCategoryId || !orderfaqQuestion || !orderfaqAnswer) {
            return sendBadRequestResponse(res, "orderfaqCategoryId, orderfaqQuestion and orderfaqAnswer are required!");
        }

        if (!mongoose.Types.ObjectId.isValid(orderfaqCategoryId)) {
            return sendBadRequestResponse(res, "Invalid orderFAQ category ID!");
        }

        const ordercategoryExists = await orderFAQCategory.findById(orderfaqCategoryId);
        if (!ordercategoryExists) {
            return sendNotFoundResponse(res, "orderFAQ category not found!");
        }

        if (typeof orderfaqQuestion !== 'string' || orderfaqQuestion.trim().length === 0) {
            return sendBadRequestResponse(res, "FAQ question must be a non-empty string!");
        }

        if (typeof orderfaqAnswer !== 'string' || orderfaqAnswer.trim().length === 0) {
            return sendBadRequestResponse(res, "FAQ answer must be a non-empty string!");
        }

        const trimmedorderQuestion = orderfaqQuestion.trim();

        const existingorderQuestion = await orderFAQQuestion.findOne({
            orderfaqCategoryId,
            orderfaqQuestion: {
                $regex: `^${trimmedorderQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                $options: 'i'
            }
        });

        if (existingorderQuestion) {
            return sendBadRequestResponse(res, "This orderquestion already exists in this category!");
        }

        // Create orderFAQ question
        const neworderFAQQuestion = await orderFAQQuestion.create({
            orderfaqCategoryId,
            orderfaqQuestion: trimmedorderQuestion,
            orderfaqAnswer: orderfaqAnswer.trim()
        });

        // Populate category details
        await neworderFAQQuestion.populate('orderfaqCategoryId', 'name description');

        return sendSuccessResponse(res, "✅ orderFAQ question created successfully!", neworderFAQQuestion);

    } catch (error) {
        console.error('Create orderFAQ Question Error:', error);
        return ThrowError(res, 500, error.message);
    }
};

export const getAllorderFAQQuestions = async (req, res) => {
    try {
        const orderfaqQuestion = await orderFAQQuestion.find()

        if (!orderfaqQuestion || orderfaqQuestion.length === 0) {
            return sendNotFoundResponse(res, "No any orderfaqQuestion found...")
        }

        return sendSuccessResponse(res, "orderFaqQuestion fetched Successfully..", orderfaqQuestion)

    } catch (error) {
        console.error('Get orderFAQ Questions Error:', error);
        return ThrowError(res, 500, "Server error while fetching FAQ questions");
    }
};

export const getorderFAQQuestionById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid orderFAQ question ID!");
        }

        const orderquestion = await orderFAQQuestion.findById(id)
            .populate('orderfaqCategoryId', 'name description');

        if (!orderquestion) {
            return sendNotFoundResponse(res, "orderFAQ question not found!");
        }

        return sendSuccessResponse(res, "orderFAQ question fetched successfully!", orderquestion);

    } catch (error) {
        console.error('Get FAQ Question Error:', error);
        return ThrowError(res, 500, "Server error while fetching orderFAQ question");
    }
};

export const updateorderFAQQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderfaqCategoryId, orderfaqQuestion, orderfaqAnswer } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid orderFAQ question ID!");
        }

        // Check if question exists
        const existingorderQuestion = await orderFAQQuestion.findById(id);
        if (!existingorderQuestion) {
            return sendNotFoundResponse(res, "orderFAQ question not found!");
        }

        // Validate orderfaqCategoryId if provided
        if (orderfaqCategoryId) {
            if (!mongoose.Types.ObjectId.isValid(orderfaqCategoryId)) {
                return sendBadRequestResponse(res, "Invalid orderFAQ category ID!");
            }

            const ordercategoryExists = await orderFAQCategory.findById(orderfaqCategoryId);
            if (!ordercategoryExists) {
                return sendNotFoundResponse(res, "orderFAQ category not found!");
            }
            existingorderQuestion.orderfaqCategoryId = orderfaqCategoryId;
        }

        // Validate and update faqQuestion
        if (orderfaqQuestion !== undefined) {
            if (typeof orderfaqQuestion !== 'string' || orderfaqQuestion.trim().length === 0) {
                return sendBadRequestResponse(res, "orderFAQ question must be a non-empty string!");
            }
            if (orderfaqQuestion.length > 500) {
                return sendBadRequestResponse(res, "orderFAQ question must be less than 500 characters!");
            }

            // Check for duplicate question (excluding current question)
            const duplicateorderQuestion = await orderFAQQuestion.findOne({
                _id: { $ne: id },
                orderfaqCategoryId: existingorderQuestion.orderfaqCategoryId,
                orderfaqQuestion: { $regex: new RegExp(`^${orderfaqQuestion.trim()}$`, 'i') }
            });

            if (duplicateorderQuestion) {
                return sendBadRequestResponse(res, "This orderquestion already exists in this category!");
            }

            existingorderQuestion.orderfaqQuestion = orderfaqQuestion.trim();
        }

        // Validate and update faqAnswer
        if (orderfaqAnswer !== undefined) {
            if (typeof orderfaqAnswer !== 'string' || orderfaqAnswer.trim().length === 0) {
                return sendBadRequestResponse(res, "orderFAQ answer must be a non-empty string!");
            }
            if (orderfaqAnswer.length > 2000) {
                return sendBadRequestResponse(res, "orderFAQ answer must be less than 2000 characters!");
            }
            existingorderQuestion.orderfaqAnswer = orderfaqAnswer.trim();
        }

        await existingorderQuestion.save();
        await existingorderQuestion.populate('orderfaqCategoryId', 'name description');

        return sendSuccessResponse(res, "✅ orderFAQ question updated successfully!", existingorderQuestion);

    } catch (error) {
        console.error('Update FAQ Question Error:', error);
        return ThrowError(res, 500, error.message);
    }
};

export const deleteorderFAQQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid orderFAQ question ID!");
        }

        const orderquestion = await orderFAQQuestion.findByIdAndDelete(id);

        if (!orderquestion) {
            return sendNotFoundResponse(res, "orderFAQ question not found!");
        }

        return sendSuccessResponse(res, "✅ orderFAQ question deleted successfully!");

    } catch (error) {
        console.error('Delete orderFAQ Question Error:', error);
        return ThrowError(res, 500, "Server error while deleting orderFAQ question");
    }
};

export const getorderFAQQuestionsByCategory = async (req, res) => {
    try {
        const { ordercategoryId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(ordercategoryId)) {
            return sendBadRequestResponse(res, "Invalid orderFAQ category ID!");
        }

        const ordercategoryExists = await orderFAQCategory.findById(ordercategoryId);
        if (!ordercategoryExists) {
            return sendNotFoundResponse(res, "orderFAQ category not found!");
        }

        const orderquestions = await orderFAQQuestion.find({ orderfaqCategoryId: ordercategoryId })
            .populate('orderfaqCategoryId', 'name description')
            .sort({ createdAt: -1 });

        return sendSuccessResponse(res, "orderFAQ questions fetched successfully!", orderquestions);

    } catch (error) {
        console.error('Get orderFAQ Questions by Category Error:', error);
        return ThrowError(res, 500, "Server error while fetching orderFAQ questions");
    }
};
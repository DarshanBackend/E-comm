import FAQQuestion from '../model/faqQuestion.model.js';
import FAQCategory from '../model/faqCategory.model.js';
import mongoose from 'mongoose';
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from '../utils/Response.utils.js';
import { ThrowError } from '../utils/Error.utils.js';


export const createFAQQuestion = async (req, res) => {
    try {
        const { faqCategoryId, faqQuestion, faqAnswer } = req.body;

        if (!faqCategoryId || !faqQuestion || !faqAnswer) {
            return sendBadRequestResponse(res, "faqCategoryId, faqQuestion and faqAnswer are required!");
        }

        if (!mongoose.Types.ObjectId.isValid(faqCategoryId)) {
            return sendBadRequestResponse(res, "Invalid FAQ category ID!");
        }

        const categoryExists = await FAQCategory.findById(faqCategoryId);
        if (!categoryExists) {
            return sendNotFoundResponse(res, "FAQ category not found!");
        }

        if (typeof faqQuestion !== 'string' || faqQuestion.trim().length === 0) {
            return sendBadRequestResponse(res, "FAQ question must be a non-empty string!");
        }

        if (typeof faqAnswer !== 'string' || faqAnswer.trim().length === 0) {
            return sendBadRequestResponse(res, "FAQ answer must be a non-empty string!");
        }

        const trimmedQuestion = faqQuestion.trim();

        const existingQuestion = await FAQQuestion.findOne({
            faqCategoryId,
            faqQuestion: {
                $regex: `^${trimmedQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                $options: 'i'
            }
        });

        if (existingQuestion) {
            return sendBadRequestResponse(res, "This question already exists in this category!");
        }

        // Create FAQ question
        const newFAQQuestion = await FAQQuestion.create({
            faqCategoryId,
            faqQuestion: trimmedQuestion,
            faqAnswer: faqAnswer.trim()
        });

        // Populate category details
        await newFAQQuestion.populate('faqCategoryId', 'name description');

        return sendSuccessResponse(res, "✅ FAQ question created successfully!", newFAQQuestion);

    } catch (error) {
        console.error('Create FAQ Question Error:', error);
        return ThrowError(res, 500, error.message);
    }
};

export const getAllFAQQuestions = async (req, res) => {
    try {
        const faqQuestion = await FAQQuestion.find()

        if (!faqQuestion || faqQuestion.length === 0) {
            return sendNotFoundResponse(res, "No any faqQuestion found...")
        }

        return sendSuccessResponse(res, "FaqQuestion fetched Successfully..", faqQuestion)

    } catch (error) {
        console.error('Get FAQ Questions Error:', error);
        return ThrowError(res, 500, "Server error while fetching FAQ questions");
    }
};

export const getFAQQuestionById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid FAQ question ID!");
        }

        const question = await FAQQuestion.findById(id)
            .populate('faqCategoryId', 'name description');

        if (!question) {
            return sendNotFoundResponse(res, "FAQ question not found!");
        }

        return sendSuccessResponse(res, "FAQ question fetched successfully!", question);

    } catch (error) {
        console.error('Get FAQ Question Error:', error);
        return ThrowError(res, 500, "Server error while fetching FAQ question");
    }
};

export const updateFAQQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { faqCategoryId, faqQuestion, faqAnswer } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid FAQ question ID!");
        }

        // Check if question exists
        const existingQuestion = await FAQQuestion.findById(id);
        if (!existingQuestion) {
            return sendNotFoundResponse(res, "FAQ question not found!");
        }

        // Validate faqCategoryId if provided
        if (faqCategoryId) {
            if (!mongoose.Types.ObjectId.isValid(faqCategoryId)) {
                return sendBadRequestResponse(res, "Invalid FAQ category ID!");
            }

            const categoryExists = await FAQCategory.findById(faqCategoryId);
            if (!categoryExists) {
                return sendNotFoundResponse(res, "FAQ category not found!");
            }
            existingQuestion.faqCategoryId = faqCategoryId;
        }

        // Validate and update faqQuestion
        if (faqQuestion !== undefined) {
            if (typeof faqQuestion !== 'string' || faqQuestion.trim().length === 0) {
                return sendBadRequestResponse(res, "FAQ question must be a non-empty string!");
            }
            if (faqQuestion.length > 500) {
                return sendBadRequestResponse(res, "FAQ question must be less than 500 characters!");
            }

            // Check for duplicate question (excluding current question)
            const duplicateQuestion = await FAQQuestion.findOne({
                _id: { $ne: id },
                faqCategoryId: existingQuestion.faqCategoryId,
                faqQuestion: { $regex: new RegExp(`^${faqQuestion.trim()}$`, 'i') }
            });

            if (duplicateQuestion) {
                return sendBadRequestResponse(res, "This question already exists in this category!");
            }

            existingQuestion.faqQuestion = faqQuestion.trim();
        }

        // Validate and update faqAnswer
        if (faqAnswer !== undefined) {
            if (typeof faqAnswer !== 'string' || faqAnswer.trim().length === 0) {
                return sendBadRequestResponse(res, "FAQ answer must be a non-empty string!");
            }
            if (faqAnswer.length > 2000) {
                return sendBadRequestResponse(res, "FAQ answer must be less than 2000 characters!");
            }
            existingQuestion.faqAnswer = faqAnswer.trim();
        }

        await existingQuestion.save();
        await existingQuestion.populate('faqCategoryId', 'name description');

        return sendSuccessResponse(res, "✅ FAQ question updated successfully!", existingQuestion);

    } catch (error) {
        console.error('Update FAQ Question Error:', error);
        return ThrowError(res, 500, error.message);
    }
};

export const deleteFAQQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid FAQ question ID!");
        }

        const question = await FAQQuestion.findByIdAndDelete(id);

        if (!question) {
            return sendNotFoundResponse(res, "FAQ question not found!");
        }

        return sendSuccessResponse(res, "✅ FAQ question deleted successfully!");

    } catch (error) {
        console.error('Delete FAQ Question Error:', error);
        return ThrowError(res, 500, "Server error while deleting FAQ question");
    }
};

export const getFAQQuestionsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return sendBadRequestResponse(res, "Invalid FAQ category ID!");
        }

        const categoryExists = await FAQCategory.findById(categoryId);
        if (!categoryExists) {
            return sendNotFoundResponse(res, "FAQ category not found!");
        }

        const questions = await FAQQuestion.find({ faqCategoryId: categoryId })
            .populate('faqCategoryId', 'name description')
            .sort({ createdAt: -1 });

        return sendSuccessResponse(res, "FAQ questions fetched successfully!", questions);

    } catch (error) {
        console.error('Get FAQ Questions by Category Error:', error);
        return ThrowError(res, 500, "Server error while fetching FAQ questions");
    }
};
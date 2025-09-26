import blogCatgoryModel from "../model/blog.category.model.js";
import { sendBadRequestResponse, sendErrorResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js";
import { slugify } from "../utils/slug.config.js";

export const addNewBlogCategoryController = async (req, res) => {
    try {
        const { blogCategoryName } = req?.body;

        if (!req.body.blogCategoryName && !blogCategoryName) {
            return sendBadRequestResponse(res, "blogCategoryName Not Found!");
        }

        const blogSlug = slugify(blogCategoryName);

        //save
        const newBlogCategory = await blogCatgoryModel.create({ blogCategoryName: blogCategoryName, slug: blogSlug })
        await newBlogCategory.save();

        return sendSuccessResponse(res, "Blog Category created SuccessFully", newBlogCategory);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "error during Add new blog Category", error);
    }
}

export const getAllBlogCategoryController = async (req, res) => {
    try {
        const blogCategory = await blogCatgoryModel.find({}).select("blogCategoryName");

        if (!blogCategory) {
            return sendNotFoundResponse(res, "Blog Category Not Found!");
        }

        return sendSuccessResponse(res, "Blofg Category featched SuccessFully", {
            total: blogCategory.length,
            blogsCategory: blogCategory
        });

    } catch (error) {
        console.log(error.message);
        return sendErrorResponse(res, 500, "Error During Get all Blogs ", error);
    }
}

export const getBlogCategoryByIdController = async (req, res) => {
    try {
        const { categoryId } = req?.params;

        if (!categoryId) {
            return sendBadRequestResponse(res, "CategoryId not Found")
        }

        const blogCategory = await blogCatgoryModel.find({ _id: categoryId });

        if (!blogCategory.length === 0) {
            return sendNotFoundResponse(res, "Not category Found length is 0");
        }

        return sendSuccessResponse(res, "Blog category by Id Featched Successfully", blogCategory)
    } catch (error) {
        console.log(error.message);
        return sendErrorResponse(res, "Error During Get Blog By id", error);
    }
}

export const updateBlogCategoryController = async (req, res) => {
    try {
        const { blogCategoryName } = req?.body;
        const { categoryId } = req?.params;
        if (!req.body.blogCategoryName && !blogCategoryName) {
            return sendBadRequestResponse(res, "blogCategoryName Not Found!");
        }

        const blogSlug = slugify(blogCategoryName);

        //save
        const updateBlogCategory = await blogCatgoryModel.findByIdAndUpdate({ _id: categoryId }, { blogCategoryName: blogCategoryName, slug: blogSlug })

        return sendSuccessResponse(res, "Blog Category created SuccessFully", updateBlogCategory);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "error during Add new blog Category", error);
    }
}

export const deleteBlogCategoryController = async (req, res) => {
    try {
        const { categoryId } = req?.params;

        if (!categoryId) return sendNotFoundResponse(res, "categoryId Not Found");

        const deleteBlogCategory = await blogCatgoryModel.findByIdAndDelete({ _id: categoryId });

        if (!deleteBlogCategory.length === 0) {
            return sendNotFoundResponse(res, "delete catgory length is 0");
        }

        return sendSuccessResponse(res, "Blog category Delete SuccessFull", deleteBlogCategory);

    } catch (error) {
        console.log(error)
        return sendErrorResponse(res, 500, "Error During Delete Blog category", error);
    }
}
import mongoose from "mongoose";

const blogCategorySchema = new mongoose.Schema({
    blogCategoryName: { type: String, default: null },
    slug: { type: String, default: null },
    isFeatureBlog: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const blogCatgoryModel = mongoose.model("blogCatgory", blogCategorySchema);

export default blogCatgoryModel;
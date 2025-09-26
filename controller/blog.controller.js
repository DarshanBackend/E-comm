import mongoose from "mongoose";
import { uploadFile } from "../middleware/imageupload.js";
import blogModel from "../model/blog.model.js";
import { sendErrorResponse } from "../utils/Response.utils.js";
import { deleteS3File } from "../utils/aws.config.js";

export const addNewBlogController = async (req, res) => {
    try {
        const { blogCategoryId, blogTitle, section } = req.body;

        let heroImageUrl = null;

        if (req.files && Array.isArray(req.files)) {
            const heroFile = req.files.find(f => f.fieldname === "heroImage");
            if (heroFile) {
                const result = await uploadFile(heroFile);
                heroImageUrl = result.url;
            }
        }


        // 2. Sections Handling
        let parsedSections = [];
        if (section) {
            parsedSections = JSON.parse(section);

            for (let i = 0; i < parsedSections.length; i++) {
                const sectionFiles = req.files.filter(
                    (f) => f.fieldname === `sectionImg_${i}`
                );

                let sectionImgs = [];
                if (sectionFiles.length > 0) {
                    sectionImgs = await Promise.all(
                        sectionFiles.map(async (file) => {
                            const res = await uploadFile(file);
                            return res.url;
                        })
                    );
                }

                parsedSections[i].sectionImg = sectionImgs;
            }
        }

        // 3. Save Blog
        const blog = new blogModel({
            blogCategoryId,
            blogTitle,
            heroImage: heroImageUrl,
            section: parsedSections,
        });

        await blog.save();

        return res.status(201).json({
            success: true,
            message: "Blog created successfully",
            blog,
        });
    } catch (error) {
        console.error("CREATE BLOG ERROR:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllBlogsController = async (req, res) => {
    try {
        // Optional pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const blogs = await blogModel
            .find()
            .populate("blogCategoryId", "categoryName") // only bring category name
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await blogModel.countDocuments();

        return res.status(200).json({
            success: true,
            message: "All blogs fetched successfully",
            total,
            page,
            limit,
            blogs,
        });
    } catch (error) {
        console.error("GET ALL BLOGS ERROR:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getBlogByIdController = async (req, res) => {
    try {
        const { blogId: id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Blog ID" });
        }

        const blog = await blogModel
            .findById(id)
            .populate("blogCategoryId", "categoryName");

        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Blog fetched successfully",
            blog,
        });
    } catch (error) {
        console.error("GET BLOG BY ID ERROR:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateBlogController = async (req, res) => {
    try {
        const { blogId } = req.params;
        const blogCategoryId = req.body?.blogCategoryId;
        const blogTitle = req.body?.blogTitle;
        const section = req.body?.section;
        if (!mongoose.Types.ObjectId.isValid(blogId))
            return res.status(400).json({ success: false, message: "Invalid Blog ID" });

        const blog = await blogModel.findById(blogId);
        if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

        // 1. Hero Image
        const heroFile = req.files?.find(f => f.fieldname === "heroImage");
        if (heroFile) {
            if (blog.heroImage) {
                const key = blog.heroImage.split(".amazonaws.com/").pop();
                await deleteS3File(key);
            }
            const result = await uploadFile(heroFile);
            blog.heroImage = result.url;
        }

        // 2. Blog Title & Category
        if (blogTitle) blog.blogTitle = blogTitle;
        if (blogCategoryId) blog.blogCategoryId = blogCategoryId;

        // 3. Sections
        if (section) {
            const parsedSections = JSON.parse(section);

            for (let index = 0; index < parsedSections.length; index++) {
                const updatedSection = parsedSections[index];

                if (!blog.section[index]) blog.section[index] = {};

                if (updatedSection.sectionTitle !== undefined)
                    blog.section[index].sectionTitle = updatedSection.sectionTitle;

                if (updatedSection.sectionDesc !== undefined)
                    blog.section[index].sectionDesc = updatedSection.sectionDesc;

                if (updatedSection.sectionPoints !== undefined)
                    blog.section[index].sectionPoints = updatedSection.sectionPoints;

                if (updatedSection.sectionOtherInfo !== undefined)
                    blog.section[index].sectionOtherInfo = updatedSection.sectionOtherInfo;

                // section images
                const sectionFiles = req.files?.filter(f => f.fieldname === `sectionImg_${index}`) || [];
                if (sectionFiles.length > 0) {
                    // delete old images
                    if (blog.section[index].sectionImg?.length) {
                        for (const img of blog.section[index].sectionImg) {
                            const key = img.split(".amazonaws.com/").pop();
                            await deleteS3File(key);
                        }
                    }
                    // upload new images
                    const uploadedImgs = [];
                    for (const file of sectionFiles) {
                        const resFile = await uploadFile(file);
                        uploadedImgs.push(resFile.url);
                    }
                    blog.section[index].sectionImg = uploadedImgs;
                }
            }
        }

        await blog.save();
        return res.status(200).json({ success: true, message: "Blog updated successfully", blog });
    } catch (error) {
        console.error("UPDATE BLOG ERROR:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteBlogController = async (req, res) => {
    try {
        const { blogId } = req.params;

        // 1. Validate blog ID
        if (!mongoose.Types.ObjectId.isValid(blogId)) {
            return res.status(400).json({ success: false, message: "Invalid Blog ID" });
        }

        // 2. Find blog
        const blog = await blogModel.findById(blogId);
        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }

        // 3. Delete hero image from S3
        if (blog.heroImage) {
            const key = blog.heroImage.split(".amazonaws.com/").pop();
            await deleteS3File(key);
        }

        // 4. Delete section images from S3
        if (blog.section?.length) {
            for (const sec of blog.section) {
                if (sec.sectionImg?.length) {
                    for (const img of sec.sectionImg) {
                        const key = img.split(".amazonaws.com/").pop();
                        await deleteS3File(key);
                    }
                }
            }
        }

        // 5. Delete the blog document
        await blogModel.findByIdAndDelete(blogId);

        return res.status(200).json({ success: true, message: "Blog and all images deleted successfully" });

    } catch (error) {
        console.error("DELETE BLOG ERROR:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

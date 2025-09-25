import Review from '../model/review.model.js';
import Product from '../model/product.model.js';
import { uploadFile } from '../middleware/imageupload.js';
import mongoose from 'mongoose';
import { ThrowError } from '../utils/Error.utils.js';
import { sendBadRequestResponse, sendErrorResponse, sendNotFoundResponse, sendSuccessResponse } from '../utils/Response.utils.js';
import { s3 } from '../utils/aws.config.js';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export const createReview = async (req, res) => {
    try {
        const { productId, overallRating, love_about, comment } = req.body;
        const userId = req.user?._id;

        // Validate required fields
        if (!productId || !overallRating) {
            return sendBadRequestResponse(res, "productId and overallRating are required!");
        }
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return sendBadRequestResponse(res, "Invalid or missing user ID. Please login first!");
        }
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return sendBadRequestResponse(res, "Invalid product ID!");
        }

        // Prevent duplicate review
        const existingReview = await Review.findOne({ productId, userId });
        if (existingReview) {
            return sendBadRequestResponse(res, "You have already reviewed this product!");
        }

        const product = await Product.findById(productId);
        if (!product) return sendNotFoundResponse(res, "Product not found!");

        // Validate overallRating
        const rating = Number(overallRating);
        if (isNaN(rating) || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
            return sendBadRequestResponse(res, "Rating must be an integer between 1 and 5!");
        }

        // Parse love_about
        let parsedLoveAbout = [];
        if (love_about) {
            parsedLoveAbout = typeof love_about === "string" ? JSON.parse(love_about) : love_about;

            if (!Array.isArray(parsedLoveAbout)) {
                return sendBadRequestResponse(res, "love_about must be an array of objects!");
            }

            const productPoints = product.love_about.map(p => p.point);

            // Validate points & rates
            for (const item of parsedLoveAbout) {
                if (!item.point || typeof item.point !== "string") {
                    return sendBadRequestResponse(res, "Each love_about item must have a valid 'point' string!");
                }
                if (!productPoints.includes(item.point)) {
                    return sendBadRequestResponse(res, `Invalid love_about point: ${item.point}`);
                }
                if (item.rate === undefined || typeof item.rate !== "number" || item.rate < 1 || item.rate > 5) {
                    return sendBadRequestResponse(res, "Each love_about 'rate' must be a number between 1 and 5!");
                }
            }

            // Add/update user's rating in product.love_about
            product.love_about = product.love_about.map(p => {
                const userRating = parsedLoveAbout.find(l => l.point === p.point);
                if (!userRating) return p;

                if (!Array.isArray(p.ratings)) p.ratings = [];

                const existingIndex = p.ratings.findIndex(r => r.userId.toString() === userId.toString());
                if (existingIndex !== -1) {
                    p.ratings[existingIndex].rate = userRating.rate; // update
                } else {
                    p.ratings.push({ userId, rate: userRating.rate }); // add new
                }

                return p;
            });

            await product.save();
        }

        // Handle media uploads
        const media = { images: [], videos: [] };
        if (req.files?.images) {
            for (const file of req.files.images) {
                const result = await uploadFile(file);
                media.images.push({ url: result.url, key: result.key, uploadDate: new Date() });
            }
        }
        if (req.files?.videos) {
            for (const file of req.files.videos) {
                const result = await uploadFile(file);
                media.videos.push({ url: result.url, key: result.key, uploadDate: new Date() });
            }
        }

        // Create the review
        const newReview = await Review.create({
            productId,
            userId,
            overallRating: rating,
            love_about: parsedLoveAbout, // user-specific rating
            comment: comment || "",
            media
        });

        // --- Update product average rating & totalReviews ---
        const reviews = await Review.find({ productId });

        // totalReviews = only reviews with comment
        const reviewsWithComments = reviews.filter(r => r.comment && r.comment.trim() !== "");
        const totalReviews = reviewsWithComments.length;

        // average = from all ratings
        let averageRating = 0;
        if (reviews.length > 0) {
            const totalRating = reviews.reduce((sum, r) => sum + (r.overallRating || 0), 0);
            averageRating = totalRating / reviews.length;
        }

        product.rating = {
            average: Number(averageRating.toFixed(1)), // round to 1 decimal
            totalReviews
        };
        await product.save();

        return sendSuccessResponse(res, "✅ Review submitted successfully!", newReview);

    } catch (error) {
        console.error("Create Review Error:", error);
        return ThrowError(res, 500, error.message);
    }
};

export const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(reviewId))
            return sendBadRequestResponse(res, "Invalid review ID");

        const review = await Review.findOne({ _id: reviewId, userId });
        if (!review) return sendNotFoundResponse(res, "Review not found");

        // --- Update rating ---
        if (req.body.overallRating !== undefined) {
            const rating = Number(req.body.overallRating);
            if (isNaN(rating) || rating < 1 || rating > 5 || !Number.isInteger(rating))
                return sendBadRequestResponse(res, "Rating must be 1-5 integer");
            review.overallRating = rating;
        }

        // --- Update comment ---
        if (req.body.comment !== undefined) review.comment = req.body.comment;

        // --- Update love_about ---
        if (req.body.love_about) {
            const loveAboutArr = typeof req.body.love_about === "string"
                ? JSON.parse(req.body.love_about)
                : req.body.love_about;
            if (!Array.isArray(loveAboutArr)) return sendBadRequestResponse(res, "love_about must be array");
            review.love_about = loveAboutArr;
        }

        // --- Media handling: replace old files ---
        const hasNewImages = req.files?.images?.length > 0;
        const hasNewVideos = req.files?.videos?.length > 0;

        if (hasNewImages || hasNewVideos) {

            // Delete old images from S3
            if (review.media?.images?.length) {
                for (const img of review.media.images) {
                    const key = img.key || img.url.split("/").pop();
                    await s3.send(new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: key.startsWith("uploads/") ? key : `uploads/${key}`
                    }));
                }
            }

            // Delete old videos from S3
            if (review.media?.videos?.length) {
                for (const vid of review.media.videos) {
                    const key = vid.key || vid.url.split("/").pop();
                    await s3.send(new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: key.startsWith("uploads/") ? key : `uploads/${key}`
                    }));
                }
            }

            // Reset media arrays
            review.media.images = [];
            review.media.videos = [];

            // Upload new images
            if (hasNewImages) {
                for (const file of req.files.images) {
                    const result = await uploadFile(file); // { url, key }
                    review.media.images.push({
                        url: result.url,
                        key: result.key,
                        uploadDate: new Date()
                    });
                }
            }

            // Upload new videos
            if (hasNewVideos) {
                for (const file of req.files.videos) {
                    const result = await uploadFile(file);
                    review.media.videos.push({
                        url: result.url,
                        key: result.key,
                        uploadDate: new Date()
                    });
                }
            }
        }

        await review.save();
        return sendSuccessResponse(res, "✅ Review updated successfully", review);

    } catch (err) {
        console.error("Update Review Error:", err);
        return ThrowError(res, 500, err.message);
    }
};;

export const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(reviewId))
            return sendBadRequestResponse(res, "Invalid review ID!");
        if (!userId || !mongoose.Types.ObjectId.isValid(userId))
            return sendBadRequestResponse(res, "Invalid user ID!");

        const review = await Review.findOne({ _id: reviewId, userId });
        if (!review)
            return sendNotFoundResponse(res, "Review not found or unauthorized!");

        const product = await Product.findById(review.productId);
        if (!product) return sendNotFoundResponse(res, "Product not found!");

        // --- Remove user ratings from product love_about ---
        if (review.love_about?.length) {
            product.love_about = product.love_about.map(p => {
                if (Array.isArray(p.ratings)) {
                    p.ratings = p.ratings.filter(r => r.userId.toString() !== userId.toString());
                }
                return p;
            });
        }

        // --- Helper to delete media from S3 ---
        const deleteMediaFromS3 = async (mediaArray) => {
            for (const m of mediaArray) {
                // Ensure key always starts with 'uploads/'
                let key = m.key || m.url.split("/").pop();
                key = key.startsWith("uploads/") ? key : `uploads/${key}`;
                try {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: key,
                    }));
                } catch (err) {
                    console.error("Failed to delete from S3:", err.message);
                }
            }
        };

        if (review.media?.images?.length) await deleteMediaFromS3(review.media.images);
        if (review.media?.videos?.length) await deleteMediaFromS3(review.media.videos);

        // --- Delete review from DB ---
        await Review.findByIdAndDelete(reviewId);

        // --- Save product updates after review deletion ---
        await product.save();

        // --- Recalculate product overall rating ---
        await updateProductRating(product._id);

        return sendSuccessResponse(res, "✅ Review deleted successfully!");

    } catch (error) {
        console.error("Delete Review Error:", error);
        return ThrowError(res, 500, error.message);
    }
};
``
const updateProductRating = async (productId) => {
    try {
        const reviews = await Review.find({ productId });
        const totalReviews = reviews.length;
        const averageRating =
            totalReviews === 0
                ? 0
                : reviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews;

        await Product.findByIdAndUpdate(productId, {
            'rating.average': averageRating,
            'rating.totalReviews': totalReviews
        });
    } catch (error) {
        console.error('Error updating product rating:', error);
    }
};

export const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10, sort = "latest" } = req.query;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return sendBadRequestResponse(res, "Invalid product ID!");
        }

        const skip = (page - 1) * limit;

        // 🔸 Fetch reviews
        const reviews = await Review.find({ productId })
            .populate("userId", "name avatar")
            .sort(sort === "latest" ? { createdAt: -1 } : { overallRating: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // 🔸 Count total reviews
        const totalReviews = await Review.countDocuments({ productId });

        // 🔸 Rating distribution (1–5 stars)
        const distribution = {};
        for (let i = 1; i <= 5; i++) {
            distribution[i] = await Review.countDocuments({ productId, overallRating: i });
        }

        // 🔸 Average rating
        const avgData = await Review.aggregate([
            { $match: { productId: new mongoose.Types.ObjectId(productId) } },
            { $group: { _id: null, avg: { $avg: "$overallRating" } } }
        ]);
        const average = avgData.length > 0 ? avgData[0].avg.toFixed(1) : 0;

        // 🔸 Format reviews
        const formattedReviews = reviews.map(r => ({
            _id: r._id,
            rating: r.overallRating,
            comment: r.comment,
            media: {
                images: r.media?.images || [],
                videos: r.media?.videos || []
            },
            likes: r.likes?.length || 0,
            dislikes: r.dislikes?.length || 0,
            createdAt: r.createdAt,
            user: {
                name: r.userId?.name || "Anonymous",
                avatar: r.userId?.avatar || null
            },
            likedByUser: req.user ? r.likes.includes(req.user._id) : false,
            dislikedByUser: req.user ? r.dislikes.includes(req.user._id) : false
        }));


        return sendSuccessResponse(res, "Review data fetched successfully!", {
            summary: {
                average: Number(average),
                totalReviews,
                distribution
            },
            reviews: formattedReviews,
            page: Number(page),
            totalPages: Math.ceil(totalReviews / limit)
        });
    } catch (error) {
        console.error("Get Product Reviews Error:", error);
        return ThrowError(res, 500, error.message);
    }
};

export const likeReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found!" });
        }

        // Cannot like if already disliked
        if (review.dislikes.includes(userId)) {
            return res.status(400).json({ success: false, message: "You cannot like a review you already disliked!" });
        }

        // Toggle like
        if (review.likes.includes(userId)) {
            review.likes.pull(userId); // remove like
        } else {
            review.likes.push(userId); // add like
        }

        await review.save();
        res.json({
            success: true,
            message: "Review like updated successfully!",
            likes: review.likes.length,
            dislikes: review.dislikes.length
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const dislikeReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found!" });
        }

        // Cannot dislike if already liked
        if (review.likes.includes(userId)) {
            return res.status(400).json({ success: false, message: "You cannot dislike a review you already liked!" });
        }

        // Toggle dislike
        if (review.dislikes.includes(userId)) {
            review.dislikes.pull(userId); // remove dislike
        } else {
            review.dislikes.push(userId); // add dislike
        }

        await review.save();
        res.json({
            success: true,
            message: "Review dislike updated successfully!",
            likes: review.likes.length,
            dislikes: review.dislikes.length
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


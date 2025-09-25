import { uploadFile } from "../middleware/imageupload.js";
import { ProductBanner } from "../model/product.banner.model.js";
import productModel from "../model/product.model.js";

export const addProductBannerController = async (req, res) => {
    try {
        const { productId } = req.params;
        const { bannerDescription } = req.body;

        const imageFiles = req.files || [];
        const uploadedImages = [];

        for (const file of imageFiles) {
            const result = await uploadFile(file); // your upload function should return { url }
            uploadedImages.push(result.url);
        }

        const banner = await ProductBanner.create({
            productId,
            bannerDescription,
            bannerImages: uploadedImages,
        });

        res.status(201).json(banner);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to create banner", error });
    }
}

export const getProductBannerController = async (req, res) => {
    try {
        const { productId } = req.params;
        const banner = await ProductBanner.findOne({ productId });
        if (!banner) return res.status(404).json({ message: "Banner not found" });
        res.json(banner);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch banner", error });
    }
}

export const updateProductBannerController = async (req, res) => {
    try {
        const { productId } = req.params;
        const { bannerDescription } = req.body;

        const banner = await ProductBanner.findOne({ productId });
        if (!banner) {
            return res.status(404).json({ message: "Banner not found" });
        }

        // Check if new images are uploaded
        if (
            req.file ||
            (req.files?.mainImage && req.files.mainImage.length > 0) ||
            (req.files?.images && req.files.images.length > 0)
        ) {
            // Delete old images from S3
            if (banner.bannerImages && banner.bannerImages.length > 0) {
                for (const imageUrl of banner.bannerImages) {
                    const key = imageUrl.split("/").pop();
                    try {
                        await s3.send(
                            new DeleteObjectCommand({
                                Bucket: process.env.S3_BUCKET_NAME,
                                Key: `uploads/${key}`,
                            })
                        );
                    } catch (err) {
                        console.error("Failed to delete old image:", err.message);
                    }
                }
            }

            // Upload new images
            const newImages = [];

            const mainFile = req.file || req.files?.mainImage?.[0];
            if (mainFile) {
                const result = await uploadFile(mainFile); // returns { url }
                newImages.push(result.url);
            }

            if (req.files?.images) {
                for (const file of req.files.images) {
                    const result = await uploadFile(file);
                    newImages.push(result.url);
                }
            }

            // Update bannerImages
            if (newImages.length > 0) banner.bannerImages = newImages;
        }

        // Update description if provided
        if (bannerDescription) banner.bannerDescription = bannerDescription;

        await banner.save();

        res.status(200).json({ message: "Banner updated successfully", banner });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update banner", error });
    }
};

export const deleteProductBannerController = async (req, res) => {
    try {
        const { productId } = req.params;
        const banner = await ProductBanner.findOne({ productId });
        if (!banner) return res.status(404).json({ message: "Banner not found" });

        // Delete images from S3
        if (banner.bannerImages && banner.bannerImages.length > 0) {
            for (const img of banner.bannerImages) {
                const key = img.split("/").pop();
                try {
                    await s3.send(
                        new DeleteObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: `uploads/${key}`,
                        })
                    );
                } catch (err) {
                    console.error("Failed to delete image from S3:", err.message);
                }
            }
        }

        await ProductBanner.deleteOne({ productId });
        res.json({ message: "Banner deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete banner", error });
    }
}


import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { uploadFile } from "../middleware/imageupload.js";
import offerModel from "../model/offer.model.js";
import { s3 } from "../utils/aws.config.js";

export const createOfferController = async (req, res) => {
    try {
        const {
            offerTitle,
            offerDesc,
            category,
        } = req.body;

        if (!offerTitle || !offerDesc || !category) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Offer image is required" });
        }

        // Upload image to S3
        const result = await uploadFile(req.file);

        const countdownData = req.body.countdown
            ? JSON.parse(req.body.countdown)
            : undefined;


        // Create Offer
        const newOffer = await offerModel.create({
            offerTitle,
            offerDesc,
            offerImage: result.url,
            category,
            isSpecialOffer: req.body.isSpecialOffer === "true" || false,
            discountPercent: req.body.discountPercent || 0,
            headline: req.body.headline || "",
            subText: req.body.subText || "",
            countdown: countdownData,
        });


        res.status(201).json({ success: true, data: newOffer });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

export const deleteOfferController = async (req, res) => {
    try {
        const { offerId } = req.params;

        if (!offerId) {
            return res.status(400).json({ success: false, message: "Offer ID is required" });
        }

        // Find the offer
        const offer = await offerModel.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        // Delete offer image from S3
        if (offer.offerImage) {
            const key = offer.offerImage.split(".amazonaws.com/").pop();
            try {
                await s3.send(
                    new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: `${key}`,
                    })
                );
                console.log("Offer image deleted from S3:", key);
                await offerModel.findByIdAndDelete(offerId);
                return res.status(200).json({
                    success: true,
                    message: "Offer deleted successfully",
                });
            } catch (err) {
                console.error("Failed to delete offer image from S3:", err.message);
                res.status(500).json({ success: false, message: err.message });
            }
        }

        // Delete offer from DB

    } catch (error) {
        console.error("Delete Offer Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

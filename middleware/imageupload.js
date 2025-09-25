import multer from "multer";
import sharp from "sharp";
import path from "path";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

// AWS S3 Client
const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY
    }
});

// Multer → Memory storage (file is stored in RAM)
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 } // 20 MB
});

// Function to upload a single file to S3
export const uploadFile = async (file) => {
    if (!file) throw new Error("No file provided");

    const ext = path.extname(file.originalname).toLowerCase();

    // If image, optionally convert
    let buffer = file.buffer;
    let contentType = file.mimetype;

    if (file.mimetype.startsWith("image/")) {
        const shouldConvert = ext === ".jfif" || file.mimetype === "application/octet-stream";
        if (shouldConvert) {
            buffer = await sharp(file.buffer).jpeg().toBuffer();
            contentType = "image/jpeg";
        }
    }

    // Generate key
    const fileName = `${Date.now()}_${file.originalname}`;
    const key = `uploads/${fileName}`;

    await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType
    }));

    return {
        url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`,
        key
    };
};

export const uploadPDF = async (file, folder = "uploads") => {
    if (!file) throw new Error("No file provided");

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf") {
        throw new Error("Only PDF files are allowed");
    }

    // Clean file name: replace spaces with underscores
    const cleanName = file.originalname.replace(/\s+/g, "_");

    // Use timestamp + cleaned name for uniqueness
    const timestamp = Date.now();
    const fileName = `${timestamp}-${cleanName}`;
    const key = `${folder}/${fileName}`;

    // Upload PDF to S3
    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: "application/pdf",
        })
    );

    return {
        url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`,
        key,
    };
};


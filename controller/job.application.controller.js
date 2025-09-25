import mongoose from "mongoose";
import { uploadFile, uploadPDF } from "../middleware/imageupload.js";
import jobModel from "../model/job.model.js";
import { sendErrorResponse, sendSuccessResponse } from "../utils/Response.utils.js";
import applicationModel from "../model/application.model.js";
import { deleteS3File } from "../utils/aws.config.js";

export const currentJobController = async (req, res) => {
    try {
        const jobs = await jobModel.find({ isActive: true }).sort({ postedAt: -1 });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getCurrentJobByIdController = async (req, res) => {
    try {
        const { jobId: id } = req.params;
        const job = await jobModel.findById({ _id: id });
        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        res.json(job);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const applyJobController = async (req, res) => {
    try {
        const { id } = req.user; // Assuming user's ID is available in req.user
        const { jobId } = req.params;
        const {
            firstName,
            lastName,
            email,
            mobileNo,
            currentCompany,
            currentCTC,
            expectedCTC,
        } = req.body;

        if (
            !firstName ||
            !lastName ||
            !email ||
            !mobileNo ||
            !currentCompany ||
            !currentCTC ||
            !expectedCTC ||
            !req.file
        ) {
            return sendErrorResponse(res, 400, "All fields including resume are required.");
        }

        const resume = req.file;

        // ✅ Validate file type
        if (!resume.mimetype.startsWith("application/pdf")) {
            return sendErrorResponse(res, 400, "Only PDF files are allowed for resume.");
        }

        // ✅ Validate file size (2MB max)
        if (resume.size > 2 * 1024 * 1024) {
            return sendErrorResponse(res, 400, "Resume size should not exceed 2MB.");
        }

        // ✅ Check valid jobId
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return sendErrorResponse(res, 400, "Invalid Job ID.");
        }

        const job = await jobModel.findById(jobId);
        if (!job) {
            return sendErrorResponse(res, 404, "Job not found.");
        }

        let resumeUrl = null;
        if (req.file) {
            const uploaded = await uploadPDF(req.file);
            resumeUrl = uploaded.url;
        }


        // ✅ Save application
        const newApplication = new applicationModel({
            job: jobId,
            firstName,
            lastName,
            email,
            mobileNo,
            currentCompany,
            currentCTC,
            expectedCTC,
            userId: id,
            resume: resumeUrl,
        });

        await newApplication.save();

        // job model add new applicaiton
        await jobModel.findByIdAndUpdate({ _id: jobId }, { $push: { applications: newApplication._id } })

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully.",
            application: newApplication,
        });

    } catch (error) {
        console.error("Apply Job Error:", error.message);

        if (error.code === 11000) {
            return sendErrorResponse(res, 400, "You have already applied for this job.");
        }

        return sendErrorResponse(res, 500, "Internal Server Error", error.message);
    }
};

const extractKeyFromS3Url = (url) => {
    try {
        const parsedUrl = new URL(url);
        // The pathname includes a leading slash, which we remove.
        const key = parsedUrl.pathname.substring(1);
        if (key) {
            return key;
        }
        return null;
    } catch (error) {
        console.error("Invalid URL provided:", error);
        return null;
    }
};

export const deleteJobApplicationController = async (req, res) => {
    try {
        const { applicationId } = req.params;

        const application = await applicationModel.findById(applicationId);
        if (!application) {
            return res.status(404).json({ message: "Job application not found" });
        }

        // Check resume file stored in DB
        if (application.resume) {
            const fileKey = extractKeyFromS3Url(application.resume); // ✅ use resume instead of fileUrl

            if (fileKey) {
                const deleted = await deleteS3File(fileKey);
                if (deleted) {
                    console.log(`✅ Deleted from S3: ${fileKey}`);
                } else {
                    console.warn("⚠️ Failed to delete from S3, check permissions/key");
                }
            } else {
                console.warn("⚠️ Failed to extract file key from URL, skipping S3 deletion.");
            }
        }

        // Delete application from DB
        await applicationModel.findByIdAndDelete(applicationId);

        return res.json({ message: "Job application deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting job application:", error);
        return res.status(500).json({ message: "Failed to delete job application", error });
    }
};


export const getMyJobapplicationsController = async (req, res) => {
    try {
        const { id } = req.user; // Assuming user's email is available in req.user
        const applications = await applicationModel.find({ userId: id }).populate('job');

        return sendSuccessResponse(res, "Job applications fetched successfully.", applications);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};

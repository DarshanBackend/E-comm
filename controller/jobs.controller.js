import { sendErrorResponse, sendSuccessResponse } from "../utils/Response.utils.js";
import jobModel from "../model/job.model.js"
import mongoose from "mongoose";

export const adminJobsController = async (req, res) => {
    try {
        const jobs = await jobModel.find().sort({ postedAt: -1 });
        return sendSuccessResponse(res, "Jobs fetched successfully", jobs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const createJobController = async (req, res) => {
    if (!req.body.title || !req.body.description || !req.body.location || !req.body.jobType) {
        return sendErrorResponse(res, 400, "All fields are required");
    }
    const job = new jobModel({
        title: req.body.title,
        description: req.body.description,
        location: req.body.location,
        jobType: req.body.jobType,
    });
    try {
        try {
            const newJob = await job.save();
            res.status(201).json(newJob);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Error During Job cfreayte")
    }
}

export const updateJobController = async (req, res) => {
    try {
        const { jobId: id } = req.params;

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }

        const updates = req.body;

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No fields provided to update." });
        }

        // Find and update in one step
        const updatedJob = await jobModel.findByIdAndUpdate(id, updates, {
            new: true,         
            runValidators: true 
        });

        if (!updatedJob) {
            return res.status(404).json({ message: "Job not found." });
        }

        return res.status(200).json({
            message: "Job updated successfully",
            job: updatedJob,
        });

    } catch (err) {
        console.error("Update Job Error:", err);
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        return res.status(500).json({ message: "Server Error" });
    }
};


export const deleteJobController = async (req, res) => {
    try {
        const { jobId: id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        const job = await jobModel.findByIdAndDelete({ _id: id });
        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        res.json({ message: 'Job deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
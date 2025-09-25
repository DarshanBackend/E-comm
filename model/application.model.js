import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    firstName: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    mobileNo: { type: String, required: true },
    currentCompany: { type: String, required: true },
    currentCTC: { type: Number, required: true },
    expectedCTC: { type: Number, required: true },
    resume: { type: String, required: true },
    appliedAt: { type: Date, default: Date.now }
});

// ✅ Prevent duplicate applications for same job & email
applicationSchema.index({ job: 1, email: 1 }, { unique: true });

export default mongoose.model("Application", applicationSchema);

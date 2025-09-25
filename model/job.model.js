import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    jobType: { type: String, required: true }, // Full-time / Part-time etc
    location: { type: String, required: true },
    salary: { type: String },
    createdAt: { type: Date, default: Date.now },
    applications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
});

export default mongoose.model("Job", jobSchema);

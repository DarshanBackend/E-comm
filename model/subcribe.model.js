import mongoose from "mongoose";

const subcribeSchema = mongoose.Schema({
    email: {
        type: String
    }
}, { timestamps: true })

export default mongoose.model("subcribe", subcribeSchema)
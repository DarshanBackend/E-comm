import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
    heroImage: {
        type: String,
        default: null
    },
    blogCategoryId: {
        type: mongoose.Types.ObjectId,
        ref: "blogCatgory",
    },
    blogTitle: {
        type: String,
        default: null
    },
    section: [
        {
            sectionTitle: { type: String, default: null },
            sectionDesc: [
                { type: String, default: null }
            ],
            sectionImg: [
                { type: String, default: null }
            ],
            sectionPoints: [
                { type: String, default: null }
            ],
            sectionOtherInfo: [
                {
                    otherInfoTitle: { type: String, default: null },
                    otherInfoDesc: { type: String, default: null }
                }
            ]
        }
    ]
}, { timestamps: true });

const blogModel = mongoose.model("blog", blogSchema);

export default blogModel;
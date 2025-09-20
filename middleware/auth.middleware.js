import jwt from "jsonwebtoken";
import registerModel from "../model/user.model.js";
import { sendErrorResponse, sendForbiddenResponse, sendUnauthorizedResponse, sendNotFoundResponse } from '../utils/Response.utils.js';
import { config } from 'dotenv'; import sellerModel from "../model/seller.model.js";
config();

export const UserAuth = async (req, res, next) => {
    try {
        // Check if JWT_SECRET is properly configured
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured');
            return sendErrorResponse(res, 500, 'Server configuration error');
        }

        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return sendUnauthorizedResponse(res, "Access denied. No token provided.");
        }

        try {
            const decodedObj = jwt.verify(token, process.env.JWT_SECRET);
            const { id } = decodedObj;

            const user = await registerModel.findById({ _id: id });
            if (!user) {
                return sendNotFoundResponse(res, "User not found");
            }

            req.user = user;
            next();
        } catch (err) {
            console.error('Token verification error:', err);
            return sendUnauthorizedResponse(res, "Invalid token.");
        }
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

export const isAdmin = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== "admin" && !req.user.isAdmin)) {
            return sendUnauthorizedResponse(res, "Access denied. Admin privileges required.");
        }
        next();
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

export const isUser = async (req, res, next) => {
    try {
        if (!req.user) {
            return sendUnauthorizedResponse(res, "Authentication required");
        }
        if (req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Not a regular user.");
        }
        next();
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

export const sellerAuth = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) return res.status(401).json({ success: false, message: "No token provided" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const seller = await sellerModel.findById(decoded._id);
        if (!seller) {
            return res.status(403).json({ success: false, message: "Seller not found or unauthorized" });
        }

        // Normalize user object
        req.user = {
            _id: seller._id.toString(),
            name: seller.name,
            email: seller.email,
            role: seller.role
        };

        next();
    } catch (error) {
        console.error("Seller Auth error:", error);
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

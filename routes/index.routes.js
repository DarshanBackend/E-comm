import express from 'express';
import { AuthController } from '../controller/auth.controller.js';
import { newSellerController, verifySellerMobileOtpController, sellerLoginController, sellerForgetPasswordController, sellerVerifyForgetOtpController, sellerPasswordResetController, sellerGstVerifyAndInsertController, setSellerBusinessAddressController, sellerGstResetOtpController, sellerBankInfoSetController, sellerPickUpAddressSetController, trueSellerAgreementController, getAllSeller, getSeller, verifySellerOtpController } from '../controller/seller.controller.js';
import { createCategory, deleteCategoryById, getAllCategory, getCategoryById, updateCategoryById } from '../controller/category.controller.js';
import { isAdmin, isUser, sellerAuth, UserAuth } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/imageupload.js';
import { getProfileController, getSellerProfileController, getUserAddressController, getUserBillingAddressController, userAddressAddController, userAddressDeleteController, userAddressUpdatecontroller, userBillingAddressAddController, userBillingAddressDeleteController, userBillingAddressUpdatecontroller, userPasswordChangeController, userProfileUpdateController, userRemoveAccountController } from '../controller/profile.controller.js';
import { createProduct, deleteProduct, getAllProduct, getCategoryHierarchy, getProductById, getProductBySubCategory, updateProduct } from '../controller/product.controller.js';
import { addToCartController, deleteCartItemController, getMyCartController, updateCartItemController } from '../controller/cart.controller.js';
import { applyCouponController, createCoupon, deleteCoupon, getAllCoupon, getCouponById, updateCoupon } from '../controller/coupon.controller.js';
import { downloadInvoiceController, getSellerPaymentsController, makeNewPaymentController, myPaymentController, paymentStatusChangeController } from '../controller/payment.controller.js';
import { cancelMyOrderController, deleteMyOrderController, myOrderController, newOrderController, selectUserAddressController, selectUserBillingAddressController, sellerChangeOrderStatusController, updateMyOrderController, userStatusFilterController } from '../controller/order.controller.js';
import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { createMainCategory, deleteMainCategoryById, getAllMainCategory, getMainCategoryById, updateMainCategoryById } from '../controller/mainCategory.controller.js';
import { createSubCategory, deleteSubCategoryById, getAllSubCategory, getSubCategoryById, updateSubCategoryById } from '../controller/subCategory.controller.js';
import { createProductVariant, deleteProductVariant, getAllProductVariant, getProductVarientById, getProductWiseProductVarientdata, updateProductVariant } from '../controller/productVarient.controler.js';
import { createBrand } from '../controller/brand.controller.js';


const indexRouter = express.Router();

//base url = domain/api

//register
indexRouter.post("/new/user", AuthController.newUserRegisterController);

//User login
indexRouter.post("/login", AuthController.userLoginController);
indexRouter.post("/forget/password", AuthController.sendForgotMailOtpController);
indexRouter.post("/verify/forget/password", AuthController.verifyForgetOtpController)
indexRouter.post("/reset/password", AuthController.resetPasswordController);

//seller.router.js
indexRouter.post("/new/seller", newSellerController)
indexRouter.post("/verify/seller/otp", verifySellerMobileOtpController)
indexRouter.post("/seller/login", sellerLoginController)
indexRouter.post("/seller/forget/password", sellerForgetPasswordController);
indexRouter.post("/seller/verify/forget/password", sellerVerifyForgetOtpController)
indexRouter.post("/seller/reset/password", sellerPasswordResetController);


// MainCategory
indexRouter.post("/createMainCategory", UserAuth, isAdmin, createMainCategory)
indexRouter.get("/getAllMainCategory", getAllMainCategory)
indexRouter.get("/getMainCategoryById/:id", getMainCategoryById)
indexRouter.patch("/updateMainCategoryById/:id", UserAuth, isAdmin, updateMainCategoryById)
indexRouter.delete("/deleteMainCategoryById/:id", UserAuth, isAdmin, deleteMainCategoryById)

// Category 
indexRouter.post("/createCategory", UserAuth, isAdmin, createCategory)
indexRouter.get("/getAllCategory", getAllCategory)
indexRouter.get("/getCategoryById/:id", getCategoryById)
indexRouter.patch("/updateCategoryById/:id", UserAuth, isAdmin, updateCategoryById)
indexRouter.delete("/deleteCategoryById/:id", UserAuth, isAdmin, deleteCategoryById)

// SubCategory 
indexRouter.post("/createSubCategory", UserAuth, isAdmin, createSubCategory)
indexRouter.get("/getAllSubCategory", getAllSubCategory)
indexRouter.get("/getSubCategoryById/:id", getSubCategoryById)
indexRouter.patch("/updateSubCategoryById/:id", UserAuth, isAdmin, updateSubCategoryById)
indexRouter.delete("/deleteSubCategoryById/:id", UserAuth, isAdmin, deleteSubCategoryById)

// Brand
indexRouter.post("/createBrand", sellerAuth, upload.fields([{ name: "brandImage", maxCount: 1 }]), createBrand);

// Product
indexRouter.post("/createProduct", sellerAuth, createProduct);
indexRouter.get("/getAllProduct", getAllProduct);
indexRouter.get("/getProductById/:id", getProductById);
indexRouter.patch("/updateProduct/:id", sellerAuth, updateProduct);
indexRouter.delete("/deleteProduct/:id", sellerAuth, deleteProduct);
indexRouter.get("/getProductBySubCategory/:subCategoryId", getProductBySubCategory);
indexRouter.get("/getCategoryHierarchy", getCategoryHierarchy);

// Product
indexRouter.post("/createProductVariant", sellerAuth, upload.fields([{ name: "images", maxCount: 1 }]), createProductVariant);
indexRouter.get("/getAllProductVariant", getAllProductVariant);
indexRouter.get("/getProductVarientById/:id", getProductVarientById);
indexRouter.patch("/updateProductVariant/:variantId", sellerAuth, upload.fields([{ name: "images", maxCount: 1 }]), updateProductVariant);
indexRouter.delete("/deleteProductVariant/:variantId", sellerAuth, deleteProductVariant);
indexRouter.get("/getProductWiseProductVarientdata/:productId", getProductWiseProductVarientdata);

//seller.kyc.router.js
indexRouter.post("/seller/gst/verify", sellerAuth, sellerGstVerifyAndInsertController);
indexRouter.post("/seller/business/address", sellerAuth, setSellerBusinessAddressController);
indexRouter.post("/seller/verify/otp", sellerAuth, verifySellerOtpController)
indexRouter.post("/seller/gst/reset/otp", sellerAuth, sellerGstResetOtpController);

//seller bank detail verify & insert record
indexRouter.post("/seller/bank/insert", sellerAuth, sellerBankInfoSetController);
//seller.pickup.address.js
indexRouter.post("/seller/pickup/address", sellerAuth, sellerPickUpAddressSetController)
//seller agreement accept or not
indexRouter.post('/seller/agreement', sellerAuth, trueSellerAgreementController);


//profile.route.js
indexRouter.get("/user/profile", UserAuth, getProfileController);
//update email,firstname,lastnmae,mobile No;
indexRouter.patch("/user/profile/update", UserAuth, userProfileUpdateController);

//user address
indexRouter.post("/user/address", UserAuth, userAddressAddController);
indexRouter.patch("/user/address/update/:addressId", UserAuth, userAddressUpdatecontroller);
indexRouter.delete("/user/address/delete/:addressId", UserAuth, userAddressDeleteController);
indexRouter.get("/user/address", UserAuth, getUserAddressController);

//user Billingaddress
indexRouter.post("/user/billingaddress", UserAuth, userBillingAddressAddController);
indexRouter.patch("/user/billingaddress/update/:billingaddressId", UserAuth, userBillingAddressUpdatecontroller);
indexRouter.delete("/user/billingaddress/delete/:billingaddressId", UserAuth, userBillingAddressDeleteController);
indexRouter.get("/user/billingaddress", UserAuth, getUserBillingAddressController);

//cart.route.js
indexRouter.post("/add/cart/:productId", UserAuth, addToCartController);
indexRouter.get("/my/cart", UserAuth, getMyCartController)
indexRouter.patch("/update/cart/:productId", UserAuth, updateCartItemController)
indexRouter.delete("/delete/item/:cartItemId", UserAuth, deleteCartItemController)


//change password
indexRouter.post("/user/change/password", UserAuth, userPasswordChangeController);
//delete Account
indexRouter.delete("/user/remove/account", UserAuth, userRemoveAccountController);
//seller.profile
indexRouter.get("/seller/profile", sellerAuth, getSellerProfileController);

//admin api
indexRouter.get("/getAllnewUser", AuthController.getAllnewUser)
indexRouter.get("/getUser", UserAuth, AuthController.getUser)
indexRouter.get("/getAllSeller", getAllSeller)
indexRouter.get("/getSeller", sellerAuth, getSeller)

// Coupon
indexRouter.post("/seller/createCoupon", sellerAuth, createCoupon);
indexRouter.get("/getAllCoupon", UserAuth, getAllCoupon);
indexRouter.get("/getCouponById/:id", UserAuth, getCouponById);
indexRouter.patch("/seller/updateCoupon/:id", sellerAuth, updateCoupon);
indexRouter.delete("/seller/deleteCoupon/:id", sellerAuth, deleteCoupon);
indexRouter.post("/apply-coupon", applyCouponController);


//order.routes.js
indexRouter.put("/users/select-address/:addressId", UserAuth, selectUserAddressController)
indexRouter.put("/users/select-billingaddress/:billingaddressId", UserAuth, selectUserBillingAddressController)
indexRouter.post("/new/order", UserAuth, newOrderController)
indexRouter.patch("/update/myorder/:orderId", UserAuth, updateMyOrderController);
indexRouter.delete("/delete/myorder/:itemId", UserAuth, deleteMyOrderController);
indexRouter.post("/user/order/cancel/:itemId", UserAuth, cancelMyOrderController);
indexRouter.get("/my/order", UserAuth, myOrderController);
indexRouter.get("/status/filter", UserAuth, userStatusFilterController);
indexRouter.patch("/seller/order/status/:orderId/:itemId", sellerAuth, sellerChangeOrderStatusController);




// payment.route.js
indexRouter.post("/new/payment", UserAuth, makeNewPaymentController);
indexRouter.get("/my/payments", UserAuth, myPaymentController);
indexRouter.get("/all/payments", sellerAuth, getSellerPaymentsController);
indexRouter.get("/download/invoice/:paymentId", UserAuth, downloadInvoiceController);
indexRouter.patch("/payment/status/:paymentId", sellerAuth, paymentStatusChangeController);

const s3Client = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
});

// List all files in bucket
indexRouter.get("/listBucket", async (req, res) => {
    try {
        const command = new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET_NAME });
        const response = await s3Client.send(command);

        const files = (response.Contents || []).map(file => ({
            Key: file.Key,
            Size: file.Size,
            LastModified: file.LastModified,
            ETag: file.ETag,
            StorageClass: file.StorageClass,
        }));

        return res.json({ success: true, files });
    } catch (err) {
        console.error("Error listing bucket:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Delete a file from bucket
indexRouter.delete("/deleteBucketFile", async (req, res) => {
    try {
        const { key } = req.body; // example: "images/1757483363902-9.jfif"
        if (!key) return res.status(400).json({ success: false, message: "File key is required" });

        await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
        }));

        return res.json({ success: true, message: `File deleted successfully: ${key}` });
    } catch (err) {
        console.error("Error deleting file:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

export default indexRouter;
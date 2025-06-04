const express = require("express");
const Account = require("../src/class/Account");
const G = require("../src/tools/Glossary");
const R = require("../src/tools/Reply")

const router = express.Router();

router.post("/add", async (req, res) => {
    const { data } = req.body;
    try {
        const accountData = new Account(data);
        const result = await accountData.save();
        if (!result) {
            return R.response(false, G.errorSaved, res, 500);
        }
        return R.response(true, result.toDisplay(), res, 200);
    } catch (error){
        return R.handleError(res, error.message, 500);
    }
})

// // ===============================
// // 3. CONTROLLER LAYER (AccountController.js)
// // ===============================
// const Account = require('../src/class/Account');
//
// class AccountController {
//
//     // POST /accounts
//     static async create(req, res) {
//         try {
//             // Create instance from request data
//             const accountData = new Account("req.body");
//
//             // Save with all business logic
//             await accountData.save();
//
//             res.status(201).json({
//                 success: true,
//                 data: accountData.toDisplay(),
//                 message: 'Account created successfully'
//             });
//
//         } catch (error) {
//             res.status(400).json({
//                 success: false,
//                 message: error.message
//             });
//         }
//     }
//
//     // GET /accounts/:id
//     static async getById(req, res) {
//         try {
//             const account = await Account.load(req.params.id);
//
//             res.json({
//                 success: true,
//                 data: account.toJSON()
//             });
//
//         } catch (error) {
//             res.status(404).json({
//                 success: false,
//                 message: error.message
//             });
//         }
//     }
//
//     // PUT /accounts/:id
//     static async update(req, res) {
//         try {
//             const account = await Account.load(req.params.id);
//
//             // Update properties
//             Object.assign(account, req.body);
//
//             // Save with business logic
//             await account.save();
//
//             res.json({
//                 success: true,
//                 data: account.toDisplay(),
//                 message: 'Account updated successfully'
//             });
//
//         } catch (error) {
//             res.status(400).json({
//                 success: false,
//                 message: error.message
//             });
//         }
//     }
//
//     // PUT /accounts/:id/activate
//     static async activate(req, res) {
//         try {
//             const account = await Account.load(req.params.id);
//             await account.activate();
//
//             res.json({
//                 success: true,
//                 data: account.toDisplay(),
//                 message: 'Account activated successfully'
//             });
//
//         } catch (error) {
//             res.status(400).json({
//                 success: false,
//                 message: error.message
//             });
//         }
//     }
// }
//
// module.exports = AccountController;
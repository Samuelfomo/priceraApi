const express = require("express");
const Account = require("../src/class/Account");
const G = require("../src/tools/Glossary");
const R = require("../src/tools/Reply")
const Company = require("../src/class/Company");

const router = express.Router();

router.post("/add", async (req, res) => {
    const { guid, code, company } = req.body;
    try {
        if (guid){
            if (!guid || typeof guid !== 'number' && typeof guid !== 'string' || guid.toString().trim().length < 6) {
                return R.handleError(res, `${G.errorDataVerification}: GUID invalide`, 400);
            }
        }
        if(!company || typeof company !== 'number' || isNaN(company) || company.toString().trim().length < 6) {
            return R.handleError(res, `${G.errorMissingFields}: company`, 400);
        }

        if (code !== undefined && code !== null) {
            if (typeof code !== 'string' || !code.trim()) {
                return R.handleError(res, 'Le code doit être une chaîne non vide ou null', 400);
            }
        }
        const companyFind = await Company.getByGuid(company);
        if (!companyFind) {
            return R.response(false, `${G.errorGuid}: company`, res, 404);
        }
        const accountData = {
            guid: Number(guid),
            code: code,
            company: companyFind.id,
        }
        const accountInstance = new Account(accountData);
        const result = await accountInstance.save();
        if (!result) {
            return R.response(false, G.errorSaved, res, 500);
        }
        await result.loadCompany();
        return R.response(true, result.toDisplay(), res, 200);
    } catch (error){
        return R.handleError(res, error.message, 500);
    }
})

router.get("/all", async (req, res) => {
    try {
        const result = await Account.getAllWithCompany();
        if (!result) {
            return R.response(false, 'list_is_empty', res, 500);
        }
        return R.response(true, result, res, 200);
    } catch (error){
        return R.handleError(res, error.message, 500);
    }
})
router.put("/blocked", async (req, res) => {
    const { account } = req.body;
    try {
        if (!account || typeof account !== 'number' || isNaN(account) || account.toString().length < 6) {
            return R.handleError(res, `${G.errorDataVerification}: account`, 400);
        }
        const result = await Account.getByGuid(account);
        if (!result) {
            return R.response(false, G.errorGuid, res, 500);
        }
        await result.deactivate();
        await result.loadCompany();
        return R.response(true, result.toDisplay(), res, 200);
    } catch (error){
        return R.handleError(res, error.message, 500);
    }
})
router.put("/Removed", async (req, res) => {
    const { account } = req.body;
    try {
        if (!account || typeof account !== 'number' || isNaN(account) || account.toString().length < 6) {
            return R.handleError(res, `${G.errorDataVerification}: account`, 400);
        }
    } catch (error){
        return R.handleError(res, error.message, 500);
    }
})

module.exports = router;
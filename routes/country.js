const express = require('express');
const path = require("path");
const paths = require("../config/paths");
const Country =  require("../src/class/Country");
const R = require("../src/tools/Reply");
const W = require("../src/tools/Glossary");
const router = express.Router();

router.post('/add', async (req, res) => {
    const { alpha2, alpha3, dialcode, fr, en, guid } = req.body;
    try {
        if (!alpha2?.trim() || !alpha3?.trim() || !dialcode?.trim() || !fr?.trim() || !en?.trim()){
            return R.handleError(res, W.errorMissingFields, 400);
        }
        const countryData = new Country(alpha2, alpha3, dialcode, fr, en, guid, null);
        const result = await countryData.saved();
        if (!result) {
            return  R.response(false, W.errorSaved, res, 500);
        }
        return R.response(true, result.toJson(), res, 200);
    }catch(error) {
        return R.handleError(res, error.message, 500);
    }
});

// router.get('/all', async (req, res) => {
//     try {
//
//     }
//     catch(error) {
//         return R.handleError(res, error.message, 500);
//     }
// })
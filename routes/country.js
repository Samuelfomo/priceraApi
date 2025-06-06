const express = require('express');
const Country =  require("../src/class/Country");
const R = require("../src/tools/Reply");
const G = require("../src/tools/Glossary");
const router = express.Router();

router.post('/add', async (req, res) => {
    const { alpha2, alpha3, dialcode, fr, en, guid } = req.body;
    try {
        if (!alpha2?.trim() || !alpha3?.trim() || !Number(dialcode) || !fr?.trim() || !en?.trim()){
            return R.handleError(res, G.errorMissingFields, 400);
        }
        if (guid){
            if (guid.toString().length < 6){
                return R.handleError(res, `${G.errorDataVerification}`, 400);
            }
        }
        const countryData = new Country(req.body);
        const result = await countryData.save();
        if (!result) {
            return  R.response(false, G.errorSaved, res, 500);
        }
        return R.response(true, result.toDisplay(), res, 200);
    }catch(error) {
        return R.handleError(res, error.message, 500);
    }
});
router.get('/all', async (req, res) => {
    try {
        const result = await Country.getAll();
        if (!result) {
            return  R.response(false, G.errorId, res, 500);
        }
        return R.response(true, result, res, 200);
    }
    catch(error) {
        return R.handleError(res, error.message, 500);
    }
});
router.put('/getByAttribut', async (req, res) => {
    try {
        const { attribut, value } = req.body;

        if (!attribut?.trim() || !value) {
            return R.handleError(res, G.errorMissingFields, 400);
        }

        const validAttributes = ['guid', 'alpha2', 'alpha3'];

        if (!validAttributes.includes(attribut)) {
            return R.handleError(res, `Attribut invalide: ${attribut}`, 400);
        }

        const result = await Country.getByGuid(attribut, value);

        if (!result) {
            return R.response(false, G.errorId, res, 404);
        }

        return R.response(true, result.toDisplay(), res, 200);

    } catch (error) {
        return R.handleError(res, error.message, 500);
    }
});

module.exports = router;
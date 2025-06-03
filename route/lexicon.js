const express = require('express');
const {Lexicon} = require("../lib/class/Lexicon");
const R = require("../lib/tool/Reply");

const router = express.Router();


router.post('/add', async (req, res) => {
    try {
        const { english, french, portable, guid } = req.body;
        if (!english || !french || typeof portable === 'undefined' || typeof portable !== 'boolean') {
            return R.handleError(res, "missing_required_fields", 400);
        }

        const truncatedEnglish = english.length > 120 ? english.slice(0, 120) : english;
        const reference = Lexicon.toOpenCamelCase(truncatedEnglish);

        const lexicon = new Lexicon(reference, truncatedEnglish, french, portable, null, guid);

        // let entry;
        // if (guid) {
        //     entry = await lexicon.save();
        // } else {
        //     entry = await lexicon.save();
        // }
        const entry = await lexicon.save();

        return R.response(true, entry.toJson(), res, 200);

    } catch (error) {
        return R.handleError(res, error.message, 500);
    }
});

router.get('/list_all', async (req, res) => {
    try {
        const entries = await Lexicon.list_all();
        if (!entries.length) {
            return R.response(false, 'list_is_empty', res, 200);
        }
        return R.response(true, entries, res, 200);
    } catch (error) {
        return R.response(false, error.message, res, 500);
    }
});

router.put('/list', async (req, res) => {
    try {
        const {portable} = req.body;

        if (typeof portable === 'undefined' || typeof portable !== 'boolean')
            return R.handleError(res, "missing_required_fields", 400);

        const entries = await Lexicon.list(portable);  // Ensure we await the list method
        if (!entries.length)
            return R.response(false, 'list_is_empty', res, 200);
        return R.response(true, entries, res, 200);
    } catch (error) {
        return R.handleError(res, error.message, 500)
    }
});
router.put('/delete', async (req, res) => {
    try {
        const {guids} = req.body;
        if (!guids)
            return R.handleError(res, "missing_required_fields", 400);

        for (const guid of guids) {
            const lexicon = new Lexicon(null, null, null, false, null, guid);
            await lexicon.delete();
        }
        return R.response(true, 'deleted_successfully', res, 200);
    } catch (error) {
        return R.handleError(res, error.message, 500);
    }
});


// Middleware to intercept undefined requests
router.use((req, res) => {
    if (req.method === 'GET') {
        return R.handleError(res, `The method ${req.method} on ${req.url} is not defined`, 404);
    }
});

module.exports = router;
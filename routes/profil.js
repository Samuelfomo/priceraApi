const Profil = require('../src/class/Profil');
const G = require('../src/tools/Glossary');
const R = require('../src/tools/Reply');

const router = require('express').Router();

router.post('/add', async (req, res) => {
    const { guid, name, reference, description } = req.body;
    try {
        if (!name || !reference) {
            return R.response(false, G.errorMissingFields, res, 400);
        }
        const profil = new Profil({
            guid: guid,
            name: name,
            reference: reference,
            description: description
        })
        const result = await profil.save();
        if (!result) {
            return R.response(false, G.errorSaved, res, 500);
        }
        return R.response(true, result.toDisplay(), res, 200);
    } catch (error) {
        return R.handleError(res, error.message, 500);
    }
});

module.exports = router;
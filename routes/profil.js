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
        return R.response(true, result.toDisplay(), res, 201);
    } catch (error) {
        return R.handleError(res, error.message, 500);
    }
});

router.get('/all', async (req, res) => {
    try {
        const result = await Profil.getAll();
        if (!result) {
            return R.response(false, G.errorId, res, 500);
        }
        return R.response(true, result, res, 200);
    } catch (error){
        return R.handleError(res, error.message, 500);
    }
})
router.put('/removed', async (req, res) => {
    const { profil } = req.body;
    try {
        if (!profil || isNaN(profil) || profil.toString().trim() < 6) {
            return R.response(false, G.errorMissingFields, res, 400);
        }
        const result = await Profil.getByAttribute('guid', profil);
        if (!result) {
            return R.response(false, "profil_not_found", res, 500);
        }
        const removed = await result.delete();
        if (!removed) {
            return R.response(false, "profil_deleted_failed", res, 500);
        }
        return R.response(true, "profil_deleted_successful", res, 200);
    } catch (error) {
        return R.handleError(res, error.message, 500);
    }
})

module.exports = router;
const User = require('../src/class/User');
const Profil = require('../src/class/Profil');
const Account = require('../src/class/Account');
const G = require("../src/tools/Glossary");
const R = require("../src/tools/Reply");
const Logger = require("../src/tools/logger");

const router = require("express").Router();

router.post("/add", async (req, res) => {
    const { guid, name, profil, account, mobile, email } = req.body;

    try {
        if (!name || isNaN(profil) || profil.toString().trim().length<6 || isNaN(account) || account.toString().trim().length<6 || !mobile || !email) {
            return R.handleError(res, G.errorMissingFields, 400);
        }
        if (!User.isValidEmail(email)) {
            return R.handleError(res, "Format d'email invalide", 400);
        }
        if (!User.isValidMobile(mobile)) {
            return R.handleError(res, "Numéro de mobile invalide", 400);
        }
        const profilFind = await Profil.getByAttribute('guid', profil);
        if (!profilFind) {
            return R.handleError(res, `${G.errorGuid}: profil`, 400);
        }
        const accountFind = await Account.getByAttribut('guid', account);
        if (!accountFind) {
            return R.handleError(res, `${G.errorGuid}: account`, 400);
        }
        const user = new User({guid: guid, name: name, profil: profilFind.id, account: accountFind.id, mobile: mobile, email: email});
        const validation = user.validate();
        if (!validation.isValid) {
            return R.handleError(res, `Données invalides: ${validation.errors.join(', ')}`, 400);
        }
        const savedUser = await user.save();
        await savedUser.loadAssociations();
        return R.response(true, savedUser.toDisplay(), res, 201);
    } catch (error) {
        Logger.logError('Erreur lors de la création de l\'utilisateur:', error);
        return R.handleError(res, error.message, 500);
    }
});

router.get("/all", async (req, res) => {
    try {
        const result = await User.getAllWithAssociation();
        if (result.data.length === 0) {
            return R.response(false, G.errorId, res, 404);
        }
        return R.response(true, result, res, 200);
    } catch (error) {
        return R.handleError(res, error.message, 500);
    }
})

module.exports = router;
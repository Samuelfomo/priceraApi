const User = require('../src/class/User');
const G = require("../src/tools/Glossary");
const R = require("../src/tools/Reply");
const Logger = require("../src/tools/logger");

const router = require("express").Router();

router.post("/add", async (req, res) => {
    const { guid, name, profil, account, mobile, email } = req.body;

    try {
        if (!name || !profil || !account || !mobile || !email) {
            return R.handleError(res, "Tous les champs obligatoires doivent être renseignés", 400);
        }
        if (!User.isValidEmail(email)) {
            return R.handleError(res, "Format d'email invalide", 400);
        }
        if (!User.isValidMobile(mobile)) {
            return R.handleError(res, "Numéro de mobile invalide", 400);
        }
        const user = new User({guid: guid, name: name, profil: profil, account: account, mobile: mobile, email: email});
        const validation = user.validate();
        if (!validation.isValid) {
            return R.handleError(res, `Données invalides: ${validation.errors.join(', ')}`, 400);
        }
        const savedUser = await user.save();
        await savedUser.loadAssociations();
        return R.response(true, savedUser.toDisplay(), res, 200);
    } catch (error) {
        Logger.logError('Erreur lors de la création de l\'utilisateur:', error);
        return R.handleError(res, error.message, 500);
    }
});

module.exports = router;
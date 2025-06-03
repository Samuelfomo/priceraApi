// const express = require('express');
// const app = express();
// const port = process.env.PORT || 3000;
// const host = process.env.HOST || '127.0.0.1';
// // app.use(express.static('public'));
// // app.use(express.urlencoded({extended: true}));
// app.use(express.json());
// app.listen(port, host, () => {
//     console.log(`Server started at ${host}:${port}`);
// });

const express = require('express');
const cors = require('cors');
const app = express();
const host = '192.168.100.103';
// const host = '127.0.0.1';
const port = 3000;
const path = require('path');
const paths = require('./config/paths');
const LexiconModel = require(path.join(paths.MDL_DIR, 'LexiconModel'));
const CountryModel = require(path.join(paths.MDL_DIR, 'CountryModel'));
const ProfilModel = require(path.join(paths.MDL_DIR, 'ProfilModel'));
const FormulaModel = require(path.join(paths.MDL_DIR, 'FormulaModel'));
const ProductModel = require(path.join(paths.MDL_DIR, 'ProductModel'));
const CompanyModel = require(path.join(paths.MDL_DIR, 'CompanyModel'));
const AccountModel = require(path.join(paths.MDL_DIR, 'AccountModel'));
const UserModel = require(path.join(paths.MDL_DIR, 'UserModel'));
const SubscriptionModel = require(path.join(paths.MDL_DIR, 'SubscriptionModel'));

app.use(cors());
app.use(express.json());

const logger = require('./config/logger');
const { authenticate } = require("./lib/mdl/odbc"); // ✅ remonte ici avant l'appel

async function main() {
    try {
        // await authenticate()
        //     .then(() => {
        //         console.log('✅ Connexion PostgreSQL réussie !');
        //     })
        //     .catch((err) => {
        //         console.error('❌ Connexion échouée :', err);
        //     });
        await LexiconModel.initialize();
        await CountryModel.initialize();
        await ProfilModel.initialize();
        await FormulaModel.initialize();
        await ProductModel.initialize();
        await CompanyModel.initialize();
        await AccountModel.initialize();
        await UserModel.initialize();
        await SubscriptionModel.initialize();
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }

    setTimeout(() => {
        console.log('Serveur opérationnel. Prêt à recevoir des requêtes...');
    }, 1000);
}

main().then(r => {
    console.log("Here is the section Router");
    const lexiconRoute = require(path.join(paths.ROUTER, 'lexicon'));
    app.use("/lexicon", lexiconRoute);
});

// process.on('uncaughtException', (err) => {
//     logger.logError(`Uncaught Exception: ${err.message}\n${err.stack}`);
//     process.exit(1);
// });
//
// process.on('unhandledRejection', (reason, promise) => {
//     logger.logError(`Unhandled Rejection: ${reason}`);
//     process.exit(1);
// });

app.listen(port, host, async () => {
    console.log(`Server running on ${host}:${port}`);
});

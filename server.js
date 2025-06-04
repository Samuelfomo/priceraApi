const express = require('express');
const cors = require('cors');
const app = express();
const host = '192.168.100.103';
// const host = '127.0.0.1';
const port = 3000;
const path = require('path');
const paths = require('./config/paths');

// Import des modèles
const LexiconModel = require(path.join(paths.MDL_DIR, 'LexiconModel'));
const CountryModel = require(path.join(paths.MDL_DIR, 'CountryModel'));
const ProfilModel = require(path.join(paths.MDL_DIR, 'ProfilModel'));
const FormulaModel = require(path.join(paths.MDL_DIR, 'FormulaModel'));
const ProductModel = require(path.join(paths.MDL_DIR, 'ProductModel'));
const CompanyModel = require(path.join(paths.MDL_DIR, 'CompanyModel'));
const AccountModel = require(path.join(paths.MDL_DIR, 'AccountModel'));
const UserModel = require(path.join(paths.MDL_DIR, 'UserModel'));
const SubscriptionModel = require(path.join(paths.MDL_DIR, 'SubscriptionModel'));

// Middleware
app.use(cors());
app.use(express.json());

const logger = require('./src/tools/logger');

/**
 * Initialise tous les modèles avec gestion d'erreur
 */
async function initializeModels() {
    const models = [
        { name: 'LexiconModel', instance: LexiconModel },
        { name: 'CountryModel', instance: CountryModel },
        { name: 'ProfilModel', instance: ProfilModel },
        { name: 'FormulaModel', instance: FormulaModel },
        { name: 'ProductModel', instance: ProductModel },
        { name: 'CompanyModel', instance: CompanyModel },
        { name: 'AccountModel', instance: AccountModel },
        { name: 'UserModel', instance: UserModel },
        { name: 'SubscriptionModel', instance: SubscriptionModel }
    ];

    for (const model of models) {
        try {
            console.log(`Initializing ${model.name}...`);
            await model.instance.initialize();
            console.log(`✅ ${model.name} initialized successfully`);
        } catch (error) {
            console.error(`❌ Failed to initialize ${model.name}:`, error);
            throw new Error(`Model initialization failed for ${model.name}: ${error.message}`);
        }
    }
}

/**
 * Fonction principale d'initialisation
 */
async function main() {
    try {
        console.log('🚀 Starting application initialization...');

        // Initialiser tous les modèles
        await initializeModels();

        console.log('✅ All models initialized successfully');
        console.log('🎯 Application ready to handle requests');

        // Initialiser les routes après l'initialisation des modèles
        await initializeRoutes();

    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        process.exit(1); // Arrêter l'application en cas d'échec critique
    }
}

/**
 * Initialise les routes
 */
async function initializeRoutes() {
    try {
        console.log('📍 Initializing routes...');

        // Route pour les lexicons
        const lexiconRoute = require(path.join(paths.ROUTER, 'lexicon'));
        app.use("/lexicon", lexiconRoute);

        // Ajouter d'autres routes ici...
        // const accountRoute = require(path.join(paths.ROUTER, 'account'));
        // app.use("/account", accountRoute);

        // Route de santé pour vérifier l'état du serveur
        app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // Route par défaut
        app.get('/', (req, res) => {
            res.json({
                message: 'API Server is running',
                version: '1.0.0',
                endpoints: [
                    '/health',
                    '/lexicon'
                ]
            });
        });

        console.log('✅ Routes initialized successfully');

    } catch (error) {
        console.error('❌ Failed to initialize routes:', error);
        throw error;
    }
}

/**
 * Gestion gracieuse de l'arrêt du serveur
 */
async function gracefulShutdown(signal) {
    console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);

    try {
        // Fermer toutes les connexions de base de données
        const models = [
            LexiconModel, CountryModel, ProfilModel, FormulaModel,
            ProductModel, CompanyModel, AccountModel, UserModel, SubscriptionModel
        ];

        for (const model of models) {
            if (model && typeof model.close === 'function') {
                await model.close();
            }
        }

        console.log('✅ All database connections closed');
        console.log('👋 Graceful shutdown completed');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
    }
}

/**
 * Gestionnaire d'erreurs global
 */
function setupErrorHandlers() {
    // Erreurs non capturées
    process.on('uncaughtException', (err) => {
        console.error('💥 Uncaught Exception:', err);
        logger.logError(`Uncaught Exception: ${err.message}\n${err.stack}`);
        process.exit(1);
    });

    // Promesses rejetées non gérées
    process.on('unhandledRejection', (reason, promise) => {
        console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
        logger.logError(`Unhandled Rejection: ${reason}`);
        process.exit(1);
    });

    // Signaux d'arrêt
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

/**
 * Middleware de gestion d'erreurs pour Express
 */
app.use((err, req, res, next) => {
    console.error('Express Error:', err);
    logger.logError(`Express Error: ${err.message}\n${err.stack}`);

    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// /**
//  * Middleware pour les routes non trouvées
//  */
// app.use('*', (req, res) => {
//     res.status(404).json({
//         error: 'Not Found',
//         message: `Route ${req.originalUrl} not found`
//     });
// });

// Configuration des gestionnaires d'erreurs
setupErrorHandlers();

// Démarrage de l'application
main()
    .then(() => {
        app.listen(port, host, () => {
            console.log(`🌐 Server running on http://${host}:${port}`);
            console.log(`📊 Health check available at: http://${host}:${port}/health`);
            console.log('🎉 Server ready to handle requests!');
        });
    })
    .catch((error) => {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    });

// const express = require('express');
// const cors = require('cors');
// const app = express();
// const host = '192.168.100.103';
// // const host = '127.0.0.1';
// const port = 3000;
// const path = require('path');
// const paths = require('./config/paths');
// const LexiconModel = require(path.join(paths.MDL_DIR, 'LexiconModel'));
// const CountryModel = require(path.join(paths.MDL_DIR, 'CountryModel'));
// const ProfilModel = require(path.join(paths.MDL_DIR, 'ProfilModel'));
// const FormulaModel = require(path.join(paths.MDL_DIR, 'FormulaModel'));
// const ProductModel = require(path.join(paths.MDL_DIR, 'ProductModel'));
// const CompanyModel = require(path.join(paths.MDL_DIR, 'CompanyModel'));
// const AccountModel = require(path.join(paths.MDL_DIR, 'AccountModel'));
// const UserModel = require(path.join(paths.MDL_DIR, 'UserModel'));
// const SubscriptionModel = require(path.join(paths.MDL_DIR, 'SubscriptionModel'));
//
// app.use(cors());
// app.use(express.json());
//
// const logger = require('./src/tools/logger');
// const { authenticate } = require("./src/model/odbc"); // ✅ remonte ici avant l'appel
//
// async function main() {
//     try {
//         // await authenticate()
//         //     .then(() => {
//         //         console.log('✅ Connexion PostgreSQL réussie !');
//         //     })
//         //     .catch((err) => {
//         //         console.error('❌ Connexion échouée :', err);
//         //     });
//         await LexiconModel.initialize();
//         await CountryModel.initialize();
//         await ProfilModel.initialize();
//         await FormulaModel.initialize();
//         await ProductModel.initialize();
//         await CompanyModel.initialize();
//         await AccountModel.initialize();
//         await UserModel.initialize();
//         await SubscriptionModel.initialize();
//         console.log('Application initialized successfully');
//     } catch (error) {
//         console.error('Failed to initialize application:', error);
//     }
//
//     setTimeout(() => {
//         console.log('Serveur opérationnel. Prêt à recevoir des requêtes...');
//     }, 1000);
// }
//
// main().then(r => {
//     console.log("Here is the section Router");
//     const lexiconRoute = require(path.join(paths.ROUTER, 'lexicon'));
//     app.use("/lexicon", lexiconRoute);
// });
//
// // process.on('uncaughtException', (err) => {
// //     logger.logError(`Uncaught Exception: ${err.message}\n${err.stack}`);
// //     process.exit(1);
// // });
// //
// // process.on('unhandledRejection', (reason, promise) => {
// //     logger.logError(`Unhandled Rejection: ${reason}`);
// //     process.exit(1);
// // });
//
// app.listen(port, host, async () => {
//     console.log(`Server running on ${host}:${port}`);
// });

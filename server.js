const express = require('express');
const cors = require('cors');
const app = express();
const host = '192.168.100.103';
// const host = '127.0.0.1';
const port = 3000;
const path = require('path');
const paths = require('./config/paths');

// Import de la classe Database
const Database = require(path.join(paths.MDL_DIR, 'Database'));

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
 * Initialise toutes les tables de la base de données
 */
async function initializeTables() {
    try {
        console.log('🗄️  Starting database tables initialization...');

        // Récupérer les instances Sequelize des modèles
        const models = [
            LexiconModel.getModel ? LexiconModel.getModel() : LexiconModel,
            CountryModel.getModel ? CountryModel.getModel() : CountryModel,
            ProfilModel.getModel ? ProfilModel.getModel() : ProfilModel,
            FormulaModel.getModel ? FormulaModel.getModel() : FormulaModel,
            ProductModel.getModel ? ProductModel.getModel() : ProductModel,
            CompanyModel.getModel ? CompanyModel.getModel() : CompanyModel,
            AccountModel.getModel ? AccountModel.getModel() : AccountModel,
            UserModel.getModel ? UserModel.getModel() : UserModel,
            SubscriptionModel.getModel ? SubscriptionModel.getModel() : SubscriptionModel
        ].filter(model => model !== null && model !== undefined);

        // Options d'initialisation
        const initOptions = {
            force: process.env.DB_FORCE_SYNC === 'true' || false,
            alter: process.env.DB_ALTER_SYNC === 'true' || true
        };

        // Utiliser la méthode statique de Database pour initialiser les tables
        await Database.initializeTables(models, initOptions);

        console.log('✅ Database tables initialized successfully');
        return true;

    } catch (error) {
        console.error('❌ Failed to initialize database tables:', error);
        throw new Error(`Database initialization failed: ${error.message}`);
    }
}

/**
 * Vérifie que tous les modèles sont correctement chargés
 */
function validateModels() {
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
        if (!model.instance) {
            throw new Error(`${model.name} failed to load`);
        }
        if (typeof model.instance.getModel !== 'function') {
            console.warn(`⚠️  ${model.name} doesn't have getModel() method`);
        }
    }

    console.log('✅ All models validated successfully');
}

/**
 * Fonction principale d'initialisation
 */
async function main() {
    try {
        console.log('🚀 Starting application initialization...');

        // 1. Valider que tous les modèles sont chargés
        validateModels();

        // 2. Initialiser les tables de la base de données
        await initializeTables();

        console.log('✅ Database and models initialized successfully');
        console.log('🎯 Application ready to handle requests');

        // 3. Initialiser les routes après l'initialisation complète
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
        const countryRoute = require(path.join(paths.ROUTER, 'country'));
        const companyRoute = require(path.join(paths.ROUTER, 'company'));
        const accountRoute = require(path.join(paths.ROUTER, 'account'));
        const userRoute = require(path.join(paths.ROUTER, 'user'));
        const profilRoute = require(path.join(paths.ROUTER, 'profil'));
        app.use("/lexicon", lexiconRoute);
        app.use("/country", countryRoute);
        app.use("/company", companyRoute);
        app.use("/account", accountRoute);
        app.use("/user", userRoute);
        app.use("/profil", profilRoute);

        // Ajouter d'autres routes ici...
        // const accountRoute = require(path.join(paths.ROUTER, 'account'));
        // app.use("/account", accountRoute);

        // Route de santé pour vérifier l'état du serveur
        app.get('/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: 'Connected'
            });
        });

        // Route pour vérifier les statistiques de la base de données
        app.get('/db-stats', (req, res) => {
            try {
                // Créer une instance temporaire pour accéder aux stats
                const tempDb = Object.create(Database.prototype);
                tempDb._init();
                const stats = tempDb.getPoolStats();

                res.json({
                    status: 'OK',
                    pool_stats: stats,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    status: 'ERROR',
                    message: 'Failed to get database stats',
                    error: error.message
                });
            }
        });

        // Route par défaut
        app.get('/', (req, res) => {
            res.json({
                message: 'API Server is running',
                version: '1.0.0',
                endpoints: [
                    '/health',
                    '/db-stats',
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
        // Fermer toutes les connexions de base de données via les modèles
        const models = [
            LexiconModel, CountryModel, ProfilModel, FormulaModel,
            ProductModel, CompanyModel, AccountModel, UserModel, SubscriptionModel
        ];

        console.log('🔌 Closing database connections...');

        for (const model of models) {
            if (model && typeof model.close === 'function') {
                try {
                    await model.close();
                    console.log(`✅ ${model.constructor?.name || 'Model'} connection closed`);
                } catch (error) {
                    console.error(`❌ Error closing ${model.constructor?.name || 'Model'}:`, error);
                }
            }
        }

        // Fermer le pool de connexions principal si accessible
        try {
            const tempDb = Object.create(Database.prototype);
            tempDb._init();
            await tempDb.closePool();
        } catch (error) {
            console.error('❌ Error closing main database pool:', error);
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
        gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Promesses rejetées non gérées
    process.on('unhandledRejection', (reason, promise) => {
        console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
        logger.logError(`Unhandled Rejection: ${reason}`);
        gracefulShutdown('UNHANDLED_REJECTION');
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
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

/**
 * Middleware pour les routes non trouvées
 */
// app.use('*', (req, res) => {
//     res.status(404).json({
//         error: 'Not Found',
//         message: `Route ${req.originalUrl} not found`,
//         timestamp: new Date().toISOString()
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
            console.log(`📈 Database stats available at: http://${host}:${port}/db-stats`);
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
//
// // Import des modèles
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
// // Middleware
// app.use(cors());
// app.use(express.json());
//
// const logger = require('./src/tools/logger');
//
// /**
//  * Initialise tous les modèles avec gestion d'erreur
//  */
// async function initializeModels() {
//     const models = [
//         { name: 'LexiconModel', instance: LexiconModel },
//         { name: 'CountryModel', instance: CountryModel },
//         { name: 'ProfilModel', instance: ProfilModel },
//         { name: 'FormulaModel', instance: FormulaModel },
//         { name: 'ProductModel', instance: ProductModel },
//         { name: 'CompanyModel', instance: CompanyModel },
//         { name: 'AccountModel', instance: AccountModel },
//         { name: 'UserModel', instance: UserModel },
//         { name: 'SubscriptionModel', instance: SubscriptionModel }
//     ];
//
//     for (const model of models) {
//         try {
//             console.log(`Initializing ${model.name}...`);
//             await model.instance.initialize();
//             console.log(`✅ ${model.name} initialized successfully`);
//         } catch (error) {
//             console.error(`❌ Failed to initialize ${model.name}:`, error);
//             throw new Error(`Model initialization failed for ${model.name}: ${error.message}`);
//         }
//     }
// }
//
// /**
//  * Fonction principale d'initialisation
//  */
// async function main() {
//     try {
//         console.log('🚀 Starting application initialization...');
//
//         // Initialiser tous les modèles
//         await initializeModels();
//
//         console.log('✅ All models initialized successfully');
//         console.log('🎯 Application ready to handle requests');
//
//         // Initialiser les routes après l'initialisation des modèles
//         await initializeRoutes();
//
//     } catch (error) {
//         console.error('❌ Failed to initialize application:', error);
//         process.exit(1); // Arrêter l'application en cas d'échec critique
//     }
// }
//
// /**
//  * Initialise les routes
//  */
// async function initializeRoutes() {
//     try {
//         console.log('📍 Initializing routes...');
//
//         // Route pour les lexicons
//         const lexiconRoute = require(path.join(paths.ROUTER, 'lexicon'));
//         app.use("/lexicon", lexiconRoute);
//
//         // Ajouter d'autres routes ici...
//         // const accountRoute = require(path.join(paths.ROUTER, 'account'));
//         // app.use("/account", accountRoute);
//
//         // Route de santé pour vérifier l'état du serveur
//         app.get('/health', (req, res) => {
//             res.json({
//                 status: 'OK',
//                 timestamp: new Date().toISOString(),
//                 uptime: process.uptime()
//             });
//         });
//
//         // Route par défaut
//         app.get('/', (req, res) => {
//             res.json({
//                 message: 'API Server is running',
//                 version: '1.0.0',
//                 endpoints: [
//                     '/health',
//                     '/lexicon'
//                 ]
//             });
//         });
//
//         console.log('✅ Routes initialized successfully');
//
//     } catch (error) {
//         console.error('❌ Failed to initialize routes:', error);
//         throw error;
//     }
// }
//
// /**
//  * Gestion gracieuse de l'arrêt du serveur
//  */
// async function gracefulShutdown(signal) {
//     console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
//
//     try {
//         // Fermer toutes les connexions de base de données
//         const models = [
//             LexiconModel, CountryModel, ProfilModel, FormulaModel,
//             ProductModel, CompanyModel, AccountModel, UserModel, SubscriptionModel
//         ];
//
//         for (const model of models) {
//             if (model && typeof model.close === 'function') {
//                 await model.close();
//             }
//         }
//
//         console.log('✅ All database connections closed');
//         console.log('👋 Graceful shutdown completed');
//         process.exit(0);
//
//     } catch (error) {
//         console.error('❌ Error during graceful shutdown:', error);
//         process.exit(1);
//     }
// }
//
// /**
//  * Gestionnaire d'erreurs global
//  */
// function setupErrorHandlers() {
//     // Erreurs non capturées
//     process.on('uncaughtException', (err) => {
//         console.error('💥 Uncaught Exception:', err);
//         logger.logError(`Uncaught Exception: ${err.message}\n${err.stack}`);
//         process.exit(1);
//     });
//
//     // Promesses rejetées non gérées
//     process.on('unhandledRejection', (reason, promise) => {
//         console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
//         logger.logError(`Unhandled Rejection: ${reason}`);
//         process.exit(1);
//     });
//
//     // Signaux d'arrêt
//     process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
//     process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// }
//
// /**
//  * Middleware de gestion d'erreurs pour Express
//  */
// app.use((err, req, res, next) => {
//     console.error('Express Error:', err);
//     logger.logError(`Express Error: ${err.message}\n${err.stack}`);
//
//     res.status(500).json({
//         error: 'Internal Server Error',
//         message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
//     });
// });
//
// // /**
// //  * Middleware pour les routes non trouvées
// //  */
// // app.use('*', (req, res) => {
// //     res.status(404).json({
// //         error: 'Not Found',
// //         message: `Route ${req.originalUrl} not found`
// //     });
// // });
//
// // Configuration des gestionnaires d'erreurs
// setupErrorHandlers();
//
// // Démarrage de l'application
// main()
//     .then(() => {
//         app.listen(port, host, () => {
//             console.log(`🌐 Server running on http://${host}:${port}`);
//             console.log(`📊 Health check available at: http://${host}:${port}/health`);
//             console.log('🎉 Server ready to handle requests!');
//         });
//     })
//     .catch((error) => {
//         console.error('❌ Failed to start server:', error);
//         process.exit(1);
//     });
// src/database/Database.js
const { Sequelize } = require('sequelize');

class Database {
    constructor() {
        if (new.target === Database) {
            throw new Error('La classe Database est abstraite et ne peut pas être instanciée directement.');
        }

        this._sequelize = null;
        this._connection = null;
        this._transaction = null;
        this._isTransactionActive = false;
        this._init();
    }

    /**
     * Initialise la connexion Sequelize avec le pool
     */
    _init() {
        this._sequelize = new Sequelize(
            process.env.DB_NAME || "priceradb25",
            process.env.DB_USER || "priceradmin",
            process.env.DB_PASSWORD || "MonMotDePasseSecurise123!",
            {
                host: process.env.DB_HOST || '192.168.100.103',
                dialect: 'postgres',
                port: process.env.DB_PORT || 5432,
                pool: {
                    max: 20,        // Maximum 20 connexions
                    min: 5,         // Minimum 5 connexions toujours ouvertes
                    acquire: 60000, // Temps max pour obtenir une connexion
                    idle: 10000,    // Temps avant fermeture d'une connexion inactive
                    evict: 1000     // Vérification des connexions inactives
                },
                timezone: '+01:00',
                dialectOptions: {
                    timezone: 'Africa/Douala',
                },
                logging: process.env.NODE_ENV === 'development' ? console.log : false,
                retry: {
                    max: 3 // Retry failed connections
                }
            }
        );
    }

    /**
     * Retourne l'instance Sequelize
     * @returns {Sequelize}
     */
    getInstance() {
        return this._sequelize;
    }

    /**
     * Obtient ou crée une connexion (utilise le pool)
     * @param {Object} options - Options pour la connexion
     * @returns {Promise<Object>} - Connexion ou transaction
     */
    async getConnection(options = {}) {
        try {
            // Si une transaction est active, la retourner
            if (this._isTransactionActive && this._transaction) {
                return {
                    connection: this._transaction,
                    isTransaction: true
                };
            }

            // Si une connexion spécifique est passée en paramètre
            if (options.connection) {
                return {
                    connection: options.connection,
                    isTransaction: options.isTransaction || false
                };
            }

            // Utiliser le pool de connexions de Sequelize (recommandé)
            return {
                connection: this._sequelize,
                isTransaction: false
            };

        } catch (error) {
            console.error('Erreur lors de l\'obtention de la connexion:', error);
            throw error;
        }
    }

    /**
     * Démarre une transaction
     * @param {Object} options - Options de transaction
     * @returns {Promise<Object>} - Transaction
     */
    async beginTransaction(options = {}) {
        try {
            if (this._isTransactionActive) {
                throw new Error('Une transaction est déjà active');
            }

            this._transaction = await this._sequelize.transaction(options);
            this._isTransactionActive = true;

            console.log('🔄 Transaction démarrée');
            return this._transaction;
        } catch (error) {
            console.error('Erreur lors du démarrage de la transaction:', error);
            throw error;
        }
    }

    /**
     * Valide (commit) la transaction
     * @returns {Promise<void>}
     */
    async commitTransaction() {
        try {
            if (!this._isTransactionActive || !this._transaction) {
                throw new Error('Aucune transaction active à valider');
            }

            await this._transaction.commit();
            this._transaction = null;
            this._isTransactionActive = false;

            console.log('✅ Transaction validée');
        } catch (error) {
            console.error('Erreur lors de la validation de la transaction:', error);
            await this.rollbackTransaction();
            throw error;
        }
    }

    /**
     * Annule (rollback) la transaction
     * @returns {Promise<void>}
     */
    async rollbackTransaction() {
        try {
            if (this._transaction) {
                await this._transaction.rollback();
                console.log('🔄 Transaction annulée');
            }
        } catch (error) {
            console.error('Erreur lors de l\'annulation de la transaction:', error);
        } finally {
            this._transaction = null;
            this._isTransactionActive = false;
        }
    }

    /**
     * Exécute une fonction dans une transaction
     * @param {Function} operation - Fonction à exécuter
     * @param {Object} options - Options de transaction
     * @returns {Promise<*>}
     */
    async executeInTransaction(operation, options = {}) {
        const transaction = await this.beginTransaction(options);

        try {
            const result = await operation(transaction);
            await this.commitTransaction();
            return result;
        } catch (error) {
            await this.rollbackTransaction();
            throw error;
        }
    }

    /**
     * Teste la connexion à la base de données
     */
    async testConnection() {
        try {
            await this._sequelize.authenticate();
            console.log('✅ Connexion à la base de données PostgreSQL réussie.');
            return true;
        } catch (error) {
            console.error('❌ Échec de la connexion à la base de données:', error);
            throw error;
        }
    }

    /**
     * Ferme le pool de connexions (uniquement à l'arrêt de l'application)
     */
    async closePool() {
        try {
            if (this._isTransactionActive) {
                await this.rollbackTransaction();
            }

            if (this._sequelize) {
                await this._sequelize.close();
                console.log('🔌 Pool de connexions fermé.');
            }
        } catch (error) {
            console.error('Erreur lors de la fermeture du pool:', error);
        }
    }

    /**
     * Get one row in table using ID
     * @param {Object} table - Modèle Sequelize
     * @param {number} id - ID de l'enregistrement
     * @param {Object} options - Options (connection, transaction, etc.)
     * @returns {Promise<Object|null>}
     */
    async getById(table, id, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const queryOptions = { where: { id } };
            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const entry = await table.findByPk(id, queryOptions);
            return entry ? entry.toJSON() : null;
        } catch (error) {
            console.error('Error retrieving entry:', error);
            throw error;
        }
    }

    /**
     * Get table last autoincrement ID
     * @param {Object} table - Modèle Sequelize
     * @param {Object} options - Options de connexion
     * @returns {Promise<number>}
     */
    async getLastId(table, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const queryOptions = { order: [['id', 'DESC']] };
            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const lastRecord = await table.findOne(queryOptions);
            return lastRecord ? lastRecord.id : 0;
        } catch (error) {
            console.error('Error getting last ID:', error);
            throw error;
        }
    }

    /**
     * Generate GUID from table
     * @param {Object} table - Modèle Sequelize
     * @param {number} length - Longueur du GUID
     * @param {number|null} guid - GUID de base
     * @param {Object} options - Options de connexion
     * @returns {Promise<number>}
     */
    async generateGuid(table, length = 6, guid = null, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            if (guid === null) {
                const lastId = await this.getLastId(table, options);
                guid = Math.pow(10, length - 1) + (lastId + 1);
            }

            const queryOptions = { where: { guid } };
            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const record = await table.findOne(queryOptions);

            if (record === null) {
                return guid;
            } else {
                return await this.generateGuid(table, length, guid + 1, options);
            }
        } catch (error) {
            console.error('Error generating GUID:', error);
            throw error;
        }
    }

    /**
     * Génère un code alphanumérique unique
     * @param {Object} table - Modèle Sequelize
     * @param {number} length - Longueur du code
     * @param {Object} options - Options de connexion
     * @returns {Promise<string>}
     */
    async generateUniqueCode(table, length = 6, options = {}) {
        const charset = `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`;

        function generateCode(length) {
            let result = '';
            for (let i = 0; i < length; i++) {
                const randIndex = Math.floor(Math.random() * charset.length);
                result += charset[randIndex];
            }
            return result;
        }

        try {
            const { connection } = await this.getConnection(options);
            let code;
            let exists = true;

            while (exists) {
                code = generateCode(length);
                const queryOptions = { where: { code: code } };
                if (options.isTransaction || this._isTransactionActive) {
                    queryOptions.transaction = connection;
                }

                const existing = await table.findOne(queryOptions);
                exists = existing !== null;
            }

            return code;
        } catch (error) {
            console.error('Erreur lors de la génération du code unique:', error);
            throw error;
        }
    }


    /**
     * Crée un enregistrement
     * @param {Object} table - Modèle Sequelize
     * @param {Object} data - Données à insérer
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object>}
     */
    async createRecord(table, data, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const createOptions = {};
            if (options.isTransaction || this._isTransactionActive) {
                createOptions.transaction = connection;
            }

            const newRecord = await table.create(data, createOptions);
            return newRecord.toJSON();
        } catch (error) {
            console.error('Error creating record:', error);
            throw error;
        }
    }

    /**
     * Met à jour un enregistrement
     * @param {Object} table - Modèle Sequelize
     * @param {number} id - ID de l'enregistrement
     * @param {Object} data - Données à mettre à jour
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object|null>}
     */
    async updateRecord(table, id, data, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const updateOptions = { where: { id } };
            if (options.isTransaction || this._isTransactionActive) {
                updateOptions.transaction = connection;
            }

            const [updatedRowsCount] = await table.update(data, updateOptions);

            if (updatedRowsCount > 0) {
                return await this.getById(table, id, options);
            }

            return null;
        } catch (error) {
            console.error('Error updating record:', error);
            throw error;
        }
    }

    /**
     * Supprime un enregistrement
     * @param {Object} table - Modèle Sequelize
     * @param {number} id - ID de l'enregistrement
     * @param {Object} options - Options de connexion
     * @returns {Promise<boolean>}
     */
    async deleteRecord(table, id, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const deleteOptions = { where: { id } };
            if (options.isTransaction || this._isTransactionActive) {
                deleteOptions.transaction = connection;
            }

            const deletedRowsCount = await table.destroy(deleteOptions);
            return deletedRowsCount > 0;
        } catch (error) {
            console.error('Error deleting record:', error);
            throw error;
        }
    }

    /**
     * Exécute une requête personnalisée
     * @param {string} query - Requête SQL
     * @param {Object} options - Options (replacements, type, etc.)
     * @returns {Promise<*>}
     */
    async executeQuery(query, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const queryOptions = { ...options };
            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            return await this._sequelize.query(query, queryOptions);
        } catch (error) {
            console.error('Error executing query:', error);
            throw error;
        }
    }

    /**
     * Obtient les statistiques du pool de connexions
     * @returns {Object}
     */
    getPoolStats() {
        if (this._sequelize && this._sequelize.connectionManager && this._sequelize.connectionManager.pool) {
            const pool = this._sequelize.connectionManager.pool;
            return {
                total: pool.size,
                active: pool.using,
                idle: pool.available,
                pending: pool.pending
            };
        }
        return { total: 0, active: 0, idle: 0, pending: 0 };
    }

    /**
     * Initialise les tables de la base de données (méthode statique)
     * @param {Array} models - Tableau des modèles Sequelize à synchroniser
     * @param {Object} options - Options d'initialisation
     * @param {boolean} options.force - Force la recréation des tables (défaut: false)
     * @param {boolean} options.alter - Modifie les tables existantes (défaut: false)
     * @returns {Promise<void>}
     */
    static async initializeTables(models = [], options = {}) {
        // Créer une instance temporaire pour accéder à la configuration
        const tempInstance = Object.create(Database.prototype);
        tempInstance._init();

        const sequelize = tempInstance._sequelize;
        let transaction = null;

        try {
            // Tester la connexion
            await sequelize.authenticate();
            console.log('✅ Connexion établie pour l\'initialisation des tables');

            // Démarrer une transaction
            transaction = await sequelize.transaction();
            console.log('🔄 Transaction d\'initialisation démarrée');

            const syncOptions = {
                transaction: transaction,
                force: options.force || false,
                alter: options.alter || false
            };

            // Synchroniser les modèles si fournis
            if (models && models.length > 0) {
                console.log(`📋 Synchronisation de ${models.length} modèle(s)...`);

                for (const model of models) {
                    if (model && typeof model.sync === 'function') {
                        await model.sync(syncOptions);
                        console.log(`✅ Table ${model.tableName || model.name} synchronisée`);
                    } else {
                        console.warn(`⚠️  Modèle invalide ignoré:`, model);
                    }
                }
            } else {
                // Synchroniser toutes les tables définies
                console.log('📋 Synchronisation de toutes les tables...');
                await sequelize.sync(syncOptions);
            }

            // Valider la transaction
            await transaction.commit();
            console.log('✅ Initialisation des tables terminée avec succès');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation des tables:', error);

            // Annuler la transaction en cas d'erreur
            if (transaction) {
                try {
                    await transaction.rollback();
                    console.log('🔄 Transaction d\'initialisation annulée');
                } catch (rollbackError) {
                    console.error('❌ Erreur lors de l\'annulation de la transaction:', rollbackError);
                }
            }

            throw error;
        }
        finally {
            // Fermer la connexion
            if (sequelize) {
                try {
                    await sequelize.close();
                    console.log('🔌 Connexion fermée');
                } catch (closeError) {
                    console.error('❌ Erreur lors de la fermeture de la connexion:', closeError);
                }
            }
        }
    }
}

module.exports = Database;

class DB extends Database {
    constructor() {
        super();
    }
}
module.exports = DB;
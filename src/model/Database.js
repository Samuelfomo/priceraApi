// src/database/Database.js
const { Sequelize } = require('sequelize');

class Database {
    constructor() {
        if (new.target === Database) {
            throw new Error('La classe Database est abstraite et ne peut pas être instanciée directement.');
        }

        this._sequelize = null;
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
                    max: 10,
                    min: 0,
                    acquire: 30000,
                    idle: 10000
                },
                timezone: '+01:00',
                dialectOptions: {
                    timezone: 'Africa/Douala',
                },
                logging: false
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
     * Teste la connexion à la base de données
     */
    async testConnection() {
        try {
            await this._sequelize.authenticate();
            console.log('Connexion à la base de données PostgreSQL réussie.');
        } catch (error) {
            console.error('Échec de la connexion à la base de données :', error);
            throw error;
        }
    }

    /**
     * Ferme toutes les connexions
     */
    async close() {
        try {
            if (this._sequelize) {
                await this._sequelize.close();
                console.log('Connexion à la base de données fermée.');
            }
        } catch (error) {
            console.error('Erreur lors de la fermeture de la connexion:', error);
        }
    }

    /**
     * Get one row in table using ID avec gestion d'erreur
     * @param {Object} table - Modèle Sequelize
     * @param {number} id - ID de l'enregistrement
     * @returns {Promise<Object|null>}
     */
    async getById(table, id) {
        try {
            const entry = await table.findByPk(id);
            return entry ? entry.toJSON() : null;
        } catch (error) {
            console.error('Error retrieving entry:', error);
            throw error;
        }
    }

    /**
     * Get table last autoincrement ID
     * @param {Object} table - Modèle Sequelize
     * @returns {Promise<number>}
     */
    async getLastId(table) {
        try {
            const lastRecord = await table.findOne({
                order: [['id', 'DESC']]
            });
            return lastRecord ? lastRecord.id : 0;
        } catch (error) {
            console.error('Error getting last ID:', error);
            throw error;
        }
    }

    /**
     * Generate GUID from table
     * @param {Object} table - Modèle Sequelize
     * @param {number} length - Longueur du GUID (défaut: 6)
     * @param {number|null} guid - GUID de base (optionnel)
     * @returns {Promise<number>}
     */
    async generateGuid(table, length = 6, guid = null) {
        try {
            if (guid === null) {
                const lastId = await this.getLastId(table);
                guid = Math.pow(10, length - 1) + (lastId + 1);
            }

            const record = await table.findOne({
                where: { guid: guid }
            });

            if (record === null) {
                return guid;
            } else {
                return await this.generateGuid(table, length, guid + 1);
            }
        } catch (error) {
            console.error('Error generating GUID:', error);
            throw error;
        }
    }

    /**
     * Execute a database operation with automatic connection management
     * @param {Function} operation - Fonction à exécuter
     * @returns {Promise<*>}
     */
    async executeWithConnection(operation) {
        try {
            await this.testConnection();
            const result = await operation();
            return result;
        } catch (error) {
            console.error('Database operation error:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * Exécute une transaction avec gestion automatique des connexions
     * @param {Function} operation - Fonction à exécuter dans la transaction
     * @returns {Promise<*>}
     */
    async executeTransaction(operation) {
        const transaction = await this._sequelize.transaction();
        try {
            const result = await operation(transaction);
            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            console.error('Transaction error:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * Méthode utilitaire pour créer un enregistrement
     * @param {Object} table - Modèle Sequelize
     * @param {Object} data - Données à insérer
     * @returns {Promise<Object>}
     */
    async createRecord(table, data) {
        return await this.executeWithConnection(async () => {
            const newRecord = await table.create(data);
            return newRecord.toJSON();
        });
    }

    /**
     * Méthode utilitaire pour mettre à jour un enregistrement
     * @param {Object} table - Modèle Sequelize
     * @param {number} id - ID de l'enregistrement
     * @param {Object} data - Données à mettre à jour
     * @returns {Promise<Object|null>}
     */
    async updateRecord(table, id, data) {
        return await this.executeWithConnection(async () => {
            const [updatedRowsCount] = await table.update(data, {
                where: { id: id }
            });

            if (updatedRowsCount > 0) {
                const updatedRecord = await table.findByPk(id);
                return updatedRecord ? updatedRecord.toJSON() : null;
            }

            return null;
        });
    }

    /**
     * Méthode utilitaire pour supprimer un enregistrement
     * @param {Object} table - Modèle Sequelize
     * @param {number} id - ID de l'enregistrement
     * @returns {Promise<boolean>}
     */
    async deleteRecord(table, id) {
        return await this.executeWithConnection(async () => {
            const deletedRowsCount = await table.destroy({
                where: { id: id }
            });
            return deletedRowsCount > 0;
        });
    }
}

module.exports = Database;
class Db extends Database {
    constructor() {
        super(); // obligatoire pour hériter correctement
    }
}

module.exports = Db;
// // src/database/Database.js
// const { Sequelize } = require('sequelize');
//
// class Database {
//     constructor() {
//         if (new.target === Database) {
//             throw new Error('La classe Database est abstraite et ne peut pas être instanciée directement.');
//         }
//
//         this._sequelize = null;
//         this._isInitialized = false;
//         this._init();
//     }
//
//     /**
//      * Initialise la connexion Sequelize avec le pool
//      */
//     _init() {
//         this._sequelize = new Sequelize(
//             process.env.DB_NAME || "priceradb25",
//             process.env.DB_USER || "priceradmin",
//             process.env.DB_PASSWORD || "MonMotDePasseSecurise123!",
//             {
//                 host: process.env.DB_HOST || '192.168.100.103',
//                 dialect: 'postgres',
//                 port: process.env.DB_PORT || 5432,
//                 pool: {
//                     max: 10,        // Maximum de connexions dans le pool
//                     min: 0,         // Minimum de connexions dans le pool
//                     acquire: 30000, // Temps max pour obtenir une connexion (ms)
//                     idle: 10000,    // Temps max qu'une connexion peut rester inactive (ms)
//                 },
//                 timezone: '+01:00',
//                 dialectOptions: {
//                     timezone: 'Africa/Douala',
//                 },
//                 logging: false, // true pour voir les requêtes SQL
//                 retry: {
//                     max: 3 // Nombre de tentatives en cas d'échec
//                 }
//             }
//         );
//         this._isInitialized = true;
//     }
//
//     /**
//      * Retourne l'instance Sequelize
//      * @returns {Sequelize}
//      */
//     getInstance() {
//         if (!this._isInitialized) {
//             throw new Error('Database not initialized');
//         }
//         return this._sequelize;
//     }
//
//     /**
//      * Teste la connexion à la base de données
//      */
//     async testConnection() {
//         try {
//             await this._sequelize.authenticate();
//             console.log('✅ Connexion à la base de données PostgreSQL réussie.');
//             return true;
//         } catch (error) {
//             console.error('❌ Échec de la connexion à la base de données :', error.message);
//             throw error;
//         }
//     }
//
//     /**
//      * Exécute une opération avec gestion automatique des connexions
//      * @param {Function} operation - Fonction à exécuter
//      * @returns {Promise<any>}
//      */
//     async executeWithConnection(operation) {
//         try {
//             // Sequelize gère automatiquement les connexions via le pool
//             return await operation();
//         } catch (error) {
//             console.error('Erreur lors de l\'exécution de l\'opération:', error);
//             throw error;
//         }
//         // Pas besoin de fermer explicitement - le pool gère cela
//     }
//
//     /**
//      * Exécute une transaction
//      * @param {Function} operation - Fonction à exécuter dans la transaction
//      * @returns {Promise<any>}
//      */
//     async executeTransaction(operation) {
//         const transaction = await this._sequelize.transaction();
//
//         try {
//             const result = await operation(transaction);
//             await transaction.commit();
//             console.log('✅ Transaction commitée avec succès');
//             return result;
//         } catch (error) {
//             await transaction.rollback();
//             console.error('❌ Transaction rollback:', error.message);
//             throw error;
//         }
//     }
//
//     /**
//      * Get one row in table using ID avec gestion de connexion
//      * @param {Object} table - Sequelize model
//      * @param {number} id - Record ID
//      * @returns {Promise<Object|null>}
//      */
//     async getById(table, id) {
//         return await this.executeWithConnection(async () => {
//             const entry = await table.findByPk(id);
//             return entry ? entry.toJSON() : null;
//         });
//     }
//
//     /**
//      * Get table last autoincrement ID avec gestion de connexion
//      * @param {Object} table - Sequelize model
//      * @returns {Promise<number>}
//      */
//     async getLastID(table) {
//         return await this.executeWithConnection(async () => {
//             const lastRecord = await table.findOne({
//                 order: [['id', 'DESC']]
//             });
//             return lastRecord ? lastRecord.id : 0;
//         });
//     }
//
//     /**
//      * Generate GUID from table avec gestion de connexion
//      * @param {Object} table - Sequelize model
//      * @param {number} length - GUID length
//      * @param {number|null} guid - Starting GUID
//      * @returns {Promise<number>}
//      */
//     async generateGuid(table, length = 6, guid = null) {
//         return await this.executeWithConnection(async () => {
//             if (guid === null) {
//                 const lastId = await this.getLastID(table);
//                 guid = Math.pow(10, length - 1) + (lastId + 1);
//             }
//
//             const record = await table.findOne({
//                 where: { guid: guid }
//             });
//
//             return record === null ? guid : await this.generateGuid(table, length, guid + 1);
//         });
//     }
//
//     /**
//      * Count records in table avec gestion de connexion
//      * @param {Object} table - Sequelize model
//      * @param {Object} where - Where conditions
//      * @returns {Promise<number>}
//      */
//     async count(table, where = {}) {
//         return await this.executeWithConnection(async () => {
//             return await table.count({ where });
//         });
//     }
//
//     /**
//      * Check if record exists avec gestion de connexion
//      * @param {Object} table - Sequelize model
//      * @param {Object} where - Where conditions
//      * @returns {Promise<boolean>}
//      */
//     async exists(table, where) {
//         return await this.executeWithConnection(async () => {
//             const count = await this.count(table, where);
//             return count > 0;
//         });
//     }
//
//     /**
//      * Ferme toutes les connexions du pool
//      * ⚠️  À n'utiliser qu'à l'arrêt de l'application
//      */
//     async close() {
//         if (this._sequelize) {
//             try {
//                 await this._sequelize.close();
//                 console.log('🔐 Toutes les connexions de la base de données fermées.');
//                 this._isInitialized = false;
//             } catch (error) {
//                 console.error('❌ Erreur lors de la fermeture des connexions:', error);
//                 throw error;
//             }
//         }
//     }
//
//     /**
//      * Obtient les statistiques du pool de connexions
//      * @returns {Object}
//      */
//     getPoolStats() {
//         if (this._sequelize && this._sequelize.connectionManager && this._sequelize.connectionManager.pool) {
//             const pool = this._sequelize.connectionManager.pool;
//             return {
//                 size: pool.size,
//                 available: pool.available,
//                 using: pool.using,
//                 waiting: pool.waiting
//             };
//         }
//         return null;
//     }
//
//     /**
//      * Vérifie la santé de la connexion
//      * @returns {Promise<Object>}
//      */
//     async healthCheck() {
//         try {
//             const startTime = Date.now();
//             await this._sequelize.authenticate();
//             const endTime = Date.now();
//
//             return {
//                 status: 'healthy',
//                 responseTime: endTime - startTime,
//                 pool: this.getPoolStats(),
//                 timestamp: new Date().toISOString()
//             };
//         } catch (error) {
//             return {
//                 status: 'unhealthy',
//                 error: error.message,
//                 timestamp: new Date().toISOString()
//             };
//         }
//     }
// }
//
// module.exports = Database;
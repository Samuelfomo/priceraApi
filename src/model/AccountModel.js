const { DataTypes } = require("sequelize");
const path = require('path');
const paths = require('../../config/paths');
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));
const Database = require("./Database");

/**
 * Model class - Pure data structure and basic CRUD operations
 * @class AccountModel
 * @extends Database
 *
 * @property {number} id
 * @property {number} guid
 * @property {string} code
 * @property {number} company
 * @property {boolean} active
 * @property {boolean} blocked
 * @property {boolean} deleted
 * @property {Date|null} deletedAt
 * @property {Date|null} lastLogin
 */

class AccountModel extends Database {

    constructor() {
        super();
        this.model = null;
        this._initModel();
    }

    /**
     * Initialise le modèle Sequelize
     * @private
     */
    _initModel() {
        this.model = this.getInstance().define('Account', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                comment: "Account ID"
            },
            guid: {
                type: DataTypes.INTEGER,
                unique: {
                    name: 'UNIQUE-ACCOUNT-GUID',
                    msg: 'The GUID of Account must be unique'
                },
                allowNull: false,
                comment: 'GUID'
            },
            code: {
                type: DataTypes.STRING(128),
                unique: {
                    name: 'UNIQUE-ACCOUNT-CODE',
                    msg: 'The CODE of Account must be unique'
                },
                allowNull: false,
                comment: "CODE"
            },
            company: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'company',
                    key: 'id'
                },
                comment: "Company foreign key"
            },
            active: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
                comment: 'Active Account'
            },
            blocked: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
                comment: 'Blocked Account'
            },
            deleted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false,
                comment: 'Soft delete flag'
            },
            deletedAt: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Deletion timestamp'
            },
            lastLogin: {
                type: DataTypes.DATE,
                allowNull: true,
                field: 'last_login',
                comment: 'Last login timestamp'
            }
        }, {
            tableName: `${G.tablePrefix}_account`,
            timestamps: true,
            createdAt: 'created',
            updatedAt: 'updated',
            hooks: {
                beforeSave: async (instance) => {
                    await this.dataControl(instance);
                }
            }
        });
    }

    /**
     * Find by ID avec gestion de connexion
     * @param {number} id - Account ID
     * @returns {Promise<Object|null>}
     */
    async find(id) {
        let connection = null;
        try {
            await this.testConnection();
            const account = await this.getById(this.model, id);
            return account && !account.deleted ? account : null;
        } catch (error) {
            console.error('Erreur lors de la recherche par ID:', error);
            throw error;
        } finally {
            if (connection) {
                await this.close();
            }
        }
    }

    /**
     * Find by single attribute avec gestion de connexion
     * @param {string} attribute - Attribute name
     * @param {*} value - Attribute value
     * @returns {Promise<Object|null>}
     */
    async findByAttribute(attribute, value) {
        try {
            await this.testConnection();
            const result = await this.model.findOne({
                where: {
                    [attribute]: value,
                    deleted: false
                }
            });
            return result ? result.toJSON() : null;
        } catch (error) {
            console.error('Erreur lors de la recherche par attribut:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * Find multiple records avec gestion de connexion
     * @param {Object} criteria - Search criteria
     * @param {string} operator - 'AND' or 'OR'
     * @returns {Promise<Array>}
     */
    async findMultiple(criteria, operator = 'AND') {
        try {
            await this.testConnection();
            const { Op } = require("sequelize");
            const whereClause = { deleted: false };

            if (operator === 'OR') {
                whereClause[Op.or] = criteria;
            } else {
                Object.assign(whereClause, criteria);
            }

            const results = await this.model.findAll({ where: whereClause });
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche multiple:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * Find by string pattern avec gestion de connexion
     * @param {string} attribute - Attribute name
     * @param {string} pattern - Search pattern
     * @returns {Promise<Array>}
     */
    async findByString(attribute, pattern) {
        try {
            await this.testConnection();
            const { Op } = require("sequelize");
            const results = await this.model.findAll({
                where: {
                    [attribute]: { [Op.like]: `%${pattern}%` },
                    deleted: false
                }
            });
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche par chaîne:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * Find by integer value avec gestion de connexion
     * @param {string} attribute - Attribute name
     * @param {number} value - Integer value
     * @returns {Promise<Array>}
     */
    async findByInt(attribute, value) {
        try {
            await this.testConnection();
            const results = await this.model.findAll({
                where: {
                    [attribute]: value,
                    deleted: false
                }
            });
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche par entier:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * Create new account avec gestion de connexion
     * @param {Object} data - Account data
     * @returns {Promise<Object>}
     */
    async create(data) {
        try {
            await this.testConnection();

            // Générer le GUID automatiquement
            if (!data.guid) {
                data.guid = await this.generateGuid(this.model, 6);
            }

            const newAccount = await this.model.create(data);
            return newAccount.toJSON();
        } catch (error) {
            console.error('Erreur lors de la création:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * Update account avec gestion de connexion
     * @param {number} id - Account ID
     * @param {Object} data - Update data
     * @returns {Promise<Object|null>}
     */
    async update(id, data) {
        try {
            await this.testConnection();

            const [updatedRowsCount] = await this.model.update(data, {
                where: { id: id, deleted: false }
            });

            if (updatedRowsCount > 0) {
                const updatedAccount = await this.model.findByPk(id);
                return updatedAccount ? updatedAccount.toJSON() : null;
            }

            return null;
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * Soft delete avec gestion de connexion
     * @param {number} id - Account ID
     * @returns {Promise<boolean>}
     */
    async softDelete(id) {
        try {
            await this.testConnection();

            const [updatedRowsCount] = await this.model.update({
                deleted: true,
                active: false,
                deletedAt: new Date()
            }, {
                where: { id: id, deleted: false }
            });

            return updatedRowsCount > 0;
        } catch (error) {
            console.error('Erreur lors de la suppression douce:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    /**
     * Data validation before save
     * @param {Object} instance - Model instance
     * @throws {Error} If validation fails
     */
    async dataControl(instance) {
        const errors = [];

        // Basic validations
        if (!instance.guid) errors.push('GUID is required');
        if (!instance.code?.trim()) errors.push('Code is required');
        if (!instance.company) errors.push('Company is required');

        // Code format validation
        if (instance.code && instance.code.length > 128) {
            errors.push('Code too long (max 128 characters)');
        }

        // Check uniqueness
        if (instance.guid) {
            const existingByGuid = await this.model.findOne({
                where: {
                    guid: instance.guid,
                    id: { [this.getInstance().Op.ne]: instance.id || 0 }
                }
            });
            if (existingByGuid) errors.push('GUID already exists');
        }

        if (instance.code) {
            const existingByCode = await this.model.findOne({
                where: {
                    code: instance.code,
                    id: { [this.getInstance().Op.ne]: instance.id || 0 }
                }
            });
            if (existingByCode) errors.push('Code already exists');
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }

    /**
     * Static initialization method
     */
    async initialize() {
        try {
            await this.testConnection();
            await this.model.sync({ alter: true, force: G.development });
            console.log('AccountModel synchronized successfully');
        } catch (error) {
            console.error('Unable to synchronize the AccountModel:', error);
            throw error;
        } finally {
            await this.close();
        }
    }
}

// Créer une instance singleton
const accountModelInstance = new AccountModel();

module.exports = accountModelInstance;

// const { DataTypes } = require("sequelize");
// const path = require('path');
// const paths = require('../../config/paths');
// const G = require(path.join(paths.TOOL_DIR, 'Glossary'));
// const Database = require("./Database");
//
// /**
//  * Model class avec gestion optimisée des connexions
//  * @class AccountModel
//  * @extends Database
//  */
// class AccountModel extends Database {
//
//     constructor() {
//         super();
//         this.sequelizeModel = null;
//         this._initModel();
//     }
//
//     /**
//      * Initialise le modèle Sequelize
//      * @private
//      */
//     _initModel() {
//         const sequelizeInstance = this.getInstance();
//
//         this.sequelizeModel = sequelizeInstance.define('Account', {
//             id: {
//                 type: DataTypes.INTEGER,
//                 primaryKey: true,
//                 autoIncrement: true,
//                 comment: "Account ID"
//             },
//             guid: {
//                 type: DataTypes.INTEGER,
//                 unique: {
//                     name: 'UNIQUE-ACCOUNT-GUID',
//                     msg: 'The GUID of Account must be unique'
//                 },
//                 allowNull: false,
//                 comment: 'GUID'
//             },
//             code: {
//                 type: DataTypes.STRING(128),
//                 unique: {
//                     name: 'UNIQUE-ACCOUNT-CODE',
//                     msg: 'The CODE of Account must be unique'
//                 },
//                 allowNull: false,
//                 comment: "CODE"
//             },
//             company: {
//                 type: DataTypes.INTEGER,
//                 allowNull: false,
//                 references: {
//                     model: 'company',
//                     key: 'id'
//                 },
//                 comment: "Company foreign key"
//             },
//             active: {
//                 type: DataTypes.BOOLEAN,
//                 defaultValue: false,
//                 allowNull: false,
//                 comment: 'Active Account'
//             },
//             blocked: {
//                 type: DataTypes.BOOLEAN,
//                 defaultValue: false,
//                 allowNull: false,
//                 comment: 'Blocked Account'
//             },
//             deleted: {
//                 type: DataTypes.BOOLEAN,
//                 defaultValue: false,
//                 allowNull: false,
//                 comment: 'Soft delete flag'
//             },
//             deletedAt: {
//                 type: DataTypes.DATE,
//                 allowNull: true,
//                 comment: 'Deletion timestamp'
//             },
//             lastLogin: {
//                 type: DataTypes.DATE,
//                 allowNull: true,
//                 field: 'last_login',
//                 comment: 'Last login timestamp'
//             }
//         }, {
//             tableName: `${G.tablePrefix}_account`,
//             timestamps: true,
//             createdAt: 'created',
//             updatedAt: 'updated',
//             hooks: {
//                 beforeSave: async (instance) => {
//                     await this.dataControl(instance);
//                 }
//             }
//         });
//     }
//
//     /**
//      * Find by ID avec gestion de connexion
//      * @param {number} id - Account ID
//      * @returns {Promise<Object|null>}
//      */
//     async find(id) {
//         return await this.executeWithConnection(async () => {
//             const account = await this.getById(this.sequelizeModel, id);
//             return account && !account.deleted ? account : null;
//         });
//     }
//
//     /**
//      * Find by single attribute avec gestion de connexion
//      * @param {string} attribute - Attribute name
//      * @param {*} value - Attribute value
//      * @returns {Promise<Object|null>}
//      */
//     async findByAttribute(attribute, value) {
//         return await this.executeWithConnection(async () => {
//             const result = await this.sequelizeModel.findOne({
//                 where: {
//                     [attribute]: value,
//                     deleted: false
//                 }
//             });
//             return result ? result.toJSON() : null;
//         });
//     }
//
//     /**
//      * Find multiple records avec gestion de connexion
//      * @param {Object} criteria - Search criteria
//      * @param {string} operator - 'AND' or 'OR'
//      * @returns {Promise<Array>}
//      */
//     async findMultiple(criteria, operator = 'AND') {
//         return await this.executeWithConnection(async () => {
//             const { Op } = require("sequelize");
//             const whereClause = { deleted: false };
//
//             if (operator === 'OR') {
//                 whereClause[Op.or] = criteria;
//             } else {
//                 Object.assign(whereClause, criteria);
//             }
//
//             const results = await this.sequelizeModel.findAll({ where: whereClause });
//             return results.map(result => result.toJSON());
//         });
//     }
//
//     /**
//      * Find by string pattern avec gestion de connexion
//      * @param {string} attribute - Attribute name
//      * @param {string} pattern - Search pattern
//      * @returns {Promise<Array>}
//      */
//     async findByString(attribute, pattern) {
//         return await this.executeWithConnection(async () => {
//             const { Op } = require("sequelize");
//             const results = await this.sequelizeModel.findAll({
//                 where: {
//                     [attribute]: { [Op.like]: `%${pattern}%` },
//                     deleted: false
//                 }
//             });
//             return results.map(result => result.toJSON());
//         });
//     }
//
//     /**
//      * Find by integer value avec gestion de connexion
//      * @param {string} attribute - Attribute name
//      * @param {number} value - Integer value
//      * @returns {Promise<Array>}
//      */
//     async findByInt(attribute, value) {
//         return await this.executeWithConnection(async () => {
//             const results = await this.sequelizeModel.findAll({
//                 where: {
//                     [attribute]: value,
//                     deleted: false
//                 }
//             });
//             return results.map(result => result.toJSON());
//         });
//     }
//
//     /**
//      * Create new account avec transaction
//      * @param {Object} data - Account data
//      * @returns {Promise<Object>}
//      */
//     async create(data) {
//         return await this.executeTransaction(async (transaction) => {
//             // Générer un GUID si non fourni
//             if (!data.guid) {
//                 data.guid = await this.generateGuid(this.sequelizeModel, 8);
//             }
//
//             const result = await this.sequelizeModel.create(data, { transaction });
//             return result.toJSON();
//         });
//     }
//
//     /**
//      * Update account avec transaction
//      * @param {number} id - Account ID
//      * @param {Object} data - Update data
//      * @returns {Promise<Object>}
//      */
//     async update(id, data) {
//         return await this.executeTransaction(async (transaction) => {
//             const [updatedRowsCount] = await this.sequelizeModel.update(data, {
//                 where: { id, deleted: false },
//                 transaction
//             });
//
//             if (updatedRowsCount === 0) {
//                 throw new Error('Account not found or already deleted');
//             }
//
//             // Récupérer l'enregistrement mis à jour
//             const updatedAccount = await this.sequelizeModel.findByPk(id, { transaction });
//             return updatedAccount ? updatedAccount.toJSON() : null;
//         });
//     }
//
//     /**
//      * Soft delete avec transaction
//      * @param {number} id - Account ID
//      * @returns {Promise<Object>}
//      */
//     async softDelete(id) {
//         return await this.update(id, {
//             deleted: true,
//             active: false,
//             deletedAt: new Date()
//         });
//     }
//
//     /**
//      * Bulk create avec transaction
//      * @param {Array} accounts - Array of account data
//      * @returns {Promise<Array>}
//      */
//     async bulkCreate(accounts) {
//         return await this.executeTransaction(async (transaction) => {
//             // Générer des GUIDs pour les comptes qui n'en ont pas
//             for (let account of accounts) {
//                 if (!account.guid) {
//                     account.guid = await this.generateGuid(this.sequelizeModel, 8);
//                 }
//             }
//
//             const results = await this.sequelizeModel.bulkCreate(accounts, {
//                 transaction,
//                 returning: true
//             });
//             return results.map(result => result.toJSON());
//         });
//     }
//
//     /**
//      * Data validation before save
//      * @param {Object} instance - Sequelize instance
//      * @throws {Error} If validation fails
//      */
//     async dataControl(instance) {
//         return await this.executeWithConnection(async () => {
//             const { Op } = require("sequelize");
//             const errors = [];
//
//             // Basic validations
//             if (!instance.guid) errors.push('GUID is required');
//             if (!instance.code?.trim()) errors.push('Code is required');
//             if (!instance.company) errors.push('Company is required');
//
//             // Code format validation
//             if (instance.code && instance.code.length > 128) {
//                 errors.push('Code too long (max 128 characters)');
//             }
//
//             // Check uniqueness
//             if (instance.guid) {
//                 const existingByGuid = await this.sequelizeModel.findOne({
//                     where: {
//                         guid: instance.guid,
//                         id: { [Op.ne]: instance.id || 0 }
//                     }
//                 });
//                 if (existingByGuid) errors.push('GUID already exists');
//             }
//
//             if (instance.code) {
//                 const existingByCode = await this.sequelizeModel.findOne({
//                     where: {
//                         code: instance.code,
//                         id: { [Op.ne]: instance.id || 0 }
//                     }
//                 });
//                 if (existingByCode) errors.push('Code already exists');
//             }
//
//             if (errors.length > 0) {
//                 throw new Error(errors.join('; '));
//             }
//         });
//     }
//
//     /**
//      * Get all accounts avec pagination et gestion de connexion
//      * @param {Object} options - Query options
//      * @returns {Promise<Object>}
//      */
//     async findAll(options = {}) {
//         return await this.executeWithConnection(async () => {
//             const {
//                 page = 1,
//                 limit = 10,
//                 where = {},
//                 order = [['id', 'ASC']],
//                 include = []
//             } = options;
//
//             const offset = (page - 1) * limit;
//             const defaultWhere = { deleted: false, ...where };
//
//             const { count, rows } = await this.sequelizeModel.findAndCountAll({
//                 where: defaultWhere,
//                 order,
//                 limit,
//                 offset,
//                 include,
//                 distinct: true
//             });
//
//             return {
//                 data: rows.map(row => row.toJSON()),
//                 pagination: {
//                     page,
//                     limit,
//                     total: count,
//                     pages: Math.ceil(count / limit)
//                 }
//             };
//         });
//     }
//
//     /**
//      * Get active accounts only
//      * @param {Object} options - Query options
//      * @returns {Promise<Array>}
//      */
//     async findActiveAccounts(options = {}) {
//         return await this.findAll({
//             ...options,
//             where: { active: true, ...options.where }
//         });
//     }
//
//     /**
//      * Initialize the model
//      * @returns {Promise<void>}
//      */
//     async initialize() {
//         try {
//             await this.testConnection();
//             await this.sequelizeModel.sync({ alter: true, force: G.development });
//             console.log('✅ AccountModel synchronized successfully');
//         } catch (error) {
//             console.error('❌ Unable to synchronize the AccountModel:', error);
//             throw error;
//         }
//     }
//
//     /**
//      * Health check pour ce modèle
//      * @returns {Promise<Object>}
//      */
//     async modelHealthCheck() {
//         try {
//             const baseHealth = await this.healthCheck();
//             const accountCount = await this.count(this.sequelizeModel);
//
//             return {
//                 ...baseHealth,
//                 model: 'AccountModel',
//                 accountCount,
//                 modelStatus: 'healthy'
//             };
//         } catch (error) {
//             return {
//                 model: 'AccountModel',
//                 modelStatus: 'unhealthy',
//                 error: error.message,
//                 timestamp: new Date().toISOString()
//             };
//         }
//     }
// }
//
// module.exports = AccountModel;
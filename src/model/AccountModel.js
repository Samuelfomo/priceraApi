const { DataTypes } = require("sequelize");
const path = require('path');
const paths = require('../../config/paths');
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));
const Database = require("./Database");
const CountryModel = require("./CountryModel");

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
 // * @property {boolean} blocked
 * @property {boolean} deleted
 * @property {Date|null} deletedAt
 * @property {Date|null} lastLogin
 */
class AccountModel extends Database {

    constructor() {
        super();
        this.model = null;
        this._initModel();
        this._initAssociations();
    }
    _initAssociations(){
        const CompanyModel = require("./CompanyModel");
        this.model.belongsTo(CompanyModel.getModel(), {
            foreignKey: "company",
            as: "companyData",
            targetKey: "id"
        });
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
                unique: {
                    name: 'UNIQUE-ACCOUNT-COMPANY',
                    msg: 'The COMPANY ID must be unique'
                },
                references: {
                    model: `${G.tablePrefix}_company`,
                    key: 'id'
                },
                comment: "Company foreign key"
            },
            active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false,
                comment: 'Active Account'
            },
            // blocked: {
            //     type: DataTypes.BOOLEAN,
            //     defaultValue: false,
            //     allowNull: false,
            //     comment: 'Blocked Account'
            // },
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
                    await this._dataControl(instance);
                }
            }
        });
    }

    /**
     * Retourne le modèle Sequelize pour l'initialisation des tables
     * @returns {Object} - Modèle Sequelize
     */
    getModel() {
        return this.model;
    }

    /**
     * Find by ID
     * @param {number} id - Account ID
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object|null>}
     */
    async find(id, options = {}) {
        try {
            const account = await this.getById(this.model, id, options);
            return account && !account.deleted ? account : null;
        } catch (error) {
            console.error('Erreur lors de la recherche par ID:', error);
            throw error;
        }
    }

    /**
     * Find by single attribute
     * @param {string} attribute - Attribute name
     * @param {*} value - Attribute value
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object|null>}
     */
    async findByAttribute(attribute, value, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const queryOptions = {
                where: {
                    [attribute]: value,
                    deleted: false
                }
            };

            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const result = await this.model.findOne(queryOptions);
            return result ? result.toJSON() : null;
        } catch (error) {
            console.error('Erreur lors de la recherche par attribut:', error);
            throw error;
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }

    /**
     * Find multiple records
     * @param {Object} criteria - Search criteria
     * @param {string} operator - 'AND' or 'OR'
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async findMultiple(criteria, operator = 'AND', options = {}) {
        try {
            const { connection } = await this.getConnection(options);
            const { Op } = require("sequelize");
            const whereClause = { deleted: false };

            if (operator === 'OR') {
                whereClause[Op.or] = criteria;
            } else {
                Object.assign(whereClause, criteria);
            }

            const queryOptions = { where: whereClause };
            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const results = await this.model.findAll(queryOptions);
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche multiple:', error);
            throw error;
        }
        finally {
            if (!options.isTransaction && !this._isTransactionActive) {
                await this.closePool();
            }
        }
    }

    /**
     * Find by string pattern
     * @param {string} attribute - Attribute name
     * @param {string} pattern - Search pattern
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async findByString(attribute, pattern, options = {}) {
        try {
            const { connection } = await this.getConnection(options);
            const { Op } = require("sequelize");

            const queryOptions = {
                where: {
                    [attribute]: { [Op.like]: `%${pattern}%` },
                    deleted: false
                }
            };

            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const results = await this.model.findAll(queryOptions);
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche par chaîne:', error);
            throw error;
        }
        finally {
            if (!options.isTransaction && !this._isTransactionActive) {
                await this.closePool();
            }
        }
    }

    /**
     * Find by integer value
     * @param {string} attribute - Attribute name
     * @param {number} value - Integer value
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async findByInt(attribute, value, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const queryOptions = {
                where: {
                    [attribute]: value,
                    deleted: false
                }
            };

            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const results = await this.model.findAll(queryOptions);
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche par entier:', error);
            throw error;
        }
        finally {
            if (!options.isTransaction && !this._isTransactionActive) {
                await this.closePool();
            }
        }
    }

    /**
     * Create new account
     * @param {Object} data - Account data
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object>}
     */
    async create(data, options = {}) {
        try {
            // Générer le GUID automatiquement si pas fourni
            if (!data.guid) {
                data.guid = await this.generateGuid(this.model, 6, null, options);
            }
            if (!data.code){
                data.code = await this.generateUniqueCode(this.model, 6, options);
            }

            return await this.createRecord(this.model, data, options);
        } catch (error) {
            console.error('Erreur lors de la création:', error);
            throw error;
        }
    }

    /**
     * Update account
     * @param {number} id - Account ID
     * @param {Object} data - Update data
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object|null>}
     */
    async update(id, data, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const updateOptions = {
                where: { id: id, deleted: false }
            };

            if (options.isTransaction || this._isTransactionActive) {
                updateOptions.transaction = connection;
            }

            const [updatedRowsCount] = await this.model.update(data, updateOptions);

            if (updatedRowsCount > 0) {
                return await this.find(id, options);
            }

            return null;
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            throw error;
        }
        finally {
            if (!options.isTransaction && !this._isTransactionActive) {
                await this.closePool();
            }
        }
    }

    /**
     * Soft delete
     * @param {number} id - Account ID
     * @param {Object} options - Options de connexion
     * @returns {Promise<boolean>}
     */
    async softDelete(id, options = {}) {
        try {
            const result = await this.update(id, {
                deleted: true,
                active: false,
                deletedAt: new Date()
            }, options);

            return result !== null;
        } catch (error) {
            console.error('Erreur lors de la suppression douce:', error);
            throw error;
        }
    }

    /**
     * Get all accounts avec pagination
     * @param {Object} queryOptions - Query options
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object>}
     */
    async findAll(queryOptions = {}, options = {}) {
        try {
            const { connection } = await this.getConnection(options);
            const {
                page = 1,
                limit = 10,
                where = {},
                order = [['id', 'ASC']],
                include = []
            } = queryOptions;

            const offset = (page - 1) * limit;
            const defaultWhere = { deleted: false, ...where };

            const findOptions = {
                where: defaultWhere,
                order,
                limit,
                offset,
                include,
                distinct: true
            };

            if (options.isTransaction || this._isTransactionActive) {
                findOptions.transaction = connection;
            }

            const { count, rows } = await this.model.findAndCountAll(findOptions);

            return {
                data: rows.map(row => row.toJSON()),
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Erreur lors de la recherche paginée:', error);
            throw error;
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }
    async findAllWithCompany(queryOptions = {}, options = {}) {
        try {
            const { connection } = await this.getConnection(options);
            const CompanyModel = require('./CompanyModel');

            const {page = 1, limit = 10, where = {}, order = [['id', 'ASC']]} = queryOptions;
            const offset = (page - 1) * limit;

            const findOptions = {where, order, limit, offset,
                include: [{
                    model: CompanyModel.getModel(),
                    as: 'companyData',
                    required: true
                }],
                distinct: true
            };

            if (options.isTransaction || this._isTransactionActive) {
                findOptions.transaction = connection;
            }

            const { count, rows } = await this.model.findAndCountAll(findOptions);

            return {
                data: rows.map(row => row.toJSON()),
                pagination: {page, limit, total: count, pages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Erreur lors de la recherche paginée avec company:', error);
            throw error;
        }
    }

    /**
     * Bulk create avec transaction
     * @param {Array} accounts - Array of account data
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async bulkCreate(accounts, options = {}) {
        return await this.executeInTransaction(async (transaction) => {
            // Générer des GUIDs pour les comptes qui n'en ont pas
            for (let account of accounts) {
                if (!account.guid) {
                    account.guid = await this.generateGuid(this.model, 6, null, {
                        connection: transaction,
                        isTransaction: true
                    });
                }
            }

            const createOptions = { transaction, returning: true };
            const results = await this.model.bulkCreate(accounts, createOptions);
            return results.map(result => result.toJSON());
        });
    }

    /**
     * Data validation before save
     * @param {Object} instance - Model instance
     * @throws {Error} If validation fails
     * @private
     */
    async _dataControl(instance) {
        const { Op } = require("sequelize");
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
                    id: { [Op.ne]: instance.id || 0 }
                }
            });
            if (existingByGuid) errors.push('GUID already exists');
        }

        if (instance.code) {
            const existingByCode = await this.model.findOne({
                where: {
                    code: instance.code,
                    id: { [Op.ne]: instance.id || 0 }
                }
            });
            if (existingByCode) errors.push('Code already exists');
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }

    /**
     * Health check pour ce modèle
     * @returns {Promise<Object>}
     */
    async modelHealthCheck() {
        try {
            const poolStats = this.getPoolStats();
            const accountCount = await this.model.count({ where: { deleted: false } });

            return {
                model: 'AccountModel',
                poolStats,
                accountCount,
                modelStatus: 'healthy',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                model: 'AccountModel',
                modelStatus: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Créer une instance singleton
const accountModelInstance = new AccountModel();

module.exports = accountModelInstance;
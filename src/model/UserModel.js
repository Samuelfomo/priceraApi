const { DataTypes } = require("sequelize");
const path = require('path');
const paths = require('../../config/paths');
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));
const Database = require("./Database");

/**
 * Model class - Pure data structure and basic CRUD operations
 * @class UserModel
 * @extends Database
 *
 * @property {number} id
 * @property {number} guid
 * @property {string} name
 * @property {number} profil
 * @property {number} account
 * @property {number} mobile
 * @property {string} email
 */
class UserModel extends Database {

    constructor() {
        super();
        this.model = null;
        this._initModel();
        this._initAssociations();
    }

    _initAssociations() {
        const AccountModel = require("./AccountModel");
        const ProfilModel = require("./ProfilModel");

        // Association avec Account
        this.model.belongsTo(AccountModel.getModel(), {
            foreignKey: "account",
            as: "accountData",
            targetKey: "id"
        });

        // Association avec Profil
        this.model.belongsTo(ProfilModel.getModel(), {
            foreignKey: "profil",
            as: "profilData",
            targetKey: "id"
        });
    }

    /**
     * Initialise le modèle Sequelize
     * @private
     */
    _initModel() {
        this.model = this.getInstance().define('User', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                comment: "User ID"
            },
            guid: {
                type: DataTypes.INTEGER,
                unique: {
                    name: 'UNIQUE-User-GUID',
                    msg: 'The GUID of User must be unique'
                },
                allowNull: false,
                comment: 'GUID'
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'User full Name'
            },
            profil: {
                type: DataTypes.INTEGER,
                references: {
                    model: 'profil',
                    key: 'id'
                },
                allowNull: false,
                comment: "The profil of User must be foreign key references of table profil"
            },
            account: {
                type: DataTypes.INTEGER,
                references: {
                    model: `${G.tablePrefix}_account`,
                    key: 'id'
                },
                allowNull: false,
                comment: "The Account of User must be foreign key references of table account"
            },
            mobile: {
                type: DataTypes.BIGINT,
                allowNull: false,
                unique: {
                    name: 'UNIQUE-Mobile',
                    msg: 'The Mobile number of user must be unique'
                },
                comment: "Mobile of user"
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: {
                    name: 'UNIQUE-Email',
                    msg: 'The Email address must be unique'
                },
                comment: "Email of user"
            }
        }, {
            tableName: "user",
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
     * @param {number} id - User ID
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object|null>}
     */
    async find(id, options = {}) {
        try {
            const user = await this.getById(this.model, id, options);
            return user || null;
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
                    [attribute]: value
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
            const whereClause = {};

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
        } finally {
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
                    [attribute]: { [Op.like]: `%${pattern}%` }
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
        } finally {
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
                    [attribute]: value
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
        } finally {
            if (!options.isTransaction && !this._isTransactionActive) {
                await this.closePool();
            }
        }
    }

    /**
     * Create new user
     * @param {Object} data - User data
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object>}
     */
    async create(data, options = {}) {
        try {
            // Générer le GUID automatiquement si pas fourni
            if (!data.guid) {
                data.guid = await this.generateGuid(this.model, 6, null, options);
            }

            return await this.createRecord(this.model, data, options);
        } catch (error) {
            console.error('Erreur lors de la création:', error);
            throw error;
        }
    }

    /**
     * Update user
     * @param {number} id - User ID
     * @param {Object} data - Update data
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object|null>}
     */
    async update(id, data, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const updateOptions = {
                where: { id: id }
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
        } finally {
            if (!options.isTransaction && !this._isTransactionActive) {
                await this.closePool();
            }
        }
    }

    /**
     * Delete user
     * @param {number} id - User ID
     * @param {Object} options - Options de connexion
     * @returns {Promise<boolean>}
     */
    async delete(id, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const deleteOptions = {
                where: { id: id }
            };

            if (options.isTransaction || this._isTransactionActive) {
                deleteOptions.transaction = connection;
            }

            const deletedRowsCount = await this.model.destroy(deleteOptions);
            return deletedRowsCount > 0;
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            throw error;
        } finally {
            if (!options.isTransaction && !this._isTransactionActive) {
                await this.closePool();
            }
        }
    }

    /**
     * Get all users avec pagination
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

            const findOptions = {
                where,
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
    }

    /**
     * Find all users with account and profil data
     * @param {Object} queryOptions - Query options
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object>}
     */
    async findAllWithAccount(queryOptions = {}, options = {}) {
        try {
            const { connection } = await this.getConnection(options);
            const AccountModel = require('./AccountModel');
            const ProfilModel = require('./ProfilModel');

            const { page = 1, limit = 10, where = {}, order = [['id', 'ASC']] } = queryOptions;
            const offset = (page - 1) * limit;

            const findOptions = {
                where,
                order,
                limit,
                offset,
                include: [{
                    model: AccountModel.getModel(),
                    as: 'accountData',
                    required: true
                }, {
                    model: ProfilModel.getModel(),
                    as: 'profilData',
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
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('Erreur lors de la recherche paginée avec account et profil:', error);
            throw error;
        }
    }

    /**
     * Bulk create avec transaction
     * @param {Array} users - Array of user data
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async bulkCreate(users, options = {}) {
        return await this.executeInTransaction(async (transaction) => {
            // Générer des GUIDs pour les utilisateurs qui n'en ont pas
            for (let user of users) {
                if (!user.guid) {
                    user.guid = await this.generateGuid(this.model, 6, null, {
                        connection: transaction,
                        isTransaction: true
                    });
                }
            }

            const createOptions = { transaction, returning: true };
            const results = await this.model.bulkCreate(users, createOptions);
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
        if (!instance.name?.trim()) errors.push('Name is required');
        if (!instance.profil) errors.push('Profil is required');
        if (!instance.account) errors.push('Account is required');
        if (!instance.mobile) errors.push('Mobile is required');
        if (!instance.email?.trim()) errors.push('Email is required');

        // Email format validation
        if (instance.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(instance.email)) {
            errors.push('Invalid email format');
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

        if (instance.mobile) {
            const existingByMobile = await this.model.findOne({
                where: {
                    mobile: instance.mobile,
                    id: { [Op.ne]: instance.id || 0 }
                }
            });
            if (existingByMobile) errors.push('Mobile already exists');
        }

        if (instance.email) {
            const existingByEmail = await this.model.findOne({
                where: {
                    email: instance.email,
                    id: { [Op.ne]: instance.id || 0 }
                }
            });
            if (existingByEmail) errors.push('Email already exists');
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
            const userCount = await this.model.count();

            return {
                model: 'UserModel',
                poolStats,
                userCount,
                modelStatus: 'healthy',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                model: 'UserModel',
                modelStatus: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Créer une instance singleton
const userModelInstance = new UserModel();

module.exports = userModelInstance;



// const {DataTypes} = require("sequelize")
// const path = require('path');
// const paths = require('../../config/paths');
// const G = require(path.join(paths.TOOL_DIR, 'Glossary'));
//
// const { sequelize } = require(path.join(paths.MDL_DIR, 'odbc'));
//
// const UserModel = sequelize.define('User', {
//     id: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true,
//         comment: "User"
//     },
//     guid: {
//         type: DataTypes.INTEGER,
//         unique: {
//             name: 'UNIQUE-User-GUID',
//             msg: 'The GUID of User must be unique'
//         },
//         allowNull: false,
//         comment: 'GUID'
//     },
//     name: {
//         type: DataTypes.STRING,
//         allowNull: false,
//         comment: 'User full Name'
//     },
//     profil: {
//         type: DataTypes.INTEGER,
//         references: {
//             model: 'profil',
//             key: 'id'
//         },
//         allowNull: false,
//         comment: "The profil of User must be foreign key references of table profil"
//     },
//     account: {
//         type: DataTypes.INTEGER,
//         references: {
//             model:`${G.tablePrefix}_account`,
//             key: 'id'
//         },
//         allowNull: false,
//         comment: "The Account of User must be foreign key references of table account"
//     },
//     mobile: {
//         type: DataTypes.BIGINT,
//         allowNull: false,
//         unique: {
//             name: 'UNIQUE-Mobile',
//             msg: 'The Mobile number of user must be unique'
//         },
//         comment: "Mobile of user"
//     },
//     email: {
//         type: DataTypes.STRING,
//         allowNull: false,
//         unique: {
//             name: 'UNIQUE-Email',
//             msg: 'The Email address must be unique'
//         },
//         comment: "Email of user"
//     }
// }, {
//     tableName: "user",
//     timestamps: true,
//     createdAt: 'created',
//     updatedAt: 'updated'
// });
// UserModel.initialize = async function () {
//     try {
//         // Checks database connection
//         await sequelize.authenticate();
//
//         // Synchronises the model (creates the table if it doesn't exist)
//         await UserModel.sync({alter: true, force: G.development});
//
//         console.log('UserModel synchronized successfully');
//     } catch (error) {
//         console.error('Unable to synchronize the UserModel:', error);
//         throw error;
//     }
// };
//
// module.exports = UserModel;

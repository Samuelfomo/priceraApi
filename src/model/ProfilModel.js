const { DataTypes } = require("sequelize");
const path = require('path');
const paths = require('../../config/paths');
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));
const Database = require("./Database");

/**
 * Model class - Pure data structure and basic CRUD operations
 * @class ProfilModel
 * @extends Database
 *
 * @property {number} id
 * @property {number} guid
 * @property {string} name
 * @property {string} reference
 * @property {string} description
 */
class ProfilModel extends Database {

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
        this.model = this.getInstance().define('Profil', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                comment: "Profil ID"
            },
            guid: {
                type: DataTypes.INTEGER,
                unique: {
                    name: 'UNIQUE-Profil-GUID',
                    msg: 'The GUID of Profil must be unique'
                },
                allowNull: false,
                comment: 'GUID'
            },
            name: {
                type: DataTypes.STRING(128),
                unique: {
                    name: 'UNIQUE-Profil-Name',
                    msg: 'The Name of Profil must be unique'
                },
                allowNull: false,
                comment: "Name"
            },
            reference: {
                type: DataTypes.STRING,
                unique: {
                    name: 'UNIQUE-Profil-Reference',
                    msg: 'The Reference of Profil must be unique'
                },
                allowNull: false,
                comment: "Reference"
            },
            description: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: "Description"
            }
        }, {
            tableName: "profil",
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
     * @param {number} id - Profil ID
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object|null>}
     */
    async find(id, options = {}) {
        try {
            const profil = await this.getById(this.model, id, options);
            return profil || null;
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
     * Find by reference
     * @param {string} reference - Reference value
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object|null>}
     */
    async findByReference(reference, options = {}) {
        return await this.findByAttribute('reference', reference, options);
    }

    /**
     * Find by name
     * @param {string} name - Name value
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object|null>}
     */
    async findByName(name, options = {}) {
        return await this.findByAttribute('name', name, options);
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
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
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
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }

    /**
     * Create new profil
     * @param {Object} data - Profil data
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
     * Update profil
     * @param {number} id - Profil ID
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
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }

    /**
     * Delete profil
     * @param {number} id - Profil ID
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
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }

    /**
     * Get all profils avec pagination
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
                order = [['name', 'ASC']],
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
     * Get active profils (optionnel si vous avez un statut)
     * @param {Object} queryOptions - Query options
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object>}
     */
    async findActive(queryOptions = {}, options = {}) {
        const activeQueryOptions = {
            ...queryOptions,
            where: {
                ...queryOptions.where,
                // Ajoutez ici vos critères pour les profils actifs si nécessaire
                // status: 'active' par exemple
            }
        };
        return await this.findAll(activeQueryOptions, options);
    }

    /**
     * Bulk create avec transaction
     * @param {Array} profils - Array of profil data
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async bulkCreate(profils, options = {}) {
        return await this.executeInTransaction(async (transaction) => {
            // Générer des GUIDs pour les profils qui n'en ont pas
            for (let profil of profils) {
                if (!profil.guid) {
                    profil.guid = await this.generateGuid(this.model, 6, null, {
                        connection: transaction,
                        isTransaction: true
                    });
                }
            }

            const createOptions = { transaction, returning: true };
            const results = await this.model.bulkCreate(profils, createOptions);
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
        if (!instance.reference?.trim()) errors.push('Reference is required');

        // Name length validation
        if (instance.name && instance.name.length > 128) {
            errors.push('Name must be 128 characters or less');
        }

        // Reference format validation (vous pouvez personnaliser selon vos besoins)
        if (instance.reference && !/^[A-Z0-9_-]+$/i.test(instance.reference)) {
            errors.push('Reference must contain only alphanumeric characters, underscores, and hyphens');
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

        if (instance.name) {
            const existingByName = await this.model.findOne({
                where: {
                    name: instance.name,
                    id: { [Op.ne]: instance.id || 0 }
                }
            });
            if (existingByName) errors.push('Name already exists');
        }

        if (instance.reference) {
            const existingByReference = await this.model.findOne({
                where: {
                    reference: instance.reference,
                    id: { [Op.ne]: instance.id || 0 }
                }
            });
            if (existingByReference) errors.push('Reference already exists');
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
            const profilCount = await this.model.count();

            return {
                model: 'ProfilModel',
                poolStats,
                profilCount,
                modelStatus: 'healthy',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                model: 'ProfilModel',
                modelStatus: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Initialize method pour compatibilité avec l'ancien code
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Vérifier la connexion à la base de données
            await this.getInstance().authenticate();

            // Synchroniser le modèle (créer la table si elle n'existe pas)
            await this.model.sync({ alter: true, force: G.development });

            console.log('ProfilModel synchronized successfully');
        } catch (error) {
            console.error('Unable to synchronize the ProfilModel:', error);
            throw error;
        }
    }
}

// Créer une instance singleton
const profilModelInstance = new ProfilModel();

module.exports = profilModelInstance;



// const {DataTypes} = require("sequelize")
// const path = require('path');
// const paths = require('../../config/paths');
// const G = require(path.join(paths.TOOL_DIR, 'Glossary'));
//
// const { sequelize } = require(path.join(paths.MDL_DIR, 'odbc'));
//
// const ProfilModel = sequelize.define('Profil', {
//     id: {
//         type: DataTypes.INTEGER,
//         primaryKey: true,
//         autoIncrement: true,
//         comment: "Profil"
//     },
//     guid: {
//         type: DataTypes.INTEGER,
//         unique: {
//             name: 'UNIQUE-Profil-GUID',
//             msg: 'The GUID of Profil must be unique'
//         },
//         allowNull: false,
//         comment: 'GUID'
//     },
//     name: {
//         type: DataTypes.STRING(128),
//         unique: {
//             name: 'UNIQUE-Profil-Name',
//             msg: 'The Name of Profil must be unique'
//         },
//         allowNull: false,
//         comment: "Name"
//     },
//     reference: {
//         type: DataTypes.STRING,
//         unique: {
//             name: 'UNIQUE-Profil-Reference',
//             msg: 'The Reference of Profil must be unique'
//         },
//         allowNull: false,
//         comment: "Reference"
//     },
//     description: {
//         type: DataTypes.STRING,
//         allowNull: true,
//         comment: "description"
//     },
// }, {
//     tableName: "profil",
//     timestamps: true,
//     createdAt: 'created',
//     updatedAt: 'updated'
// });
// ProfilModel.initialize = async function () {
//     try {
//         // Checks database connection
//         await sequelize.authenticate();
//
//         // Synchronises the model (creates the table if it doesn't exist)
//         await ProfilModel.sync({alter: true, force: G.development});
//
//         console.log('ProfilModel synchronized successfully');
//     } catch (error) {
//         console.error('Unable to synchronize the ProfilModel:', error);
//         throw error;
//     }
// };
//
// module.exports = ProfilModel;

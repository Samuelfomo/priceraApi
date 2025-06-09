const { DataTypes } = require("sequelize");
const Database = require("./Database");

class CountryModel extends Database{
    constructor() {
        super();
        this.model = null;
        this._initModel();
    }
    _initModel() {
        this.model = this.getInstance().define('Country', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                comment: "Country"
            },
            guid: {
                type: DataTypes.INTEGER,
                unique: {
                    name: 'UNIQUE-Country-GUID',
                    msg: 'The GUID of Country must be unique'
                },
                allowNull: false,
                comment: 'GUID'
            },
            alpha2: {
                type: DataTypes.STRING(128),
                unique: {
                    name: 'UNIQUE-Country-alpha2',
                    msg: 'The alpha2 of Country must be unique'
                },
                allowNull: false,
                comment: "alpha2"
            },
            alpha3: {
                type: DataTypes.STRING(128),
                unique: {
                    name: 'UNIQUE-Country-alpha3',
                    msg: 'The alpha3 of Country must be unique'
                },
                allowNull: false,
                comment: "alpha3"
            },
            dialcode: {
                type: DataTypes.SMALLINT,
                allowNull: false,
                comment: "dialcode"
            },
            fr: {
                type: DataTypes.STRING(128),
                allowNull: false,
                comment: "fr"
            },
            en: {
                type: DataTypes.STRING(128),
                allowNull: false,
                comment: "en"
            }
        }, {
                tableName: "country",
                timestamps: false,
                hooks: {
                    beforeSave: async (instance) => {
                        await this._dataControl(instance);
                    }
                }
            })
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
     * @param {number} id - Country ID
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object|null>}
     */
    async find(id, options = {}) {
        try {
            const country = await this.getById(this.model, id, options);
            return country? country : null;
        } catch (error) {
            console.error('Erreur lors de la recherche par ID:', error);
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
            const defaultWhere = { ...where };

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

    /**
     * Create new country
     * @param {Object} data - Country data
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object>}
     */
    async create(data, options = {}) {
        await this.getConnection(options);
        try {
            if (!data.guid) {
                data.guid = await this.generateGuid(this.model, 6, null, options);
            }
            return await this.createRecord(this.model, data, options);
        } catch (error) {
            console.error('Erreur lors de la création:', error);
            throw error;
        }
        // SUPPRIMÉ : finally { await this.closePool(); }
    }


    /**
     * Update country
     * @param id
     * @param data
     * @param options
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
        if (!instance.alpha2?.trim()) errors.push('Code alpha2 is required');
        if (!instance.alpha3?.trim()) errors.push('Code alpha3 is required');
        if (!instance.dialcode) errors.push('Dialcode is required');
        if (!instance.fr?.trim()) errors.push('French name is required');
        if (!instance.en?.trim()) errors.push('English name is required');


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

        if (instance.alpha2) {
            const existingByAlpha2 = await this.model.findOne({
                where: {
                    alpha2: instance.alpha2,
                    id: { [Op.ne]: instance.id || 0 }
                }
            });
            if (existingByAlpha2) errors.push('Alpha2 already exists');
        }
        if (instance.alpha3) {
            const existingByAlpha3 = await this.model.findOne({
                where: {
                    alpha3: instance.alpha3,
                    id: { [Op.ne]: instance.id || 0 }
                }
            });
            if (existingByAlpha3) errors.push('Alpha3 already exists');
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }

}

const countryModelInstance = new CountryModel();

module.exports = countryModelInstance;


/*
const { DataTypes } = require("sequelize");
const path = require("path");
const Database = require("./Database");

class CountryModel extends Database {
    constructor() {
        super();
        this.model = null;
        this._initModel();
    }

    _initModel() {
        this.model = this.getInstance().define("Country", {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                comment: "Country"
            },
            guid: {
                type: DataTypes.INTEGER,
                unique: {
                    name: 'UNIQUE-Country-GUID',
                    msg: 'The GUID of Country must be unique'
                },
                allowNull: false,
                comment: 'GUID'
            },
            alpha2: {
                type: DataTypes.STRING(128),
                unique: {
                    name: 'UNIQUE-Country-alpha2',
                    msg: 'The alpha2 of Country must be unique'
                },
                allowNull: false,
                comment: "alpha2"
            },
            alpha3: {
                type: DataTypes.STRING(128),
                unique: {
                    name: 'UNIQUE-Country-alpha3',
                    msg: 'The alpha3 of Country must be unique'
                },
                allowNull: false,
                comment: "alpha3"
            },
            dialcode: {
                type: DataTypes.SMALLINT,
                allowNull: false,
                comment: "dialcode"
            },
            fr: {
                type: DataTypes.STRING(128),
                allowNull: false,
                comment: "fr"
            },
            en: {
                type: DataTypes.STRING(128),
                allowNull: false,
                comment: "en"
            }
        }, {
            tableName: "country",
            timestamps: false,
            hooks: {
                beforeSave: async (instance) => {
                    await this._dataControl(instance);
                }
            }
        });
    }

    getModel() {
        return this.model;
    }

    async find(id, options = {}) {
        try {
            return await this.model.findByPk(id, options);
        } catch (err) {
            console.error("Erreur find Country :", err);
            throw err;
        }
    }

    async findAll(options = {}) {
        try {
            return await this.model.findAll(options);
        } catch (err) {
            console.error("Erreur findAll Country :", err);
            throw err;
        }
    }

    async create(data, options = {}) {
        try {
            return await this.model.create(data, options);
        } catch (err) {
            console.error("Erreur create Country :", err);
            throw err;
        }
    }

    async update(id, data, options = {}) {
        try {
            const [affectedRows] = await this.model.update(data, {
                where: { id },
                ...options
            });

            return affectedRows > 0 ? await this.find(id, options) : null;
        } catch (err) {
            console.error("Erreur update Country :", err);
            throw err;
        }
    }
}

 */

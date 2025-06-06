const { DataTypes } = require("sequelize");
const path = require('path');
const paths = require('../../config/paths');
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));
const Database = require("./Database");
const {sequelize} = require("./odbc");

/**
 * Model class - Pure data structure and basic CRUD operations
 * @class CompanyModel
 * @extends Database
 *
 * @property {number} id
 * @property {number} guid
 * @property {string} name
 * @property {string} point - WKT Point format: POINT(longitude latitude)
 * @property {string} code
 * @property {number} country
 * @property {Object} address - JSON: {city, location, district}
 * @property {Object} metadata - JSON: {domaine, sector, speciality}
 */
class CompanyModel extends Database {

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
        this.model = this.getInstance().define('Company', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                comment: "Company ID"
            },
            guid: {
                type: DataTypes.INTEGER,
                unique: {
                    name: 'UNIQUE-COMPANY-GUID',
                    msg: 'The GUID of Company must be unique'
                },
                allowNull: false,
                comment: 'GUID'
            },
            name: {
                type: DataTypes.STRING(128),
                allowNull: false,
                comment: 'Name of Company'
            },
            // Using WKT Point format for geolocation
            point: {
                type: DataTypes.TEXT,
                allowNull: false,
                comment: 'Geolocation of company (WKT format: POINT(longitude latitude))',
                validate: {
                    isValidPoint(value) {
                        const pointRegex = /^POINT\((-?\d+\.?\d*)\s+(-?\d+\.?\d*)\)$/i;
                        if (!pointRegex.test(value)) {
                            throw new Error('Point must be in WKT format: POINT(longitude latitude)');
                        }

                        const matches = value.match(pointRegex);
                        const longitude = parseFloat(matches[1]);
                        const latitude = parseFloat(matches[2]);

                        if (longitude < -180 || longitude > 180) {
                            throw new Error('Longitude must be between -180 and 180');
                        }
                        if (latitude < -90 || latitude > 90) {
                            throw new Error('Latitude must be between -90 and 90');
                        }
                    }
                }
            },
            code: {
                type: DataTypes.STRING(128),
                unique: {
                    name: 'UNIQUE-COMPANY-CODE',
                    msg: 'The CODE of Company must be unique'
                },
                allowNull: true,
                comment: "CODE"
            },
            country: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'country',
                    key: 'id'
                },
                comment: "Country foreign key"
            },
            // JSON attribute for address
            address: {
                type: DataTypes.JSONB,
                allowNull: false,
                comment: "Address of Company (JSON: {city, location, district})",
                validate: {
                    isValidAddress(value) {
                        if (!value || typeof value !== 'object') {
                            throw new Error('Address must be a valid JSON object');
                        }

                        const required = ['city', 'location', 'district'];
                        const missing = required.filter(field => !value[field] || typeof value[field] !== 'string');

                        if (missing.length > 0) {
                            throw new Error(`Address is missing required fields: ${missing.join(', ')}`);
                        }
                    }
                }
            },
            // JSON attribute for metadata
            metadata: {
                type: DataTypes.JSONB,
                allowNull: false,
                comment: "Metadata of Company (JSON: {domaine, sector, speciality})",
                validate: {
                    isValidMetadata(value) {
                        if (!value || typeof value !== 'object') {
                            throw new Error('Metadata must be a valid JSON object');
                        }

                        const required = ['domaine', 'sector', 'speciality'];
                        // const missing = required.filter(field => !value[field] || typeof value[field] !== 'string');
                        const missing = required.filter(field =>
                            !value[field] ||
                            !(typeof value[field] === 'string' || (Array.isArray(value[field]) && value[field].every(v => typeof v === 'string')))
                        );

                        if (missing.length > 0) {
                            throw new Error(`Metadata is missing required fields: ${missing.join(', ')}`);
                        }
                    }
                }
            }
        }, {
            tableName: `${G.tablePrefix}_company`,
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
     * @param {number} id - Company ID
     * @param {Object} options - Options de connexion
     * @returns {Promise<Object|null>}
     */
    async find(id, options = {}) {
        try {
            const company = await this.getById(this.model, id, options);
            return company? company: null;
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
                where: { [attribute]: value }
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
                where: { [attribute]: value }
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
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await sequelize.close();
        //     }
        // }
    }

    /**
     * Create new company
     * @param {Object} data - Company data
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
     * Update company
     * @param {number} id - Company ID
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
     * Delete company
     * @param {number} id - Company ID
     * @param {Object} options - Options de connexion
     * @returns {Promise<boolean>}
     */
    async delete(id, options = {}) {
        try {
            return await this.deleteRecord(this.model, id, options);
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            throw error;
        }
    }

    /**
     * Get all companies avec pagination
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
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }

    /**
     * Bulk create avec transaction
     * @param {Array} companies - Array of company data
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async bulkCreate(companies, options = {}) {
        return await this.executeInTransaction(async (transaction) => {
            // Générer des GUIDs pour les compagnies qui n'en ont pas
            for (let company of companies) {
                if (!company.guid) {
                    company.guid = await this.generateGuid(this.model, 6, null, {
                        connection: transaction,
                        isTransaction: true
                    });
                }
            }

            const createOptions = { transaction, returning: true };
            const results = await this.model.bulkCreate(companies, createOptions);
            return results.map(result => result.toJSON());
        });
    }

    // =============================================================================
    // MÉTHODES SPÉCIFIQUES POUR LES COORDONNÉES GÉOGRAPHIQUES
    // =============================================================================

    /**
     * Find companies by radius
     * @param {number} centerLng - Center longitude
     * @param {number} centerLat - Center latitude
     * @param {number} radiusKm - Radius in kilometers
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async findByRadius(centerLng, centerLat, radiusKm, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const queryOptions = {
                where: this.getInstance().literal(`
                    (6371 * acos(
                        cos(radians(${centerLat})) * 
                        cos(radians(CAST(substring(point from 'POINT\\\\(([^\\\\s]+)') AS FLOAT))) * 
                        cos(radians(CAST(substring(point from 'POINT\\\\([^\\\\s]+\\\\s+([^\\\\)]+)') AS FLOAT)) - radians(${centerLng})) + 
                        sin(radians(${centerLat})) * 
                        sin(radians(CAST(substring(point from 'POINT\\\\([^\\\\s]+\\\\s+([^\\\\)]+)') AS FLOAT)))
                    )) <= ${radiusKm}
                `)
            };

            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const results = await this.model.findAll(queryOptions);
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche par rayon:', error);
            throw error;
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }

    /**
     * Find nearest companies
     * @param {number} lng - Longitude
     * @param {number} lat - Latitude
     * @param {number} limit - Number of results
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async findNearest(lng, lat, limit = 10, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const queryOptions = {
                attributes: {
                    include: [
                        [
                            this.getInstance().literal(`
                                (6371 * acos(
                                    cos(radians(${lat})) * 
                                    cos(radians(CAST(substring(point from 'POINT\\\\(([^\\\\s]+)') AS FLOAT))) * 
                                    cos(radians(CAST(substring(point from 'POINT\\\\([^\\\\s]+\\\\s+([^\\\\)]+)') AS FLOAT)) - radians(${lng})) + 
                                    sin(radians(${lat})) * 
                                    sin(radians(CAST(substring(point from 'POINT\\\\([^\\\\s]+\\\\s+([^\\\\)]+)') AS FLOAT)))
                                ))
                            `),
                            'distance'
                        ]
                    ]
                },
                order: this.getInstance().literal('distance ASC'),
                limit: limit
            };

            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const results = await this.model.findAll(queryOptions);
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche des plus proches:', error);
            throw error;
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }

    // =============================================================================
    // MÉTHODES SPÉCIFIQUES POUR LES RECHERCHES JSON
    // =============================================================================

    /**
     * Find companies by city
     * @param {string} city - City name
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async findByCity(city, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const queryOptions = {
                where: this.getInstance().where(
                    this.getInstance().json('address.city'),
                    city
                )
            };

            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const results = await this.model.findAll(queryOptions);
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche par ville:', error);
            throw error;
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }

    /**
     * Find companies by domaine
     * @param {string} domaine - Domaine name
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async findByDomaine(domaine, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const queryOptions = {
                where: this.getInstance().where(
                    this.getInstance().json('metadata.domaine'),
                    domaine
                )
            };

            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const results = await this.model.findAll(queryOptions);
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche par domaine:', error);
            throw error;
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }

    /**
     * Find companies by sector
     * @param {string} sector - Sector name
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async findBySector(sector, options = {}) {
        try {
            const { connection } = await this.getConnection(options);

            const queryOptions = {
                where: this.getInstance().where(
                    this.getInstance().json('metadata.sector'),
                    sector
                )
            };

            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const results = await this.model.findAll(queryOptions);
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche par secteur:', error);
            throw error;
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }

    /**
     * Find companies by location
     * @param {string} city - City name
     * @param {string|null} location - Location name (optional)
     * @param {Object} options - Options de connexion
     * @returns {Promise<Array>}
     */
    async findByLocation(city, location = null, options = {}) {
        try {
            const { connection } = await this.getConnection(options);
            const { Op } = require("sequelize");

            const conditions = {
                [Op.and]: [
                    this.getInstance().where(this.getInstance().json('address.city'), city)
                ]
            };

            if (location) {
                conditions[Op.and].push(
                    this.getInstance().where(this.getInstance().json('address.location'), location)
                );
            }

            const queryOptions = { where: conditions };

            if (options.isTransaction || this._isTransactionActive) {
                queryOptions.transaction = connection;
            }

            const results = await this.model.findAll(queryOptions);
            return results.map(result => result.toJSON());
        } catch (error) {
            console.error('Erreur lors de la recherche par localisation:', error);
            throw error;
        }
        // finally {
        //     if (!options.isTransaction && !this._isTransactionActive) {
        //         await this.closePool();
        //     }
        // }
    }

    // =============================================================================
    // MÉTHODES UTILITAIRES
    // =============================================================================

    /**
     * Extract coordinates from WKT Point
     * @param {string} point - WKT Point string
     * @returns {Object|null} - {longitude, latitude}
     */
    extractCoordinatesFromPoint(point) {
        if (!point) return null;

        const pointRegex = /^POINT\((-?\d+\.?\d*)\s+(-?\d+\.?\d*)\)$/i;
        const matches = point.match(pointRegex);

        if (!matches) return null;

        return {
            longitude: parseFloat(matches[1]),
            latitude: parseFloat(matches[2])
        };
    }

    /**
     * Calculate distance between two points (Haversine formula)
     * @param {Object} coord1 - {longitude, latitude}
     * @param {Object} coord2 - {longitude, latitude}
     * @returns {number|null} - Distance in kilometers
     */
    calculateDistance(coord1, coord2) {
        if (!coord1 || !coord2) return null;

        const R = 6371; // Earth radius in kilometers
        const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
        const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in kilometers
    }

    /**
     * Create WKT Point from coordinates
     * @param {number} longitude - Longitude
     * @param {number} latitude - Latitude
     * @returns {string} - WKT Point string
     */
    createPoint(longitude, latitude) {
        return `POINT(${longitude} ${latitude})`;
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
        // if (!instance.code?.trim()) errors.push('Code is required');
        if (!instance.country) errors.push('Country is required');
        if (!instance.point || // null, undefined, etc.
            (typeof instance.point === 'string' && !instance.point.trim()) || // chaîne vide
            (Array.isArray(instance.point) && instance.point.length === 0) // tableau vide
        ) {
            errors.push('Point coordinates are required');
        }
        if (!instance.address) errors.push('Address is required');
        if (!instance.metadata) errors.push('Metadata is required');

        // Length validations
        if (instance.name && instance.name.length > 128) {
            errors.push('Name too long (max 128 characters)');
        }
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

        // Data normalization
        if (instance.address && typeof instance.address === 'object') {
            Object.keys(instance.address).forEach(key => {
                if (typeof instance.address[key] === 'string') {
                    instance.address[key] = instance.address[key].trim();
                }
            });
        }

        if (instance.metadata && typeof instance.metadata === 'object') {
            Object.keys(instance.metadata).forEach(key => {
                if (typeof instance.metadata[key] === 'string') {
                    instance.metadata[key] = instance.metadata[key].trim();
                }
            });
        }
        if (Array.isArray(instance.point)) {
            if (instance.point.length !== 2) {
                errors.push('Point must contain exactly 2 coordinates [latitude, longitude]');
            } else {
                const [lat, lng] = instance.point;
                if (isNaN(lat) || isNaN(lng)) {
                    errors.push('Point coordinates must be valid numbers');
                } else if (lat < -90 || lat > 90) {
                    errors.push('Latitude must be between -90 and 90');
                } else if (lng < -180 || lng > 180) {
                    errors.push('Longitude must be between -180 and 180');
                } else {
                    // Convert to WKT format for Sequelize
                    instance.point = `POINT(${lng} ${lat})`;
                }
            }
        }


        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }

    /**
     * Create JSON indexes for performance (PostgreSQL)
     * @param {Object} options - Options de connexion
     * @returns {Promise<void>}
     */
    async createJsonIndexes(options = {}) {
        try {
            const queries = [
                // Index for point field (WKT format)
                `CREATE INDEX IF NOT EXISTS idx_company_point ON ${G.tablePrefix}_company USING BTREE (point)`,

                // Index for city searches
                `CREATE INDEX IF NOT EXISTS idx_company_address_city ON ${G.tablePrefix}_company USING BTREE ((address->>'city'))`,

                // Index for domain searches
                `CREATE INDEX IF NOT EXISTS idx_company_metadata_domaine ON ${G.tablePrefix}_company USING BTREE ((metadata->>'domaine'))`,

                // Index for sector searches
                `CREATE INDEX IF NOT EXISTS idx_company_metadata_sector ON ${G.tablePrefix}_company USING BTREE ((metadata->>'sector'))`,

                // Global GIN index for complete address
                `CREATE INDEX IF NOT EXISTS idx_company_address_gin ON ${G.tablePrefix}_company USING GIN (address)`,

                // Global GIN index for complete metadata
                `CREATE INDEX IF NOT EXISTS idx_company_metadata_gin ON ${G.tablePrefix}_company USING GIN (metadata)`
            ];

            for (const query of queries) {
                await this.executeQuery(query, options);
            }

            console.log('JSON indexes created successfully');
        } catch (error) {
            console.error('Error creating JSON indexes:', error);
            // Don't fail if indexes fail
        }
    }

    /**
     * Health check pour ce modèle
     * @returns {Promise<Object>}
     */
    async modelHealthCheck() {
        try {
            const poolStats = this.getPoolStats();
            const companyCount = await this.model.count();

            return {
                model: 'CompanyModel',
                poolStats,
                companyCount,
                modelStatus: 'healthy',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                model: 'CompanyModel',
                modelStatus: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Créer une instance singleton
const companyModelInstance = new CompanyModel();

module.exports = companyModelInstance;
const {DataTypes} = require("sequelize")
const path = require('path');
const paths = require('../../config/paths');
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));
const { sequelize } = require(path.join(paths.MDL_DIR, 'odbc'));

const CompanyModel = sequelize.define('Company', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: "Company"
    },
    guid: {
        type: DataTypes.INTEGER,
        unique: {
            name: 'UNIQUE-Company-GUID',
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
            name: 'UNIQUE-Company-CODE',
            msg: 'The CODE of Company must be unique'
        },
        allowNull: false,
        comment: "CODE"
    },
    country: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'country',
            key: 'id'
        },
        comment: "The Country of Company must be foreign key references of table country"
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
                const missing = required.filter(field => !value[field] || typeof value[field] !== 'string');

                if (missing.length > 0) {
                    throw new Error(`Metadata is missing required fields: ${missing.join(', ')}`);
                }
            }
        }
    }
}, {
    tableName: "company",
    timestamps: true,
    updatedAt: "updated",
    createdAt: "created",
});

// =============================================================================
// INSTANCE METHODS FOR GEOLOCATION (Updated for WKT Point format)
// =============================================================================

CompanyModel.prototype.setCoordinates = function(longitude, latitude) {
    this.point = `POINT(${longitude} ${latitude})`;
    return this;
};

CompanyModel.prototype.getCoordinates = function() {
    const coords = this.extractCoordinatesFromPoint();
    return coords;
};

CompanyModel.prototype.getLongitude = function() {
    const coords = this.extractCoordinatesFromPoint();
    return coords ? coords.longitude : null;
};

CompanyModel.prototype.getLatitude = function() {
    const coords = this.extractCoordinatesFromPoint();
    return coords ? coords.latitude : null;
};

// Helper method to extract coordinates from WKT Point
CompanyModel.prototype.extractCoordinatesFromPoint = function() {
    if (!this.point) return null;

    const pointRegex = /^POINT\((-?\d+\.?\d*)\s+(-?\d+\.?\d*)\)$/i;
    const matches = this.point.match(pointRegex);

    if (!matches) return null;

    return {
        longitude: parseFloat(matches[1]),
        latitude: parseFloat(matches[2])
    };
};

// Method to calculate distance between two points (Haversine formula)
CompanyModel.prototype.distanceTo = function(otherCompany) {
    const thisCoords = this.getCoordinates();
    const otherCoords = otherCompany.getCoordinates();

    if (!thisCoords || !otherCoords) return null;

    const R = 6371; // Earth radius in kilometers
    const dLat = (otherCoords.latitude - thisCoords.latitude) * Math.PI / 180;
    const dLon = (otherCoords.longitude - thisCoords.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(thisCoords.latitude * Math.PI / 180) * Math.cos(otherCoords.latitude * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
};

// =============================================================================
// INSTANCE METHODS FOR ADDRESS
// =============================================================================

CompanyModel.prototype.getAddressCity = function() {
    return this.address?.city;
};

CompanyModel.prototype.getAddressLocation = function() {
    return this.address?.location;
};

CompanyModel.prototype.getAddressDistrict = function() {
    return this.address?.district;
};

CompanyModel.prototype.setAddress = function(city, location, district) {
    this.address = { city, location, district };
    return this;
};

CompanyModel.prototype.getFullAddress = function() {
    if (!this.address) return null;
    return `${this.address.location}, ${this.address.city}, ${this.address.district}`;
};

// =============================================================================
// INSTANCE METHODS FOR METADATA
// =============================================================================

CompanyModel.prototype.getMetadataDomaine = function() {
    return this.metadata?.domaine;
};

CompanyModel.prototype.getMetadataSector = function() {
    return this.metadata?.sector;
};

CompanyModel.prototype.getMetadataSpeciality = function() {
    return this.metadata?.speciality;
};

CompanyModel.prototype.setMetadata = function(domaine, sector, speciality) {
    this.metadata = { domaine, sector, speciality };
    return this;
};

CompanyModel.prototype.getFullMetadata = function() {
    if (!this.metadata) return null;
    return `${this.metadata.domaine} - ${this.metadata.sector} (${this.metadata.speciality})`;
};

// =============================================================================
// STATIC METHODS FOR JSON QUERIES
// =============================================================================

CompanyModel.findByCity = function(city) {
    return this.findAll({
        where: sequelize.where(
            sequelize.json('address.city'),
            city
        )
    });
};

CompanyModel.findByDomaine = function(domaine) {
    return this.findAll({
        where: sequelize.where(
            sequelize.json('metadata.domaine'),
            domaine
        )
    });
};

CompanyModel.findBySector = function(sector) {
    return this.findAll({
        where: sequelize.where(
            sequelize.json('metadata.sector'),
            sector
        )
    });
};

CompanyModel.findByLocation = function(city, location = null) {
    const conditions = {
        [sequelize.Op.and]: [
            sequelize.where(sequelize.json('address.city'), city)
        ]
    };

    if (location) {
        conditions[sequelize.Op.and].push(
            sequelize.where(sequelize.json('address.location'), location)
        );
    }

    return this.findAll({ where: conditions });
};

// Geographic query methods (Updated for WKT Point format)
CompanyModel.findByRadius = function(centerLng, centerLat, radiusKm) {
    // Using ST_DWithin for PostGIS or manual calculation for regular PostgreSQL
    return this.findAll({
        where: sequelize.literal(`
            (6371 * acos(
                cos(radians(${centerLat})) * 
                cos(radians(CAST(substring(point from 'POINT\\(([^\\s]+)') AS FLOAT))) * 
                cos(radians(CAST(substring(point from 'POINT\\([^\\s]+\\s+([^\\)]+)') AS FLOAT)) - radians(${centerLng})) + 
                sin(radians(${centerLat})) * 
                sin(radians(CAST(substring(point from 'POINT\\([^\\s]+\\s+([^\\)]+)') AS FLOAT)))
            )) <= ${radiusKm}
        `)
    });
};

CompanyModel.findNearest = function(lng, lat, limit = 10) {
    return this.findAll({
        attributes: {
            include: [
                [
                    sequelize.literal(`
                        (6371 * acos(
                            cos(radians(${lat})) * 
                            cos(radians(CAST(substring(point from 'POINT\\(([^\\s]+)') AS FLOAT))) * 
                            cos(radians(CAST(substring(point from 'POINT\\([^\\s]+\\s+([^\\)]+)') AS FLOAT)) - radians(${lng})) + 
                            sin(radians(${lat})) * 
                            sin(radians(CAST(substring(point from 'POINT\\([^\\s]+\\s+([^\\)]+)') AS FLOAT)))
                        ))
                    `),
                    'distance'
                ]
            ]
        },
        order: sequelize.literal('distance ASC'),
        limit: limit
    });
};

// =============================================================================
// INITIALIZATION METHOD
// =============================================================================

CompanyModel.initialize = async function () {
    try {
        // Database connection verification
        await sequelize.authenticate();
        console.log('Database connection established successfully');

        // Model synchronization (creates table if it doesn't exist)
        await CompanyModel.sync({alter: true, force: G.development});
        console.log('CompanyModel synchronized successfully');

        // Create indexes for performance (PostgreSQL only)
        if (sequelize.getDialect() === 'postgres') {
            await CompanyModel.createJsonIndexes();
        }

    } catch (error) {
        console.error('Unable to synchronize the CompanyModel:', error);
        throw error;
    }
};

// =============================================================================
// CREATE INDEXES FOR PERFORMANCE (PostgreSQL) - Fixed for WKT Point
// =============================================================================

CompanyModel.createJsonIndexes = async function() {
    try {
        // Index for point field (WKT format)
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_company_point
                ON company USING BTREE (point)
        `);

        // Index for city searches
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_company_address_city
                ON company USING BTREE ((address->>'city'))
        `);

        // Index for domain searches
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_company_metadata_domaine
                ON company USING BTREE ((metadata->>'domaine'))
        `);

        // Index for sector searches
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_company_metadata_sector
                ON company USING BTREE ((metadata->>'sector'))
        `);

        // Global GIN index for complete address
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_company_address_gin
                ON company USING GIN (address)
        `);

        // Global GIN index for complete metadata
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_company_metadata_gin
                ON company USING GIN (metadata)
        `);

        console.log('JSON indexes created successfully');
    } catch (error) {
        console.error('Error creating JSON indexes:', error);
        // Don't fail initialization if indexes fail
    }
};

// =============================================================================
// UTILITY METHODS
// =============================================================================

CompanyModel.prototype.toSimpleJSON = function() {
    const json = this.toJSON();
    return {
        id: json.id,
        name: json.name,
        code: json.code,
        coordinates: this.getCoordinates(),
        fullAddress: this.getFullAddress(),
        fullMetadata: this.getFullMetadata(),
        created: json.created,
        updated: json.updated
    };
};

CompanyModel.prototype.toGeoJSON = function() {
    const coords = this.getCoordinates();
    return {
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: coords ? [coords.longitude, coords.latitude] : null
        },
        properties: {
            id: this.id,
            name: this.name,
            code: this.code,
            address: this.address,
            metadata: this.metadata
        }
    };
};

// Hook before save for additional validation
CompanyModel.beforeSave((company, options) => {
    // Data normalization
    if (company.address) {
        Object.keys(company.address).forEach(key => {
            if (typeof company.address[key] === 'string') {
                company.address[key] = company.address[key].trim();
            }
        });
    }

    if (company.metadata) {
        Object.keys(company.metadata).forEach(key => {
            if (typeof company.metadata[key] === 'string') {
                company.metadata[key] = company.metadata[key].trim();
            }
        });
    }

    // Validate coordinates from point if it exists
    if (company.point) {
        const pointRegex = /^POINT\((-?\d+\.?\d*)\s+(-?\d+\.?\d*)\)$/i;
        const matches = company.point.match(pointRegex);

        if (matches) {
            const longitude = parseFloat(matches[1]);
            const latitude = parseFloat(matches[2]);

            if (isNaN(longitude) || longitude < -180 || longitude > 180) {
                throw new Error('Longitude must be a valid number between -180 and 180');
            }
            if (isNaN(latitude) || latitude < -90 || latitude > 90) {
                throw new Error('Latitude must be a valid number between -90 and 90');
            }
        }
    }
});

module.exports = CompanyModel;

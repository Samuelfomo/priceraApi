const CompanyModel = require('../model/CompanyModel');
const Logger = require('../tools/logger');
const G = require('../tools/Glossary');
const CountryModel = require('../model/CountryModel');

/**
 * Business Logic class - Composition pattern instead of inheritance
 * Contains getters, setters, and business operations
 * @class Company
 */
class Company {
    constructor(data = {}) {
        // Initialize properties
        this.id = data.id || null;
        this.guid = data.guid || null;
        this.name = data.name || '';
        this.point = data.point || [];
        this.code = data.code || '';
        this.country = data.country || null;
        this.address = data.address || {};
        this.metadata = data.metadata || {};
        this.created = data.created || null;
        this.updated = data.updated || null;
        this.countryObject = data.countryObject || null;
    }

    // ===========================
    // GETTERS & SETTERS
    // ===========================

    get guidFormatted() {
        return this.guid ? Number(this.guid) : null;
    }

    get codeFormatted() {
        return this.code?.toUpperCase() || '';
    }

    get nameFormatted() {
        return this.name?.trim() || '';
    }
    get hasLocation() {
        // Si déjà tableau [lat, lng]
        if (Array.isArray(this.point) && this.point.length === 2) {
            return !isNaN(this.point[0]) && !isNaN(this.point[1]);
        }

        // Si chaîne WKT format: "POINT(lng lat)"
        if (typeof this.point === 'string') {
            const match = this.point.match(/^POINT\((-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\)$/i);
            return !!match;
        }

        return false;
    }

    get latitude() {
        if (Array.isArray(this.point)) {
            return this.point[0];
        }

        if (typeof this.point === 'string') {
            const match = this.point.match(/^POINT\((-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\)$/i);
            if (match) return parseFloat(match[3]); // lat
        }

        return null;
    }

    get longitude() {
        if (Array.isArray(this.point)) {
            return this.point[1];
        }

        if (typeof this.point === 'string') {
            const match = this.point.match(/^POINT\((-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\)$/i);
            if (match) return parseFloat(match[1]); // lng
        }

        return null;
    }

    /**
     * @property {string} city
     * @property {string} location
     * @property {string} district
     * @returns {string}
     */
    get addressFormatted() {
        if (!this.address || typeof this.address !== 'object') return '';

        const parts = [];
        if (this.address.city) parts.push(this.address.city);
        if (this.address.location) parts.push(this.address.location);
        if (this.address.district) parts.push(this.address.district);

        return parts.join(', ');
    }

    /**
     * @property {string} domaine
     * @property {string} sector
     * @property {string} speciality
     * @returns {string}
     */
    get metadataFormatted() {
        if (!this.metadata || typeof this.metadata !== 'object') return '';

        const parts = [];
        if (this.metadata.domaine) parts.push(this.metadata.domaine);
        if (this.metadata.sector) parts.push(this.metadata.sector);
        if (this.metadata.speciality) parts.push(this.metadata.speciality);
        return parts.join(', ');
    }

    set codeValue(value) {
        this.code = value?.toString().trim().toUpperCase();
    }

    set nameValue(value) {
        this.name = value?.toString().trim();
    }
    set pointValue(coords) {
        if (coords && coords.latitude != null && coords.longitude != null) {
            this.point = [Number(coords.latitude), Number(coords.longitude)];
        } else {
            this.point = [];
        }
    }

    // set pointValue({latitude, longitude}) {
    //     if (latitude != null && longitude != null) {
    //         this.point = [Number(latitude), Number(longitude)];
    //     } else {
    //         this.point = [];
    //     }
    // }

    // ===========================
    // STATIC FACTORY METHODS
    // ===========================

    /**
     * Charger les données du country associé
     * @returns {Promise<Country|null>}
     */
    async loadCountry() {
        try {
            if (!this.country) return null;

            const CountryModel = require('../model/CountryModel');
            const countryData = await CountryModel.find(this.country);

            if (countryData) {
                const Country = require('./Country');
                this.countryObject = new Country(countryData);
                return this.countryObject;
            }

            return null;
        } catch (error) {
            Logger.logError('Failed to load country:', error);
            return null;
        }
    }

    /**
     * Méthode statique pour charger une company avec son country
     * @param {number} id - Company ID
     * @returns {Promise<Company>}
     */
    static async loadWithCountry(id) {
        try {
            const company = await Company.load(id);
            await company.loadCountry();
            return company;
        } catch (error) {
            Logger.logError('Failed to load company with country:', error);
            throw error;
        }
    }

    /**
     * Méthode statique pour obtenir toutes les companies avec leurs countries
     * @param {Object} queryOptions - Query options
     * @returns {Promise<Object>}
     */
    static async getAllWithCountry(queryOptions = {}) {
        try {
            const result = await CompanyModel.findAll(queryOptions);

            // Charger les countries pour chaque company
            const companiesWithCountry = await Promise.all(
                result.data.map(async (companyData) => {
                    const company = new Company(companyData);
                    await company.loadCountry();
                    return company;
                })
            );

            return {
                data: companiesWithCountry,
                pagination: result.pagination
            };
        } catch (error) {
            Logger.logError('Failed to get all companies with country:', error);
            throw error;
        }
    }

    /**
     * Load company with business validation
     * @param {number} id - Company ID
     * @returns {Promise<Company>}
     */
    static async load(id) {
        try {
            if (!id) throw new Error(G.errorMissingFields);

            const companyData = await CompanyModel.find(id);
            if (!companyData) throw new Error(G.errorId);

            return new Company(companyData);

        } catch (error) {
            Logger.logError('Failed to load company:', error);
            throw error;
        }
    }

    /**
     * Get company by code
     * @param {string} code - Company code
     * @returns {Promise<Company>}
     */
    static async getByCode(code) {
        try {
            if (!code) throw new Error('Code is required');

            const companyData = await CompanyModel.findByAttribute('code', code.toUpperCase());
            if (!companyData) throw new Error('Company not found');

            return new Company(companyData);

        } catch (error) {
            Logger.logError('Failed to get company by code:', error);
            throw error;
        }
    }

    /**
     * Get company by GUID
     * @param {number} guid - Company GUID
     * @returns {Promise<Company>}
     */
    static async getByGuid(guid) {
        try {
            if (!guid) throw new Error('GUID is required');

            const companyData = await CompanyModel.findByAttribute('guid', guid);
            if (!companyData) throw new Error('Company not found');

            return new Company(companyData);

        } catch (error) {
            Logger.logError('Failed to get company by GUID:', error);
            throw error;
        }
    }

    /**
     * Search companies by name pattern
     * @param {string} pattern - Search pattern
     * @returns {Promise<Company[]>}
     */
    static async searchByName(pattern) {
        try {
            const companiesData = await CompanyModel.findByString('name', pattern);
            return companiesData.map(data => new Company(data));

        } catch (error) {
            Logger.logError('Failed to search companies:', error);
            throw error;
        }
    }

    /**
     * Search companies by code pattern
     * @param {string} pattern - Search pattern
     * @returns {Promise<Company[]>}
     */
    static async searchByCode(pattern) {
        try {
            const companiesData = await CompanyModel.findByString('code', pattern);
            return companiesData.map(data => new Company(data));

        } catch (error) {
            Logger.logError('Failed to search companies:', error);
            throw error;
        }
    }

    /**
     * Get companies by country
     * @param {number} countryId - Country ID
     * @returns {Promise<Company[]>}
     */
    static async getByCountry(countryId) {
        try {
            const companiesData = await CompanyModel.findByInt('country', countryId);
            return companiesData.map(data => new Company(data));

        } catch (error) {
            Logger.logError('Failed to get companies by country:', error);
            throw error;
        }
    }

    /**
     * Get paginated companies
     * @param {Object} queryOptions - Query options
     * @returns {Promise<Object>}
     */
    static async getAll(queryOptions = {}) {
        try {
            const result = await CompanyModel.findAll(queryOptions);
            return {
                data: result.data.map(data => new Company(data)),
                pagination: result.pagination
            };

        } catch (error) {
            Logger.logError('Failed to get all companies:', error);
            throw error;
        }
    }

    /**
     * Create new company
     * @param {Object} data - Company data
     * @returns {Promise<Company>}
     */
    static async create(data) {
        try {
            const company = new Company(data);
            await company.businessValidation();

            const savedData = await CompanyModel.create(company.toModelData());
            return new Company(savedData);

        } catch (error) {
            Logger.logError('Failed to create company:', error);
            throw error;
        }
    }

    // ===========================
    // INSTANCE METHODS
    // ===========================

    /**
     * Update company location
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {Promise<Company>}
     */
    async updateLocation(latitude, longitude) {
        try {
            if (latitude == null || longitude == null) {
                throw new Error('Latitude and longitude are required');
            }

            this.pointValue = [latitude, longitude];
            await this.save();
            Logger.logInfo(`Company ${this.code} location updated`);
            return this;

        } catch (error) {
            Logger.logError('Failed to update company location:', error);
            throw error;
        }
    }

    /**
     * Update company metadata
     * @param {Object} metadata - Metadata object
     * @returns {Promise<Company>}
     */
    async updateMetadata(metadata) {
        try {
            if (typeof metadata !== 'object' || metadata === null) {
                throw new Error('Metadata must be a valid object');
            }

            this.metadata = { ...this.metadata, ...metadata };
            await this.save();
            Logger.logInfo(`Company ${this.code} metadata updated`);
            return this;

        } catch (error) {
            Logger.logError('Failed to update company metadata:', error);
            throw error;
        }
    }

    /**
     * Update company address
     * @param {Object} address - Address object
     * @returns {Promise<Company>}
     */
    async updateAddress(address) {
        try {
            if (typeof address !== 'object' || address === null) {
                throw new Error('Address must be a valid object');
            }

            this.address = { ...this.address, ...address };
            await this.save();
            Logger.logInfo(`Company ${this.code} address updated`);
            return this;

        } catch (error) {
            Logger.logError('Failed to update company address:', error);
            throw error;
        }
    }

    /**
     * Business validation
     * @throws {Error} If validation fails
     */
    async businessValidation() {
        const errors = [];

        // Business rules
        if (!this.name || this.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters');
        }

        if (this.code){
            if (!this.code || this.code.trim().length < 2) {
                errors.push('Code must be at least 2 characters');
            }
        }


        // Validate location if provided
        // Validate location if provided
        if (this.point) {
            let lat, lng;

            // Cas 1 : point est déjà une chaîne WKT
            if (typeof this.point === 'string') {
                const pointRegex = /^POINT\((-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\)$/i;
                const match = this.point.match(pointRegex);
                if (!match) {
                    errors.push('Point must be in WKT format: POINT(longitude latitude)');
                } else {
                    lng = parseFloat(match[1]);
                    lat = parseFloat(match[3]);
                }
            }

            // Cas 2 : point est un tableau [lat, lng]
            else if (Array.isArray(this.point)) {
                if (this.point.length !== 2) {
                    errors.push('Point must contain exactly 2 coordinates [latitude, longitude]');
                } else {
                    [lat, lng] = this.point;
                    if (isNaN(lat) || isNaN(lng)) {
                        errors.push('Point coordinates must be valid numbers');
                    } else {
                        // Transforme le tableau en format WKT
                        this.point = `POINT(${lng} ${lat})`;
                    }
                }
            }

            // Vérification des valeurs
            if (!isNaN(lat) && !isNaN(lng)) {
                if (lat < -90 || lat > 90) {
                    errors.push('Latitude must be between -90 and 90');
                }
                if (lng < -180 || lng > 180) {
                    errors.push('Longitude must be between -180 and 180');
                }
            }
        }

        // if (this.point && this.point.length > 0) {
        //     console.log("point data validation");
        //     if (this.point.length !== 2) {
        //         errors.push('Point must contain exactly 2 coordinates [latitude, longitude]');
        //     } else {
        //         const [lat, lng] = this.point;
        //         if (isNaN(lat) || isNaN(lng)) {
        //             errors.push('Point coordinates must be valid numbers');
        //         } else if (lat < -90 || lat > 90) {
        //             errors.push('Latitude must be between -90 and 90');
        //         } else if (lng < -180 || lng > 180) {
        //             errors.push('Longitude must be between -180 and 180');
        //         }
        //     }
        // }

        // Validate metadata is valid JSON
        if (this.metadata && typeof this.metadata !== 'object') {
            errors.push('Metadata must be a valid object');
        }

        // Validate address is valid JSON
        if (this.address && typeof this.address !== 'object') {
            errors.push('Address must be a valid object');
        }

        // Check if country exists
        if (this.country) {
            try {
                const countryData = await CountryModel.find(this.country);
                if (!countryData) {
                    errors.push('Country does not exist');
                }
            } catch (error) {
                errors.push('Error validating country');
            }
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }

    /**
     * Save company with business logic
     * @returns {Promise<Company>}
     */
    async save() {
        try {
            Logger.logInfo('Starting company save process');

            // Business validation
            await this.businessValidation();

            let savedData;
            if (this.guid) {
                const companyId = await CompanyModel.findByAttribute('guid', this.guid);
                if (!companyId) {
                    throw new Error('Failed to update not found');
                }
                const result = new Company(companyId);
                this.id = result.id;
                // Update existing
                savedData = await CompanyModel.update(this.id, this.toModelData());
                if (!savedData) {
                    throw new Error('Failed to update company');
                }
            } else {
                // Create new
                console.log(this.toModelData());
                savedData = await CompanyModel.create(this.toModelData());
            }

            // Update current instance with saved data
            Object.assign(this, savedData);

            Logger.logInfo('Company saved successfully');
            return this;

        } catch (error) {
            Logger.logError('Failed to save company:', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    // ===========================
    // DATA CONVERSION METHODS
    // ===========================

    /**
     * Convert to model data (for database operations)
     * @returns {Object}
     */
    toModelData() {
        return {
            id: this.id,
            guid: this.guid? this.guid : null,
            name: this.name? this.name : '',
            point: this.point,
            code: this.code.trim()? this.code : null,
            country: this.country,
            address: this.address,
            metadata: this.metadata
        };
    }

    /**
     * Convert to JSON with business formatting
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            guid: this.guid,
            guidFormatted: this.guidFormatted,
            name: this.name,
            nameFormatted: this.nameFormatted,
            point: this.point,
            latitude: this.latitude,
            longitude: this.longitude,
            hasLocation: this.hasLocation,
            code: this.code,
            codeFormatted: this.codeFormatted,
            country: this.countryObject ? this.countryObject.toJSON() : { id: this.country },
            // country: this.country,
            address: this.address,
            addressFormatted: this.addressFormatted,
            metadata: this.metadataFormatted,
            created: this.created,
            updated: this.updated
        };
    }

    /**
     * Convert to display format
     * @returns {Object}
     */
    toDisplay() {
        return {
            guid: this.guidFormatted,
            name: this.nameFormatted,
            // code: this.codeFormatted,
            address: this.addressFormatted,
            metadata: this.metadataFormatted,
            location: this.hasLocation ? `${this.longitude}, ${this.latitude}` : 'No location',
            country: this.countryObject ? this.countryObject.toDisplay() : { id: this.country }
            // country: this.country
        };
    }

    toString() {
        return `Company[${this.guid}] ${this.name} (${this.code})`;
    }
}

module.exports = Company;
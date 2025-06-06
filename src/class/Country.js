const G = require("../tools/Glossary");
const CountryModel = require("../model/CountryModel");
const Logger = require("../tools/logger");

class Country {
    constructor(data = {}) {
        this._id = data.id || null;
        this._guid = data.guid || null;
        this._alpha2 = data.alpha2 || '';
        this._alpha3 = data.alpha3 || '';
        this._dialcode = data.dialcode || null;
        this._fr = data.fr || '';
        this._en = data.en || '';
    }

    // ID
    get id() { return this._id; }
    set id(value) { this._id = Number(value) || null; }

    // GUID
    get guid() { return this._guid; }
    set guid(value) {
        this._guid = Number(value) || null;
    }

    get guidFormatted() {
        return this.guid ? this.guid : '';
    }

    // alpha2
    get alpha2() { return this._alpha2; }
    set alpha2(value) {
        this._alpha2 = String(value || '').toUpperCase();
    }

    get alpha2Formatted() {
        return this.alpha2;
    }

    // alpha3
    get alpha3() { return this._alpha3; }
    set alpha3(value) {
        this._alpha3 = String(value || '').toUpperCase();
    }

    get alpha3Formatted() {
        return this.alpha3;
    }

    // dialcode
    get dialcode() { return this._dialcode; }
    set dialcode(value) {
        this._dialcode = Number(value) || null;
    }

    get dialcodeFormatted() {
        return this.dialcode !== null ? `+${this.dialcode}` : '';
    }

    // French name
    get fr() { return this._fr; }
    set fr(value) {
        this._fr = String(value || '').trim();
    }

    get frFormatted() {
        return this.fr;
    }

    // English name
    get en() { return this._en; }
    set en(value) {
        this._en = String(value || '').trim();
    }

    get enFormatted() {
        return this.en;
    }


    /**
     * Load country with business validation
     * @param id
     * @returns {Promise<Country>}
     */
    static async load(id) {
        try {
            if (!id) throw new Error(G.errorMissingFields);

            const countryData = await CountryModel.find(id);
            if (!countryData) throw new Error(G.errorId);

            return new Country(countryData);
        } catch (error) {
            Logger.logError('Failed to load country:', error);
            throw error;
        }
    }

    /**
     * get by attribut
     * @param attribut
     * @param value
     * @returns {Promise<Country>}
     */
    static async getByGuid(attribut, value) {
        try {
            if (!value) throw new Error('Value is required');
            if (!attribut) throw new Error('Attribut is required');

            const countryData = await CountryModel.findByAttribute(attribut, value);
            if (!countryData) throw new Error('Country not found');

            return new Country(countryData);

        } catch (error) {
            Logger.logError(`Failed to get country by ${attribut}:`, error);
            throw error;
        }
    }

    /**
     * Get paginated country
     * @param {Object} queryOptions - Query options
     * @returns {Promise<Object>}
     */
    static async getAll(queryOptions = {}) {
        try {
            const result = await CountryModel.findAll(queryOptions);
            return {
                data: result.data.map(data => new Country(data).toDisplay()),
                pagination: result.pagination
            };

        } catch (error) {
            Logger.logError('Failed to get all country:', error);
            throw error;
        }
    }

    static async searchByString(attribut, pattern) {
        try {
            const countryData = await CountryModel.findByString(attribut, pattern);
            return countryData.map(data => new Country(data));

        } catch (error) {
            Logger.logError('Failed to search country:', error);
            throw error;
        }
    }


    static async create(data) {
        try {
            const countryData = new Country(data);
            await countryData.businessValidation();
            const savedData = await CountryModel.create(countryData.toModelData());
            return new Country(savedData);
        } catch (error) {
            Logger.logError('Failed to create country:', error);
            throw error;
        }
    }

    /**
     * Save country with business logic
     * @returns {Promise<Country>}
     */
    async save() {
        try {
            Logger.logInfo('Starting country save process');

            // Business validation
            await this.businessValidation();

            let savedData;
            if (this.guid) {
                const response = await CountryModel.findByAttribute('guid', this.guid);
                const result = new Country(response);
                this.id = result.id;
                // Update existing
                savedData = await CountryModel.update(this.id, this.toModelData());
                if (!savedData) {
                    throw new Error('Failed to update country');
                }
            } else {
                // Create new
                savedData = await CountryModel.create(this.toModelData());
            }

            // Update current instance with saved data
            Object.assign(this, savedData);

            Logger.logInfo('Country saved successfully');
            return this;

        } catch (error) {
            Logger.logError('Failed to save country:', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Business validation
     * @throws {Error} If validation fails
     */
    async businessValidation() {
        const errors = [];

        if (!this.alpha2.trim() || !this.alpha3.trim() || !this.fr.trim() || !this.en.trim() || !this.dialcode) {
            errors.push(G.errorMissingFields);
        }
        // Business rules
        if (!this.alpha2 || this.alpha2.trim().length < 2) {
            errors.push('Alpha2 must be at least 2 characters');
        }
        if (!this.alpha3 || this.alpha3.trim().length < 3) {
            errors.push('Alpha3 must be at least 3 characters');
        }

        if (!this.dialcode  || !Number(this.dialcode)) {
            errors.push('Dialcode must be a number');
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }




    /**
     * Convert to model data (for database operations)
     * @returns {Object}
     */
    toModelData() {
        return {
            id: this.id,
            guid: this.guid,
            alpha2: this.alpha2,
            alpha3: this.alpha3,
            dialcode: this.dialcode,
            fr: this.fr,
            en: this.en
        };
    }
    /**
     * Convert to display format
     * @returns {Object}
     */
    toDisplay() {
        return {
            guid: this.guidFormatted,
            alpha2: this.alpha2Formatted,
            alpha3: this.alpha3Formatted,
            dialcode: this.dialcodeFormatted,
            fr: this.frFormatted,
            en: this.enFormatted,
        };
    }
    toString() {
        return `Country[${this.guid}] ${this.alpha2} ${this.alpha3} ${this.dialcode}`;
    }


}

module.exports = Country;
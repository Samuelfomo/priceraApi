const G = require("../tools/Glossary");
const ProfilModel = require("../model/ProfilModel");
const Logger = require("../tools/logger");

class Profil {
    constructor(data = {}) {
        this._id = data.id || null;
        this._guid = data.guid || null;
        this._name = data.name || '';
        this._reference = data.reference || '';
        this._description = data.description || '';
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

    // Name
    get name() { return this._name; }
    set name(value) {
        this._name = String(value || '').trim();
    }

    get nameFormatted() {
        return this.name;
    }

    // Reference
    get reference() { return this._reference; }
    set reference(value) {
        this._reference = String(value || '').toUpperCase().trim();
    }

    get referenceFormatted() {
        return this.reference;
    }

    // Description
    get description() { return this._description; }
    set description(value) {
        this._description = String(value || '').trim();
    }

    get descriptionFormatted() {
        return this.description || 'Aucune description';
    }

    /**
     * Load profil with business validation
     * @param {number} id
     * @returns {Promise<Profil>}
     */
    static async load(id) {
        try {
            if (!id) throw new Error(G.errorMissingFields);

            const profilData = await ProfilModel.find(id);
            if (!profilData) throw new Error(G.errorId);

            return new Profil(profilData);
        } catch (error) {
            Logger.logError('Failed to load profil:', error);
            throw error;
        }
    }

    /**
     * Get by attribute
     * @param {string} attribut
     * @param {*} value
     * @returns {Promise<Profil>}
     */
    static async getByAttribute(attribut, value) {
        try {
            if (!value) throw new Error('Value is required');
            if (!attribut) throw new Error('Attribut is required');

            const profilData = await ProfilModel.findByAttribute(attribut, value);
            if (!profilData) throw new Error('Profil not found');

            return new Profil(profilData);

        } catch (error) {
            Logger.logError(`Failed to get profil by ${attribut}:`, error);
            throw error;
        }
    }

    /**
     * Get by reference
     * @param {string} reference
     * @returns {Promise<Profil>}
     */
    static async getByReference(reference) {
        try {
            if (!reference) throw new Error('Reference is required');

            const profilData = await ProfilModel.findByReference(reference);
            if (!profilData) throw new Error('Profil not found');

            return new Profil(profilData);

        } catch (error) {
            Logger.logError('Failed to get profil by reference:', error);
            throw error;
        }
    }

    /**
     * Get by name
     * @param {string} name
     * @returns {Promise<Profil>}
     */
    static async getByName(name) {
        try {
            if (!name) throw new Error('Name is required');

            const profilData = await ProfilModel.findByName(name);
            if (!profilData) throw new Error('Profil not found');

            return new Profil(profilData);

        } catch (error) {
            Logger.logError('Failed to get profil by name:', error);
            throw error;
        }
    }

    /**
     * Get paginated profils
     * @param {Object} queryOptions - Query options
     * @returns {Promise<Object>}
     */
    static async getAll(queryOptions = {}) {
        try {
            const result = await ProfilModel.findAll(queryOptions);
            return {
                data: result.data.map(data => new Profil(data).toDisplay()),
                pagination: result.pagination
            };

        } catch (error) {
            Logger.logError('Failed to get all profils:', error);
            throw error;
        }
    }

    /**
     * Get active profils only
     * @param {Object} queryOptions - Query options
     * @returns {Promise<Object>}
     */
    static async getActive(queryOptions = {}) {
        try {
            const result = await ProfilModel.findActive(queryOptions);
            return {
                data: result.data.map(data => new Profil(data).toDisplay()),
                pagination: result.pagination
            };

        } catch (error) {
            Logger.logError('Failed to get active profils:', error);
            throw error;
        }
    }

    /**
     * Search profils by string pattern
     * @param {string} attribut
     * @param {string} pattern
     * @returns {Promise<Profil[]>}
     */
    static async searchByString(attribut, pattern) {
        try {
            const profilData = await ProfilModel.findByString(attribut, pattern);
            return profilData.map(data => new Profil(data));

        } catch (error) {
            Logger.logError('Failed to search profils:', error);
            throw error;
        }
    }

    /**
     * Create new profil
     * @param {Object} data
     * @returns {Promise<Profil>}
     */
    static async create(data) {
        try {
            const profilData = new Profil(data);
            await profilData.businessValidation();
            const savedData = await ProfilModel.create(profilData.toModelData());
            return new Profil(savedData);
        } catch (error) {
            Logger.logError('Failed to create profil:', error);
            throw error;
        }
    }

    /**
     * Bulk create profils
     * @param {Array} profilsData
     * @returns {Promise<Profil[]>}
     */
    static async bulkCreate(profilsData) {
        try {
            // Validate all profils first
            const validatedProfils = [];
            for (const data of profilsData) {
                const profil = new Profil(data);
                await profil.businessValidation();
                validatedProfils.push(profil.toModelData());
            }

            const savedData = await ProfilModel.bulkCreate(validatedProfils);
            return savedData.map(data => new Profil(data));
        } catch (error) {
            Logger.logError('Failed to bulk create profils:', error);
            throw error;
        }
    }

    /**
     * Save profil with business logic
     * @returns {Promise<Profil>}
     */
    async save() {
        try {
            Logger.logInfo('Starting profil save process');

            // Business validation
            await this.businessValidation();

            let savedData;
            if (this.guid) {
                const response = await ProfilModel.findByAttribute('guid', this.guid);
                const result = new Profil(response);
                this.id = result.id;
                // Update existing
                savedData = await ProfilModel.update(this.id, this.toModelData());
                if (!savedData) {
                    throw new Error('Failed to update profil');
                }
            } else {
                // Create new
                savedData = await ProfilModel.create(this.toModelData());
            }

            // Update current instance with saved data
            Object.assign(this, savedData);

            Logger.logInfo('Profil saved successfully');
            return this;

        } catch (error) {
            Logger.logError('Failed to save profil:', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Update profil
     * @param {Object} updateData
     * @returns {Promise<Profil>}
     */
    async update(updateData) {
        try {
            // Merge update data
            Object.keys(updateData).forEach(key => {
                if (this.hasOwnProperty(`_${key}`) || key === 'id') {
                    this[key] = updateData[key];
                }
            });

            // Validate and save
            await this.businessValidation();
            const savedData = await ProfilModel.update(this.id, this.toModelData());

            if (!savedData) {
                throw new Error('Failed to update profil');
            }

            // Update current instance
            Object.assign(this, savedData);
            return this;

        } catch (error) {
            Logger.logError('Failed to update profil:', error);
            throw error;
        }
    }

    /**
     * Delete profil
     * @returns {Promise<boolean>}
     */
    async delete() {
        try {
            if (!this.id) {
                throw new Error('Cannot delete profil without ID');
            }

            const result = await ProfilModel.delete(this.id);
            if (result) {
                Logger.logInfo(`Profil ${this.guid} deleted successfully`);
            }
            return result;

        } catch (error) {
            Logger.logError('Failed to delete profil:', error);
            throw error;
        }
    }

    /**
     * Business validation
     * @throws {Error} If validation fails
     */
    async businessValidation() {
        const errors = [];

        // Required fields validation
        if (!this.name.trim() || !this.reference.trim()) {
            errors.push(G.errorMissingFields);
        }

        // Business rules
        if (!this.name || this.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters');
        }

        if (this.name && this.name.length > 128) {
            errors.push('Name must be 128 characters or less');
        }

        if (!this.reference || this.reference.trim().length < 2) {
            errors.push('Reference must be at least 2 characters');
        }

        // Reference format validation
        if (this.reference && !/^[A-Z0-9_-]+$/i.test(this.reference)) {
            errors.push('Reference must contain only alphanumeric characters, underscores, and hyphens');
        }

        // Reserved references validation
        const reservedReferences = ['ADMIN', 'ROOT', 'SYSTEM', 'DEFAULT'];
        if (this.reference && reservedReferences.includes(this.reference.toUpperCase())) {
            // Allow only if it's an existing profil being updated
            if (!this.id) {
                errors.push('Reference cannot use reserved words');
            }
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }

    /**
     * Check if profil has specific permissions (placeholder for future implementation)
     * @param {string} permission
     * @returns {boolean}
     */
    hasPermission(permission) {
        // This would typically check against a permissions system
        // For now, return true for admin-like profiles
        return this.reference && ['ADMIN', 'ADMINISTRATOR', 'ROOT'].includes(this.reference.toUpperCase());
    }

    /**
     * Check if profil is system profil
     * @returns {boolean}
     */
    isSystem() {
        return this.reference && ['SYSTEM', 'ROOT', 'DEFAULT'].includes(this.reference.toUpperCase());
    }

    /**
     * JSON representation
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            guid: this.guid,
            guidFormatted: this.guidFormatted,
            name: this.name,
            nameFormatted: this.nameFormatted,
            reference: this.reference,
            referenceFormatted: this.referenceFormatted,
            description: this.description,
            descriptionFormatted: this.descriptionFormatted
        };
    }

    /**
     * Convert to model data (for database operations)
     * @returns {Object}
     */
    toModelData() {
        return {
            id: this.id,
            guid: this.guid,
            name: this.name,
            reference: this.reference,
            description: this.description
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
            reference: this.referenceFormatted,
            description: this.descriptionFormatted
        };
    }

    /**
     * String representation
     * @returns {string}
     */
    toString() {
        return `Profil[${this.guid}] ${this.reference} - ${this.name}`;
    }
}

module.exports = Profil;
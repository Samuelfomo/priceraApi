const AccountModel = require('../model/AccountModel');
const Logger = require('../tools/logger');
const G = require('../tools/Glossary');
const CompanyModel = require('../model/CompanyModel');

/**
 * Business Logic class - Inherits from Model
 * Contains getters, setters, and business operations
 * @class Account
 * @extends AccountModel
 */
class Account extends AccountModel {

    constructor(data = {}) {
        super(data);
        // Initialize with provided data
        if (data) {
            Object.assign(this, data);
        }
    }

    // ===========================
    // GETTERS & SETTERS
    // ===========================

    get guidFormatted() {
        return String(this.guid).padStart(8, '0');
    }

    get codeFormatted() {
        return this.code?.toUpperCase();
    }

    get isActive() {
        return Boolean(this.active && !this.deleted);
    }

    get statusText() {
        if (this.deleted) return 'Deleted';
        if (!this.active) return 'Inactive';
        return 'Active';
    }

    set codeValue(value) {
        this.code = value?.toString().trim().toUpperCase();
    }

    // ===========================
    // BUSINESS LOGIC METHODS
    // ===========================

    /**
     * Load account with business validation
     * @param {number} id - Account ID
     * @returns {Promise<Account>}
     */
    static async load(id) {
        try {
            if (!id) throw new Error(G.errorMissingFields);

            const account = await AccountModel.find(id);
            if (!account) throw new Error(G.errorId);

            return new Account(account.toJSON());

        } catch (error) {
            Logger.logError('Failed to load account:', error);
            throw error;
        }
    }

    /**
     * Get account by code
     * @param {string} code - Account code
     * @returns {Promise<Account>}
     */
    static async getByCode(code) {
        try {
            if (!code) throw new Error('Code is required');

            const account = await AccountModel.findByAttribute('code', code.toUpperCase());
            if (!account) throw new Error('Account not found');

            return new Account(account.toJSON());

        } catch (error) {
            Logger.logError('Failed to get account by code:', error);
            throw error;
        }
    }

    /**
     * Get account by GUID
     * @param {number} guid - Account GUID
     * @returns {Promise<Account>}
     */
    static async getByGuid(guid) {
        try {
            if (!guid) throw new Error('GUID is required');

            const account = await AccountModel.findByAttribute('guid', guid);
            if (!account) throw new Error('Account not found');

            return new Account(account.toJSON());

        } catch (error) {
            Logger.logError('Failed to get account by GUID:', error);
            throw error;
        }
    }

    /**
     * Search accounts by name pattern
     * @param {string} pattern - Search pattern
     * @returns {Promise<Account[]>}
     */
    static async searchByCode(pattern) {
        try {
            const accounts = await AccountModel.findByString('code', pattern);
            return accounts.map(account => new Account(account.toJSON()));

        } catch (error) {
            Logger.logError('Failed to search accounts:', error);
            throw error;
        }
    }

    /**
     * Get accounts by company
     * @param {number} companyId - Company ID
     * @returns {Promise<Account[]>}
     */
    static async getByCompany(companyId) {
        try {
            const accounts = await AccountModel.findByInt('company', companyId);
            return accounts.map(account => new Account(account.toJSON()));

        } catch (error) {
            Logger.logError('Failed to get accounts by company:', error);
            throw error;
        }
    }

    /**
     * Activate account
     * @returns {Promise<Account>}
     */
    async activate() {
        try {
            this.active = true;
            await this.save();
            Logger.logInfo(`Account ${this.code} activated`);
            return this;

        } catch (error) {
            Logger.logError('Failed to activate account:', error);
            throw error;
        }
    }

    /**
     * Deactivate account
     * @returns {Promise<Account>}
     */
    async deactivate() {
        try {
            this.active = false;
            await this.save();
            Logger.logInfo(`Account ${this.code} deactivated`);
            return this;

        } catch (error) {
            Logger.logError('Failed to deactivate account:', error);
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
        if (this.code && this.code.length < 3) {
            errors.push('Code must be at least 3 characters');
        }

        if (this.guid && this.guid < 1000) {
            errors.push('GUID must be at least 1000');
        }

        // Check if company exists and is active
        if (this.company) {
            const company = await CompanyModel.find(this.company);
            if (!company) {
                errors.push('Company does not exist');
            } else if (!company.active) {
                errors.push('Company is not active');
            }
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }

    /**
     * Save with business logic
     * @returns {Promise<Account>}
     */
    async save() {
        try {
            Logger.logInfo('Starting account save process');

            // Business validation
            await this.businessValidation();

            // Data control is handled by the model hook
            const result = await (this.id ?
                    super.save() :
                    AccountModel.create(this.toJSON())
            );

            // Update current instance with saved data
            if (!this.id && result.id) {
                Object.assign(this, result.toJSON());
            }

            Logger.logInfo('Account saved successfully');
            return this;

        } catch (error) {
            Logger.logError('Failed to save account:', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Delete with business logic
     * @returns {Promise<Account>}
     */
    async delete() {
        try {
            // Business rules for deletion
            if (this.active) {
                throw new Error('Cannot delete active account. Deactivate first.');
            }

            await this.softDelete();
            Logger.logInfo(`Account ${this.code} deleted`);
            return this;

        } catch (error) {
            Logger.logError('Failed to delete account:', error);
            throw error;
        }
    }

    /**
     * Convert to JSON with business formatting
     * @returns {Object}
     */
    toJSON() {
        return {
            guid: this.guid,
            guidFormatted: this.guidFormatted,
            code: this.code,
            codeFormatted: this.codeFormatted,
            company: this.company,
            active: this.active,
            isActive: this.isActive,
            statusText: this.statusText,
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
            code: this.codeFormatted,
            status: this.statusText,
            company: this.company
        };
    }

    toString() {
        return `Account[${this.guid}] ${this.code}`;
    }
}

module.exports = Account;
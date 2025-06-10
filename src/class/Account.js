const AccountModel = require('../model/AccountModel');
const Logger = require('../tools/logger');
const G = require('../tools/Glossary');
const CompanyModel = require('../model/CompanyModel');

/**
 * Business Logic class - Composition pattern instead of inheritance
 * Contains getters, setters, and business Accountoperations
 * @class Account
 */
class Account {
    constructor(data = {}) {
        this.id = data.id || null;
        this.guid = data.guid || null;
        this.code = data.code || null;
        this.company = data.company || null;
        this.active = data.active || true;
        // this.blocked = data.blocked || false;
        this.deleted = data.deleted || false;
        this.deletedAt = data.deletedAt || null;
        this.lastLogin = data.lastLogin || null;
        this.created = data.created || null;
        this.updated = data.updated || null;
        this.companyObject = data.companyObject || null;
        const Company = require('./Company');
        if (data.companyData) {
            this.companyObject = new Company(data.companyData);
        } else if (data.countryObject) {
            this.companyObject = new Company(data.companyObject);
        } else {
            this.companyObject = null;
        }
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

    get isActive() {
        return Boolean(this.active && !this.deleted && !this.blocked);
    }

    get statusText() {
        if (this.deleted) return 'Deleted';
        // if (this.blocked) return 'Blocked';
        if (!this.active) return 'Inactive';
        return 'Active';
    }

    set codeValue(value) {
        this.code = value?.toString().trim().toUpperCase();
    }

    // ===========================
    // STATIC FACTORY METHODS
    // ===========================

    /**
     * Méthode statique pour charger un account avec sa company
     * @param id
     * @returns {Promise<Account>}
     */
    static async loadWithCompany(id) {
        const Company = require('../class/Company');
        try {
            // const account = await Account.load(id);
            // await account.loadCompany();
            // return account;
            const accountData = await AccountModel.find(id);
            if (!accountData) throw new Error('Account not found');

            const account = new Account(accountData);
                account.company = await Company.loadWithCountry(account.id);

            return account;
        } catch (error) {
            Logger.logError('Failed to load account with company:', error);
            throw error;
        }
    }

    /**
     * Méthode statique pour obtenir toutes les accounts avec leurs companies
     * @param queryOptions
     * @returns {Promise<{data: Awaited<unknown>[], pagination: {page: number, limit: number, total: *, pages: number}}>}
     */
    static async getAllWithCompany(queryOptions = {}) {
        try {
            const result = await AccountModel.findAllWithCompany(queryOptions);

            // Charger les Company pour chaque Account
            const accountWithCompany = await Promise.all(
                result.data.map(async (accountData) => {
                    const account = new Account(accountData);
                    await account.loadCompany();
                    return account.toDisplay();
                })
            );

            return {
                data: accountWithCompany,
                pagination: result.pagination
            };
        } catch (error) {
            Logger.logError('Failed to get all companies with country:', error);
            throw error;
        }
    }
    // static async getAllCompany(queryOptions = {}) {
    //     try {
    //         const result = await CompanyModel.findAllWithCountry(queryOptions);
    //
    //         // Charger les countries pour chaque company
    //         const companiesWithCountry = await Promise.all(
    //             result.data.map(async (companyData) => {
    //                 const company = new Company(companyData);
    //                 await company.loadCountry();
    //                 return company.toDisplay();
    //             })
    //         );
    //
    //         return {
    //             data: companiesWithCountry,
    //             pagination: result.pagination
    //         };
    //     } catch (error) {
    //         Logger.logError('Failed to get all companies with country:', error);
    //         throw error;
    //     }
    // }

    /**
     * Load account with business validation
     * @param {number} id - Account ID
     * @returns {Promise<Account>}
     */
    static async load(id) {
        try {
            if (!id) throw new Error(G.errorMissingFields);

            const accountData = await AccountModel.find(id);
            if (!accountData) throw new Error(G.errorId);

            return new Account(accountData);

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

            const accountData = await AccountModel.findByAttribute('code', code.toUpperCase());
            if (!accountData) throw new Error('Account not found');

            return new Account(accountData);

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

            const accountData = await AccountModel.findByAttribute('guid', guid);
            if (!accountData) throw new Error('Account not found');

            return new Account(accountData);

        } catch (error) {
            Logger.logError('Failed to get account by GUID:', error);
            throw error;
        }
    }
    static async getByAttribut(attribut, value) {
        try {
            if (!attribut) throw new Error('Attribut is required');
            if (!value) throw new Error('value is required');

            const accountData = await AccountModel.findByAttribute(attribut, value);
            if (!accountData) throw new Error('Account not found');

            return new Account(accountData);

        } catch (error) {
            Logger.logError('Failed to get account:', error);
            throw error;
        }
    }

    /**
     * Search accounts by code pattern
     * @param {string} pattern - Search pattern
     * @returns {Promise<Account[]>}
     */
    static async searchByCode(pattern) {
        try {
            const accountsData = await AccountModel.findByString('code', pattern);
            return accountsData.map(data => new Account(data));

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
            const accountsData = await AccountModel.findByInt('company', companyId);
            return accountsData.map(data => new Account(data));

        } catch (error) {
            Logger.logError('Failed to get accounts by company:', error);
            throw error;
        }
    }

    /**
     * Get paginated accounts
     * @param {Object} queryOptions - Query options
     * @returns {Promise<Object>}
     */
    static async getAll(queryOptions = {}) {
        try {
            const result = await AccountModel.findAll(queryOptions);
            return {
                data: result.data.map(data => new Account(data)),
                pagination: result.pagination
            };

        } catch (error) {
            Logger.logError('Failed to get all accounts:', error);
            throw error;
        }
    }

    /**
     * Create new account
     * @param {Object} data - Account data
     * @returns {Promise<Account>}
     */
    static async create(data) {
        try {
            const account = new Account(data);
            await account.businessValidation();

            const savedData = await AccountModel.create(account.toModelData());
            return new Account(savedData);

        } catch (error) {
            Logger.logError('Failed to create account:', error);
            throw error;
        }
    }

    // ===========================
    // INSTANCE METHODS
    // ===========================

    /**
     * Charger les données du company associé
     * @returns {Promise<Company|null>}
     */
    async loadCompany() {
        try {
            if (!this.company) return null;

            const CompanyModel = require('../model/CompanyModel');
            const companyData = await CompanyModel.findWithCountry(this.company);

            if (companyData) {
                const Company = require('./Company');
                this.companyObject = new Company(companyData);
                return this.companyObject;
            }

            return null;
        } catch (error) {
            Logger.logError('Failed to load company:', error);
            return null;
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

    // /**
    //  * Block account
    //  * @returns {Promise<Account>}
    //  */
    // async block() {
    //     try {
    //         this.blocked = true;
    //         this.active = false;
    //         await this.save();
    //         Logger.logInfo(`Account ${this.code} blocked`);
    //         return this;
    //
    //     } catch (error) {
    //         Logger.logError('Failed to block account:', error);
    //         throw error;
    //     }
    // }

    // /**
    //  * Unblock account
    //  * @returns {Promise<Account>}
    //  */
    // async unblock() {
    //     try {
    //         this.blocked = false;
    //         await this.save();
    //         Logger.logInfo(`Account ${this.code} unblocked`);
    //         return this;
    //
    //     } catch (error) {
    //         Logger.logError('Failed to unblock account:', error);
    //         throw error;
    //     }
    // }

    /**
     * Business validation
     * @throws {Error} If validation fails
     */
    async businessValidation() {
        const errors = [];

        // Business rules
        if (this.code) {
            if (this.code.trim().length < 3) {
                errors.push('Code must be at least 3 characters');
            }
        }

        if (this.company) {
            try {
                const companyData = await CompanyModel.find(this.company);
                if (!companyData) {
                    errors.push('Company does not exist');
                }
            } catch (error) {
                errors.push('Error validating company');
            }
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }

    /**
     * Save account with business logic
     * @returns {Promise<Account>}
     */
    async save() {
        try {
            Logger.logInfo('Starting account save process');

            // Business validation
            await this.businessValidation();

            let savedData;
            if (this.id) {
                // Update existing
                savedData = await AccountModel.update(this.id, this.toModelData());
                if (!savedData) {
                    throw new Error('Failed to update account');
                }
            } else {
                // Create new
                savedData = await AccountModel.create(this.toModelData());
            }

            // Update current instance with saved data
            Object.assign(this, savedData);

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
     * Delete account with business logic
     * @returns {Promise<boolean>}
     */
    async delete() {
        try {
            if (!this.id) {
                throw new Error('Cannot delete account without ID');
            }

            // Business rules for deletion
            if (this.active) {
                throw new Error('Cannot delete active account. Deactivate first.');
            }

            const result = await AccountModel.softDelete(this.id);
            if (result) {
                this.deleted = true;
                this.active = false;
                this.deletedAt = new Date();
                Logger.logInfo(`Account ${this.code} deleted`);
            }

            return result;

        } catch (error) {
            Logger.logError('Failed to delete account:', error);
            throw error;
        }
    }

    /**
     * Update last login
     * @returns {Promise<Account>}
     */
    async updateLastLogin() {
        try {
            if (!this.id) {
                throw new Error('Cannot update login for account without ID');
            }

            this.lastLogin = new Date();
            const savedData = await AccountModel.update(this.id, {
                lastLogin: this.lastLogin
            });

            if (savedData) {
                Object.assign(this, savedData);
            }

            return this;

        } catch (error) {
            Logger.logError('Failed to update last login:', error);
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
            guid: this.guid,
            code: this.code,
            company: this.company,
            active: this.active,
            // blocked: this.blocked,
            deleted: this.deleted,
            deletedAt: this.deletedAt,
            lastLogin: this.lastLogin
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
            code: this.code,
            codeFormatted: this.codeFormatted,
            // company: this.company,
            company: this.companyObject ? this.companyObject.toJSON() : { id: this.company },
            active: this.active,
            // blocked: this.blocked,
            isActive: this.isActive,
            statusText: this.statusText,
            deleted: this.deleted,
            deletedAt: this.deletedAt,
            lastLogin: this.lastLogin,
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
            company: this.companyObject ? this.companyObject.toDisplay() : { id: this.company },
            // company: this.company,
            lastLogin: this.lastLogin,
        };
    }

    toString() {
        return `Account[${this.guid}] ${this.code}`;
    }
}

module.exports = Account;
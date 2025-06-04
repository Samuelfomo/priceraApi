import Db from './Db.js';
import Logger from '../tools/logger.js';
import TokenGenerator from '../tools/token.js';
import { normalize } from '../tools/text.js';
import Watcher from '../tools/watcher.js';
import { Country } from '../class/Country.js';
import { generateValidPin } from '../tools/pin-generator.js';
import MobileValidator from '../tools/mobile-validator.js';
import G from '../tools/glossary.js';

/**
 * Model class for account management
 * Handles all database interactions for accounts
 * @class AccountModel
 * @extends Db
 */
class AccountModel extends Db {
    static nameKeepChars = ['u0020', 'u002d', 'u005f', 'u0027'];

    constructor(data = {}) {
        super();
        this.table = Db.TABLES.ACCOUNT;
        this.id = data.id || null;
        this.number = data.number || null;
        this.pin = data.pin || null;
        this.name = data.name || '';
        this.country = data.country || null;
        this.mobile = data.mobile || null;
        this.email = data.email || '';
        this.admin = data.admin || null;
        this.balance = data.balance || 0.0;
        this.active = data.active ?? true;
        this.blocked = data.blocked ?? false;
        this.deleted = data.deleted ?? false;
        this.lastLogin = data.last_login || null;
    }

    /**
     * Generate account number that will be Luhn-valid when combined with PIN
     * @param {number} length - Length of account number (default: 8)
     * @returns {number} Account number
     */
    _generateAccountNumber(length = 8) {
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length) - 1;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Create new account
     * @returns {Promise<AccountModel>} Created account
     * @throws {Error} If validation fails or database error occurs
     */
    async create() {
        const connection = await this.pool.getConnection();
        try {
            await this.validate();

            if (!this.number) {
                let isUnique = false;
                let accountNumber;

                while (!isUnique) {
                    accountNumber = this._generateAccountNumber();
                    const existing = await this.findByNumber(accountNumber);
                    if (!existing) {
                        isUnique = true;
                    }
                }

                this.number = accountNumber;
                this.pin = generateValidPin(this.number);
            }

            this.name = normalize(this.name)
                .clean(true, AccountModel.nameKeepChars)
                .toUpperCase()
                .toString()
                .substring(0, 120);

            const data = this.toDatabase();

            // Construire la requête SQL avec les colonnes explicites
            const columns = Object.keys(data);
            const placeholders = columns.map((col) => `:${col}`).join(', ');
            const sql = `
                INSERT INTO ${this.table}
                    (${columns.join(', ')})
                VALUES (${placeholders})
            `;

            const [result] = await connection.execute(sql, data);
            this.id = result.insertId;

            await connection.commit();
            return this;
        } catch (error) {
            Logger.error('Failed to create account:', {
                error: error.message,
                stack: error.stack,
                data: this.toDatabase(),
            });
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Update account information
     * @returns {Promise<AccountModel>} Updated account
     * @throws {Error} If validation fails or database error occurs
     */
    async update() {
        const connection = await this.pool.getConnection();
        try {
            if (!this.number) {
                throw new Error(G.identifierRequired);
            }

            await this.validate();

            // Only get fields that have been provided/modified
            const updates = {};
            if (this.name) {
                updates.name = normalize(this.name)
                    .clean(true, AccountModel.nameKeepChars)
                    .toUpperCase()
                    .toString()
                    .substring(0, 120);
            }
            if (this.email !== undefined) updates.email = this.email;
            if (this.admin !== undefined) updates.admin = this.admin;
            if (this.mobile !== undefined) updates.mobile = this.mobile;
            if (this.active !== null) updates.active = this.active;
            if (this.blocked !== null) updates.blocked = this.blocked;
            if (this.deleted !== null) updates.deleted = this.deleted;
            if (this.lastLogin) updates.last_login = this.lastLogin;

            // Build SQL query with explicit SET clauses
            const setClause = Object.keys(updates)
                .map((field) => `${field} = :${field}`)
                .join(', ');

            const sql = `
                UPDATE ${this.table}
                SET ${setClause},
                    updated = CURRENT_TIMESTAMP
                WHERE number = :number
                  AND deleted = 0`;

            // Combine update data with number for WHERE clause
            const params = { ...updates, number: this.number };

            await connection.execute(sql, params);
            // Reloading data from the database after the commit
            const refreshed = await this.findByNumber(this.number);
            if (refreshed) {
                Object.assign(this, refreshed);
            }

            await connection.commit();
            return this;
        } catch (error) {
            Logger.error('Failed to update account:', {
                error: error.message,
                stack: error.stack,
                number: this.number,
            });
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Update account PIN
     * @param {number} oldPin - Current PIN
     * @param {number} newPin - New PIN
     * @returns {Promise<AccountModel>} Updated account
     * @throws {Error} If validation fails or database error occurs
     */
    async updatePin(oldPin, newPin) {
        const connection = await this.pool.getConnection();
        try {
            // Verify old PIN
            if (this.pin !== oldPin) {
                throw new Error('invalid_pin');
            }

            // Verify that new PIN makes account number Luhn-valid
            const accountStr = this.number.toString().padStart(8, '0');
            const fullNumber = accountStr + newPin.toString().padStart(4, '0');

            if (!TokenGenerator.validateLuhn(fullNumber)) {
                throw new Error('invalid_pin_format');
            }

            const sql = `UPDATE ${this.table}
                         SET pin = ?
                         WHERE number = ?
                           AND deleted = 0`;
            await connection.execute(sql, [newPin, this.number]);
            this.pin = newPin;

            await connection.commit();
            return this;
        } catch (error) {
            await connection.rollback();
            Logger.error('Failed to update account PIN:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Process account balance update based on ledger entry
     * @param {boolean} isDebit - Whether operation is debit
     * @param {number} amount - Amount to credit/debit
     * @returns {Promise<AccountModel>} Updated account
     * @throws {Error} If validation fails or database error occurs
     */
    async updateBalance(isDebit, amount) {
        const connection = await this.pool.getConnection();
        try {
            const sql = `UPDATE ${this.table}
                         SET balance = balance ${isDebit ? '-' : '+'} ?
                         WHERE id = ?`;
            const [rows] = await connection.execute(sql, [amount, this.id]);

            const refreshed = await this.find(this.id);
            if (refreshed) {
                Object.assign(this, refreshed);
            }

            await connection.commit();
            return rows[0] ? new AccountModel(rows[0]) : null;
        } catch (error) {
            await connection.rollback();
            Logger.error('Failed to process balance update:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Update account last login
     * @returns {Promise<AccountModel>}
     */
    async updateLastLogin() {
        const connection = await this.pool.getConnection();
        try {
            const sql = `UPDATE wa_account
                         SET last_login = ?
                         WHERE id = ?`;
            await connection.execute(sql, [new Date(), this.id]);

            const refreshed = await this.findByNumber(this.number);
            if (refreshed) {
                Object.assign(this, refreshed);
            }

            await connection.commit();
            return this;
        } catch (error) {
            await connection.rollback();
            Logger.error('Failed to update account PIN:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Find account by ID
     * @param {number} id - Account ID
     * @returns {Promise<AccountModel|null>} Found account or null
     */
    async find(id) {
        const connection = await this.pool.getConnection();
        try {
            const sql = `SELECT *
                         FROM ${this.table}
                         WHERE id = ?
                           AND deleted = 0`;
            const [rows] = await connection.execute(sql, [id]);
            return rows[0] ? new AccountModel(rows[0]) : null;
        } catch (error) {
            Logger.error('Failed to find account:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Find account by number
     * @param {number} number - Account number
     * @returns {Promise<AccountModel|null>} Found account or null
     */
    async findByNumber(number) {
        const connection = await this.pool.getConnection();
        try {
            const sql = `SELECT *
                         FROM ${this.table}
                         WHERE number = ?
                           AND deleted = 0`;
            const [rows] = await connection.execute(sql, [number]);
            return rows[0] ? new AccountModel(rows[0]) : null;
        } catch (e) {
            Logger.error('Failed to find account:', e);
            throw e;
        } finally {
            connection.release();
        }
    }

    /**
     * Validate account data
     * @throws {Error} If validation fails
     * @private
     */
    async validate() {
        const errors = [];

        // Validate name
        if (!this.name?.trim()) errors.push('name_required');
        if (this.name?.length > 120) errors.push('name_too_long');

        // Validate country and mobile
        if (!this.country) errors.push('country_required');
        if (!this.admin) errors.push('account_manager_required');
        if (!this.mobile) errors.push('mobile_required');

        // Mobile validation
        if (this.mobile && this.country) {
            try {
                const country = await Country.getByCode(this.country);
                if (!country) {
                    errors.push(G.countryNotFound);
                } else {
                    const validatedMobile = await MobileValidator.validate(
                        this.mobile,
                        country.alpha2
                    );
                    this.mobile = validatedMobile.e164;
                }
            } catch (error) {
                errors.push(error.message);
            }
        }

        // Validate email
        if (!Watcher.isValidEmail(this.email)) errors.push('invalid_email_format');

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
    }

    /**
     * Convert model to database media
     * @returns {Object} Database formatted object
     * @private
     */
    toDatabase() {
        return {
            number: this.number,
            pin: this.pin,
            name: this.name,
            country: this.country,
            mobile: this.mobile,
            email: this.email,
            admin: this.admin,
            balance: this.balance,
            active: this.active,
            blocked: this.blocked,
            deleted: this.deleted,
            last_login: this.lastLogin,
        };
    }
}

export default AccountModel;

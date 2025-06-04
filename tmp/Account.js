import AccountModel from './AccountModel.js';
import Logger from '../tools/logger.js';
import TokenGenerator from '../tools/token.js';
import { Country } from './Country.js';
import G from '../tools/glossary.js';
import watcher from '../tools/watcher.js';
import { formatDateTime } from '../tools/date.js';
import NumberFormatter from '../tools/number.js';

/**
 * Business logic class for account management
 * @class Account
 * @author Assistant
 */
class Account {
    #model; // Private field

    constructor(data) {
        this.#model = new AccountModel(data);
    }

    get id() {
        return this.#model.id;
    }

    get number() {
        return Number(this.#model.number);
    }

    get pin() {
        return Number(this.#model.pin);
    }

    get name() {
        return this.#model.name;
    }

    // Setters
    set name(value) {
        this.#model.name = value;
    }

    get country() {
        return this.#model.country;
    }

    get mobile() {
        return Number(this.#model.mobile);
    }

    set mobile(value) {
        this.#model.mobile = value;
    }

    get email() {
        return this.#model.email;
    }

    set email(value) {
        this.#model.email = value;
    }

    get admin() {
        return this.#model.admin;
    }

    set admin(value) {
        this.#model.admin = value;
    }

    get balance() {
        return NumberFormatter.toDecimal(this.#model.balance, 2);
    }

    get active() {
        return Boolean(this.#model.active);
    }

    get blocked() {
        return Boolean(this.#model.blocked);
    }

    get lastLogin() {
        return !this.#model.lastLogin ? null : formatDateTime(this.#model.lastLogin);
    }

    set lastLogin(value) {
        this.#model.lastLogin = value;
    }

    /**
     * Get account
     * @param {number} identifier - Account identifier (ID or Number)
     * @param {boolean} [byNumber=false] - Get account by number
     * @returns {Promise<Account>} Account instance
     * @throws {Error} If account not found or inactive
     */
    static async load(identifier, byNumber = false) {
        try {
            await watcher.isOccur(!identifier, G.identifierRequired);

            const model = new AccountModel();
            const found = byNumber
                ? await model.findByNumber(identifier)
                : await model.find(identifier);

            await watcher.isOccur(!found, G.accountNotFound);
            await watcher.isOccur(found.blocked, G.accountIsBlocked);
            await watcher.isOccur(found.deleted, G.accountIsDeleted);

            return new Account(found);
        } catch (error) {
            Logger.error('Failed to load account:', error);
            throw error;
        }
    }

    /**
     * Get account by number
     * @param {number} number - Account number
     * @returns {Promise<Account>} Account instance
     * @throws {Error} If account not found or inactive
     */
    static async getByNumber(number) {
        try {
            await watcher.isOccur(!number, G.identifierRequired);

            const model = new AccountModel();
            const found = await model.findByNumber(number);
            await watcher.isOccur(!found, G.accountNotFound);

            return new Account(found);
        } catch (error) {
            Logger.error('Failed to load account:', error);
            throw error;
        }
    }

    /**
     * Verify account credentials
     * @param {number} number - Account number
     * @param {number} pin - Account PIN
     * @returns {Promise<boolean>} True if credentials are valid
     * @throws {Error} If account not found or inactive
     */
    static async verify(number, pin) {
        try {
            const account = await Account.getByNumber(number);
            return account.pin === pin && account.active && !account.blocked;
        } catch (error) {
            Logger.error('Account verification failed:', error);
            throw error;
        }
    }

    /**
     * Update account PIN
     * @param {number} oldPin - Current PIN
     * @param {number} newPin - New PIN
     * @returns {Promise<Account>} Updated account
     * @throws {Error} If update fails
     */
    async updatePin(oldPin, newPin) {
        try {
            await this.#model.updatePin(oldPin, newPin);
            return this;
        } catch (error) {
            Logger.error('Failed to update PIN:', error);
            throw error;
        }
    }

    /**
     * Update login date
     * @returns {Promise<Account>}
     */
    async updateLastLogin() {
        try {
            await this.#model.updateLastLogin();
            return this;
        } catch (error) {
            Logger.error('Failed to update PIN:', error);
            throw error;
        }
    }

    /**
     * Request PIN reset
     * Returns PIN reminder token
     * @returns {Promise<string>} Reset token
     */
    async requestPinReset() {
        try {
            this.#model.active = false;
            await this.#model.update();
            return TokenGenerator.generateSecureToken(32);
        } catch (error) {
            Logger.error('Failed to request PIN reset:', error);
            throw error;
        }
    }

    /**
     * Process account credit/debit
     * @param {boolean} isDebit - Whether operation is debit
     * @param {number} amount - Amount to process
     * @returns {Promise<Account>} Updated account
     * @throws {Error} If operation fails
     */
    async updateBalance(isDebit, amount) {
        try {
            await watcher.isOccur(amount <= 0, G.invalidAmount);
            const currentBalance = NumberFormatter.toDecimal(this.#model.balance, 2);
            await watcher.isOccur(isDebit && amount > currentBalance, G.insufficientBalance);
            await this.#model.updateBalance(isDebit, amount);
            return this;
        } catch (error) {
            Logger.error('Failed to process balance:', error);
            throw error;
        }
    }

    /**
     * Update account status
     * @param {boolean} blocked - Block/unblock account
     * @returns {Promise<Account>} Updated account
     */
    async updateStatus(blocked) {
        try {
            this.#model.blocked = blocked;
            await this.#model.update();
            return this;
        } catch (error) {
            Logger.error('Failed to update account status:', error);
            throw error;
        }
    }

    /**
     * Create or update account
     * @returns {Promise<Account>}
     */
    async save() {
        try {
            Logger.info('Starting account save process');
            await (this.#model.id ? this.#model.update() : this.#model.create());
            Logger.info('Account saved successfully');
            return this;
        } catch (error) {
            Logger.error('Failed to save account:', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Delete account (soft delete)
     * @returns {Promise<Account>} Deleted account
     */
    async delete() {
        try {
            this.#model.deleted = true;
            await this.#model.update();
            return this;
        } catch (error) {
            Logger.error('Failed to delete account:', error);
            throw error;
        }
    }

    /**
     * Convert to JSON representation
     * @returns {Promise<{Object}>}
     */
    async toJSON() {
        const country = await Country.getByCode(this.#model.country);
        return {
            number: this.number,
            name: this.name,
            mobile: this.mobile,
            email: this.email,
            balance: this.balance,
            active: this.active,
            blocked: this.blocked,
            lastLogin: this.lastLogin,
            country: country ? country.toJSON() : null,
        };
    }

    /**
     * Convert to DATA representation
     * @returns {{number, name, mobile: *, balance: *}}
     */
    toDATA() {
        return {
            number: this.number,
            name: this.name,
            mobile: this.mobile,
            balance: this.balance,
        };
    }

    toString() {
        return `Account[${this.#model.number}] ${this.#model.name}`;
    }
}

export { Account };

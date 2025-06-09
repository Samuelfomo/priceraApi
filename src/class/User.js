const G = require("../tools/Glossary");
const UserModel = require("../model/UserModel");
const Logger = require("../tools/logger");

class User {
    constructor(options = {}) {
        this.id = options.id;
        this.guid = options.guid;
        this.name = options.name;
        this.profil = options.profil;
        this.account = options.account;
        this.mobile = options.mobile;
        this.email = options.email;
        this.created = options.created || null;
        this.updated = options.updated || null;

        // Données associées
        this.accountData = options.accountData || null;
        this.profilData = options.profilData || null;
    }

    // ================================
    // GETTERS
    // ================================

    getId() {
        return this.id;
    }

    getGuid() {
        return this.guid;
    }

    getName() {
        return this.name;
    }

    getProfil() {
        return this.profil;
    }

    getAccount() {
        return this.account;
    }

    getMobile() {
        return this.mobile;
    }

    getEmail() {
        return this.email;
    }

    getCreated() {
        return this.created;
    }

    getUpdated() {
        return this.updated;
    }

    getAccountData() {
        return this.accountData;
    }

    getProfilData() {
        return this.profilData;
    }

    // ================================
    // SETTERS
    // ================================

    setId(id) {
        this.id = id;
        return this;
    }

    setGuid(guid) {
        this.guid = guid;
        return this;
    }

    setName(name) {
        if (!name || typeof name !== 'string' || !name.trim()) {
            throw new Error('Name must be a non-empty string');
        }
        this.name = name.trim();
        return this;
    }

    setProfil(profil) {
        if (!profil || !Number.isInteger(profil) || profil <= 0) {
            throw new Error('Profil must be a positive integer');
        }
        this.profil = profil;
        return this;
    }

    setAccount(account) {
        if (!account || !Number.isInteger(account) || account <= 0) {
            throw new Error('Account must be a positive integer');
        }
        this.account = account;
        return this;
    }

    setMobile(mobile) {
        if (!mobile || !Number.isInteger(mobile) || mobile <= 0) {
            throw new Error('Mobile must be a positive integer');
        }
        this.mobile = mobile;
        return this;
    }

    setEmail(email) {
        if (!email || typeof email !== 'string' || !email.trim()) {
            throw new Error('Email must be a non-empty string');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            throw new Error('Invalid email format');
        }
        this.email = email.trim().toLowerCase();
        return this;
    }

    setCreated(created) {
        this.created = created;
        return this;
    }

    setUpdated(updated) {
        this.updated = updated;
        return this;
    }

    setAccountData(accountData) {
        this.accountData = accountData;
        return this;
    }

    setProfilData(profilData) {
        this.profilData = profilData;
        return this;
    }

    // ================================
    // MÉTHODES MÉTIER
    // ================================

    /**
     * Valide les données de l'utilisateur
     * @returns {Object} - Résultat de validation
     */
    validate() {
        const errors = [];

        if (!this.name || !this.name.trim()) {
            errors.push('Name is required');
        }

        if (!this.profil || !Number.isInteger(this.profil) || this.profil <= 0) {
            errors.push('Valid profil ID is required');
        }

        if (!this.account || !Number.isInteger(this.account) || this.account <= 0) {
            errors.push('Valid account ID is required');
        }

        if (!this.mobile || !Number.isInteger(this.mobile) || this.mobile <= 0) {
            errors.push('Valid mobile number is required');
        }

        if (!this.email || !this.email.trim()) {
            errors.push('Email is required');
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.email)) {
                errors.push('Invalid email format');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Convertit l'objet en format pour la base de données
     * @returns {Object}
     */
    toModelData() {
        const data = {};

        if (this.id !== undefined) data.id = this.id;
        if (this.guid !== undefined) data.guid = this.guid;
        if (this.name !== undefined) data.name = this.name;
        if (this.profil !== undefined) data.profil = this.profil;
        if (this.account !== undefined) data.account = this.account;
        if (this.mobile !== undefined) data.mobile = this.mobile;
        if (this.email !== undefined) data.email = this.email;

        return data;
    }

    /**
     * Convertit l'objet en JSON pour les réponses API
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.id,
            guid: this.guid,
            name: this.name,
            profil: this.profil,
            account: this.account,
            mobile: this.mobile,
            email: this.email,
            created: this.created,
            updated: this.updated,
            accountData: this.accountData,
            profilData: this.profilData
        };
    }
    toDisplay(){
        return {
            guid: this.guid,
            name: this.name,
            profil: this.profil,
            account: this.account,
            mobile: this.mobile,
            email: this.email,
            created: this.created,
            updated: this.updated,
            accountData: this.accountData,
            profilData: this.profilData
        }
    }

    /**
     * Vérifie si l'utilisateur est complet (tous les champs obligatoires remplis)
     * @returns {boolean}
     */
    isComplete() {
        return !!(this.name && this.profil && this.account && this.mobile && this.email);
    }

    /**
     * Vérifie si l'utilisateur est nouveau (pas d'ID)
     * @returns {boolean}
     */
    isNew() {
        return !this.id;
    }

    /**
     * Met à jour les données de l'utilisateur
     * @param {Object} data - Nouvelles données
     * @returns {User}
     */
    updateData(data) {
        if (data.name !== undefined) this.setName(data.name);
        if (data.profil !== undefined) this.setProfil(data.profil);
        if (data.account !== undefined) this.setAccount(data.account);
        if (data.mobile !== undefined) this.setMobile(data.mobile);
        if (data.email !== undefined) this.setEmail(data.email);

        return this;
    }

    /**
     * Génère un nom d'affichage formaté
     * @returns {string}
     */
    getDisplayName() {
        if (!this.name) return 'Unknown User';

        return this.name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Masque l'email pour l'affichage public
     * @returns {string}
     */
    getMaskedEmail() {
        if (!this.email) return '';

        const [username, domain] = this.email.split('@');
        const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1);
        return `${maskedUsername}@${domain}`;
    }

    /**
     * Formate le numéro de mobile pour l'affichage
     * @returns {string}
     */
    getFormattedMobile() {
        if (!this.mobile) return '';

        const mobileStr = this.mobile.toString();
        // Format basique - peut être adapté selon le pays
        return mobileStr.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }

    /**
     * Vérifie si l'utilisateur a des données associées complètes
     * @returns {boolean}
     */
    hasCompleteAssociations() {
        return !!(this.accountData && this.profilData);
    }

    // ================================
    // MÉTHODES STATIQUES
    // ================================

    /**
     * Crée une instance User à partir des données de la base
     * @param {Object} dbData - Données de la base
     * @returns {User}
     */
    static fromDatabase(dbData) {
        if (!dbData) return null;

        return new User({
            id: dbData.id,
            guid: dbData.guid,
            name: dbData.name,
            profil: dbData.profil,
            account: dbData.account,
            mobile: dbData.mobile,
            email: dbData.email,
            created: dbData.created,
            updated: dbData.updated,
            accountData: dbData.accountData,
            profilData: dbData.profilData
        });
    }

    /**
     * Crée une instance User à partir de données JSON
     * @param {Object} jsonData - Données JSON
     * @returns {User}
     */
    static fromJSON(jsonData) {
        if (!jsonData) return null;

        return new User(jsonData);
    }

    /**
     * Crée un utilisateur vide
     * @returns {User}
     */
    static createEmpty() {
        return new User();
    }

    /**
     * Valide un email
     * @param {string} email - Email à valider
     * @returns {boolean}
     */
    static isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    /**
     * Valide un numéro de mobile
     * @param {number} mobile - Mobile à valider
     * @returns {boolean}
     */
    static isValidMobile(mobile) {
        return mobile && Number.isInteger(mobile) && mobile > 0;
    }

    // ================================
    // MÉTHODES D'ACCÈS AUX DONNÉES
    // ================================

    /**
     * Sauvegarde l'utilisateur en base
     * @param {Object} options - Options de connexion
     * @returns {Promise<User>}
     */
    async save(options = {}) {
        try {
            const validation = this.validate();
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            let result;
            if (this.isNew()) {
                result = await UserModel.create(this.toModelData(), options);
                Logger.logInfo(`User created with ID: ${result.id}`);
            } else {
                result = await UserModel.update(this.id, this.toModelData(), options);
                Logger.logInfo(`User updated with ID: ${this.id}`);
            }

            if (result) {
                this.id = result.id;
                this.guid = result.guid;
                this.created = result.created;
                this.updated = result.updated;
            }

            return this;
        } catch (error) {
            Logger.logError('Error saving user:', error);
            throw error;
        }
    }

    /**
     * Supprime l'utilisateur
     * @param {Object} options - Options de connexion
     * @returns {Promise<boolean>}
     */
    async delete(options = {}) {
        try {
            if (!this.id) {
                throw new Error('Cannot delete user without ID');
            }

            const result = await UserModel.delete(this.id, options);
            Logger.logInfo(`User deleted with ID: ${this.id}`);
            return result;
        } catch (error) {
            Logger.logError('Error deleting user:', error);
            throw error;
        }
    }

    /**
     * Recharge les données depuis la base
     * @param {Object} options - Options de connexion
     * @returns {Promise<User>}
     */
    async reload(options = {}) {
        try {
            if (!this.id) {
                throw new Error('Cannot reload user without ID');
            }

            const result = await UserModel.find(this.id, options);
            if (result) {
                Object.assign(this, result);
            }

            return this;
        } catch (error) {
            Logger.logError('Error reloading user:', error);
            throw error;
        }
    }

    /**
     * Charge les données associées (account et profil)
     * @param {Object} options - Options de connexion
     * @returns {Promise<User>}
     */
    async loadAssociations(options = {}) {
        try {
            if (!this.id) {
                throw new Error('Cannot load associations without user ID');
            }

            // Cette méthode nécessiterait une méthode spécifique dans UserModel
            // pour charger un utilisateur avec ses associations
            const AccountModel = require("../model/AccountModel");
            const ProfilModel = require("../model/ProfilModel");

            if (this.account) {
                this.accountData = await AccountModel.find(this.account, options);
            }

            if (this.profil) {
                this.profilData = await ProfilModel.find(this.profil, options);
            }

            return this;
        } catch (error) {
            Logger.logError('Error loading user associations:', error);
            throw error;
        }
    }
}

module.exports = User;
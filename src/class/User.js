const UserModel = require("../model/UserModel");
const Logger = require("../tools/logger");
const AccountModel = require("../model/AccountModel");
const ProfilModel = require("../model/ProfilModel");
const Account = require("./Account");
const Profil = require("./Profil");


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
        this.accountObject = options.accountObject || {};
        this.profilObject = options.profilObject || {};
        if (options.accountData) {
            this.accountObject = new Account(options.accountData);
        }
        else if (options.accountObject) {
            this.accountObject = new Account(options.accountObject);
        }
        else {
            this.accountObject = null;
        }
        if (options.profilData) {
            this.profilObject = new Profil(options.profilData);
        }
        else if (options.profilObject) {
            this.profilObject = new Profil(options.profilObject);
        }
        else {
            this.profilObject = null;
        }
        /*
         if (data.companyData) {
            this.companyObject = new Company(data.companyData);
        } else if (data.countryObject) {
            this.companyObject = new Company(data.companyObject);
        } else {
            this.companyObject = null;
        }
         */
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

    getaccountObject() {
        return this.accountObject;
    }

    getprofilObject() {
        return this.profilObject;
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

    setaccountObject(accountObject) {
        this.accountObject = accountObject;
        return this;
    }

    setprofilObject(profilObject) {
        this.profilObject = profilObject;
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

        if (!this.mobile) {
            errors.push('mobile number is required');
        }else {
            const regexNumberCam = /^(\+237|237)?6(2[0]\d{6}|[5-9]\d{7})$/;
            const cleanedPhoneNumber = this.mobile.toString().replace(/\s+/g, '');
            if (!regexNumberCam.test(cleanedPhoneNumber)) {
                errors.push('Invalid mobile number format');
            }
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
            accountObject: this.accountObject,
            profilObject: this.profilObject
        };
    }
    toDisplay(){
        return {
            guid: this.guid,
            name: this.name,
            // profil: this.profil,
            // account: this.account,
            mobile: this.mobile,
            email: this.email,
            // created: this.created,
            // updated: this.updated,
            accountObject: this.accountObject? this.accountObject.toDisplay() : {id: this.account},
            profilObject: this.profilObject? this.profilObject.toDisplay() : {id: this.profil},
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
        return !this.guid;
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
        return !!(this.accountObject && this.profilObject);
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
            accountObject: dbData.accountObject,
            profilObject: dbData.profilObject
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
        if (typeof mobile !== 'string' && typeof mobile !== 'number') {
            return false;
        }

        const regexNumberCam = /^(\+237|237)?6(2[0]\d{6}|[5-9]\d{7})$/;
        const cleanedPhoneNumber = mobile.toString().replace(/\s+/g, '');
        return regexNumberCam.test(cleanedPhoneNumber);
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
            } else {
                const findUser = await UserModel.findByAttribute("guid", this.guid);
                if (!findUser) {
                    throw new Error(`user updated doesn't exist`);
                }
                this.id = findUser.id;
                result = await UserModel.update(this.id, this.toModelData(), options);
            }

            // if (result) {
            //     this.id = result.id;
            //     this.guid = result.guid;
            //     this.created = result.created;
            //     this.updated = result.updated;
            // }
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
     * @returns {Promise<*|{}|User|null>}
     */
    async loadAssociations() {
        if (this.accountObject) {
            this.accountObject = new Account(this.accountObject)
        }
        if (this.profilObject) {
            this.profilObject = new Profil(this.profilObject)
        }
        try {
            // if (!this.id) {
            //     throw new Error('Cannot load associations without user ID');
            // }
            if (!this.account) return null;
            if (!this.profil) return null;

            // Cette méthode nécessiterait une méthode spécifique dans UserModel
            // pour charger un utilisateur avec ses associations


            if (this.account) {
                const accountObjectResponse = await AccountModel.findWithCompany(this.account);
                if (!accountObjectResponse) {
                    return null;
                }
                this.accountObject = new Account(accountObjectResponse);
                // this.accountObject = await AccountModel.find(this.account, options);
            }

            if (this.profil) {
                const profilObjectResponse = await ProfilModel.find(this.profil);
                if (!profilObjectResponse) {
                    return null;
                }
                this.profilObject  = new Profil(profilObjectResponse);
                // this.profilObject = await ProfilModel.find(this.profil, options);
            }

            // console.log(this.toDisplay());
            return this.toDisplay();
        } catch (error) {
            Logger.logError('Error loading user associations:', error);
            return null;
        }
    }

    /**
     * Get paginated users
     * @param {Object} queryOptions - Query options
     * @returns {Promise<Object>}
     */
    // static async getAll(queryOptions = {}) {
    //     try {
    //         const result = await UserModel.findAll(queryOptions);
    //         return {
    //             data: result.data.map(data => new User(data).toDisplay()),
    //             pagination: result.pagination
    //         };
    //     } catch (error) {
    //         Logger.logError('Failed to get all profils:', error);
    //         throw error;
    //     }
    // }

    static async getAllWithAssociation(queryOptions = {}) {
        try {
            const result = await UserModel.findAllWithAccount(queryOptions);

            // Charger les Associations pour chaque User
            const accountWithAssociation = await Promise.all(
                result.data.map(async (userData) => {
                    const user = new User(userData);
                    await user.loadAssociations();
                    return user.toDisplay();
                })
            );

            return {
                data: accountWithAssociation,
                pagination: result.pagination
            };
        } catch (error) {
            Logger.logError('Failed to get all users with association:', error);
            throw error;
        }
    }

}

module.exports = User;
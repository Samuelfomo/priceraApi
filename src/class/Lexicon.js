const path = require('path');
const paths = require('../../config/paths');

const Db = require(path.join(paths.MDL_DIR, 'Database'));
const LexiconModel = require(path.join(paths.MDL_DIR, 'LexiconModel'));
const W = require(path.join(paths.TOOL_DIR, 'W'));
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));

class Lexicon {
    constructor(reference, english, french, portable = false, id = null, guid = null) {
        this.id = id;
        this.guid = guid;
        this.reference = reference;
        this.english = english;
        this.french = french;
        this.portable = portable;
    }

    /**
     *
     * @param json
     * @returns {Lexicon}
     */
    static fromJson(json) {
        return new Lexicon(json.reference, json.english, json.french, json.portable, json.id, json.guid);
    }

    /**
     * Check for duplicate entry
     * @returns {Promise<void>}
     */
    async _duplicate() {
        const existingEntry = await LexiconModel.findOne({
            where: { reference: this.reference }
        });
        await W.isOccur(existingEntry, G.duplicate);
    }

    // /**
    //  * Convert to OpenCamelCase
    //  * @param str
    //  * @returns {string}
    //  */
    // static toOpenCamelCase(str) {
    //     if (!str) return '';
    //
    //     const cleanedStr = str
    //         .replace(/[^a-zA-Z0-9']+/g, ' ')
    //         .trim()
    //         .replace(/'/g, '');
    //
    //     const words = cleanedStr
    //         .toLowerCase()
    //         .split(' ')
    //     ;
    //
    //     return words
    //         .map((word, index) => {
    //             if (index === 0) return word;
    //             return word.charAt(0).toUpperCase() + word.slice(1);
    //         })
    //         .join('');
    // }
    /**
     * Convert to OpenCamelCase
     * @param str
     * @returns {string}
     */
    static toOpenCamelCase(str) {
        if (!str) return '';

        const cleanedStr = str
            .replace(/[^a-zA-Z0-9']+/g, ' ')
            .trim()
            .replace(/'/g, '');

        const words = cleanedStr
            .toLowerCase()
            .split(' ')
        ;

        return words
            .map((word, index) => {
                if (index === 0) return word;
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join('');
    }

    /**
     * Save Lexicon data in the database
     * @returns {Promise<Lexicon>}
     */
    async save() {
        try {
            const truncatedReference= this.english.length > 50 ? this.english.slice(0, 50) : this.english;
            this.reference = Lexicon.toOpenCamelCase(truncatedReference);
            await W.isOccur(!LexiconModel, 'LexiconModel is not properly initialized');

            let entry;
            if (!this.guid) {
                console.log('Creating Lexicon');
                // Verifier les doubloons lors de la création
                await this._duplicate();

                // Crée une nouvelle entrée
                const db = new Db();
                const guid = await db.generateGuid(LexiconModel, 6);

                console.log('Creating guid', guid);
                entry = await LexiconModel.create({
                    guid: guid,
                    reference: this.reference,
                    english: this.english,
                    french: this.french,
                    portable: this.portable
                });
            }
            else {
                // Vérifiez si l'entrée existe pour la mise à jour
                const existingEntry = await LexiconModel.findOne({
                    where: { guid: this.guid }
                });

                await W.isOccur(!existingEntry, G.errorGuid);

                // Met à jour l'entrée existante
                await LexiconModel.update(
                    {
                        // reference: this.reference,
                        english: this.english,
                        french: this.french,
                        portable: this.portable
                    },
                    {
                        where: { guid: this.guid }
                    }
                );

                // Récupère l'entrée mise à jour
                entry = await LexiconModel.findOne({
                    where: { guid: this.guid }
                });
            }

            return Lexicon.fromJson(entry.toJSON());
        } catch (error) {
            throw error;
        }
    }
    /**
     * List lexicon entries
     * @param portable
     * @returns {Promise<{reference, english, guid, french}[]|*[]>}
     */
    static async list(portable = false) {
        try {
            const entries = await LexiconModel.findAll({
                where: { portable: portable }
            });

            if (!entries.length) return [];

            // Convert entries to Lexicon instances and then to JSON
            return entries.map(entry => Lexicon.fromJson(entry.toJSON()).toJson());
        } catch (error) {
            console.error('Error listing lexicon entries:', error);
            throw error;
        }
    }
    static async list_all() {
        try {
            const entries = await LexiconModel.findAll();
            if (!entries.length) return [];
            // console.log(entries.map(entry => Lexicon.fromJson(entry.toJSON()).toJson()));
            return entries.map(entry => Lexicon.fromJson(entry.toJSON()).toJson());
        } catch (error) {
            console.error('Error fetching lexicons:', error);
            throw error;
        }
    }

    /**
     * Delete lexicon entry from database
     * @returns {Promise<void>}
     */
    async delete() {
        try {
            await W.isOccur(!LexiconModel, 'LexiconModel is not properly initialized');

            // Check if entry exists
            const existingEntry = await LexiconModel.findOne({
                where: { guid: this.guid }
            });

            await W.isOccur(!existingEntry, G.errorGuid);

            // Delete the entry
            const deleted = await LexiconModel.destroy({
                where: { guid: this.guid }
            });

            // Double check if deletion was successful
            await W.isOccur(deleted !== 1, G.errorDeleted); // Vérification du nombre d'entrées supprimées
        } catch (error) {
            throw error;
        }
    }

    /**
     * Convert object to JSON
     * @returns {{reference, english, guid, french}}
     */
    toJson() {
        return {
            guid: this.guid,
            reference: this.reference,
            english: this.english,
            french: this.french,
            portable: this.portable
        };
    }
}

module.exports = { Lexicon };
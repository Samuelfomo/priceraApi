const path = require('path');
const paths = require('../../config/paths');

const Db = require(path.join(paths.MDL_DIR, 'Db'));
const CountryModel = require(path.join(paths.MDL_DIR, 'CountryModel'));
const W = require(path.join(paths.TOOL_DIR, 'W'));
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));

class Country {
    constructor(alpha2, alpha3, dialcode, fr, en, guid = null, id = null) {
        this.id = id;
        this.guid = guid;
        this.alpha2 = alpha2;
        this.alpha3 = alpha3;
        this.dialcode = dialcode;
        this.fr = fr;
        this.en = en;
    }
    static fromJson(json) {
        return new Country(json.alpha2, json.alpha3, json.dialcode, json.fr, json.en, json.guid, json.id);
    }

    async _duplicate() {
        const existingEntry = await CountryModel.findOne({
            where: {
                alpha2: this.alpha2
            }
        });
        await W.isOccur(existingEntry, W.duplicate);
    }

    async saved() {
        try {
            await W.isOccur(!CountryModel, 'CountryModel is not properly initialized');
            let entry;
            if (!this.guid){
                await this._duplicate();

                const db = new Db();
                const guid = await db.generateGuid(CountryModel, 6);

                entry = await CountryModel.create({
                    guid: guid,
                    alpha2: this.alpha2,
                    alpha3: this.alpha3,
                    dialcode: this.dialcode,
                    fr: this.fr,
                    en: this.en,
                })
            }
            else {
                const existingEntry = await CountryModel.findOne({
                    where: { guid: this.guid }
                });
                await W.isOccur(!existingEntry, W.errorGuid);

                await CountryModel.update({
                        alpha2: this.alpha2,
                        alpha3: this.alpha3,
                        dialcode: this.dialcode,
                        fr: this.fr,
                        en: this.en,
                    },
                    {
                        where: { guid: this.guid }
                    });
                entry = await CountryModel.findOne({
                    where: { guid: this.guid }
                });
            }
            return Country.fromJson(entry.toJSON);
        } catch (error) {
            throw  error;
        }
    }


    toJson() {
        return {
            code: this.guid,
            alpha2: this.alpha2,
            alpha3: this.alpha3,
            dialcode: this.dialcode,
            fr: this.fr,
            en: this.en
        }
    }
}
module.exports = Country;
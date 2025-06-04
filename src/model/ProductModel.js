const {DataTypes} = require("sequelize")
const path = require('path');
const paths = require('../../config/paths');
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));
const { sequelize } = require(path.join(paths.MDL_DIR, 'odbc'));

const ProductModel = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: "Product"
    },
    guid: {
        type: DataTypes.INTEGER,
        unique: {
            name: 'UNIQUE-Product-GUID',
            msg: 'The GUID of Product must be unique'
        },
        allowNull: false,
        comment: 'GUID'
    },
    common_name: {
        type: DataTypes.STRING(128),
        unique: {
            name: 'UNIQUE-Product-Name',
            msg: 'The Name of Product must be unique'
        },
        allowNull: false,
        comment: 'Name of Product'
    },
    local_name: {
        type: DataTypes.STRING(128),
        allowNull: false,
        comment: "local_Name"
    },
    bare_code: {
        type: DataTypes.STRING(128),
        unique: {
            name: 'UNIQUE-Product-bareCode',
            msg: 'The bareCode of Product must be unique'
        },
        allowNull: true,
        comment: "bare_Code"
    },
    // Attribut JSONB pour taxonomy
    taxonomy: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: "Taxonomy of Product (JSON: {domain: string[], tag: string[], merchant: string[]})",
        validate: {
            isValidTaxonomy(value) {
                if (!value || typeof value !== 'object') {
                    throw new Error('Taxonomy must be a valid JSON object');
                }

                const required = ['domain', 'tag', 'merchant'];
                for (const field of required) {
                    if (!value[field]) {
                        throw new Error(`Taxonomy is missing required field: ${field}`);
                    }
                    if (!Array.isArray(value[field])) {
                        throw new Error(`Taxonomy.${field} must be an array of strings`);
                    }
                    if (value[field].some(item => typeof item !== 'string')) {
                        throw new Error(`Taxonomy.${field} must contain only strings`);
                    }
                }
            }
        }
    },
    // Attribut JSONB pour les survey
    survey: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: "Survey of Product (JSON: {date: timestamp, contain: {account: int, price: int, note: string, merchant: string[], geolocation: string}})",
        validate: {
            isValidSurvey(value) {
                if (!value || typeof value !== 'object') {
                    throw new Error('Survey must be a valid JSON object');
                }

                // Validation de la date
                if (!value.date) {
                    throw new Error('Survey is missing required field: date');
                }
                if (!(value.date instanceof Date) && typeof value.date !== 'string' && typeof value.date !== 'number') {
                    throw new Error('Survey.date must be a valid date/timestamp');
                }

                // Validation du contenu
                if (!value.contain || typeof value.contain !== 'object') {
                    throw new Error('Survey.contain must be a valid object');
                }

                const contain = value.contain;

                // Validation account (ID de la table account)
                if (contain.account !== undefined && (!Number.isInteger(contain.account) || contain.account <= 0)) {
                    throw new Error('Survey.contain.account must be a positive integer (account ID)');
                }

                // Validation price (int)
                if (contain.price !== undefined && !Number.isInteger(contain.price)) {
                    throw new Error('Survey.contain.price must be an integer');
                }

                // Validation note (string)
                if (contain.note !== undefined && typeof contain.note !== 'string') {
                    throw new Error('Survey.contain.note must be a string');
                }

                // Validation merchant (array of strings)
                if (contain.merchant !== undefined) {
                    if (!Array.isArray(contain.merchant)) {
                        throw new Error('Survey.contain.merchant must be an array of strings');
                    }
                    if (contain.merchant.some(item => typeof item !== 'string')) {
                        throw new Error('Survey.contain.merchant must contain only strings');
                    }
                }

                // Validation geolocation (string)
                if (contain.geolocation !== undefined && typeof contain.geolocation !== 'string') {
                    throw new Error('Survey.contain.geolocation must be a string');
                }
            }
        }
    }
}, {
    tableName: "product",
    timestamps: true,
    updatedAt: "updated",
    createdAt: "created",
});

// =============================================================================
// MÉTHODES D'INSTANCE POUR TAXONOMY
// =============================================================================

ProductModel.prototype.getTaxonomyDomain = function() {
    return this.taxonomy?.domain || [];
};

ProductModel.prototype.getTaxonomyTag = function() {
    return this.taxonomy?.tag || [];
};

ProductModel.prototype.getTaxonomyMerchant = function() {
    return this.taxonomy?.merchant || [];
};

ProductModel.prototype.setTaxonomy = function(domain, tag, merchant) {
    this.taxonomy = {
        domain: Array.isArray(domain) ? domain : [domain],
        tag: Array.isArray(tag) ? tag : [tag],
        merchant: Array.isArray(merchant) ? merchant : [merchant]
    };
    return this;
};

ProductModel.prototype.addTaxonomyDomain = function(domain) {
    if (!this.taxonomy) this.taxonomy = { domain: [], tag: [], merchant: [] };
    if (!this.taxonomy.domain.includes(domain)) {
        this.taxonomy.domain.push(domain);
    }
    return this;
};

ProductModel.prototype.addTaxonomyTag = function(tag) {
    if (!this.taxonomy) this.taxonomy = { domain: [], tag: [], merchant: [] };
    if (!this.taxonomy.tag.includes(tag)) {
        this.taxonomy.tag.push(tag);
    }
    return this;
};

ProductModel.prototype.addTaxonomyMerchant = function(merchant) {
    if (!this.taxonomy) this.taxonomy = { domain: [], tag: [], merchant: [] };
    if (!this.taxonomy.merchant.includes(merchant)) {
        this.taxonomy.merchant.push(merchant);
    }
    return this;
};

ProductModel.prototype.getFullTaxonomy = function() {
    if (!this.taxonomy) return null;
    return {
        domains: this.taxonomy.domain.join(', '),
        tags: this.taxonomy.tag.join(', '),
        merchants: this.taxonomy.merchant.join(', ')
    };
};

// =============================================================================
// MÉTHODES D'INSTANCE POUR SURVEY
// =============================================================================

ProductModel.prototype.getSurveyDate = function() {
    return this.survey?.date;
};

ProductModel.prototype.getSurveyContain = function() {
    return this.survey?.contain;
};

ProductModel.prototype.getSurveyAccount = function() {
    return this.survey?.contain?.account;
};

ProductModel.prototype.getSurveyPrice = function() {
    return this.survey?.contain?.price;
};

ProductModel.prototype.getSurveyNote = function() {
    return this.survey?.contain?.note;
};

ProductModel.prototype.getSurveyMerchant = function() {
    return this.survey?.contain?.merchant || [];
};

ProductModel.prototype.getSurveyGeolocation = function() {
    return this.survey?.contain?.geolocation;
};

ProductModel.prototype.setSurvey = function(date, contain) {
    // Normalisation de la date
    let normalizedDate = date;
    if (typeof date === 'string' || typeof date === 'number') {
        normalizedDate = new Date(date);
    }

    this.survey = {
        date: normalizedDate,
        contain: contain || {}
    };
    return this;
};

ProductModel.prototype.setSurveyContain = function(account, price, note, merchant, geolocation) {
    if (!this.survey) {
        this.survey = { date: new Date(), contain: {} };
    }

    this.survey.contain = {
        account: account,
        price: price,
        note: note,
        merchant: Array.isArray(merchant) ? merchant : (merchant ? [merchant] : []),
        geolocation: geolocation
    };
    return this;
};

ProductModel.prototype.addSurveyMerchant = function(merchant) {
    if (!this.survey) {
        this.survey = { date: new Date(), contain: { merchant: [] } };
    }
    if (!this.survey.contain) {
        this.survey.contain = { merchant: [] };
    }
    if (!Array.isArray(this.survey.contain.merchant)) {
        this.survey.contain.merchant = [];
    }

    if (!this.survey.contain.merchant.includes(merchant)) {
        this.survey.contain.merchant.push(merchant);
    }
    return this;
};

ProductModel.prototype.getFullSurvey = function() {
    if (!this.survey) return null;

    const contain = this.survey.contain || {};
    return {
        date: this.survey.date,
        account: contain.account,
        price: contain.price,
        note: contain.note,
        merchants: Array.isArray(contain.merchant) ? contain.merchant.join(', ') : '',
        geolocation: contain.geolocation
    };
};

// =============================================================================
// MÉTHODES STATIQUES POUR LES REQUÊTES JSON
// =============================================================================

ProductModel.findByDomain = function(domain) {
    return this.findAll({
        where: sequelize.where(
            sequelize.fn('JSON_CONTAINS', sequelize.col('taxonomy'), JSON.stringify({ domain: [domain] })),
            true
        )
    });
};

ProductModel.findByTag = function(tag) {
    return this.findAll({
        where: sequelize.where(
            sequelize.fn('JSON_CONTAINS', sequelize.col('taxonomy'), JSON.stringify({ tag: [tag] })),
            true
        )
    });
};

ProductModel.findByPriceRange = function(minPrice, maxPrice) {
    return this.findAll({
        where: sequelize.where(
            sequelize.cast(sequelize.json('survey.contain.price'), 'INTEGER'),
            { [sequelize.Op.between]: [minPrice, maxPrice] }
        )
    });
};

ProductModel.findByAccount = function(accountId) {
    return this.findAll({
        where: sequelize.where(
            sequelize.json('survey.contain.account'),
            accountId
        )
    });
};

ProductModel.findByDateRange = function(startDate, endDate) {
    return this.findAll({
        where: sequelize.where(
            sequelize.cast(sequelize.json('survey.date'), 'DATETIME'),
            { [sequelize.Op.between]: [startDate, endDate] }
        )
    });
};

// =============================================================================
// MÉTHODE D'INITIALISATION
// =============================================================================

ProductModel.initialize = async function () {
    try {
        // Vérification de la connexion à la base de données
        await sequelize.authenticate();
        console.log('Database connection established successfully');

        // Synchronisation du modèle (crée la table si elle n'existe pas)
        await ProductModel.sync({alter: true, force: G.development});
        console.log('ProductModel synchronized successfully');

        // Création d'index pour les performances (PostgreSQL uniquement)
        if (sequelize.getDialect() === 'postgres') {
            await ProductModel.createJsonIndexes();
        }

    } catch (error) {
        console.error('Unable to synchronize the ProductModel:', error);
        throw error;
    }
};

// =============================================================================
// CRÉATION D'INDEX POUR LES PERFORMANCES (PostgreSQL) - VERSION CORRIGÉE
// =============================================================================

ProductModel.createJsonIndexes = async function() {
    try {
        // Index GIN pour les recherches dans taxonomy (fonctionne bien)
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_product_taxonomy_gin 
            ON product USING GIN (taxonomy)
        `);

        // Index GIN pour les recherches dans survey (fonctionne bien)
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_product_survey_gin 
            ON product USING GIN (survey)
        `);

        // Index pour les prix - utiliser BTREE avec une expression correcte
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_product_survey_price 
            ON product USING BTREE (((survey->'contain'->>'price')::INTEGER))
            WHERE survey->'contain'->>'price' IS NOT NULL
        `);

        // Index pour les comptes - utiliser BTREE avec une expression correcte
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_product_survey_account 
            ON product USING BTREE (((survey->'contain'->>'account')::INTEGER))
            WHERE survey->'contain'->>'account' IS NOT NULL
        `);

        // Index pour les dates - CORRIGÉ pour éviter l'erreur IMMUTABLE
        // Utiliser une fonction IMMUTABLE ou un index différent
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_product_survey_date_text 
            ON product USING BTREE ((survey->>'date'))
            WHERE survey->>'date' IS NOT NULL
        `);

        // Alternative pour la date si vous avez besoin d'un index temporel
        // (nécessite une fonction personnalisée IMMUTABLE)
        /*
        await sequelize.query(`
            CREATE OR REPLACE FUNCTION immutable_json_to_timestamp(json_text text)
            RETURNS timestamp
            LANGUAGE sql
            IMMUTABLE
            RETURNS NULL ON NULL INPUT
            AS 'SELECT $1::timestamp';
        `);

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_product_survey_date_timestamp
            ON product USING BTREE (immutable_json_to_timestamp(survey->>'date'))
            WHERE survey->>'date' IS NOT NULL
        `);
        */

        console.log('JSON indexes created successfully');
    } catch (error) {
        console.error('Error creating JSON indexes:', error);
        // Ne pas faire échouer l'initialisation si les index échouent
    }
};

// // =============================================================================
// // CRÉATION D'INDEX POUR LES PERFORMANCES (PostgreSQL)
// // =============================================================================
//
// ProductModel.createJsonIndexes = async function() {
//     try {
//         // Index pour les recherches dans taxonomy
//         await sequelize.query(`
//             CREATE INDEX IF NOT EXISTS idx_product_taxonomy_gin
//             ON product USING GIN (taxonomy)
//         `);
//
//         // Index pour les recherches dans survey
//         await sequelize.query(`
//             CREATE INDEX IF NOT EXISTS idx_product_survey_gin
//             ON product USING GIN (survey)
//         `);
//
//         // Index spécifique pour les prix
//         await sequelize.query(`
//             CREATE INDEX IF NOT EXISTS idx_product_survey_price
//             ON product USING GIN ((survey->'contain'->>'price'))
//         `);
//
//         // Index pour les comptes
//         await sequelize.query(`
//             CREATE INDEX IF NOT EXISTS idx_product_survey_account
//             ON product USING GIN ((survey->'contain'->>'account'))
//         `);
//
//         console.log('JSON indexes created successfully');
//     } catch (error) {
//         console.error('Error creating JSON indexes:', error);
//         // Ne pas faire échouer l'initialisation si les index échouent
//     }
// };

// =============================================================================
// MÉTHODES UTILITAIRES
// =============================================================================

ProductModel.prototype.toSimpleJSON = function() {
    const json = this.toJSON();
    return {
        id: json.id,
        common_name: json.common_name,
        local_name: json.local_name,
        bare_code: json.bare_code,
        fullTaxonomy: this.getFullTaxonomy(),
        fullSurvey: this.getFullSurvey(),
        created: json.created,
        updated: json.updated
    };
};

// Hook avant sauvegarde pour validation et normalisation
ProductModel.beforeSave((product, options) => {
    // Normalisation des tableaux dans taxonomy
    if (product.taxonomy) {
        ['domain', 'tag', 'merchant'].forEach(field => {
            if (product.taxonomy[field] && Array.isArray(product.taxonomy[field])) {
                product.taxonomy[field] = product.taxonomy[field]
                    .map(item => typeof item === 'string' ? item.trim() : item)
                    .filter(item => item && item.length > 0);
            }
        });
    }

    // Normalisation des données dans survey
    if (product.survey && product.survey.contain) {
        const contain = product.survey.contain;

        // Normalisation de la note
        if (contain.note && typeof contain.note === 'string') {
            contain.note = contain.note.trim();
        }

        // Normalisation du tableau merchant
        if (contain.merchant && Array.isArray(contain.merchant)) {
            contain.merchant = contain.merchant
                .map(item => typeof item === 'string' ? item.trim() : item)
                .filter(item => item && item.length > 0);
        }

        // Normalisation de la géolocalisation
        if (contain.geolocation && typeof contain.geolocation === 'string') {
            contain.geolocation = contain.geolocation.trim();
        }
    }
});

module.exports = ProductModel;
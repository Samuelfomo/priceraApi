const {DataTypes} = require("sequelize");
const path = require('path');
const paths = require('../../config/paths');
const W = require(path.join(paths.TOOL_DIR, 'Watcher'));

const { sequelize } = require(path.join(paths.MDL_DIR, 'odbc'));


const LexiconModel = sequelize.define('Lexicon', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Lexicon'
    },
    guid: {
        type: DataTypes.INTEGER,
        unique: {
            name: 'UNIQUE-LEXICON-GUID',
            msg: 'The GUID of Lexicon must be unique'
        },
        allowNull: false,
        comment: 'GUID'
    },
    portable: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: 'Portable'
    },
    reference: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: {
            name: 'UNIQUE-LEXICON-REFERENCE',
            msg: 'The REFERENCE of Lexicon must be unique'
        },
        comment: 'Reference'
    },
    english: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'English'
    },
    french: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'French'
    }
}, {
    tableName: 'lexicon',
    timestamps: false
});

/**
 * Synchronise le modèle avec la base de données
 * @returns {Promise<void>}
 */
LexiconModel.initialize = async function () {
    try {
        // Checks database connection
        await sequelize.authenticate();

        // Synchronises the model (creates the table if it doesn't exist)
        await LexiconModel.sync({alter: true, force: W.development});

        console.log('LexiconModel synchronized successfully');
    } catch (error) {
        console.error('Unable to synchronize the LexiconModel:', error);
        throw error;
    }
};

module.exports = LexiconModel;
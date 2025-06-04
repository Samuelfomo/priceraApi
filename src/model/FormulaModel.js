const {DataTypes} = require("sequelize")
const path = require('path');
const paths = require('../../config/paths');
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));

const { sequelize } = require(path.join(paths.MDL_DIR, 'odbc'));

const FormulaModel = sequelize.define('Formula', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: "Formula"
    },
    guid: {
        type: DataTypes.INTEGER,
        unique: {
            name: 'UNIQUE-Formula-GUID',
            msg: 'The GUID of Formula must be unique'
        },
        allowNull: false,
        comment: 'GUID'
    },
    name: {
        type: DataTypes.STRING(128),
        unique: {
            name: 'UNIQUE-Formula-Name',
            msg: 'The Name of Formula must be unique'
        },
        allowNull: false,
        comment: "Name of Formula"
    },
    code: {
        type: DataTypes.STRING(128),
        unique: {
            name: 'UNIQUE-Formula-CODE',
            msg: 'The CODE of Formula must be unique'
        },
        allowNull: false,
        comment: "CODE"
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Amount of Formula"
    },
    description: {
        type: DataTypes.STRING(128),
        allowNull: true,
        comment: "Description of Formula"
    }
}, {
    tableName: "formula",
    timestamps: true,
    updatedAt: "updated",
    createdAt: "created",
});
FormulaModel.initialize = async function () {
    try {
        // Checks database connection
        await sequelize.authenticate();

        // Synchronises the model (creates the table if it doesn't exist)
        await FormulaModel.sync({alter: true, force: G.development});

        console.log('FormulaModel synchronized successfully');
    } catch (error) {
        console.error('Unable to synchronize the FormulaModel:', error);
        throw error;
    }
};

module.exports = FormulaModel;
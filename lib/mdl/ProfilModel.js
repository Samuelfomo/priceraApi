const {DataTypes} = require("sequelize")
const path = require('path');
const paths = require('../../config/paths');
const W = require(path.join(paths.TOOL_DIR, 'Watcher'));

const { sequelize } = require(path.join(paths.MDL_DIR, 'odbc'));

const ProfilModel = sequelize.define('Profil', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: "Profil"
    },
    guid: {
        type: DataTypes.INTEGER,
        unique: {
            name: 'UNIQUE-Profil-GUID',
            msg: 'The GUID of Profil must be unique'
        },
        allowNull: false,
        comment: 'GUID'
    },
    name: {
        type: DataTypes.STRING(128),
        unique: {
            name: 'UNIQUE-Profil-Name',
            msg: 'The Name of Profil must be unique'
        },
        allowNull: false,
        comment: "Name"
    },
    reference: {
        type: DataTypes.STRING,
        unique: {
            name: 'UNIQUE-Profil-Reference',
            msg: 'The Reference of Profil must be unique'
        },
        allowNull: false,
        comment: "Reference"
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "description"
    },
}, {
    tableName: "profil",
    timestamps: true,
    createdAt: 'created',
    updatedAt: 'updated'
});
ProfilModel.initialize = async function () {
    try {
        // Checks database connection
        await sequelize.authenticate();

        // Synchronises the model (creates the table if it doesn't exist)
        await ProfilModel.sync({alter: true, force: W.development});

        console.log('ProfilModel synchronized successfully');
    } catch (error) {
        console.error('Unable to synchronize the ProfilModel:', error);
        throw error;
    }
};

module.exports = ProfilModel;

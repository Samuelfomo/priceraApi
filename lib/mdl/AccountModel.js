const {DataTypes} = require("sequelize")
const path = require('path');
const paths = require('../../config/paths');
const W = require(path.join(paths.TOOL_DIR, 'Watcher'));

const { sequelize } = require(path.join(paths.MDL_DIR, 'odbc'));

const AccountModel = sequelize.define('Account', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: "Account"
    },
    guid: {
        type: DataTypes.INTEGER,
        unique: {
            name: 'UNIQUE-Account-GUID',
            msg: 'The GUID of Account must be unique'
        },
        allowNull: false,
        comment: 'GUID'
    },
    code: {
        type: DataTypes.STRING(128),
        unique: {
            name: 'UNIQUE-Account-CODE',
            msg: 'The CODE of Account must be unique'
        },
        allowNull: false,
        comment: "CODE"
    },
    company: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'company',
            key: 'id'
        },
        comment: "The Company of Account must be foreign key references of table company"
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Active Account'
    }
}, {
    tableName: "account",
    timestamps: true,
    updatedAt: "updated",
    createdAt: "created",
});
AccountModel.initialize = async function () {
    try {
        // Checks database connection
        await sequelize.authenticate();

        // Synchronises the model (creates the table if it doesn't exist)
        await AccountModel.sync({alter: true, force: W.development});

        console.log('AccountModel synchronized successfully');
    } catch (error) {
        console.error('Unable to synchronize the AccountModel:', error);
        throw error;
    }
};

module.exports = AccountModel;
const {DataTypes} = require("sequelize")
const path = require('path');
const paths = require('../../config/paths');
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));

const { sequelize } = require(path.join(paths.MDL_DIR, 'odbc'));

const SubscriptionModel = sequelize.define('Subscription', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: "Subscription"
    },
    guid: {
        type: DataTypes.INTEGER,
        unique: {
            name: 'UNIQUE-Subscription-GUID',
            msg: 'The GUID of Subscription must be unique'
        },
        allowNull: false,
        comment: 'GUID'
    },
    token: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: {
            name: 'UNIQUE-Subscription-TOKEN',
            msg: 'The TOKEN of Subscription must be unique'
        },
        comment: 'TOKEN of subscription'
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Duration of Subscription'
    },
    formula: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'formula',
            key: 'id',
        },
        comment: 'The Formula of Subscription must be foreign key references of table formula'
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Amount of Subscription'
    },
    account: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: `${G.tablePrefix}_account`,
            key: 'id',
        },
        comment: 'The Account of Subscription must be foreign key references of table account'
    },
    date_start: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Date of subscription was created'
    },
    date_end: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Date of subscription was finished'
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Active subscription of Company'
    },
    is_grantedAccess: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Granted access to Subscription for the Company'
    }
}, {
    tableName: "subscription",
    timestamps: true,
    updatedAt: "updated",
    createdAt: "created",
});
SubscriptionModel.initialize = async function () {
    try {
        // Checks database connection
        await sequelize.authenticate();

        // Synchronises the model (creates the table if it doesn't exist)
        await SubscriptionModel.sync({alter: true, force: G.development});

        console.log('SubscriptionModel synchronized successfully');
    } catch (error) {
        console.error('Unable to synchronize the SubscriptionModel:', error);
        throw error;
    }
};

module.exports = SubscriptionModel;
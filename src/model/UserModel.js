const {DataTypes} = require("sequelize")
const path = require('path');
const paths = require('../../config/paths');
const G = require(path.join(paths.TOOL_DIR, 'Glossary'));

const { sequelize } = require(path.join(paths.MDL_DIR, 'odbc'));

const UserModel = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: "User"
    },
    guid: {
        type: DataTypes.INTEGER,
        unique: {
            name: 'UNIQUE-User-GUID',
            msg: 'The GUID of User must be unique'
        },
        allowNull: false,
        comment: 'GUID'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'User full Name'
    },
    profil: {
        type: DataTypes.INTEGER,
        references: {
            model: 'profil',
            key: 'id'
        },
        allowNull: false,
        comment: "The profil of User must be foreign key references of table profil"
    },
    account: {
        type: DataTypes.INTEGER,
        references: {
            model: 'account',
            key: 'id'
        },
        allowNull: false,
        comment: "The Account of User must be foreign key references of table account"
    },
    mobile: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: {
            name: 'UNIQUE-Mobile',
            msg: 'The Mobile number of user must be unique'
        },
        comment: "Mobile of user"
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            name: 'UNIQUE-Email',
            msg: 'The Email address must be unique'
        },
        comment: "Email of user"
    }
}, {
    tableName: "user",
    timestamps: true,
    createdAt: 'created',
    updatedAt: 'updated'
});
UserModel.initialize = async function () {
    try {
        // Checks database connection
        await sequelize.authenticate();

        // Synchronises the model (creates the table if it doesn't exist)
        await UserModel.sync({alter: true, force: G.development});

        console.log('UserModel synchronized successfully');
    } catch (error) {
        console.error('Unable to synchronize the UserModel:', error);
        throw error;
    }
};

module.exports = UserModel;

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('priceradb25', 'priceradmin', 'MonMotDePasseSecurise123!', {
    host: '192.168.100.103',
    dialect: 'postgres',
    port: 5432,
    timezone: '+01:00',
    dialectOptions: {
        timezone: 'Africa/Douala',
    },
    logging: false // Pour désactiver les logs SQL (optionnel)
});

// On a ici notre méthode `authenticate`
async function authenticate() {
    await sequelize.authenticate(); // Cette méthode vérifie la connexion à la base
}

module.exports = {
    sequelize,
    authenticate
};

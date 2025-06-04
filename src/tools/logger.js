// config/logger.js
const fs = require('fs');
const path = require('path');

// Crée un dossier 'logs' si non existant
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logFile = path.join(logDir, 'app.log');

function logError(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ERROR: ${message}\n`);
}

function logInfo(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] INFO: ${message}\n`);
}

module.exports = {
    logError,
    logInfo
};

class W{
    /**
     * Check error occurred and throw new error
     * @param occurred
     * @param message
     * @returns {Promise<void>}
     */
    static isOccur = async function (occurred, message) {
        if (occurred)
            throw new Error(message)
    };
}
module.exports = W;
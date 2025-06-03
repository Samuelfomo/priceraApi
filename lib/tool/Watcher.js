class Watcher {

    static development = true;

    static duplicate = "duplicate_data_detected";
    static errorSaved = "error_prevents_data_from_being_saved";
    static errorGuid = "no_entry_found_with_specified_guid";
    static errorDeleted = "error_prevent_data_from_being_removed";
    static errorMissingFields = "missing_required_fields";
    static errorDataVerification = "entry_verification_failed";


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

module.exports = Watcher;
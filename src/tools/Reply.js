class Reply {

    /**
     * Handle successful JSON response
     * @param {Response} res - The response object
     * @param {Object} structure - The structure of the response data
     * @param {int} resCode - The response code
     */
    static handleResponse(res, structure, resCode = 200) {
        res.status(resCode).json({
            status: true,
            response: structure
        });
    }


    /**
     *
     * @param res
     * @param errorMessage
     * @param errorCode
     * @param isResponse
     * @returns {*}
     */
    // static handleError(res, errorMessage, errorCode = 400, isResponse ) {
    //     return res.status(errorCode).json({
    //         status: false,
    //         isResponse ? {response: errorMessage}: {message: errorMessage}
    //     });
    // }
    static handleError(res, errorMessage, errorCode = 400, isResponse) {
        return res.status(errorCode).json({
            status: false,
            ...(isResponse ? { response: errorMessage } : { message: errorMessage })
        });
    }


    /**
     *
     * @param state
     * @param structure
     * @param res
     * @param resCode
     * @param isResponse
     * @returns {Promise<void>}
     */
    static async response(state, structure, res, resCode,isResponse = false) {
        if (state) {
            // Send successful response
            Reply.handleResponse(res, structure, resCode);
        } else {
            // Send error response
            Reply.handleError(res, structure, resCode, isResponse);
        }
    }
}

module.exports = Reply;
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..');
module.exports = {
    ROOT_DIR,
    LIB_DIR: path.join(ROOT_DIR, 'lib'),
    MDL_DIR: path.join(ROOT_DIR, 'lib/mdl'),
    CLASS_DIR: path.join(ROOT_DIR, 'lib/class'),
    TOOL_DIR: path.join(ROOT_DIR, 'lib/tool'),
    ROUTER: path.join(ROOT_DIR, 'route'),
    VALIDATE_ENTRY: path.join(ROOT_DIR, 'lib/shared/utils')
}
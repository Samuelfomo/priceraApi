const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..');
module.exports = {
    ROOT_DIR,
    LIB_DIR: path.join(ROOT_DIR, 'src'),
    MDL_DIR: path.join(ROOT_DIR, 'src/model'),
    CLASS_DIR: path.join(ROOT_DIR, 'src/class'),
    TOOL_DIR: path.join(ROOT_DIR, 'src/tools'),
    ROUTER: path.join(ROOT_DIR, 'routes'),
    VALIDATE_ENTRY: path.join(ROOT_DIR, 'src/shared/utils')
}
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(filePath) {
    if (filePath === undefined)
        return '';
    let filePathSplit = filePath.split('.');
    if (filePathSplit && filePathSplit.length > 1) {
        let extension = filePathSplit.pop();
        if (extension) {
            return extension.toLowerCase();
        }
    }
    return '';
}
exports.default = default_1;

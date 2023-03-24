"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const getOs_fn_1 = __importDefault(require("../../functions/getOs.fn"));
function default_1(inputString) {
    if ((0, getOs_fn_1.default)() === 'win32') {
        return inputString?.split('\\').slice(0, -1).join('\\') || '';
    }
    else {
        return inputString?.split('/').slice(0, -1).join('/') || '';
    }
}
exports.default = default_1;

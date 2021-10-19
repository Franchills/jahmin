"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEqualizerValues = exports.renameEqualizer = exports.getEqualizers = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const __1 = require("..");
const equalizerFile_service_1 = __importDefault(require("./equalizerFile.service"));
const eqFolderPath = path_1.default.join(__1.appDataPath(), 'eq');
function getEqualizers() {
    let equalizerFilePaths = fs_1.default.readdirSync(eqFolderPath);
    let equalizers = [];
    if (!fs_1.default.existsSync(eqFolderPath)) {
        fs_1.default.mkdirSync(eqFolderPath);
        fs_1.default.writeFileSync(path_1.default.join(eqFolderPath, 'default.txt'), equalizerFile_service_1.default.stringify(defaultEqualizer));
    }
    equalizerFilePaths.forEach(filePath => {
        if (filePath !== '.DS_Store') {
            let equalizerObject = equalizerFile_service_1.default.parse(fs_1.default.readFileSync(path_1.default.join(eqFolderPath, filePath), { encoding: 'utf8' }));
            equalizerObject.filePath = filePath;
            equalizers.push(equalizerObject);
        }
    });
    if (equalizers.length === 0) {
        equalizers.push(defaultEqualizer);
    }
    return equalizers;
}
exports.getEqualizers = getEqualizers;
function renameEqualizer(eqId, newName) {
    let equalizers = getEqualizers();
    let foundEq = equalizers.find(x => x.id === eqId);
    if (foundEq) {
        foundEq.name = newName;
        try {
            fs_1.default.writeFileSync(path_1.default.join(eqFolderPath, foundEq.filePath), equalizerFile_service_1.default.stringify(foundEq));
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.renameEqualizer = renameEqualizer;
function updateEqualizerValues(eqId, newValues) {
    let equalizers = getEqualizers();
    let foundEq = equalizers.find(x => x.id === eqId);
    if (foundEq) {
        foundEq.values = newValues;
        try {
            fs_1.default.writeFileSync(path_1.default.join(eqFolderPath, foundEq.filePath), equalizerFile_service_1.default.stringify(foundEq));
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.updateEqualizerValues = updateEqualizerValues;
let defaultEqualizer = {
    id: 'default',
    name: 'Default',
    values: [
        { frequency: 32, gain: 0 },
        { frequency: 64, gain: 0 },
        { frequency: 128, gain: 0 },
        { frequency: 256, gain: 0 },
        { frequency: 512, gain: 0 },
        { frequency: 1024, gain: 0 },
        { frequency: 2048, gain: 0 },
        { frequency: 4096, gain: 0 },
        { frequency: 8192, gain: 0 },
        { frequency: 16384, gain: 0 }
    ]
};

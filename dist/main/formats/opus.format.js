"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpusTags = exports.writeOpusTags = void 0;
const fs = __importStar(require("fs"));
const stringHash = require('string-hash');
const generateId_fn_1 = __importDefault(require("../functions/generateId.fn"));
const truncToDecimalPoint_fn_1 = __importDefault(require("../functions/truncToDecimalPoint.fn"));
const workers_service_1 = require("../services/workers.service");
/********************** Write Opus Tags **********************/
let ffmpegDeferredPromise = undefined;
let ffmpegDeferredPromiseId;
let ffmpegWorker;
(0, workers_service_1.getWorker)('ffmpeg').then(worker => {
    ffmpegWorker = worker;
    ffmpegWorker.on('message', (response) => __awaiter(void 0, void 0, void 0, function* () {
        if (response.id === ffmpegDeferredPromiseId) {
            // TODO Add Size matching check just in case
            if (fs.existsSync(response.tempFileName)) {
                fs.unlinkSync(response.filePath);
                fs.renameSync(response.tempFileName, response.filePath);
            }
            ffmpegDeferredPromise(response.status);
        }
    }));
});
function writeOpusTags(filePath, newTags) {
    return new Promise((resolve, reject) => {
        ffmpegDeferredPromise = resolve;
        ffmpegDeferredPromiseId = (0, generateId_fn_1.default)();
        let ffmpegString = objectToFfmpegString(newTags);
        let tempFileName = filePath.replace(/(\.opus)$/, '.temp.opus');
        let command = `-i "${filePath}" -y -map_metadata 0:s:a:0 -codec copy ${ffmpegString} "${tempFileName}"`;
        ffmpegWorker === null || ffmpegWorker === void 0 ? void 0 : ffmpegWorker.postMessage({ id: ffmpegDeferredPromiseId, filePath, tempFileName, command });
    });
}
exports.writeOpusTags = writeOpusTags;
/********************** Get Opus Tags **********************/
let mmWorker;
(0, workers_service_1.getWorker)('musicMetadata').then(worker => {
    mmWorker = worker;
    mmWorker.on('message', data => {
        if (mmDeferredPromises.has(data.filePath)) {
            mmDeferredPromises.get(data.filePath)(data.metadata);
            mmDeferredPromises.delete(data.filePath);
        }
    });
});
let mmDeferredPromises = new Map();
function getOpusTags(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (!fs.existsSync(filePath)) {
                return reject('File not found');
            }
            const METADATA = yield new Promise((resolve, reject) => {
                mmDeferredPromises.set(filePath, resolve);
                mmWorker === null || mmWorker === void 0 ? void 0 : mmWorker.postMessage(filePath);
            });
            let tags = {
                ID: stringHash(filePath),
                Extension: 'opus',
                SourceFile: filePath
            };
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    return reject(err);
                }
                if (stats) {
                    let nativeTags = mergeNatives(METADATA.native);
                    let dateParsed = getDate(String(nativeTags.DATE));
                    tags.Album = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.ALBUM) || null;
                    tags.AlbumArtist = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.ALBUMARTIST) || null;
                    tags.Artist = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.ARTIST) || null;
                    tags.Comment = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.DESCRIPTION) || (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.COMMENT) || null;
                    tags.Composer = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.COMPOSER) || null;
                    tags.Date_Year = dateParsed.year || null;
                    tags.Date_Month = dateParsed.month || null;
                    tags.Date_Day = dateParsed.day || null;
                    tags.DiscNumber = Number(nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.DISCNUMBER) || null;
                    tags.Genre = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.GENRE) || null;
                    tags.Rating = Number(nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.RATING) || null;
                    tags.Title = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.TITLE) || null;
                    tags.Track = Number(nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.TRACKNUMBER) || null;
                    tags.BitRate = METADATA.format.bitrate / 1000 || null;
                    tags.Duration = (0, truncToDecimalPoint_fn_1.default)(METADATA.format.duration, 3) || null;
                    tags.LastModified = stats.mtimeMs;
                    tags.SampleRate = METADATA.format.sampleRate || null;
                    tags.Size = stats.size;
                    resolve(tags);
                }
            });
        }));
    });
}
exports.getOpusTags = getOpusTags;
function mergeNatives(native) {
    let finalObject = {};
    for (let key in native) {
        for (let value in native[key]) {
            if (finalObject[native[key][value]['id']]) {
                finalObject[native[key][value]['id']] = finalObject[native[key][value]['id']] + '//' + native[key][value]['value'];
            }
            else {
                finalObject[native[key][value]['id']] = native[key][value]['value'];
            }
        }
    }
    return finalObject;
}
function getDate(dateString) {
    let splitDate = [];
    if (!dateString) {
        return {
            year: undefined,
            month: undefined,
            day: undefined
        };
    }
    // For - Separator
    if (dateString.includes('-')) {
        splitDate = dateString.split('-');
        // For / Separator
    }
    else if (dateString.includes('/')) {
        splitDate = dateString.split('/');
        // For *space* Separator
    }
    else if (dateString.includes(' ')) {
        splitDate = dateString.split(' ');
        // For . Separator
    }
    else if (dateString.includes('.')) {
        splitDate = dateString.split('.');
        // For : Separator
    }
    else if (dateString.includes(':')) {
        splitDate = dateString.split(':');
    }
    if (splitDate.length > 1) {
        return {
            year: Number(splitDate[0]),
            month: Number(splitDate[1]) || undefined,
            day: Number(splitDate[2]) || undefined
        };
    }
    else {
        return {
            year: Number(dateString),
            month: undefined,
            day: undefined
        };
    }
}
function objectToFfmpegString(newTags) {
    let finalString = '';
    // if (newTags.DiscNumber) renameObjectKey(newTags, 'DiscNumber', 'disc')
    // if (newTags.AlbumArtist) renameObjectKey(newTags, 'AlbumArtist', 'Album_Artist')
    if (newTags.Date_Year || newTags.Date_Month || newTags.Date_Day) {
        newTags.Date = `${newTags.Date_Year || '0000'}/${newTags.Date_Month || '00'}/${newTags.Date_Day || '00'}`;
        delete newTags.Date_Year;
        delete newTags.Date_Month;
        delete newTags.Date_Day;
    }
    for (let key in newTags) {
        finalString += ` -metadata "${key}=${newTags[key]}" `;
    }
    return finalString;
}

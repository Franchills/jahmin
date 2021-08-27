"use strict";
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlacTags = exports.writeFlacTags = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const string_hash_1 = __importDefault(require("string-hash"));
const trash_1 = __importDefault(require("trash"));
const generateId_fn_1 = __importDefault(require("../../svelte/src/functions/generateId.fn"));
const renameObjectKey_fn_1 = require("../functions/renameObjectKey.fn");
const worker_service_1 = require("../services/worker.service");
let ffmpegPath = path_1.default.join(process.cwd(), '/electron-app/binaries/ffmpeg');
const mm = require('music-metadata');
/********************** Write Flac Tags **********************/
let ffmpegDeferredPromise = undefined;
let ffmpegDeferredPromiseId;
const ffmpegWorker = (_a = worker_service_1.getWorker('ffmpeg')) === null || _a === void 0 ? void 0 : _a.on('message', (response) => __awaiter(void 0, void 0, void 0, function* () {
    if (response.id === ffmpegDeferredPromiseId) {
        yield trash_1.default(response.filePath);
        fs_1.default.renameSync(response.tempFileName, response.filePath);
        ffmpegDeferredPromise(response.status);
    }
}));
function writeFlacTags(filePath, newTags) {
    return new Promise((resolve, reject) => {
        ffmpegDeferredPromise = resolve;
        ffmpegDeferredPromiseId = generateId_fn_1.default();
        let ffmpegString = objectToFfmpegString(newTags);
        let tempFileName = filePath.replace(/(\.flac)$/, '.temp.flac');
        let command = `"${ffmpegPath}" -i "${filePath}"  -map 0 -y -codec copy ${ffmpegString} "${tempFileName}"`;
        ffmpegWorker === null || ffmpegWorker === void 0 ? void 0 : ffmpegWorker.postMessage({ id: ffmpegDeferredPromiseId, filePath, tempFileName, command });
    });
}
exports.writeFlacTags = writeFlacTags;
/* export function writeFlacTags(filePath: string, newTags: any) {
    return new Promise((resolve, reject) => {

        resolve('')

        // let ffmpegMetatagString = objectToFfmpegString(newTags)
        // let templFileName = filePath.replace(/(\.flac)$/, '.temp.flac')

        // exec(
        // 	`"${ffmpegPath}" -i "${filePath}"  -map 0 -y -codec copy ${ffmpegMetatagString} "${templFileName}" && mv "${templFileName}" "${filePath}"`,
        // 	(error, stdout, stderr) => {}
        // ).on('close', () => {
        // 	resolve('Done')
        // })
    })
} */
/********************** Get Flac Tags **********************/
let worker = worker_service_1.getWorker('musicMetadata');
let deferredPromise = new Map();
worker === null || worker === void 0 ? void 0 : worker.on('message', (data) => {
    if (deferredPromise.has(data.filePath)) {
        deferredPromise.get(data.filePath)(data.metadata);
        deferredPromise.delete(data.filePath);
    }
});
function getFlacTags(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const METADATA = yield new Promise((resolve, reject) => {
                deferredPromise.set(filePath, resolve);
                worker === null || worker === void 0 ? void 0 : worker.postMessage(filePath);
            });
            let tags = {
                ID: string_hash_1.default(filePath),
                Extension: 'flac',
                SourceFile: filePath
            };
            const STATS = fs_1.default.statSync(filePath);
            let nativeTags = mergeNatives(METADATA.native);
            let dateParsed = getDate(String(nativeTags.DATE));
            tags.Album = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.ALBUM) || '';
            tags.AlbumArtist = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.ALBUMARTIST) || '';
            tags.Artist = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.ARTIST) || '';
            tags.Comment = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.DESCRIPTION) || (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.COMMENT) || '';
            tags.Composer = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.COMPOSER) || '';
            tags.Date_Year = dateParsed.year || 0;
            tags.Date_Month = dateParsed.month || 0;
            tags.Date_Day = dateParsed.day || 0;
            tags.DiscNumber = Number(nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.DISCNUMBER) || 0;
            tags.Genre = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.GENRE) || '';
            tags.Rating = Number(nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.RATING) || 0;
            tags.Title = (nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.TITLE) || '';
            tags.Track = Number(nativeTags === null || nativeTags === void 0 ? void 0 : nativeTags.TRACKNUMBER) || 0;
            tags.BitDepth = METADATA.format.bitsPerSample;
            tags.BitRate = METADATA.format.bitrate / 1000;
            tags.Duration = Math.trunc(METADATA.format.duration);
            tags.LastModified = STATS.mtimeMs;
            tags.SampleRate = METADATA.format.sampleRate;
            tags.Size = STATS.size;
            resolve(tags);
        }));
    });
}
exports.getFlacTags = getFlacTags;
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
    if (newTags.DiscNumber)
        renameObjectKey_fn_1.renameObjectKey(newTags, 'DiscNumber', 'disc');
    if (newTags.AlbumArtist)
        renameObjectKey_fn_1.renameObjectKey(newTags, 'AlbumArtist', 'Album_Artist');
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

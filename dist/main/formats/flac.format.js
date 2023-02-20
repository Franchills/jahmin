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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlacTags = exports.writeFlacTags = void 0;
const fs = __importStar(require("fs"));
const stringHash = require('string-hash');
const generateId_fn_1 = __importDefault(require("../functions/generateId.fn"));
const renameObjectKey_fn_1 = require("../functions/renameObjectKey.fn");
const truncToDecimalPoint_fn_1 = __importDefault(require("../functions/truncToDecimalPoint.fn"));
const workers_service_1 = require("../services/workers.service");
// const mm = require('music-metadata')
/********************** Write Flac Tags **********************/
let ffmpegDeferredPromise = undefined;
let ffmpegDeferredPromiseId;
let ffmpegWorker;
(0, workers_service_1.getWorker)('ffmpeg').then(worker => {
    ffmpegWorker = worker;
    ffmpegWorker.on('message', async (response) => {
        if (response.id === ffmpegDeferredPromiseId) {
            if (fs.existsSync(response.tempFileName)) {
                fs.unlinkSync(response.filePath);
                fs.renameSync(response.tempFileName, response.filePath);
            }
            ffmpegDeferredPromise(response.status);
        }
    });
});
function writeFlacTags(filePath, newTags) {
    return new Promise((resolve, reject) => {
        ffmpegDeferredPromise = resolve;
        ffmpegDeferredPromiseId = (0, generateId_fn_1.default)();
        let ffmpegString = objectToFfmpegString(newTags);
        let tempFileName = filePath.replace(/(\.flac)$/, '.temp.flac');
        let command = `-i "${filePath}"  -map 0 -y -codec copy ${ffmpegString} "${tempFileName}"`;
        ffmpegWorker?.postMessage({ id: ffmpegDeferredPromiseId, filePath, tempFileName, command });
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
let mmWorker;
(0, workers_service_1.getWorker)('musicMetadata').then(worker => {
    mmWorker = worker;
    mmWorker.on('message', data => {
        if (deferredPromise.has(data.filePath)) {
            deferredPromise.get(data.filePath)(data.metadata);
            deferredPromise.delete(data.filePath);
        }
    });
});
let deferredPromise = new Map();
async function getFlacTags(filePath) {
    return new Promise(async (resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return reject('File not found');
        }
        const METADATA = await new Promise((resolve, reject) => {
            deferredPromise.set(filePath, resolve);
            mmWorker?.postMessage(filePath);
        });
        let tags = {
            ID: stringHash(filePath),
            Extension: 'flac',
            SourceFile: filePath
        };
        const STATS = fs.statSync(filePath);
        let nativeTags = mergeNatives(METADATA.native);
        let dateParsed = getDate(String(nativeTags.DATE));
        tags.Album = nativeTags?.ALBUM || null;
        tags.AlbumArtist = nativeTags?.ALBUMARTIST || null;
        tags.Artist = nativeTags?.ARTIST || null;
        tags.Comment = nativeTags?.DESCRIPTION || nativeTags?.COMMENT || null;
        tags.Composer = nativeTags?.COMPOSER || null;
        tags.Date_Year = dateParsed.year || null;
        tags.Date_Month = dateParsed.month || null;
        tags.Date_Day = dateParsed.day || null;
        tags.DiscNumber = Number(nativeTags?.DISCNUMBER) || null;
        tags.Genre = nativeTags?.GENRE || null;
        tags.Rating = Number(nativeTags?.RATING) || null;
        tags.Title = nativeTags?.TITLE || null;
        tags.Track = Number(nativeTags?.TRACKNUMBER) || null;
        tags.BitDepth = METADATA.format.bitsPerSample || null;
        tags.BitRate = METADATA.format.bitrate / 1000 || null;
        tags.Duration = (0, truncToDecimalPoint_fn_1.default)(METADATA.format.duration, 3) || null;
        tags.LastModified = STATS.mtimeMs;
        tags.SampleRate = METADATA.format.sampleRate || null;
        tags.Size = STATS.size;
        resolve(tags);
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
        (0, renameObjectKey_fn_1.renameObjectKey)(newTags, 'DiscNumber', 'disc');
    if (newTags.AlbumArtist)
        (0, renameObjectKey_fn_1.renameObjectKey)(newTags, 'AlbumArtist', 'Album_Artist');
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

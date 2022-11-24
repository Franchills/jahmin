"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const hashString_fn_1 = __importDefault(require("../functions/hashString.fn"));
worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.on('message', (data) => {
    let { userSongs, dbSongs } = data;
    let dbSongsId = dbSongs.map(song => (0, hashString_fn_1.default)(song.SourceFile, 'number'));
    userSongs.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    let songsToAdd = userSongs.filter(songPath => !dbSongsId.includes((0, hashString_fn_1.default)(songPath, 'number')));
    worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage({
        type: 'songsToAdd',
        songs: songsToAdd
    });
    let songsToDelete = dbSongs.filter(song => !userSongs.includes(song.SourceFile)).map(song => song.ID);
    worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage({
        type: 'songsToDelete',
        songs: songsToDelete
    });
});
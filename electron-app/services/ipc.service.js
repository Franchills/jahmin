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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadIPC = void 0;
const electron_1 = require("electron");
const config_service_1 = require("./config.service");
const loki_service_1 = require("./loki.service");
const songFilter_service_1 = require("./songFilter.service");
const albumArt_service_1 = require("./albumArt.service");
const getAlbumColors_fn_1 = require("./getAlbumColors.fn");
const nanoid_1 = require("nanoid");
// import { getTotalChangesToProcess, getTotalProcessedChanged } from './folderWatcher.service'
const hashString_fn_1 = require("../functions/hashString.fn");
const groupSong_fn_1 = require("../functions/groupSong.fn");
const folderWatcher_service_1 = require("./folderWatcher.service");
const peaks_1 = require("./peaks");
const nanoid = nanoid_1.customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-', 20);
function loadIPC() {
    electron_1.ipcMain.handle('get-order', (evt, arg) => __awaiter(this, void 0, void 0, function* () {
        let config = config_service_1.getConfig();
        let grouping = config['order']['grouping'] || [];
        let filtering = config['order']['filtering'] || [];
        let result = songFilter_service_1.orderSongs(arg, grouping, filtering);
        result = result.map((value) => ({
            id: nanoid(),
            value
        }));
        return result;
    }));
    electron_1.ipcMain.handle('get-config', (evt, arg) => __awaiter(this, void 0, void 0, function* () {
        let config = config_service_1.getConfig();
        return config;
    }));
    electron_1.ipcMain.handle('save-peaks', (evt, sourceFile, peaks) => __awaiter(this, void 0, void 0, function* () {
        peaks_1.savePeaks(sourceFile, peaks);
        return '';
    }));
    electron_1.ipcMain.handle('get-peaks', (evt, sourceFile) => __awaiter(this, void 0, void 0, function* () {
        return yield peaks_1.getPeaks(sourceFile);
    }));
    electron_1.ipcMain.handle('get-grouping', (evt, valueToGroupBy) => __awaiter(this, void 0, void 0, function* () {
        return groupSong_fn_1.groupSongs(valueToGroupBy);
    }));
    electron_1.ipcMain.handle('save-config', (evt, newConfig) => {
        return config_service_1.saveConfig(newConfig);
    });
    electron_1.ipcMain.handle('open-config', () => {
        console.log('Open Config File');
        // shell.showItemInFolder(configFilePath)
        return;
    });
    electron_1.ipcMain.handle('get-albums', (evt, groupBy, groupByValue) => __awaiter(this, void 0, void 0, function* () {
        let docs = loki_service_1.getCollectionMap();
        let groupedSongs = [];
        docs.forEach((doc) => {
            doc.Songs.forEach((song) => {
                if (song[groupBy] === groupByValue) {
                    let rootDir = song.SourceFile.split('/').slice(0, -1).join('/');
                    let foundAlbum = groupedSongs.find((i) => i['RootDir'] === rootDir);
                    if (!foundAlbum) {
                        groupedSongs.push({
                            ID: hashString_fn_1.hash(rootDir),
                            RootDir: rootDir,
                            AlbumArtist: song.AlbumArtist,
                            Name: song.Album
                        });
                    }
                }
            });
        });
        return groupedSongs;
    }));
    electron_1.ipcMain.handle('get-album', (evt, albumID) => {
        return loki_service_1.getCollectionMap().get(albumID);
    });
    electron_1.ipcMain.handle('get-cover', (evt, rootDir) => __awaiter(this, void 0, void 0, function* () {
        return yield albumArt_service_1.getAlbumCover(rootDir);
    }));
    electron_1.ipcMain.handle('get-album-colors', (evt, imageId) => __awaiter(this, void 0, void 0, function* () {
        return yield getAlbumColors_fn_1.getAlbumColors(imageId);
    }));
    electron_1.ipcMain.handle('sync-db-version', (evt, value) => __awaiter(this, void 0, void 0, function* () {
        return yield loki_service_1.getNewPromiseDbVersion(value);
    }));
    electron_1.ipcMain.handle('get-changes-progress', (evt) => __awaiter(this, void 0, void 0, function* () {
        return {
            total: folderWatcher_service_1.getMaxTaskQueueLength(),
            current: folderWatcher_service_1.getTaskQueueLength()
        };
    }));
}
exports.loadIPC = loadIPC;

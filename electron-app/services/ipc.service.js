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
// import { nanoid } from 'nanoid'
const albumFiltering_service_1 = require("./albumFiltering.service");
const albumArt_service_1 = require("./albumArt.service");
const getAlbumColors_fn_1 = require("./getAlbumColors.fn");
const nanoid_1 = require("nanoid");
const getWaveform_fn_1 = require("../functions/getWaveform.fn");
const folderWatcher_service_1 = require("./folderWatcher.service");
const nanoid = nanoid_1.customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-', 20);
function loadIPC() {
    electron_1.ipcMain.handle('get-songs', (evt, arg) => __awaiter(this, void 0, void 0, function* () {
        // let index = await createFilesIndex(collectionName)
        // scanFolders(collectionName,['/Volumes/Maxtor/Music'])
        // return index
        let docs = loki_service_1.getCollection();
        return docs;
    }));
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
    electron_1.ipcMain.handle('save-config', (evt, newConfig) => {
        return config_service_1.saveConfig(newConfig);
    });
    electron_1.ipcMain.handle('open-config', () => {
        console.log('Open Config File');
        // shell.showItemInFolder(configFilePath)
        return;
    });
    electron_1.ipcMain.handle('get-albums', () => __awaiter(this, void 0, void 0, function* () {
        // Waits for the filtering to be done then return the result.
        return yield albumFiltering_service_1.getNewPromiseAlbumArray();
    }));
    electron_1.ipcMain.handle('get-album', (evt, albumID) => {
        let albums = albumFiltering_service_1.getAlbumArray().filter((x) => x['ID'] === albumID);
        return albums[0];
    });
    electron_1.ipcMain.handle('get-cover', (evt, rootDir) => __awaiter(this, void 0, void 0, function* () {
        return yield albumArt_service_1.getAlbumCover(rootDir);
    }));
    electron_1.ipcMain.handle('get-album-colors', (evt, imageId) => __awaiter(this, void 0, void 0, function* () {
        return yield getAlbumColors_fn_1.getAlbumColors(imageId);
    }));
    electron_1.ipcMain.handle('get-database-version', (evt) => __awaiter(this, void 0, void 0, function* () {
        let version = loki_service_1.getDbVersion();
        return version;
    }));
    electron_1.ipcMain.handle('sync-db-version', (evt, value) => __awaiter(this, void 0, void 0, function* () {
        return yield loki_service_1.getNewPromiseDbVersion(value);
    }));
    electron_1.ipcMain.handle('get-waveform', (evt, path) => __awaiter(this, void 0, void 0, function* () {
        return yield getWaveform_fn_1.getWaveform(path);
    }));
    electron_1.ipcMain.handle('get-changes-progress', (evt) => __awaiter(this, void 0, void 0, function* () {
        return {
            total: folderWatcher_service_1.getTotalChangesToProcess(),
            current: folderWatcher_service_1.getTotalProcessedChanged()
        };
    }));
}
exports.loadIPC = loadIPC;

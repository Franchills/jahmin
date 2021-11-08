"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchFolders = exports.getTaskQueueLength = exports.getMaxTaskQueueLength = exports.maxTaskQueueLength = exports.reloadAlbumData = exports.getRootDirFolderWatcher = void 0;
const chokidar_1 = require("chokidar");
const os_1 = require("os");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const worker_service_1 = require("./worker.service");
const __1 = require("..");
const storage_service_1 = require("./storage.service");
const opus_format_1 = require("../formats/opus.format");
const mp3_format_1 = require("../formats/mp3.format");
const flac_format_1 = require("../formats/flac.format");
const aac_format_1 = require("../formats/aac.format");
const fileExistsWithCaseSync_fn_1 = __importDefault(require("../functions/fileExistsWithCaseSync.fn"));
const TOTAL_CPUS = os_1.cpus().length;
let watcher;
const EXTENSIONS = ['flac', 'm4a', 'mp3', 'opus'];
function getRootDirFolderWatcher() {
    return watcher;
}
exports.getRootDirFolderWatcher = getRootDirFolderWatcher;
// export let taskQueue: any[] = []
let isQueueRunning = false;
let storageWorker = worker_service_1.getWorker('storage');
let taskQueue = [];
// Splits excecution based on the amount of cpus.
function processQueue() {
    // Creates an array with the length from cpus amount and map it to true.
    let processesRunning = Array.from(Array(TOTAL_CPUS >= 3 ? 2 : 1).keys()).map(() => true);
    // For each process, get a task.
    processesRunning.forEach((process, processIndex) => getTask(processIndex));
    // Shifts a task from array and gets the tags.
    function getTask(processIndex) {
        let task = taskQueue.shift();
        // This part goes to Storage Worker TS
        if (task !== undefined && ['insert', 'update'].includes(task.type)) {
            getTags(task).then(tags => {
                storageWorker === null || storageWorker === void 0 ? void 0 : storageWorker.postMessage({
                    type: task.type,
                    data: tags,
                    appDataPath: __1.appDataPath()
                });
                getTask(processIndex);
            });
        }
        else if (task !== undefined && ['delete'].includes(task.type)) {
            storageWorker === null || storageWorker === void 0 ? void 0 : storageWorker.postMessage({
                type: task.type,
                data: task.path,
                appDataPath: __1.appDataPath()
            });
            getTask(processIndex);
        }
        else {
            // If no task left then sets its own process as false.
            processesRunning[processIndex] = false;
            // And if the other process is also set to false (so both of them are done), sets isQueueRuning to false so the queue can eventually run again.
            if (processesRunning.every(process => process === false)) {
                isQueueRunning = false;
            }
        }
    }
}
function reloadAlbumData(albumId) {
    //IMPORTANT Fix issue when deleting songs? Or when updating
    // Trashed Some Songs -> Renumbered -> Renamed = Song list only had 2 songs
    let album = storage_service_1.getStorageMap().get(albumId);
    let rootDir = album === null || album === void 0 ? void 0 : album.RootDir;
    if (rootDir === undefined)
        return;
    if (fileExistsWithCaseSync_fn_1.default(rootDir) === false) {
        storageWorker === null || storageWorker === void 0 ? void 0 : storageWorker.postMessage({
            type: 'deleteFolder',
            data: rootDir,
            appDataPath: __1.appDataPath()
        });
        return;
    }
    // Gets all song in folder.
    let rootDirSongs = fs_1.default
        .readdirSync(rootDir)
        .filter(file => isAudioFile(file))
        .map(file => path_1.default.join(rootDir || '', file));
    // Filters all song present in DB but NOT in folder in another array.
    let songToRemove = album === null || album === void 0 ? void 0 : album.Songs.filter(song => !(rootDirSongs === null || rootDirSongs === void 0 ? void 0 : rootDirSongs.includes(song.SourceFile)));
    if (songToRemove && (songToRemove === null || songToRemove === void 0 ? void 0 : songToRemove.length) > 0) {
        songToRemove.forEach(song => {
            storageWorker === null || storageWorker === void 0 ? void 0 : storageWorker.postMessage({
                type: 'delete',
                data: song.SourceFile,
                appDataPath: __1.appDataPath()
            });
        });
    }
    // Check changes between local songs and DB song by comparing last modified time.
    rootDirSongs.forEach(songPath => {
        let dbSong = album === null || album === void 0 ? void 0 : album.Songs.find(song => song.SourceFile === songPath);
        // If song found in db and local song modified time is bigger than db song.
        if (dbSong && fs_1.default.statSync(dbSong === null || dbSong === void 0 ? void 0 : dbSong.SourceFile).mtimeMs > (dbSong === null || dbSong === void 0 ? void 0 : dbSong.LastModified)) {
            getTags({ path: dbSong.SourceFile }).then(tags => {
                storageWorker === null || storageWorker === void 0 ? void 0 : storageWorker.postMessage({
                    type: 'update',
                    data: tags,
                    appDataPath: __1.appDataPath()
                });
            });
        }
    });
}
exports.reloadAlbumData = reloadAlbumData;
function getTags(task) {
    return new Promise((resolve, reject) => {
        let extension = task.path.split('.').pop().toLowerCase();
        if (extension === 'opus') {
            opus_format_1.getOpusTags(task.path).then(tags => resolve(tags));
        }
        else if (extension === 'mp3') {
            mp3_format_1.getMp3Tags(task.path).then(tags => resolve(tags));
        }
        else if (extension === 'flac') {
            flac_format_1.getFlacTags(task.path).then(tags => resolve(tags));
        }
        else if (extension === 'm4a') {
            aac_format_1.getAacTags(task.path).then(tags => resolve(tags));
        }
        else {
            resolve('');
        }
    });
}
let songsFound = [];
exports.maxTaskQueueLength = 0;
function getMaxTaskQueueLength() {
    return exports.maxTaskQueueLength;
}
exports.getMaxTaskQueueLength = getMaxTaskQueueLength;
function getTaskQueueLength() {
    return taskQueue.length;
}
exports.getTaskQueueLength = getTaskQueueLength;
let audioFolders = [];
function watchFolders(rootDirectories) {
    watcher = chokidar_1.watch(rootDirectories, {
        awaitWriteFinish: true,
        ignored: '**/*.DS_Store'
    });
    watcher.on('addDir', (path) => {
        fs_1.default.readdir(path, (err, files) => {
            if (err) {
                return;
            }
            else {
                if (files.find(file => isAudioFile(file))) {
                    audioFolders.unshift(path);
                }
            }
        });
    });
    watcher.on('ready', () => {
        console.log('Done');
        console.log(audioFolders.length);
        // console.log(audioFolders[0],fs.statSync(audioFolders[0]).mtimeMs)
        /*audioFolders.forEach(folder => {
            console.log(folder, fs.statSync(folder).mtimeMs)
        }) */
        /*
            /Volumes/Maxtor/Music/Alternative/Life is Strange;1623421251000\n
            /Volumes/Maxtor/Music/Alternative/Low Roar - Bones;1635965930000\n
        */
    });
    /*

    watcher.on('add', (path) => {
        // For every file found, check if is a available audio format and add to list.
        if (isAudioFile(path)) {
            songsFound.push(path)
        }
    })

    watcher.on('change', (path) => {
        if (isAudioFile(path)) {
            addToTaskQueue(path, 'update')
        }
    })

    watcher.on('unlink', (path) => {
        if (isAudioFile(path)) {
            addToTaskQueue(path, 'delete')
        }
    })

    watcher.on('all', (event, path) => {
        console.log(event, path)
    })

    watcher.on('ready', () => {
        // When watcher is done getting files, any new files added afterwards are detected here.
        watcher.on('add', (path) => {
            if (isAudioFile(path)) {
                addToTaskQueue(path, 'insert')
            }
        })

        filterNewSongs()
    })

    */
}
exports.watchFolders = watchFolders;
function filterNewSongs() {
    return new Promise((resolve, reject) => {
        let worker = worker_service_1.getWorker('songFilter');
        let collection = storage_service_1.getStorageMapToArray().map(song => song.SourceFile);
        worker.on('message', (data) => {
            data.forEach(songPath => process.nextTick(() => addToTaskQueue(songPath, 'insert')));
            worker_service_1.killWorker('songFilter');
            resolve(null);
        });
        worker.postMessage({
            dbSongs: collection,
            foundSongs: songsFound
        });
    });
}
function addToTaskQueue(path, type) {
    taskQueue.push({
        type,
        path
    });
    if (isQueueRunning === false) {
        isQueueRunning = true;
        processQueue();
    }
}
function isAudioFile(path) {
    return EXTENSIONS.includes(path.split('.').pop() || '');
}

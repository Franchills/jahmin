"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const aac_format_1 = require("../formats/aac.format");
const flac_format_1 = require("../formats/flac.format");
const mp3_format_1 = require("../formats/mp3.format");
let songToEditQueue = [];
let isQueueuIterating = false;
worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.on('message', (tagsToEditAndSourceFile) => {
    songToEditQueue.push(tagsToEditAndSourceFile);
    if (!isQueueuIterating) {
        isQueueuIterating = true;
        iterateQueue();
    }
});
function iterateQueue() {
    let file = songToEditQueue.shift();
    if (file) {
        let extension = file.sourceFile.split('.').pop();
        if (extension === 'm4a') {
            aac_format_1.writeAacTags(file.sourceFile, file.newTags)
                .then(() => iterateQueue())
                .catch((err) => {
                //IMPORTANT Do something if err
                iterateQueue();
            });
        }
        else if (extension === 'flac') {
            flac_format_1.writeFlacTags(file.sourceFile, file.newTags).then(() => iterateQueue());
        }
        else if (extension === 'mp3') {
            mp3_format_1.writeMp3Tags(file.sourceFile, file.newTags).then(() => iterateQueue());
        }
    }
    else {
        isQueueuIterating = false;
    }
}

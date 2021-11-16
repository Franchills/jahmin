"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderSongs = void 0;
const albumFiltering_service_1 = require("./albumFiltering.service");
const storage_service_1 = require("./storage.service");
// import { getCollection } from './loki.service.bak'
function orderSongs(index, grouping, filtering) {
    // Retrieves the songs from DB.
    let songs = (0, storage_service_1.getStorageMapToArray)();
    // Array returned at the end of the whole process of filtering.
    let tempArray = [];
    // Array to be filtered again and again.
    let filteredArray = [];
    // Iterates through from 0 to the component index to filter or group upwards.
    for (let i = 0; i <= index; i++) {
        // If no songs were filtered just use the array with all the songs.
        if (filteredArray.length === 0) {
            filteredArray = songs;
        }
        // If i === index means that it should be grouping since user selection does not matter now.
        if (i === index) {
            // <<<<< Grouping >>>>>
            if (index === grouping.length - 1) {
                // Filters one last time to remove the last chosen filter, otherwise, the array would countain ALL the songs with the last selected filter for the album grouping. Only if a last grouping was selected.
                if (filtering[i] !== null) {
                    let lastFilter = filteredArray.filter((song) => song[grouping[i]] === filtering[i]);
                    (0, albumFiltering_service_1.setAlbumArray)(lastFilter);
                }
                else {
                    (0, albumFiltering_service_1.setAlbumArray)(filteredArray);
                }
            }
            filteredArray.forEach((song) => {
                // Group by i or index since they match it should be grouped.
                // i === index -> 4 === 4 -> Group by Album Artist since it is the last grouping array element.
                let valueToGroupBy = song[grouping[i]];
                if (['', undefined, null, 'undefined', 'null'].includes(valueToGroupBy)) {
                    valueToGroupBy = 'Unknown';
                }
                // Prevents data repetition / Grouping by logic.
                if (!tempArray.includes(valueToGroupBy)) {
                    tempArray.push(valueToGroupBy);
                }
            });
        }
        else {
            // <<<<< Filtering >>>>>
            let groupBy = grouping[i];
            let filterBy = filtering[i];
            filteredArray = filteredArray.filter((song) => {
                // If one of the filters is not defined or null, add the songs the the list anyway.
                if (['null', null].includes(filterBy)) {
                    return true;
                }
                else if (['Unknown'].includes(filterBy)) {
                    return ['Unknown', '', undefined, 'undefined'].includes(song[groupBy]);
                }
                else if (song[groupBy]) {
                    return song[groupBy] === filterBy;
                }
            });
        }
    }
    tempArray = tempArray.sort((a, b) => String(a).localeCompare(String(b)));
    return tempArray;
}
exports.orderSongs = orderSongs;

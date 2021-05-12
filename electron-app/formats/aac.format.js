"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAacTags = exports.writeAacTags = void 0;
const exiftool_vendored_1 = require("exiftool-vendored");
const exiftool = new exiftool_vendored_1.ExifTool({ taskTimeoutMillis: 5000 });
const fs_1 = __importDefault(require("fs"));
const string_hash_1 = __importDefault(require("string-hash"));
function writeAacTags(filePath, newTags) {
    return new Promise((resolve, reject) => {
        newTags = normalizeNewTags(newTags);
        resolve('');
    });
    /*
    exiftool.write(filePath, {
        Album: 'New Album',
        AlbumArtist: 'New Album Artist',
        Artist: 'New Artist',
        Composer: 'New Composer',
        ContentCreateDate: new Date('2020').toISOString(),
        DiskNumber: 6,
        Genre: 'New Genre',
        Title: 'New Title',
        TrackNumber: 258,
        RatingPercent: 95,
        Comment: 'New Comment'
    })
    */
}
exports.writeAacTags = writeAacTags;
function getAacTags(filePath) {
    return new Promise((resolve, reject) => {
        exiftool.read(filePath).then((tags) => {
            fs_1.default.stat(filePath, (err, fileStats) => {
                // let fileStats = fs.statSync(filePath)
                //@ts-expect-error
                let dateParsed = getDate(String(tags.ContentCreateDate));
                resolve({
                    ID: string_hash_1.default(filePath),
                    //@ts-expect-error
                    Album: tags['Album'] || '',
                    //@ts-expect-error
                    AlbumArtist: tags['AlbumArtist'] || '',
                    Artist: tags['Artist'] || '',
                    //@ts-expect-error
                    Composer: tags['Composer'] || '',
                    // Date: tags['ContentCreateDate'],
                    //@ts-expect-error
                    Genre: tags['Genre'] || '',
                    //@ts-expect-error
                    DiscNumber: tags['DiskNumber'] || null,
                    Title: tags['Title'] || '',
                    //@ts-expect-error
                    Track: getTrack(tags['TrackNumber'], tags['Track']) || 0,
                    Rating: tags['RatingPercent'] || 0,
                    Date_Year: dateParsed['year'] || null,
                    Date_Month: dateParsed['month'] || null,
                    Date_Day: dateParsed['day'] || null,
                    Comment: tags['Comment'] || '',
                    SourceFile: tags['SourceFile'] || '',
                    Extension: tags['FileTypeExtension'],
                    Size: fileStats.size,
                    Duration: tags['Duration'],
                    SampleRate: tags['AudioSampleRate'],
                    LastModified: fileStats.mtimeMs,
                    BitRate: getBitRate(tags['AvgBitrate']),
                    BitDepth: tags['AudioBitsPerSample']
                });
            });
        });
    });
}
exports.getAacTags = getAacTags;
function normalizeNewTags(newTags) {
    let stringObject = JSON.stringify(newTags);
    if (newTags.DiscNumber) {
        stringObject = stringObject.split('DiscNumber').join('DiskNumber');
    }
    if (newTags.Track) {
        stringObject = stringObject.split('Track').join('TrackNumber');
    }
    if (newTags.Rating) {
        stringObject = stringObject.split('Rating').join('RatingPercent');
    }
    newTags = JSON.parse(stringObject);
    if (newTags.Date_Year || newTags.Date_Month || newTags.Date_Day) {
        let date = new Date(new Date().setFullYear(newTags.Date_Year, newTags.Date_Month - 1, newTags.Date_Day)).toISOString();
        console.log(date);
    }
    console.log(newTags);
    /*
    exiftool.write(filePath, {
        ContentCreateDate: new Date('2020').toISOString(),
        DiskNumber: 6,
        TrackNumber: 258,
        RatingPercent: 95,
    })
        Album: 'new album',
        AlbumArtist: 'new album artist',
        Comment: 'new comment',
        Composer: 'new composer',
        Artist: 'new artisr',
        Date_Day: '1',
        Date_Month: '1',
        Date_Year: '1999',
        DiscNumber: '7',
        Genre: 'new genre',
        Rating: 30,
        Title: 'new title',
        Track: '6'
    */
    return newTags;
}
function getBitRate(bitRate) {
    if (bitRate) {
        return Number(bitRate.replace(/\D/g, ''));
    }
    else {
        return undefined;
    }
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
    if (dateString.includes('T')) {
        dateString = dateString.split('T')[0];
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
function getTrack(...trackValues) {
    let numberedTrackFound = trackValues.find((i) => typeof i === 'number');
    if (numberedTrackFound) {
        return numberedTrackFound;
    }
    for (let value of trackValues) {
        if (typeof value === 'string') {
            let splitTrack = Number(value.split(' ')[0]);
            if (!isNaN(splitTrack)) {
                return splitTrack;
            }
        }
    }
}

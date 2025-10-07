
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const configPath = path.join(__dirname, 'spreadsheets.json');
if (!fs.existsSync(configPath)) {
    console.error('Please configure spreadsheets.json (check README for further information).');
    process.exit(1); 
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const APIKEY = config.APIKEY;
const SPREADSHEETS = config.SPREADSHEETS;

const PORT = 80;
let GLOBAL_musicData = {};

//start server
app.use(express.static(__dirname));
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    instantiateGlobalMusicData();
});

//handles requests from clients to get access to the list of music
app.get('/api/music', (req, res) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    res.json(GLOBAL_musicData);
});

//handles requests from clients to refresh the music list with the latest version
app.get('/api/refresh-music', async (req, res) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    try {
        const newData = await fetchAllMusicData();
        res.json({ success: true, GLOBAL_musicData: newData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch data' });
    }
});

// instantiates the music
// runs once on setup
// if it finds a local file already stored, it takes that, otherwise uses google api to grab the music from the spreadsheet
async function instantiateGlobalMusicData() {
    for (const sheet of SPREADSHEETS) {
        const data = getLocalMusicFile(sheet.shorthand);
        if (data) {
            GLOBAL_musicData[sheet.name] = data;
        } else {
            const fetched = await googleAPIFetchMusicData(sheet);
            GLOBAL_musicData[sheet.name] = fetched;
        }
    }
}

//request a fresh version of all the music in all the spreadsheet via google api
async function fetchAllMusicData() {
    const allData = {};
    for (const sheet of SPREADSHEETS) {
        const data = await googleAPIFetchMusicData(sheet);
        allData[sheet.name] = data;
    }
    GLOBAL_musicData = allData;
    return allData;
}

function getLocalMusicFile(shorthand) {
    try {
        const filename = shorthand + "MusicData.json";
        const filePath = path.join(__dirname, "data", filename);
        const data = fs.readFileSync(filePath, 'utf-8');
        console.log(`Loaded ${shorthand} locally`);
        return JSON.parse(data);
    } catch (err) {
        console.warn(`No local file found for ${shorthand}`);
        return null;
    }
}

async function googleAPIFetchMusicData(sheet) {

    var transformedData = [];

    try {
        for (const tabName of sheet.spreadsheet.tabs) {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheet.id}/values/${tabName}?key=${APIKEY}`);
            const jsonData = await response.json();
            transformedData.push(transformMusicData(jsonData));
        }

        var mergedData = mergeMusicJsonList(transformedData);

        var musicFilePath = path.join(__dirname, "data", sheet.shorthand+"MusicData.json");
        saveJsonToFile(JSON.stringify(mergedData, null, 2), musicFilePath);

        console.log(sheet.name," Updated with Google API");

        return mergedData;

    } catch (error) {
        console.error('Error fetching or merging music data:', error);
        return null;
    }
}

//takes as input a list of multiple jsons, and merges them together into 1 json
function mergeMusicJsonList(jsonList) {
    const merged = {};

    for (const json of jsonList) {
        for (const type in json) {
            if (!merged[type]) merged[type] = {};

            for (const subtype in json[type]) {
                if (!merged[type][subtype]) merged[type][subtype] = {};

                for (const category in json[type][subtype]) {
                    if (!merged[type][subtype][category]) merged[type][subtype][category] = [];

                    const items = json[type][subtype][category];
                    merged[type][subtype][category].push(...(Array.isArray(items) ? items : [items]));
                }
            }
        }
    }

    return merged;
}


function saveJsonToFile(data, fileName) {
    let filePath;

    if (path.isAbsolute(fileName)) {
        filePath = fileName;
    } else {
        filePath = path.join(__dirname, fileName);
    }

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFile(filePath, data, 'utf8', (err) => {
        if (err) {
            console.error('Error saving JSON file:', err);
        } else {
            console.log(`Saved JSON file: ${filePath}`);
        }
    });
}

// takes a list of json items and turns them into a structured json
function transformMusicData(json) {
    var rows = json["values"];

    if (!rows || rows.length < 2) return {};
    var data = {};

    for (let i = 1; i < rows.length; i++) {
        var row = rows[i];
        var [event, author, song, music, act, type, subtype] = row;

        if (!act || act.length === 0) {
            act = "0";
        }

        if (!type || type.length === 0) {
            type = "none";
        }

        if (event || music) {
            data[act] ??= {};
            data[act][type] ??= {};
            data[act][type][subtype] ??= [];

            data[act][type][subtype].push({
                event: event || "",
                // author: author || "",
                // song: song || "",
                music: music || "",
            });
        }

    }
    return data;
}

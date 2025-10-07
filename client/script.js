var musicData = null;
var allPlayers = [];

const COLORS = [
    "#FF6B6B",      //orange
    "#FFE66D",      //yellow
    "#4472CA",      //blue
    "#4ECDC4",      //cyan
    "#e90c0cff",    //red  
    "#a6eb13ff",    //green
    "#a36206ff",    //brown
    "#748f50ff",    //olive
    "#6A0572",      //burgundy
    "#F72585",      //pink
    "#7208ebff",    //purple
    "#7e1414ff"     //maroon
  ];
  

// on load fetches music from server and draws main menu
fetch('/api/music')
  .then(res => res.json())
  .then(data => {
    musicData = safeParse(data);
    drawMainMenu();
  });


function drawMainMenu() {
    const mainMenu = document.getElementById('main-menu');
    const actView = document.getElementById('act-view');

    clearViews();

    document.title = "RPMP";

    mainMenu.style.display = 'block';
    actView.style.display = 'none';

    if (!musicData) return;

    // Loop through each spreadsheet in musicData
    Object.entries(musicData).forEach(([sheetName, sheetData]) => {
        // Create a container div for this spreadsheet
        const sheetDiv = document.createElement('div');
        sheetDiv.classList.add('sheet-container');

        // Spreadsheet title
        const title = document.createElement('h2');
        title.textContent = sheetName;
        sheetDiv.appendChild(title);

        // Create buttons for acts in this spreadsheet
        Object.entries(sheetData)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([act, events]) => {
                const btn = document.createElement('button');
                btn.textContent = act;
                btn.classList.add('act-button');
                btn.addEventListener('click', () => drawAct(act, sheetName));
                sheetDiv.appendChild(btn);
            });

        // Append this spreadsheet section to the main menu
        mainMenu.appendChild(sheetDiv);
    });

    drawRefreshButton();
}


function clearViews(){
    var mainMenu = document.getElementById('main-menu');
    var actView = document.getElementById('act-view');
    mainMenu.innerHTML = '';
    actView.innerHTML = '';
}

function drawRefreshButton(){
    var mainMenu = document.getElementById('main-menu');
    var refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh Data';
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';

        try {
            const res = await fetch('/api/refresh-music');
            const data = await res.json();
            if (data.success) {
                musicData = data.musicData;
                console.log('Updated musicData:', musicData);
                drawMainMenu();
            } else {
                alert('Failed to refresh music data');
            }
        } catch (err) {
            console.error(err);
            alert('Error fetching new music data');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'Refresh Data';
        }
    });
    mainMenu.appendChild(refreshBtn);
}

function drawAct(actName, sheetName) {
    console.log(actName, sheetName);
    var mainMenu = document.getElementById('main-menu');
    var actView = document.getElementById('act-view');

    clearViews();

    allPlayers = [];
    document.title = actName;

    mainMenu.style.display = 'none';
    actView.style.display = 'block';

    var flexcontainer = document.createElement('div');
    flexcontainer.className = 'flex-container';
    if (musicData[sheetName].length == 1){
        flexcontainer.style.gridTemplateColumns = '1fr';
    } else {
        flexcontainer.style.gridTemplateColumns = '1fr 1fr';
    }
    
    actView.appendChild(flexcontainer);

    var shuffledColors = deterministicShuffle(COLORS, actName);

    var playersCounter = 0;
    var actCounter = 0;

    Object.entries(musicData[sheetName][actName]).forEach(([type, subtypes]) => {
        var typeDiv = document.createElement('div');
        typeDiv.classList.add('type-divider');
        var table = document.createElement('table');
        table.id = 'events-table-' + type;

        var thead = document.createElement('thead');
        var headerRow = document.createElement('tr');
        [type, "Subtype", 'Music'].forEach(text => {
            const th = document.createElement('th');
            th.style.backgroundColor = shuffledColors[actCounter];
            th.textContent = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        table.appendChild(tbody);

        typeDiv.appendChild(table);
        flexcontainer.appendChild(typeDiv);

        var counterStart = playersCounter;

        Object.entries(subtypes).forEach(([subtypeName, items]) => {
            items.forEach((item, index) => {
                var row = document.createElement('tr');

                row.addEventListener("contextmenu", (e) => {
                    e.preventDefault(); 
                    row.style.backgroundColor = "";
                    row.style.color = "";
                    row.classList.toggle("marked");
                });

                row.addEventListener("click", () => {
                    const player = row.querySelector("iframe, audio, video");

                    if (player) {
                        // YouTube
                        if (player.tagName === "IFRAME" && player.id && typeof YT !== "undefined" && YT.get) {
                            const ytPlayer = YT.get(player.id);
                            if (ytPlayer && ytPlayer.getPlayerState) {
                                const state = ytPlayer.getPlayerState();
                                if (state === YT.PlayerState.PLAYING) {
                                    ytPlayer.pauseVideo();
                                } else {
                                    ytPlayer.playVideo();
                                }
                            }
                        }
                        // Google Drive → HTML5 audio/video
                        else if (player.tagName === "AUDIO" || player.tagName === "VIDEO") {
                            if (player.paused) {
                                player.play();
                            } else {
                                player.pause();
                            }
                        }
                    }
                });

                var eventCell = document.createElement('td');
                eventCell.textContent = item.event;

                var subEventCell = document.createElement('td');
                subEventCell.textContent = subtypeName;

                var musicCell = document.createElement('td');
                var playerDiv = document.createElement('div');
                playerDiv.id = `player-${playersCounter}`;
                
                playersCounter++;

                musicCell.className = 'music-cell';
                musicCell.appendChild(playerDiv);

                row.append(eventCell, subEventCell, musicCell);
                tbody.appendChild(row);

                if (item.music.includes("youtube")) {
                    musicCell.classList.add('youtube');
                    row.classList.add('youtube-row');
                    makeYoutubeCell(item, playerDiv.id, item.event);
                } else if (item.music.includes("drive.google")) {
                    musicCell.classList.add('google-drive');
                    playerDiv.classList.add('google-drive-player');
                    row.classList.add('google-drive-row');
                    var fileId = getDriveFileId(item.music);
                    makeGoogleDrivePlayer(playerDiv.id, fileId);
                }
            });
        });

        var addedPlayers = playersCounter - counterStart + 1;
        typeDiv.style.gridRow = 'span '+addedPlayers;
        if (addedPlayers > 30) {
            typeDiv.classList.add('small-divider');
        }

        actCounter++;
    });

    var backBtn = document.createElement('button');
    backBtn.id = 'back-btn';
    backBtn.textContent = 'Back to Menu';
    backBtn.onclick = drawMainMenu;
    flexcontainer.appendChild(backBtn);

    var pauseBtn = document.createElement("button");
    pauseBtn.textContent = "Pause All";
    pauseBtn.id = 'pause-btn';
    pauseBtn.onclick = pauseAllYoutubePlayers;
    flexcontainer.appendChild(pauseBtn);

}

function makeYoutubeCell(item, id, event){
    var url = new URL(item.music);
    var videoId = url.searchParams.get("v");

    const player = new YT.Player(id, {
        height: '315',
        width: '560',
        videoId: videoId,
        playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            iv_load_policy: 3,
            iv_load_policy: 3,
            cc_load_policy: 0,
            loop: 1,
            playlist: videoId,
            rel: 0,
        },
        events: {
      onReady: (event) => {
        event.target.pauseVideo();
      },
      onStateChange: (event) => {
        const tr = document.getElementById(id).closest("tr");

        if (!tr) return;

        const currentTime = player.getCurrentTime();

        if (event.data === YT.PlayerState.PLAYING) {
          tr.style.backgroundColor = "white";
          tr.style.color = "black";
        } else if (
          event.data === YT.PlayerState.PAUSED ||
          event.data === YT.PlayerState.ENDED
        ) {
            if (currentTime < 1){
                tr.style.backgroundColor = "transparent";
                tr.style.color = "white";
            } else {
                tr.style.backgroundColor = "purple";
                tr.style.color = "white";
            }

        }
      }
    }
  });

    allPlayers.push(player);
}

function pauseAllYoutubePlayers() {
  for (const p of allPlayers) {
    if (p && typeof p.getPlayerState === "function") {
      const state = p.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        p.pauseVideo();
        const tr = document.getElementById(p.getIframe().id).closest("tr");
        if (tr) {
            tr.style.backgroundColor = "purple";
            tr.style.color = "white";
        }
      }
    }
  }
}

function getDriveFileId(url) {
    const match = url.match(/\/d\/([^/]+)\//);
    return match ? match[1] : null;
}

function makeGoogleDrivePlayer(containerId, fileId) {
    const container = document.getElementById(containerId);

    const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;

    const iframe = document.createElement('iframe');
    iframe.src = previewUrl;
    iframe.width = "560"; 
    iframe.height = "80"; 
    iframe.allow = "autoplay";
    iframe.style.border = "1px solid #ccc";
    iframe.style.borderRadius = "8px";
    iframe.style.maxWidth = "100%";

    container.innerHTML = '';
    container.appendChild(iframe);
}

function safeParse(data) {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (err) {
            console.error('Failed to parse JSON:', err);
            return null;
        }
    } else if (typeof data === 'object' && data !== null) {
        return data;
    } else {
        console.warn('Unexpected data type:', typeof data);
        return null;
    }
}

// Simple DJB2 hash -> 32-bit unsigned
function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) + str.charCodeAt(i);
        h = h >>> 0;
    }
    return h >>> 0;
}

// Mulberry32 seeded PRNG (returns 0..1)
function mulberry32(seed) {
    let t = seed >>> 0;
    return function() {
        t += 0x6D2B79F5;
        t = t >>> 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

// Deterministic Fisher-Yates using the seeded RNG
function deterministicShuffle(array, seedString) {
    const arr = array.slice(); // copy
    const seed = djb2(seedString || "");
    const rand = mulberry32(seed);
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

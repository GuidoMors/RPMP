const socket = io();
var musicData = null;
var allPlayers = [];
var MY_MARKED_MUSIC = [];

socket.on('synchMarkedSongs', (markedSongs) => {
    MY_MARKED_MUSIC = markedSongs;
    clearMarkedSongs();
    markMarkedSongs();

    var currentSessionAct = sessionStorage.getItem("act");
    if (currentSessionAct == "playlist") {
        drawPlaylist();
    }
});

const COLORS = [
    "#FF6B6B",      //orange
    "#FFE66D",      //yellow
    "#4472CA",      //blue
    "#13867fff",    //cyan
    "#e90c0cff",    //red  
    "#75a805ff",    //green
    "#a36206ff",    //brown
    "#486422ff",    //olive
    "#6A0572",      //burgundy
    "#8d0d47ff",    //pink
    "#4e1392ff",    //purple
    "#7e1414ff"     //maroon
  ];
  

// on load fetches music from server and draws current state
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        fetch('/api/music')
            .then(res => res.json())
            .then(data => {
                musicData = safeParse(data);
                drawCurrentState();
            });
    }, 100);
});


function drawCurrentState() {
    var currentSessionAct = sessionStorage.getItem("act");
    var currentSheetName = sessionStorage.getItem("sheetName");

    if (!currentSessionAct || !currentSheetName || currentSessionAct == "main-menu"){
        drawMainMenu();
    } else if (currentSessionAct == "playlist") {
        drawPlaylist();
    }else {
        drawAct(currentSessionAct, currentSheetName);
    }
    
}

function drawMainMenu() {
    sessionStorage.setItem("act", "main-menu");
    const mainMenu = document.getElementById('main-menu');
    const actView = document.getElementById('act-view');

    clearViews();

    document.title = "RPMP";

    mainMenu.style.display = 'block';
    actView.style.display = 'none';

    if (!musicData) return;

    Object.entries(musicData).forEach(([sheetName, sheetData]) => {
        const sheetDiv = document.createElement('div');
        sheetDiv.classList.add('sheet-container');

        const title = document.createElement('h2');
        title.textContent = sheetName;
        sheetDiv.appendChild(title);

        Object.entries(sheetData)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([act, events]) => {
                const btn = document.createElement('button');
                btn.textContent = act;
                btn.classList.add('act-button');
                btn.addEventListener('click', () => drawAct(act, sheetName));
                sheetDiv.appendChild(btn);
            });

        mainMenu.appendChild(sheetDiv);
    });

    drawPlaylistButton();

    drawRefreshButton();
}

function clearViews(){
    var mainMenu = document.getElementById('main-menu');
    var actView = document.getElementById('act-view');
    mainMenu.innerHTML = '';
    actView.innerHTML = '';
}

function clearMarkedSongs(){
    document.querySelectorAll('tr').forEach(row => {
        row.classList.remove('marked');
    });
}

function markMarkedSongs(){
        MY_MARKED_MUSIC.forEach(([music, event]) => {
        const row = Array.from(document.querySelectorAll('tr')).find(
            r => r.dataset.music === music && r.dataset.event === event
        );
        if (row) row.classList.add('marked');
    });
}

function drawRefreshButton(){
    var mainMenu = document.getElementById('main-menu');
    var refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh Data';
    refreshBtn.className = 'refresh-btn';
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';

        try {
            const res = await fetch('/api/refresh-music');
            const data = await res.json();
            if (data.success) {
                musicData = data.musicData;
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

function drawPlaylistButton(){
    var mainMenu = document.getElementById('main-menu');
    var playlistButton = document.createElement('button');
    playlistButton.textContent = 'Your Playlist';
    playlistButton.className = 'playlist-btn';
    playlistButton.addEventListener('click', () => drawPlaylist());
    mainMenu.appendChild(playlistButton);
}

function drawAct(actName, sheetName) {

    sessionStorage.setItem("act", actName);
    sessionStorage.setItem("sheetName", sheetName);

    clearViews();

    var mainMenu = document.getElementById('main-menu');
    var actView = document.getElementById('act-view');

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
        
        var details = document.createElement('details');
        details.open = true;
        details.classList.add('category-details');
        flexcontainer.appendChild(details);

        var summary = document.createElement('summary');
        summary.classList.add('category-summary');
        details.appendChild(summary);
        
        var table = document.createElement('table');
        table.id = 'events-table-' + type;
        
        var thead = document.createElement('thead');
        thead.classList.add('category-thead');

        var headerRow = document.createElement('tr');
        
        const th = document.createElement('th');
        th.style.backgroundColor = shuffledColors[actCounter];
        th.textContent = type;
        headerRow.appendChild(th);

        thead.appendChild(headerRow);
        summary.appendChild(thead);

        var tbody = document.createElement('tbody');
        table.appendChild(tbody);

        details.appendChild(table);

        var counterStart = playersCounter;

        Object.entries(subtypes).forEach(([subtypeName, items]) => {
            items.forEach((item, index) => {
                var row = document.createElement('tr');

                row.dataset.music = item.music; 
                row.dataset.event = item.event;

                var isMarked = MY_MARKED_MUSIC.some(
                    pair => pair[0] === item.music && pair[1] === item.event
                );
                
                if (isMarked) {
                    row.classList.add("marked");
                } else {
                    row.classList.remove("marked");
                }

                row.addEventListener("contextmenu", (e) => {
                    e.preventDefault(); 
                    row.classList.remove('paused');
                    socket.emit('markSong', item.music, item.event);
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
                    makeYoutubeCell(item.music, playerDiv.id);
                } else if (item.music.includes("drive.google")) {
                    musicCell.classList.add('google-drive');
                    playerDiv.classList.add('google-drive-player');
                    row.classList.add('google-drive-row');
                    var fileId = getDriveFileId(item.music);
                    makeGoogleDrivePlayer(playerDiv.id, fileId);
                }

                var link = document.createElement('a');
                link.href = item.music;
                link.textContent = "Open music";
                link.target = "_blank";
                link.rel = "noopener noreferrer";

                musicCell.appendChild(link);
            });
        });

        var addedPlayers = playersCounter - counterStart + 1;
        details.style.gridRow = 'span '+addedPlayers;
        details.addEventListener('toggle', () => {
            if (details.open) {
                details.style.gridRow = 'span ' + addedPlayers; // expanded
            } else {
                details.style.gridRow = 'span 1'; // collapsed
            }
        });
        if (addedPlayers > 30) {
            details.classList.add('small-divider');
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

function drawPlaylist(){
    sessionStorage.setItem("act", "playlist");

    clearViews();

    var mainMenu = document.getElementById('main-menu');
    var actView = document.getElementById('act-view');

    allPlayers = [];
    document.title = "Playlist";

    mainMenu.style.display = 'none';
    actView.style.display = 'block';

    var flexcontainer = document.createElement('div');
    flexcontainer.className = 'flex-container';
    flexcontainer.style.gridTemplateColumns = '1fr';
    
    actView.appendChild(flexcontainer);
        
    var details = document.createElement('details');
    details.open = true;
    details.classList.add('category-details');
    flexcontainer.appendChild(details);

    var summary = document.createElement('summary');
    summary.classList.add('category-summary');
    details.appendChild(summary);
    
    var table = document.createElement('table');
    table.id = 'events-table-playlist';
    
    var thead = document.createElement('thead');
    thead.classList.add('category-thead');

    var headerRow = document.createElement('tr');
    
    const th = document.createElement('th');
    th.style.backgroundColor = COLORS[0];
    th.textContent = "Playlist";
    headerRow.appendChild(th);

    thead.appendChild(headerRow);
    summary.appendChild(thead);

    var tbody = document.createElement('tbody');
    table.appendChild(tbody);

    details.appendChild(table);

    var playersCounter = 0;

    Object.entries(MY_MARKED_MUSIC).forEach((items) => {
        items.forEach((item) => {

            var music = item[0];
            var event = item[1];

            if (!music || !event ) return;

            var row = document.createElement('tr');
            tbody.appendChild(row);

            playersCounter++;

            row.addEventListener("contextmenu", (e) => {
                e.preventDefault(); 
                row.classList.remove('paused');
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
            eventCell.textContent = event;

            var musicCell = document.createElement('td');
            var playerDiv = document.createElement('div');
            playerDiv.id = `player-${playersCounter}`;
            
            musicCell.className = 'music-cell';
            musicCell.appendChild(playerDiv);

            row.append(eventCell, musicCell);
            
            if (music.includes("youtube")) {
                musicCell.classList.add('youtube');
                row.classList.add('youtube-row');
                makeYoutubeCell(music, playerDiv.id);
            } else if (music.includes("drive.google")) {
                musicCell.classList.add('google-drive');
                playerDiv.classList.add('google-drive-player');
                row.classList.add('google-drive-row');
                var fileId = getDriveFileId(music);
                makeGoogleDrivePlayer(playerDiv.id, fileId);
            }

            var link = document.createElement('a');
            link.href = music;
            link.textContent = "Open music";
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            musicCell.appendChild(link);
            
        });
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

function makeYoutubeCell(musicLink, id){
    var url = new URL(musicLink);
    var videoId = url.searchParams.get("v");

    const player = new YT.Player(id, {
        height: '315',
        width: '560',
        videoId: videoId,
        playerVars: {
            host: "https://www.youtube-nocookie.com",
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            iv_load_policy: 3,
            cc_load_policy: 0,
            loop: 1,
            playlist: videoId,
            rel: 0,
            origin: window.location.origin
        },
        events: {
      onReady: (event) => {
        console.log("on ready:", id);
        event.target.pauseVideo();

        setTimeout(() => {
            validateYoutubePlayer(player, id);
        }, 1500);
      },
      onStateChange: (event) => {
        const tr = document.getElementById(id).closest("tr");

        if (!tr) return;

        const currentTime = player.getCurrentTime();

        if (event.data === YT.PlayerState.PLAYING) {
          tr.classList.add('playing');
          tr.classList.remove('paused');
        } else if (
          event.data === YT.PlayerState.PAUSED ||
          event.data === YT.PlayerState.ENDED
        ) {
            if (currentTime < 1){
                tr.classList.remove('playing');
                tr.classList.remove('paused');
            } else {
                tr.classList.add('paused');
                tr.classList.remove('playing');
            }
            }
        }
      }
    });

    allPlayers.push(player);

}

function validateYoutubePlayer(player, id) {
    try {
        const duration = player.getDuration();
        const state = player.getPlayerState();
        const data = player.getVideoData();
        
        const invalid =
            !duration ||
            duration === 0 ||
            state === -1 ||
            !data ||
            !data.video_id;

        console.log("duration:", duration);
        console.log("state:", state);
        console.log("data:", data);
        console.log("data.video_id:", data.video_id);
        console.log("invalid:", invalid);


        if (invalid) {
            hideYoutubePlayer(id);
        }

    } catch (e) {
        hideYoutubePlayer(id);
    }
}

function hideYoutubePlayer(id) {
    const container = document.getElementById(id);
    if (!container) return;

    const iframe = container.querySelector("iframe");
    if (iframe) iframe.style.display = "none";
    else container.style.display = "none";
}

function pauseAllYoutubePlayers() {
  for (const p of allPlayers) {
    if (p && typeof p.getPlayerState === "function") {
      const state = p.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        p.pauseVideo();
        const tr = document.getElementById(p.getIframe().id).closest("tr");
        if (tr) {
            tr.classList.add('paused');
            tr.classList.remove('playing');
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

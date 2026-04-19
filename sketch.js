// ============================================================
//  YOUR CREATURE  —  sketch.js   (spider edition)
//  MDDN242 Project 2
//
//  WEB NAVIGATION SYSTEM:
//  The spider moves along a graph of nodes (junctions) connected
//  by edges (silk threads). At each junction it picks the next
//  node based on its current mood.
//
//  TO USE YOUR OWN WEB IMAGE:
//  1. Place your web PNG (transparent bg) in the same folder
//     as this file, named  web.png
//  2. Set  USE_WEB_IMAGE = true  below
//  3. Adjust WEB_NODES x/y values (0–1 fractions of canvas size)
//     so they match the junction points in your image
// ============================================================

new p5(function(p) {

    // ============================================================
    //  SETTINGS
    // ============================================================

    const SHOW_UI       = true;
    const USE_WEB_IMAGE = false;   // set true once you have web.png

    let CREATURE_SIZE   = 120;
    let DECAY_RATE      = 0.003;
    let AWAY_RATE       = 0.020;
    let AFK_PER_HOUR    = 5;
    let AFK_MAX_HOURS   = 168;
    let CLICK_FEED      = 20;
    let MIC_THRESHOLD   = 0.15;
    let EXCITED_FRAMES  = 40;
    let BOUNCE_SCALE    = 1.0;
    let bgImg;
    let bgBehind;
    let focusLostAt = null;
    let focusAwayMinutes = 0;
    let raindrops = [];
    let rainActive = false;
let debris = [];
let debrisSpawnTimer = 0;



   let cloudImg;
   let cloudX = 0;
 let cloudY = 0;
    let cloudSpeed = 0.3;
    let cloudAlpha = 0;
    let cloudsActive = false;



    // Spider travel speed along edges (fraction of edge per frame)
    // Increase for faster movement, decrease for slower
   let BASE_SPEED = 0.006;
   let travelSpeed = BASE_SPEED;


    const BODY_COL = [255, 126, 0];
    const BLACK    = [0, 0, 0];
    const WHITE    = [255, 255, 255];

// ============================================================
//  WEATHER + TIME SYSTEM (Wellington, NZ)
// ============================================================

let weatherData = null;
let lastWeatherFetch = 0;

// Soft colour presets
const COL_SUNNY_DAY      = [150, 200, 255];   // soft light blue
const COL_CLOUDY_DAY     = [200, 200, 210];   // light grey
const COL_CLOUDY_LATE    = [140, 140, 150];   // darker grey
const COL_SUNSET         = [255, 150, 80];    // warm orange
const COL_NIGHT          = [10, 20, 40];      // deep navy blue

async function fetchWeather() {
    // Only refresh every 10 minutes
    if (Date.now() - lastWeatherFetch < 10 * 60 * 1000) return;

    lastWeatherFetch = Date.now();

    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=-41.2865&longitude=174.7762&current=temperature_2m,weather_code&timezone=Pacific/Auckland";

    try {
        const res = await fetch(url);
        weatherData = await res.json();
    } catch (e) {
        console.log("Weather fetch failed:", e);
    }
}

function getBackgroundColor() {
    if (!weatherData) return COL_SUNNY_DAY;

    const hour = new Date().getHours();
    const code = weatherData.current.weather_code;

    const isDay = hour >= 6 && hour < 18;
    const isSunset = hour >= 18 && hour < 20;

    // Weather codes (Open-Meteo)
    const sunnyCodes = [0, 1];
    const cloudyCodes = [2, 3];
    const rainCodes = [51, 61, 63, 80, 81];

    if (!isDay) return COL_NIGHT;
    if (isSunset) return COL_SUNSET;

    if (sunnyCodes.includes(code)) return COL_SUNNY_DAY;

    if (cloudyCodes.includes(code)) {
        // Late afternoon greys get darker
        if (hour >= 15) return COL_CLOUDY_LATE;
        return COL_CLOUDY_DAY;
    }

    if (rainCodes.includes(code)) {
        if (hour >= 15) return COL_CLOUDY_LATE;
        return COL_CLOUDY_DAY;
    }

    return COL_SUNNY_DAY;
}

    // ============================================================
    //  WEB GRAPH
    //
    //  Nodes: x, y as fractions of canvas (0.0–1.0)
    //  Edges: pairs of node IDs
    //
    //  This default graph matches a rough orb-web shape anchored
    //  to the top-right corner. Adjust node positions to match
    //  your own drawn web image.
    //
    //  Node layout (approximate screen positions):
    //
    //        0 (top-right anchor)
    //       /|\
    //      / | \
    //     1  2  3      ← inner ring
    //    /|\ | /|\
    //   4 5 6 7 8 9   ← mid ring
    //    \ \ | / /
    //     10 11 12    ← outer ring
    //        |
    //       13        ← bottom anchor
    // ============================================================

    const WEB_NODES = [
        // Hub / top-right anchor area
        { id:  0, x: 0.78, y: 0.04 },

        // Inner ring — 3 nodes close to hub
        { id:  1, x: 0.52, y: 0.18 },
        { id:  2, x: 0.72, y: 0.28 },
        { id:  3, x: 0.88, y: 0.22 },

        // Mid ring — 6 nodes
        { id:  4, x: 0.30, y: 0.32 },
        { id:  5, x: 0.48, y: 0.42 },
        { id:  6, x: 0.65, y: 0.50 },
        { id:  7, x: 0.80, y: 0.55 },
        { id:  8, x: 0.92, y: 0.40 },
        { id:  9, x: 0.96, y: 0.60 },

        // Outer ring — 4 nodes
        { id: 10, x: 0.18, y: 0.60 },
        { id: 11, x: 0.42, y: 0.72 },
        { id: 12, x: 0.68, y: 0.78 },
        { id: 13, x: 0.88, y: 0.82 },
    ];

    const WEB_EDGES = [
        // Hub to inner ring (radial spokes)
        [0, 1], [0, 2], [0, 3],

        // Inner ring connections (spiral)
        [1, 2], [2, 3],

        // Inner to mid (radial spokes)
        [1, 4], [1, 5],
        [2, 5], [2, 6],
        [3, 6], [3, 7], [3, 8],
        [8, 9],

        // Mid ring connections (spiral)
        [4, 5], [5, 6], [6, 7], [7, 8],

        // Mid to outer (radial spokes)
        [4, 10],
        [5, 11],
        [6, 11], [6, 12],
        [7, 12], [7, 13],
        [9, 13],

        // Outer ring connections (spiral)
        [10, 11], [11, 12], [12, 13],
    ];


    // ============================================================
    //  STATE MACHINE
    // ============================================================

    const STATES = {
        happy:      { bounceAmt: 0.04, shakeAmt: 0.0, alphaTarget: 255 },
        neutral:    { bounceAmt: 0.02, shakeAmt: 0.0, alphaTarget: 180 },
        distressed: { bounceAmt: 0.01, shakeAmt: 1.5, alphaTarget: 127 },
        excited:    { bounceAmt: 0.10, shakeAmt: 0.0, alphaTarget: 255 },
        calm:      { bounceAmt: 0.015, shakeAmt: 0.0, alphaTarget: 255 },
        untrusted: { bounceAmt: 0.015, shakeAmt: 0.3, alphaTarget: 160 },
        worried:   { bounceAmt: 0.06, shakeAmt: 0.5, alphaTarget: 200 },
        frustrated: { bounceAmt: 0.07, shakeAmt: 1.0, alphaTarget: 200 },


    };

    const STATE_DESCRIPTIONS = {
        happy:      'need is low — roaming freely',
        neutral:    'need is rising — avoiding backtrack',
        distressed: 'need is high — retreating to hub',
        excited:    'you brought food! — chasing mouse',
        calm:     'quiet company — slowing down, relaxed',
        worried: 'you’re gone — moving quickly, uneasy',
        untrusted: 'hasn’t seen you in a while — cautious, slow to relax',
        frustrated: 'too loud — irritated, waiting',

    };

function getState(c) {
    // If user is NOT watching → worried
    if (!c.isWatched) return 'worried';

  // Loud noise → frustrated
if (c.micLevel > MIC_THRESHOLD) return 'frustrated';

    // Calm only when trust is fully built
    if (c.trustLevel >= 1) return 'calm';

    // If trust is rising but not full → untrusted
    if (c.trustLevel > 0.2) return 'untrusted';

    // Existing emotional logic
    if (c.exciteTimer > 0) return 'excited';
    if (c.need <= 30)      return 'happy';
    if (c.need <= 70)      return 'neutral';
    return 'distressed';
}



    // ============================================================
    //  CREATURE FACTORY
    // ============================================================

    function createCreature() {
        // Start at the hub node (id 0)
        return {
            // Web navigation
            currentNode:  0,
            targetNode:   1,
            previousNode: -1,
            edgeT:        0,      // 0 = at currentNode, 1 = at targetNode
           freezeTimer: 0,
          returningHome: false,
          trustLevel: 0,          // 0 = no trust, 1 = fully calm
          trustBuildRate: 0.001,  // base rate (will be modified by AFK hours)
 
            // Position (pixels) — driven by edge travel
            x: 0, y: 0,

            // Need / state
            need:      50,
            state:     'neutral',
            bounceAmt: 0.02,
            bodyAlpha: 255,

            // Animation
            breathe:    0,
            bob:        0,
            exciteTimer: 0,
            orbitAngle:  0,

            // Misc
            hour:        new Date().getHours(),
            isWatched:   true,
            micLevel:    0,
            lastVisit:   null,
            totalVisits: 0,
        };
    }

    let creature;
    let webImg      = null;
    let micAnalyser = null;
    let micActive   = false;
    let micData     = null;
    let ui          = {};


    // ============================================================
    //  PRELOAD  (only runs if USE_WEB_IMAGE is true)
    // ============================================================

p.preload = function () {
    bgBehind = p.loadImage("bgbehind.png");
    bgImg = p.loadImage("background.png");
    };




    // ============================================================
    //  SETUP
    // ============================================================

    function isMobile() { return window.innerWidth <= 768; }

    function canvasSize() {
        if (isMobile()) return { w: window.innerWidth, h: window.innerHeight };
        return {
            w: SHOW_UI ? p.windowWidth - 360 : p.windowWidth - 40,
            h: p.windowHeight - 40,
        };
    }

p.setup = function () {
    let sz = canvasSize();
    let cnv = p.createCanvas(sz.w, sz.h);
    cnv.parent('canvas-container');

    cloudImg = p.loadImage("clouds1.png");   // ← FIXED

        creature = createCreature();
        loadState(creature);

        cloudX = p.width + 200;   // start fully off-screen right
        cloudY = p.random(20, p.height * 0.4);

        // Set initial pixel position from starting node
        let startNode = WEB_NODES[creature.currentNode];
        creature.x = startNode.x * p.width;
        creature.y = startNode.y * p.height;

        if (!SHOW_UI) document.querySelector('.sidebar').style.display = 'none';

        ui.hour    = document.getElementById('ui-hour');
        ui.period  = document.getElementById('ui-period');
        ui.state   = document.getElementById('ui-state');
        ui.desc    = document.getElementById('ui-desc');
        ui.needVal = document.getElementById('ui-need-val');
        ui.needBar = document.getElementById('ui-need-bar');
        ui.visits  = document.getElementById('ui-visits');
        ui.excited = document.getElementById('ui-excited');
        ui.watched = document.getElementById('ui-watched');
        ui.mic     = document.getElementById('ui-mic');
        ui.weather = document.getElementById('ui-weather');
        ui.day = document.getElementById('ui-day');
        ui.afk = document.getElementById('ui-afk');
        ui.away = document.getElementById('ui-away');


        window.addEventListener('focus', () => {
    creature.isWatched = true;
    focusLostAt = null; // reset timer
});

window.addEventListener('blur', () => {
    creature.isWatched = false;
    focusLostAt = Date.now(); // start timer
});

        setInterval(() => { saveState(creature); creature.hour = new Date().getHours(); }, 30000);
        window.addEventListener('beforeunload', () => saveState(creature));
    };

    function describeWeather(code) {
    const map = {
        0: "Clear sky",
        1: "Mostly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Foggy",
        51: "Light drizzle",
        53: "Drizzle",
        55: "Heavy drizzle",
        61: "Light rain",
        63: "Rain",
        65: "Heavy rain",
        80: "Light showers",
        81: "Showers",
        82: "Heavy showers",
    };
    return map[code] || "Unknown";
}


function spawnRain() {
    // Create 6–10 new drops per frame
    for (let i = 0; i < 8; i++) {
        raindrops.push({
            x: p.random(0, p.width),
            y: p.random(-20, 0),
            len: p.random(8, 14),
            speed: p.random(4, 8)
        });
    }
}
function drawRain() {
    p.stroke(255, 255, 255, 20); //change to make more or less transparent
    p.strokeWeight(1.2);

    for (let drop of raindrops) {
        p.line(drop.x, drop.y, drop.x, drop.y + drop.len);
        drop.y += drop.speed;
    }

    // Remove drops that fall off-screen
    raindrops = raindrops.filter(d => d.y < p.height + 20);
}



    // ============================================================
    //  DRAW LOOP
    // ============================================================

p.draw = function() {
    fetchWeather();

    let col = getBackgroundColor();
    let code = -1;
    let cloudy = false;

    if (weatherData && weatherData.current) {
        code = weatherData.current.weather_code;
        cloudy = (code !== 0 && code !== 1); 
        
    }

    let raining = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code);
    rainActive = raining;


    p.background(col[0], col[1], col[2]);

    if (bgBehind) {
        p.image(bgBehind, 0, 0, p.width, p.height);
    }

// --- Debris system ---
// Spawn debris every ~15 seconds
debrisSpawnTimer++;
if (debrisSpawnTimer > 900) {
    spawnDebris();
    debrisSpawnTimer = 0;
}

// Update + draw debris (falling or stuck)
updateDebris();



    p.tint(255, 200);
    p.image(bgImg, 0, 0, p.width, p.height);
    p.noTint();

    if (cloudy) {
        cloudsActive = true;
        cloudAlpha = p.lerp(cloudAlpha, 255, 0.02);
    } else {
        cloudAlpha = p.lerp(cloudAlpha, 0, 0.02);
        if (cloudAlpha < 1) cloudsActive = false;
    }

    if (cloudsActive && cloudImg) {
        cloudX -= cloudSpeed;
        if (cloudX < -p.width) {
            cloudX = p.width + 50;
            cloudY = p.random(20, p.height * 0.4);
        }
        p.tint(255, cloudAlpha);
        p.image(cloudImg, cloudX, cloudY, cloudImg.width * 1.2, cloudImg.height * 1.2);
        p.noTint();
    }

    // Rain effect
    if (rainActive) {
        spawnRain();
        drawRain();
    }

    // web + creature
    if (USE_WEB_IMAGE && webImg) {
        p.image(webImg, 0, 0, p.width, p.height);
    } else {
        drawProceduralWeb();
    }

    updateMic(creature);
    updateCreature(creature);
    drawCreature(creature);

    if (p.frameCount % 6 === 0) updateSidebar(creature);
};


    // ============================================================
    //  WEB NAVIGATION
    // ============================================================

    // Returns all node IDs connected to a given node
    function getNeighbours(nodeId) {
        let neighbours = [];
        for (let [a, b] of WEB_EDGES) {
            if (a === nodeId) neighbours.push(b);
            else if (b === nodeId) neighbours.push(a);
        }
        return neighbours;
    }

    // Pixel distance between two nodes
    function nodeDist(idA, idB) {
        let a = WEB_NODES[idA];
        let b = WEB_NODES[idB];
        return p.dist(a.x * p.width, a.y * p.height, b.x * p.width, b.y * p.height);
    }

    // Pixel distance from a node to the current mouse position
    function distToMouse(nodeId) {
        let n = WEB_NODES[nodeId];
        return p.dist(n.x * p.width, n.y * p.height, p.mouseX, p.mouseY);
    }

    // ── Mood-based next-node picker ───────────────────────────
    function pickNextNode(c) {
        let neighbours = getNeighbours(c.currentNode);
        if (neighbours.length === 0) return c.currentNode; // dead end, stay

        switch (c.state) {

            case 'happy':
                // Roam freely — any neighbour, but prefer not to backtrack
                let happyOpts = neighbours.filter(n => n !== c.previousNode);
                return p.random(happyOpts.length > 0 ? happyOpts : neighbours);

            case 'neutral':
                // Avoid backtracking — pick a random forward option
                let neutralOpts = neighbours.filter(n => n !== c.previousNode);
                return p.random(neutralOpts.length > 0 ? neutralOpts : neighbours);

            case 'distressed':
                // Retreat toward hub (node 0) — pick neighbour closest to node 0
                return neighbours.sort((a, b) => nodeDist(a, 0) - nodeDist(b, 0))[0];

            case 'excited':
                // Chase the mouse — move toward whichever neighbour is closest to mouse
                return neighbours.sort((a, b) => distToMouse(a) - distToMouse(b))[0];

            default:
                return p.random(neighbours);
        }
    }


    // ============================================================
    //  CREATURE LOGIC
    // ============================================================

    function updateCreature(c) {

// --- FREEZE BEHAVIOUR ---
if (c.freezeTimer > 0) {
    c.freezeTimer--;
    return; // stop all movement
}

// If user was away for an hour, spider must curl up at hub
if (c.awayTooLong) {
    c.returningHome = true;
}

if (c.isWatched && c.curled) {
    c.curled = false;
    c.awayTooLong = false;
}

// ── 'Need behaviour' ──────────────────────────────────────────
// ── Need behaviour with calm state ──────────────────────────
// Calm fulfilment only when fully calm
if (c.state === 'calm') {
    c.need = p.constrain(c.need - 0.02, 0, 100);
} else {
    let rate = c.isWatched ? DECAY_RATE : AWAY_RATE;
    c.need = p.constrain(c.need + rate, 0, 100);
}

// Build trust only when watched + quiet
if (c.isWatched && c.micLevel < 0.05) {
    c.trustLevel = Math.min(1, c.trustLevel + c.trustBuildRate);
} else {
    // Lose trust faster when user is gone
    let loss = c.isWatched ? 0.005 : 0.02;
    c.trustLevel = Math.max(0, c.trustLevel - loss);
}

// Debris frustration: if any debris is stuck, spider becomes frustrated
let debrisStuck = debris.some(d => d.stuck);
if (debrisStuck) {
    c.state = 'frustrated';
}


        // ── State & animation params ────────────────────────────
        c.state = getState(c);
        let s = STATES[c.state];
        c.bounceAmt = p.lerp(c.bounceAmt, s.bounceAmt * BOUNCE_SCALE, 0.08);
        c.bodyAlpha = p.lerp(c.bodyAlpha, s.alphaTarget, 0.05);

        // Emotion-based movement speed
if (c.state === 'worried' || c.state === 'frustrated') {
    travelSpeed = BASE_SPEED * 2.2;   // fast + sharp
} else if (c.state === 'calm') {
    travelSpeed = BASE_SPEED * 0.4;   // slow + relaxed
} else {
    travelSpeed = BASE_SPEED;
}


        c.breathe += 0.018;
        c.bob     += 0.012;

        if (c.exciteTimer > 0) c.exciteTimer--;

        // ── Travel along current edge ───────────────────────────
       c.edgeT += travelSpeed;


        if (c.edgeT >= 1.0) {
            // Arrived at target node — pick the next one
            c.previousNode = c.currentNode;
            c.currentNode  = c.targetNode;
            c.edgeT        = 0;
            if (c.returningHome) {
    // Move toward hub (node 0)
    let neighbours = getNeighbours(c.currentNode);
    c.targetNode = neighbours.sort((a, b) =>
        nodeDist(a, 0) - nodeDist(b, 0)
    )[0];

 if (c.currentNode === 0) {
    if (c.awayTooLong) {
        c.curled = true;     // NEW: curled state
        c.returningHome = false;
    } else {
        c.curled = false;
        c.returningHome = false;
    }
}
} else {
    c.targetNode = pickNextNode(c);
}

        }

        // Pixel position = lerp between current and target node
        let cur = WEB_NODES[c.currentNode];
        let tgt = WEB_NODES[c.targetNode];
        c.x = p.lerp(cur.x * p.width,  tgt.x * p.width,  c.edgeT);
        c.y = p.lerp(cur.y * p.height, tgt.y * p.height, c.edgeT);
    }


    // ============================================================
    //  PROCEDURAL WEB (shown when USE_WEB_IMAGE is false)
    //
    //  Draws the actual graph edges so you can see the routes
    //  the spider will travel. Nodes are shown as small dots.
    //  This makes it easy to tune node positions before you
    //  switch to your own image.
    // ============================================================

function drawProceduralWeb() {
    p.push();
    p.stroke(255, 255, 255, 20);
    p.noFill();

    // --- Draw radial spokes (hub → every node on outer ring) ---
    let hub = WEB_NODES[0];
    for (let n of WEB_NODES) {
        if (n.id === 0) continue;
        p.strokeWeight(1.2);
        p.line(
            hub.x * p.width, hub.y * p.height,
            n.x * p.width,   n.y * p.height
        );
    }

    // --- Draw spiral rings (smooth curves between nodes of similar distance) ---
    p.stroke(255, 255, 255, 60);
    p.strokeWeight(1);

    // Group nodes by approximate ring (distance from hub)
    let rings = {};
    for (let n of WEB_NODES) {
        let d = p.dist(
            hub.x, hub.y,
            n.x,   n.y
        );
        let bucket = Math.round(d * 6); // 6 rings
        if (!rings[bucket]) rings[bucket] = [];
        rings[bucket].push(n);
    }

    // Draw curved ring segments
    for (let r in rings) {
        let ring = rings[r];
        if (ring.length < 2) continue;

        p.beginShape();
        for (let n of ring) {
            p.curveVertex(n.x * p.width, n.y * p.height);
        }
        // close the loop
        let first = ring[0];
        p.curveVertex(first.x * p.width, first.y * p.height);
        p.endShape();
    }

    p.pop();
}

function spawnDebris() {
    debris.push({
        x: p.random(0, p.width),
        y: -20,
        size: p.random(6, 12),
        speed: p.random(1, 2),
        stuck: false,
        stuckNode: null
    });
}
function updateDebris() {
    for (let d of debris) {

        // If already stuck, just draw it
        if (d.stuck) {
            p.fill(255, 200);
            p.noStroke();
            p.circle(d.x, d.y, d.size);
            continue;
        }

        // Falling
        d.y += d.speed;

        // Check if it hits a web node
        for (let n of WEB_NODES) {
            let nx = n.x * p.width;
            let ny = n.y * p.height;
            if (p.dist(d.x, d.y, nx, ny) < 12) {
                d.stuck = true;
                d.stuckNode = n.id;
                d.x = nx;
                d.y = ny;
                break;
            }
        }

        // Draw falling debris
        p.fill(255, 200);
        p.noStroke();
        p.circle(d.x, d.y, d.size);
    }
}


    // ============================================================
    //  DRAWING
    // ============================================================

function drawCreature(c) {
    p.push();
    p.translate(c.x, c.y);
    p.translate(0, p.sin(c.bob) * 4);

    // Curl up if away too long
    if (c.curled) {
        p.scale(0.6);  
        c.bounceAmt = 0;
        c.bodyAlpha = 255;

        p.translate(
            p.random(-3, 3),
            p.random(-1.5, 1.5)
        );
    }

    let s = STATES[c.state];
    let bScale = 1 + p.sin(c.breathe) * c.bounceAmt;

    if (s.shakeAmt > 0) {
        p.translate(
            p.random(-s.shakeAmt, s.shakeAmt),
            p.random(-s.shakeAmt * 0.4, s.shakeAmt * 0.4)
        );
    }

    // Face direction of travel
    let cur = WEB_NODES[c.currentNode];
    let tgt = WEB_NODES[c.targetNode];
    let angle = Math.atan2(
        (tgt.y - cur.y) * p.height,
        (tgt.x - cur.x) * p.width
    );
    p.rotate(angle + p.HALF_PI);

    let sc = CREATURE_SIZE / 55.0 * bScale;
    p.scale(sc);

    drawSpider(c);
    p.pop();
}



    // ============================================================
    //  SPIDER DRAWING
    // ============================================================

    function drawSpider(c) {
        let alpha   = c.bodyAlpha;
        let legSway = p.sin(c.breathe * 1.3) * 2.5;
        drawLegs(alpha, legSway);
        drawPedipalps(c, alpha);
        drawBody(alpha);
        drawEyes(c, alpha);
    }

    function drawLegs(alpha, sway) {
        p.strokeWeight(1.5);
        p.noFill();
        let ls = sway, rs = -sway;
        drawLeg(-8, -8,   -16, -20+ls, -30, -22+ls, -32, -16+ls, alpha);
        drawLeg(-10, -2,  -20, -8+ls,  -34, -4+ls,  -38,  3+ls,  alpha);
        drawLeg(-10,  4,  -18, 10+ls,  -30, 18+ls,  -34, 26+ls,  alpha);
        drawLeg(-8,  10,  -14, 20+ls,  -20, 30+ls,  -20, 38+ls,  alpha);
        drawLeg( 8, -8,    16, -20+rs,  30, -22+rs,  32, -16+rs, alpha);
        drawLeg(10, -2,    20, -8+rs,   34, -4+rs,   38,  3+rs,  alpha);
        drawLeg(10,  4,    18, 10+rs,   30, 18+rs,   34, 26+rs,  alpha);
        drawLeg( 8, 10,    14, 20+rs,   20, 30+rs,   20, 38+rs,  alpha);
    }

    function drawLeg(x0, y0, cx1, cy1, cx2, cy2, x3, y3, alpha) {
        p.stroke(...BLACK, alpha);
        p.beginShape();
        p.vertex(x0, y0);
        p.bezierVertex(cx1, cy1, cx2, cy2, x3, y3);
        p.endShape();
    }

    function drawPedipalps(c, alpha) {
        p.stroke(...BLACK, alpha);
        p.strokeWeight(1.5);
        p.noFill();
        // Palps always point forward (up in local space) — no mouse lean needed
        // since the whole body rotates to face direction of travel
        p.beginShape();
        p.vertex(-4, -14);
        p.bezierVertex(-8, -22, -12, -26, -8, -31);
        p.endShape();
        p.beginShape();
        p.vertex(4, -14);
        p.bezierVertex(8, -22, 12, -26, 8, -31);
        p.endShape();
    }

    function drawBody(alpha) {
        p.noStroke();
        p.fill(...BODY_COL, alpha);
        p.ellipse(0, 9, 32, 30);
        p.fill(190, 85, 0, alpha);
        p.ellipse(0, -7, 24, 20);
        p.stroke(...BLACK, alpha * 0.5);
        p.strokeWeight(0.8);
        p.noFill();
        p.ellipse(0,  9, 32, 30);
        p.ellipse(0, -7, 24, 20);
        p.noStroke();
        p.fill(...BLACK, alpha);
        p.ellipse(0, 1, 7, 6);
    }

    function drawEyes(c, alpha) {
        // Eyes always look forward when travelling on the web
        let pupilBig = c.state === 'excited';
        let front = [[-7, -11], [-2.5, -13], [2.5, -13], [7, -11]];
        for (let [ex, ey] of front) {
            p.noStroke();
            p.fill(...WHITE, alpha);
            p.ellipse(ex, ey, 4.8, 4.8);
            p.fill(...BLACK, alpha);
            p.ellipse(ex, ey, pupilBig ? 2.8 : 1.5, pupilBig ? 2.8 : 1.5);
        }
        let back = [[-6, -7.5], [-2, -9], [2, -9], [6, -7.5]];
        for (let [ex, ey] of back) {
            p.noStroke();
            p.fill(...WHITE, alpha * 0.75);
            p.ellipse(ex, ey, 2.8, 2.8);
            p.fill(...BLACK, alpha);
            p.ellipse(ex, ey, pupilBig ? 1.6 : 0.9, pupilBig ? 1.6 : 0.9);
        }
    }


    // ============================================================
    //  INPUT: MOUSE CLICK
    // ============================================================

    function onCanvasClick() {
        if (!micActive) startMic();
        // Clicking near the spider feeds it
        let d = p.dist(p.mouseX, p.mouseY, creature.x, creature.y);
        if (d < CREATURE_SIZE * 0.7) {
            creature.need = p.max(0, creature.need - CLICK_FEED);
        }
    }


    // ============================================================
    //  INPUT: MICROPHONE
    // ============================================================

    async function startMic() {
        try {
            let stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            let ctx    = new (window.AudioContext || window.webkitAudioContext)();
            let source = ctx.createMediaStreamSource(stream);
            micAnalyser = ctx.createAnalyser();
            micAnalyser.fftSize = 256;
            source.connect(micAnalyser);
            micData   = new Uint8Array(micAnalyser.frequencyBinCount);
            micActive = true;
        } catch(e) {
            console.log('Mic unavailable:', e);
        }
    }

    function getMicLevel() {
        if (!micAnalyser) return 0;
        micAnalyser.getByteFrequencyData(micData);
        let sum = 0;
        for (let i = 0; i < micData.length; i++) sum += micData[i];
        return sum / (micData.length * 255);
    }

 function updateMic(c) {
    if (!micActive) return;
    c.micLevel = getMicLevel();

    if (c.micLevel > MIC_THRESHOLD) {
        c.freezeTimer = 120;      // freeze for 2 seconds
        c.returningHome = true;   // after freeze, go home
    }
}



    // ============================================================
    //  PERSISTENCE
    // ============================================================

    function saveState(c) {
        try {
            localStorage.setItem('creature_v2', JSON.stringify({
                need: c.need, lastVisit: Date.now(), totalVisits: c.totalVisits,
            }));
        } catch(e) {}
    }

    function loadState(c) {
        try {
            let raw = localStorage.getItem('creature_v2');
            if (!raw) { c.totalVisits = 1; return; }
            let data = JSON.parse(raw);
            c.need        = data.need || 50;
            c.lastVisit   = data.lastVisit;
            c.totalVisits = (data.totalVisits || 0) + 1;
            if (c.lastVisit) {
                let hours = Math.min((Date.now() - c.lastVisit) / 3600000, AFK_MAX_HOURS);
                c.need = Math.min(c.need + hours * AFK_PER_HOUR, 100);
            }
        } catch(e) {
            c.totalVisits = 1;
        }
             // Trust builds slower the longer you've been away
             let afkHours = Math.min((Date.now() - c.lastVisit) / 3600000, AFK_MAX_HOURS);
             c.trustBuildRate = 0.001 / (1 + afkHours * 0.15);

             c.awayTooLong = afkHours >= 1;   // true if user was gone ≥ 1 hour

    }


    // ============================================================
    //  SIDEBAR SYNC
    // ============================================================

    function updateSidebar(c) {
        if (ui.hour)    ui.hour.textContent    = c.hour % 12 || 12;
        if (ui.period)  ui.period.textContent  = c.hour < 12 ? 'am' : 'pm';
        if (ui.state)   ui.state.textContent   = c.state;
        if (ui.desc)    ui.desc.textContent    = STATE_DESCRIPTIONS[c.state] || '';
        if (ui.needVal) ui.needVal.textContent = Math.floor(c.need);
        if (ui.visits)  ui.visits.textContent  = c.totalVisits;
        if (ui.excited) ui.excited.textContent = c.exciteTimer > 0 ? 'yes!' : 'no';
        if (ui.watched) ui.watched.textContent = c.isWatched ? 'on' : 'away';
        if (ui.mic)     ui.mic.textContent     = micActive ? c.micLevel.toFixed(2) : '—';
        if (ui.day) {
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    ui.day.textContent = days[new Date().getDay()];
}


if (ui.weather) {
    if (weatherData && weatherData.current) {
        ui.weather.textContent = describeWeather(weatherData.current.weather_code);
    } 
    else {
        ui.weather.textContent = "loading...";
    }

}

// Time away (minutes since focus lost)
if (ui.away) {
    if (focusLostAt) {
        let ms = Date.now() - focusLostAt;
        focusAwayMinutes = Math.floor(ms / 60000);
    } else {
        focusAwayMinutes = 0;
    }
    ui.away.textContent = focusAwayMinutes + "m";
}

// AFK counter (minutes since last visit)
if (ui.afk && c.lastVisit) {
    let ms = Date.now() - c.lastVisit;
    let mins = Math.floor(ms / 60000);
    ui.afk.textContent = mins + "m";
}

} // end updateSidebar



    // ============================================================
    //  WINDOW RESIZE
    // ============================================================

    p.windowResized = function() {
        let sz = canvasSize();
        p.resizeCanvas(sz.w, sz.h);
        // Node positions are fractional so they auto-scale — nothing else needed
    };


    // ============================================================
    //  SIDEBAR CONTROLS
    // ============================================================

    window._resetNeed = () => { if (creature) creature.need = 0; };
    window._maxNeed   = () => { if (creature) creature.need = 100; };
    window._setDecay  = v => { DECAY_RATE = v; };
    window._setFeed   = v => { CLICK_FEED = v; };

}, document.body);

function drawImageNoStretch(img) {
    let imgRatio = img.width / img.height;
    let canvasRatio = p.width / p.height;

    let drawW, drawH;

    if (imgRatio > canvasRatio) {
        // Image is wider → match height
        drawH = p.height;
        drawW = drawH * imgRatio;
    } else {
        // Image is taller → match width
        drawW = p.width;
        drawH = drawW / imgRatio;
    }

    // Center the image
    let x = (p.width - drawW) / 2;
    let y = (p.height - drawH) / 2;

    p.image(img, x, y, drawW, drawH);
}


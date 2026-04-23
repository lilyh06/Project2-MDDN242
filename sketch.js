// ============================================================
//  YOUR CREATURE  —  sketch.js   (spider edition)
//  MDDN242 Project 2
// ============================================================

new p5(function(p) {

    // ============================================================
    //  SETTINGS
    // ============================================================

    const SHOW_UI       = true;
    const USE_WEB_IMAGE = false;

    let CREATURE_SIZE   = 110;
    let DECAY_RATE      = 0.003;
    let AWAY_RATE       = 0.020;
    let AFK_PER_HOUR    = 5;
    let AFK_MAX_HOURS   = 168;
    let CLICK_FEED      = 20;
    let MIC_THRESHOLD   = 0.35;
    let EXCITED_FRAMES  = 40;
    let BOUNCE_SCALE    = 1.0;

    let bgImg, bgBehind;
    let focusLostAt      = null;
    let focusAwayMinutes = 0;
    let raindrops        = [];
    let rainActive       = false;

    // WEB + DEBRIS
    let debris           = [];
    let debrisSpawnTimer = 0;
    let selectedDebris   = null;
    let webLayer;
    let web2Img, web3Img, web4Img;
    let webFade          = 0;
    let webFading        = false;
    let currentWeb       = 1;
    let targetWeb        = null;
    let dropletsLayer;
    let debrisImg1, debrisImg2;
    let debris1Count     = 0;
    let debris2Count     = 0;
    let recentDebrisFalls = [];
    let nextDebrisSpawn = 0;   // time until next debris drop 

    // ENVELOPE
    let envelopeImg;
    let bouquetImg;
    let bouquetAvailable = false;
    let bouquet          = null;
    let fadeStartTime    = null;
    let envelopeBounds   = { x: 0, y: 0, w: 0, h: 0 };
    let envelopeBounce   = 0;

    let rainStartTime    = null;
    let dropletAlpha     = 0;
    let windSway         = 0;
    let windActive       = false;
    let spiderBracing    = false;
    let fadeDuration     = 10000;
    let frustrationPenalty = 0;
    let calmVisitTime    = 0;
    let connectionLevel  = 0;
    let loudEvents       = [];
    let frustrationTimer = 0;
    let stars            = [];
    let relationshipLevel = 0;
    let fearLevel        = 0;

    // FIX: declared at top level so p.setup and p.draw can both access it
    let cloudImg        = null;
    let cloudX           = 0;
    let cloudY           = 0;
    let cloudSpeed       = 0.3;
    let cloudAlpha       = 0;
    let cloudsActive     = false;

    let BASE_SPEED       = 0.006;
    let travelSpeed      = BASE_SPEED;

    const BODY_COL = [255, 126, 0];
    const BLACK    = [0, 0, 0];
    const WHITE    = [255, 255, 255];


    // ============================================================
    //  WEATHER + TIME SYSTEM (Wellington, NZ)
    // ============================================================

    let weatherData      = null;
    let lastWeatherFetch = 0;

    const COL_SUNNY_DAY  = [150, 200, 255];
    const COL_CLOUDY_DAY = [200, 200, 210];
    const COL_CLOUDY_LATE= [140, 140, 150];
    const COL_SUNSET     = [255, 150, 80];
    const COL_NIGHT      = [10,  20,  40];

    async function fetchWeather() {
        if (Date.now() - lastWeatherFetch < 10 * 60 * 1000) return;
        lastWeatherFetch = Date.now();
        const url = "https://api.open-meteo.com/v1/forecast?latitude=-41.2865&longitude=174.7762&current=temperature_2m,weather_code&timezone=Pacific/Auckland";
        try {
            const res  = await fetch(url);
            weatherData = await res.json();
        } catch (e) {
            console.log("Weather fetch failed:", e);
        }
    }

    function getBackgroundColor() {
        if (!weatherData) return COL_SUNNY_DAY;
        const hour  = new Date().getHours() + new Date().getMinutes() / 60;
        let target;
        if      (hour < 6)  target = COL_NIGHT;
        else if (hour < 8)  target = COL_SUNSET;
        else if (hour < 17) target = COL_SUNNY_DAY;
        else if (hour < 19) target = COL_SUNSET;
        else                target = COL_NIGHT;
        let blend = (new Date().getMinutes() % 60) / 60;
        return [
            p.lerp(COL_SUNNY_DAY[0], target[0], blend),
            p.lerp(COL_SUNNY_DAY[1], target[1], blend),
            p.lerp(COL_SUNNY_DAY[2], target[2], blend),
        ];
    }

    function describeWeather(code) {
        const map = {
            0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
            45: "Foggy", 48: "Foggy",
            51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
            61: "Light rain", 63: "Rain", 65: "Heavy rain",
            80: "Light showers", 81: "Showers", 82: "Heavy showers",
        };
        return map[code] || "Unknown";
    }


    // ============================================================
    //  WEB GRAPH
    // ============================================================

    const WEB_NODES = [
        { id:  0, x: 0.78, y: 0.04 },
        { id:  1, x: 0.52, y: 0.18 },
        { id:  2, x: 0.72, y: 0.28 },
        { id:  3, x: 0.88, y: 0.22 },
        { id:  4, x: 0.30, y: 0.32 },
        { id:  5, x: 0.48, y: 0.42 },
        { id:  6, x: 0.65, y: 0.50 },
        { id:  7, x: 0.80, y: 0.55 },
        { id:  8, x: 0.92, y: 0.40 },
        { id:  9, x: 0.96, y: 0.60 },
        { id: 10, x: 0.18, y: 0.60 },
        { id: 11, x: 0.42, y: 0.72 },
        { id: 12, x: 0.68, y: 0.78 },
        { id: 13, x: 0.88, y: 0.82 },
    ];

    const WEB_EDGES = [
        [0,1],[0,2],[0,3],
        [1,2],[2,3],
        [1,4],[1,5],[2,5],[2,6],[3,6],[3,7],[3,8],[8,9],
        [4,5],[5,6],[6,7],[7,8],
        [4,10],[5,11],[6,11],[6,12],[7,12],[7,13],[9,13],
        [10,11],[11,12],[12,13],
    ];


    // ============================================================
    //  STATE MACHINE
    // ============================================================

    const STATES = {
        happy:      { bounceAmt: 0.04,  shakeAmt: 0.0, alphaTarget: 255 },
        neutral:    { bounceAmt: 0.02,  shakeAmt: 0.0, alphaTarget: 180 },
        distressed: { bounceAmt: 0.01,  shakeAmt: 1.5, alphaTarget: 127 },
        excited:    { bounceAmt: 0.10,  shakeAmt: 0.0, alphaTarget: 255 },
        calm:       { bounceAmt: 0.015, shakeAmt: 0.0, alphaTarget: 255 },
        untrusted:  { bounceAmt: 0.015, shakeAmt: 0.3, alphaTarget: 160 },
        worried:    { bounceAmt: 0.06,  shakeAmt: 0.5, alphaTarget: 200 },
        frustrated: { bounceAmt: 0.07,  shakeAmt: 1.0, alphaTarget: 200 },
        comfort:    { bounceAmt: 0.01,  shakeAmt: 0.0, alphaTarget: 255 },
        fear:       { bounceAmt: 0.00,  shakeAmt: 2.5, alphaTarget: 255 },
    };

    const STATE_DESCRIPTIONS = {
        happy:      'need is low — roaming freely',
        neutral:    'need is rising — avoiding backtrack',
        distressed: 'need is high — retreating to hub',
        excited:    'you brought food! — chasing mouse',
        calm:       'quiet company — slowing down, relaxed',
        worried:    "you're gone — moving quickly, uneasy",
        untrusted:  "hasn't seen you in a while — cautious, slow to relax",
        frustrated: 'too loud — irritated, waiting',
        comfort:    "quiet company — bonding, relaxed",
        fear:       "overwhelmed — curled up, scared",
    };

    function getState(c) {
        if (fearLevel > 0.7)                             return "fear";
        if (fearLevel > 0.4 && c.state !== "frustrated") return "distressed";
        if (!c.isWatched)                                return "worried";
        if (c.micLevel > MIC_THRESHOLD)                  return "frustrated";
        if (c.trustLevel >= 1)                           return "calm";
        if (c.trustLevel > 0.2)                          return "untrusted";
        if (c.exciteTimer > 0)                           return "excited";
        if (c.need <= 30)                                return "happy";
        if (c.need <= 70)                                return "neutral";
        return "distressed";
    }


    // ============================================================
    //  CREATURE FACTORY
    // ============================================================

    function createCreature() {
        return {
            currentNode:   0,
            targetNode:    1,
            previousNode:  -1,
            edgeT:         0,
            freezeTimer:   0,
            fearCurlTimer: 0,
            returningHome: false,
            trustLevel:    0,
            trustBuildRate: 0.001,
            comfortMode:   false,
            curled:        false,
            awayTooLong:   false,
            x: 0, y: 0,
            need:        50,
            state:       'neutral',
            bounceAmt:   0.02,
            bodyAlpha:   255,
            breathe:     0,
            bob:         0,
            exciteTimer: 0,
            orbitAngle:  0,
            hour:        new Date().getHours(),
            isWatched:   true,
            micLevel:    0,
            lastVisit:   null,
            totalVisits: 0,
        };
    }

    let creature;
    let micAnalyser = null;
    let micActive   = false;
    let micData     = null;
    let ui          = {};


    // ============================================================
    //  PRELOAD
    // ============================================================

    p.preload = function() {
        bgBehind      = p.loadImage("bgbehind.png");
        bgImg         = p.loadImage("background.png");
        webLayer      = p.loadImage("web1.png");
        dropletsLayer = p.loadImage("droplets1.png");
        cloudImg     = p.loadImage("clouds1.png");   // FIX: consistent variable name
        debrisImg1    = p.loadImage("debris1.png");
        debrisImg2    = p.loadImage("debris2.png");
        envelopeImg   = p.loadImage("envelope.png");
        bouquetImg    = p.loadImage("bouquet.png");
        web2Img       = p.loadImage("web2.png");
        web3Img       = p.loadImage("web3.png");
        web4Img       = p.loadImage("web4.png");
    };


    // ============================================================
    //  SETUP
    // ============================================================

    function isMobile() { return window.innerWidth <= 768; }

    function canvasSize() {
        if (isMobile()) return { w: window.innerWidth, h: window.innerHeight };
        let maxW = p.windowWidth - 360;
        let maxH = p.windowHeight - 40;
        let targetRatio  = 16 / 9;
        let currentRatio = maxW / maxH;
        let w, h;
        if (currentRatio > targetRatio) { h = maxH; w = h * targetRatio; }
        else                            { w = maxW; h = w / targetRatio; }
        return { w, h };
    }

    p.setup = function() {
        let sz  = canvasSize();
        let cnv = p.createCanvas(sz.w, sz.h);
        cnv.mousePressed(onCanvasClick);
        cnv.parent('canvas-container');


        creature = createCreature();
        loadState(creature);

        cloudX = p.width + 200;
        cloudY = p.random(20, p.height * 0.4);

        let startNode = WEB_NODES[creature.currentNode];
        creature.x = startNode.x * p.width;
        creature.y = startNode.y * p.height;

        for (let i = 0; i < 80; i++) {
            stars.push({
                x:       p.random(p.width),
                y:       p.random(p.height * 0.6),
                size:    p.random(2, 5),
                twinkle: p.random(0.5, 1.5),
            });
        }

        if (!SHOW_UI) document.querySelector('.sidebar').style.display = 'none';

        ui.hour         = document.getElementById('ui-hour');
        ui.period       = document.getElementById('ui-period');
        ui.day          = document.getElementById('ui-day');
        ui.state        = document.getElementById('ui-state');
        ui.desc         = document.getElementById('ui-desc');
        ui.needVal      = document.getElementById('ui-need-val');
        ui.needBar      = document.getElementById('ui-need-bar');
        ui.visits       = document.getElementById('ui-visits');
        ui.excited      = document.getElementById('ui-excited');
        ui.watched      = document.getElementById('ui-watched');
        ui.mic          = document.getElementById('ui-mic');
        ui.weather      = document.getElementById('ui-weather');
        ui.away         = document.getElementById('ui-away');
        ui.afk          = document.getElementById('ui-afk');
        ui.trustVal     = document.getElementById('ui-trust-val');
        ui.trustBar     = document.getElementById('ui-trust-bar');

        window.addEventListener('focus', () => {
            creature.isWatched = true;
            focusLostAt = null;
        });
        window.addEventListener('blur', () => {
            creature.isWatched = false;
            focusLostAt = Date.now();
        });

        setInterval(() => { saveState(creature); creature.hour = new Date().getHours(); }, 30000);
        window.addEventListener('beforeunload', () => saveState(creature));
    };


    // ============================================================
    //  RAIN
    // ============================================================

    function spawnRain() {
        for (let i = 0; i < 8; i++) {
            raindrops.push({
                x:     p.random(0, p.width),
                y:     p.random(-20, 0),
                len:   p.random(8, 14),
                speed: p.random(4, 8),
            });
        }
    }

    function drawRain() {
        p.stroke(255, 255, 255, 20);
        p.strokeWeight(1.2);
        for (let drop of raindrops) {
            p.line(drop.x, drop.y, drop.x, drop.y + drop.len);
            drop.y += drop.speed;
        }
        raindrops = raindrops.filter(d => d.y < p.height + 20);
    }


    // ============================================================
    //  DRAW LOOP
    // ============================================================

    p.draw = function() {
        fetchWeather();

        let col  = getBackgroundColor();
        let code = -1;
        let cloudy = false;

        if (weatherData && weatherData.current) {
            code   = weatherData.current.weather_code;
            cloudy = (code !== 0 && code !== 1);
        }

        let raining = [51,53,55,61,63,65,80,81,82].includes(code);

        // Track rain duration
        if (raining) {
            if (rainStartTime === null) rainStartTime = Date.now();
        } else {
            rainStartTime = null;
        }
        rainActive = raining;

        // Fade droplets in after 5 minutes of rain
        let rainMinutes = rainStartTime !== null ? (Date.now() - rainStartTime) / 60000 : 0;
        dropletAlpha = rainMinutes > 5
            ? p.lerp(dropletAlpha, 255, 0.02)
            : p.lerp(dropletAlpha, 0,   0.02);

        // Wind trigger
        let windy = [95,96,99].includes(code);
        let loud  = creature.micLevel > MIC_THRESHOLD;
        windActive    = windy || loud;
        spiderBracing = windActive;

        if (windActive) { windSway += 0.04; }
        else            { windSway *= 0.9;  }

        // Background
        p.background(col[0], col[1], col[2]);

        // Stars (clear night only)
        let hour  = new Date().getHours();
        let clear = weatherData && weatherData.current && [0,1].includes(weatherData.current.weather_code);
        if (clear && (hour >= 20 || hour < 6)) {
            for (let s of stars) {
                let alpha = 200 + Math.sin(p.frameCount * 0.02 * s.twinkle) * 55;
                p.stroke(255, alpha);
                p.noFill();
                p.line(s.x - s.size, s.y, s.x + s.size, s.y);
                p.line(s.x, s.y - s.size, s.x, s.y + s.size);
            }
        }

        // Behind layer
        if (bgBehind) drawImageNoStretch(bgBehind);

        // Main background
        p.tint(255, 255);
        if (bgImg) drawImageNoStretch(bgImg);
        p.noTint();

        // Web + droplets (with optional wind sway)
        p.push();
        if (windActive) {
            p.translate(Math.sin(windSway) * 6, Math.cos(windSway) * 3);
        }

        let baseImg = currentWeb === 1 ? webLayer :
                      currentWeb === 2 ? web2Img  :
                      currentWeb === 3 ? web3Img  : web4Img;
        if (baseImg) drawImageNoStretch(baseImg);

        // Cross-fade to target web
        if (webFading && targetWeb !== null) {
            let elapsed  = Date.now() - fadeStartTime;
            webFade      = p.constrain(elapsed / fadeDuration, 0, 1);
            let targetImg = targetWeb === 1 ? webLayer :
                            targetWeb === 2 ? web2Img  :
                            targetWeb === 3 ? web3Img  : web4Img;
            if (targetImg) {
                p.tint(255, webFade * 255);
                drawImageNoStretch(targetImg);
                p.noTint();
            }
            if (webFade >= 1) {
                currentWeb = targetWeb;
                targetWeb  = null;
                webFading  = false;
            }
        }

        // Droplets overlay
        if (dropletsLayer && dropletAlpha > 1) {
            p.tint(255, dropletAlpha);
            drawImageNoStretch(dropletsLayer);
            p.noTint();
        }
        p.pop();

        // Envelope bounce
        if (envelopeBounce > 0) envelopeBounce *= 0.85;

        // Envelope
        if (envelopeImg) {
            let envW = envelopeImg.width  * 0.07;
            let envH = envelopeImg.height * 0.07;
            let envX = (p.width  - envW) / 2;
            let envY =  p.height - envH - 15;
            envelopeBounds = { x: envX, y: envY, w: envW, h: envH };
            p.image(envelopeImg, envX, envY - envelopeBounce, envW, envH);
        }

        // Debris spawn rate based on away time
        let spawnInterval = 800;
        if (!creature.isWatched) {
            if (focusAwayMinutes > 5)  spawnInterval = 140;
            if (focusAwayMinutes > 10) spawnInterval = 90;
            if (focusAwayMinutes > 20) spawnInterval = 50;
        }
 //  RANDOM DEBRIS SPAWN SYSTEM

// If it's time to spawn debris
if (Date.now() > nextDebrisSpawn) {

    spawnDebris();

    // Base random delay: 5–20 seconds
    let delay = p.random(5000, 20000);

    // If raining → spawn 2× to 3× faster
    if (rainActive) {
        delay *= 0.35;   // 35% of normal delay
    }

    // If user is away then spawn faster
    if (!creature.isWatched) {
        delay *= 0.5;    // half the delay
    }

    nextDebrisSpawn = Date.now() + delay;
}


        updateDebris();

        // Clouds
        if (cloudy) {
            cloudsActive = true;
            cloudAlpha   = p.lerp(cloudAlpha, 255, 0.02);
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

        // Rain
        if (rainActive) { spawnRain(); drawRain(); }

        // Creature update + draw
        updateMic(creature);
        updateCreature(creature);

        // Calm company tracking
        if (creature.isWatched && creature.micLevel < 0.05 && frustrationTimer === 0) {
            calmVisitTime++;
            if (calmVisitTime % (60 * 10) === 0) {
                connectionLevel   = Math.min(1, connectionLevel + 0.05);
                frustrationPenalty = Math.max(0, frustrationPenalty - 60 * 5);
            }
        }
        if (!creature.isWatched) {
            connectionLevel = Math.max(0, connectionLevel - 0.0002);
        }

        // FIX: web trust fade — moved INSIDE p.draw so it runs every frame
        if (!webFading && currentWeb !== 1 && creature.trustLevel < 1) {
            targetWeb     = 1;
            webFading     = true;
            fadeStartTime = Date.now();
            webFade       = 0;
            fadeDuration  = 5000;
        }

        drawCreature(creature);

        // Bouquet
        if (bouquetAvailable && bouquet) {
            p.push();
            p.translate(bouquet.x, bouquet.y);
            p.image(bouquetImg, -bouquet.size / 2, -bouquet.size / 2, bouquet.size, bouquet.size);
            p.pop();
        }

        if (p.frameCount % 6 === 0) updateSidebar(creature);
    };


    // ============================================================
    //  WEB NAVIGATION
    // ============================================================

    function getNeighbours(nodeId) {
        let neighbours = [];
        for (let [a, b] of WEB_EDGES) {
            if (a === nodeId) neighbours.push(b);
            else if (b === nodeId) neighbours.push(a);
        }
        return neighbours;
    }

    function nodeDist(idA, idB) {
        let a = WEB_NODES[idA], b = WEB_NODES[idB];
        return p.dist(a.x * p.width, a.y * p.height, b.x * p.width, b.y * p.height);
    }

    function distToMouse(nodeId) {
        let n = WEB_NODES[nodeId];
        return p.dist(n.x * p.width, n.y * p.height, p.mouseX, p.mouseY);
    }

    function pickNextNode(c) {
        let neighbours = getNeighbours(c.currentNode);
        if (neighbours.length === 0) return c.currentNode;
        switch (c.state) {
            case 'happy':
            case 'neutral': {
                let opts = neighbours.filter(n => n !== c.previousNode);
                return p.random(opts.length > 0 ? opts : neighbours);
            }
            case 'distressed':
                return neighbours.sort((a, b) => nodeDist(a, 0) - nodeDist(b, 0))[0];
            case 'excited':
                return neighbours.sort((a, b) => distToMouse(a) - distToMouse(b))[0];
            default:
                return p.random(neighbours);
        }
    }


    // ============================================================
    //  CREATURE LOGIC
    // ============================================================

    function updateCreature(c) {

// Celebration circles after receiving bouquet
if (c.celebrateTimer > 0) {
    c.celebrateTimer--;

    // Circle around center of screen
    c.orbitAngle += 0.15;
    c.x = p.width/2  + Math.cos(c.orbitAngle) * 90;
    c.y = p.height/2 + Math.sin(c.orbitAngle) * 90;

    // During celebration, spider is calm
    c.state = "calm";
    return;
}


        // Freeze
        if (c.freezeTimer > 0) {
            c.freezeTimer--;
            c.state = "frustrated";
            return;
        }

        // Fear curl
        if (c.fearCurlTimer > 0) {
            c.fearCurlTimer--;
            c.state = "fear";
            c.curled = true;
            return;
        }

        // Celebration orbit during web fade
        if (webFading) {
            c.orbitAngle += 0.2;
            c.x = p.width  / 2 + Math.cos(c.orbitAngle) * 80;
            c.y = p.height / 2 + Math.sin(c.orbitAngle) * 80;
            return;
        }

        // Frustration cooldown
        if (frustrationTimer > 0) {
            frustrationTimer = Math.floor(frustrationTimer * 0.995) - 1;
            c.state = "frustrated";
        }

        if (c.awayTooLong) c.returningHome = true;

        if (c.isWatched && c.curled) {
            c.curled      = false;
            c.awayTooLong = false;
        }

        // FIX: single declaration of stuckCount
        let stuckCount = debris.filter(d => d.stuck).length;
        if (stuckCount >= 3) c.returningHome = true;

        // Need decay
        if (c.state === 'calm') {
            c.need = p.constrain(c.need - 0.02, 0, 100);
        } else {
            let rate = c.isWatched ? DECAY_RATE : AWAY_RATE;
            c.need = p.constrain(c.need + rate, 0, 100);
        }

        // Trust build / decay
        if (c.isWatched && c.micLevel < 0.05) {
            c.trustLevel = Math.min(1, c.trustLevel + c.trustBuildRate);
        } else {
            let loss = c.isWatched ? 0.005 : 0.02;
            c.trustLevel = Math.max(0, c.trustLevel - loss);
        }

        // Relationship meter
        if (c.state === "calm" && c.micLevel < 0.05 && c.isWatched) {
            relationshipLevel = Math.min(1, relationshipLevel + 0.0005);
        } else {
            relationshipLevel = Math.max(0, relationshipLevel - 0.001);
        }
        if (!c.isWatched || c.state === "frustrated" || c.micLevel > MIC_THRESHOLD) {
            relationshipLevel = Math.max(0, relationshipLevel - 0.001);
        }

        // Comfort mode
        if (c.state === "calm" && c.micLevel < 0.05 && c.isWatched) {
            calmVisitTime++;
            if (calmVisitTime > 60 * 20) c.comfortMode = true;
        } else {
            calmVisitTime  = 0;
            c.comfortMode  = false;
        }

        // Fear / frustration from debris
       if (stuckCount >= 6) {
    fearLevel = Math.min(1, fearLevel + 0.002); // 10× slower
        } else {
            fearLevel = Math.max(0, fearLevel - 0.01);
        }
       if (stuckCount >= 4 && stuckCount < 6) {
    c.state = "frustrated";
}


        // State + animation
        c.state     = getState(c);
        let s       = STATES[c.state];
        c.bounceAmt = p.lerp(c.bounceAmt, s.bounceAmt * BOUNCE_SCALE, 0.08);
        c.bodyAlpha = p.lerp(c.bodyAlpha, s.alphaTarget, 0.05);

        // Speed by mood
        if (c.state === 'worried' || c.state === 'frustrated') travelSpeed = BASE_SPEED * 2.2;
        else if (c.state === 'calm')                           travelSpeed = BASE_SPEED * 0.4;
        else                                                   travelSpeed = BASE_SPEED;

        c.breathe += 0.018;
        c.bob     += 0.012;
        if (c.exciteTimer > 0) c.exciteTimer--;

        // Travel along edge
        c.edgeT += travelSpeed;
        if (c.edgeT >= 1.0) {
            c.previousNode = c.currentNode;
            c.currentNode  = c.targetNode;
            c.edgeT        = 0;

            if (c.returningHome) {
                let neighbours = getNeighbours(c.currentNode);
                c.targetNode   = neighbours.sort((a, b) => nodeDist(a, 0) - nodeDist(b, 0))[0];
                if (c.currentNode === 0) {
                    c.curled        = !!c.awayTooLong;
                    c.returningHome = false;
                }
            } else {
                c.targetNode = pickNextNode(c);
            }
        }

        // Pixel position
        let cur = WEB_NODES[c.currentNode];
        let tgt = WEB_NODES[c.targetNode];
        c.x = p.lerp(cur.x * p.width,  tgt.x * p.width,  c.edgeT);
        c.y = p.lerp(cur.y * p.height, tgt.y * p.height, c.edgeT);
    }


    // ============================================================
    //  DEBRIS
    // ============================================================

    function spawnDebris() {
        let img = p.random([debrisImg1, debrisImg2]);
        debris.push({
            x:        p.random(0, p.width),
            y:        -20,
            img:      img,
            size:     p.random(28, 48),
            speed:    p.random(2.2, 4.0),
            rotation: p.random(-0.1, 0.1),
            angle:    0,
            stuck:    false,
            stuckNode: null,
            dragging: false,
            released: false,
            offsetX:  0,
            offsetY:  0,
        });
    }

    function nodeHasDebris(nodeId) {
        return debris.some(d => d.stuck && d.stuckNode === nodeId);
    }

    function updateDebris() {
        for (let d of debris) {
            if (d.dragging) {
                d.x = p.mouseX + d.offsetX;
                d.y = p.mouseY + d.offsetY;
                p.image(d.img, d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
                continue;
            }

            if (d.released) {
                d.y += d.speed * 1.2;
                p.push();
                d.angle += d.rotation;
                p.translate(d.x, d.y);
                p.rotate(d.angle);
                p.image(d.img, -d.size / 2, -d.size / 2, d.size, d.size);
                p.pop();
                continue;
            }

            if (d.stuck) {
                p.push();
                if (windActive) p.translate(Math.sin(windSway) * 4, Math.cos(windSway) * 2);
                p.image(d.img, d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
                p.pop();
                continue;
            }

            // Falling
            d.y += d.speed;

            recentDebrisFalls.push(Date.now());
            recentDebrisFalls = recentDebrisFalls.filter(t => Date.now() - t < 3000);
            if (recentDebrisFalls.length >= 5) fearLevel = Math.min(1, fearLevel + 0.25);
            fearLevel = Math.max(0, fearLevel - 0.002);

            // Stick to nearest node
            for (let n of WEB_NODES) {
                let nx = n.x * p.width;
                let ny = n.y * p.height;
                if (p.dist(d.x, d.y, nx, ny) < 12 && !nodeHasDebris(n.id)) {
                    d.stuck     = true;
                    d.stuckNode = n.id;
                    d.x         = nx;
                    d.y         = ny;
                    break;
                }
            }

            p.image(d.img, d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
        }

        debris = debris.filter(d => d.y < p.height + 40);
    }


    // ============================================================
    //  WEB FADE TRIGGER
    // ============================================================

    function startWebFade() {
        if (creature.state === "calm")       targetWeb = 4;
        else if (creature.state === "frustrated") targetWeb = 3;
        else                                  targetWeb = 2;

        webFading     = true;
        fadeStartTime = Date.now();
        webFade       = 0;
        fadeDuration  = 20000;
        creature.exciteTimer = 600;
    }


    // ============================================================
    //  PROCEDURAL WEB (debug / fallback)
    // ============================================================

    function drawProceduralWeb() {
        p.push();
        p.stroke(255, 255, 255, 20);
        p.noFill();
        let hub  = WEB_NODES[0];
        let rings = {};
        for (let n of WEB_NODES) {
            if (n.id === 0) continue;
            p.strokeWeight(1.2);
            p.line(hub.x * p.width, hub.y * p.height, n.x * p.width, n.y * p.height);
            let d = p.dist(hub.x, hub.y, n.x, n.y);
            let bucket = Math.round(d * 6);
            if (!rings[bucket]) rings[bucket] = [];
            rings[bucket].push(n);
        }
        p.stroke(255, 255, 255, 60);
        p.strokeWeight(1);
        for (let r in rings) {
            let ring = rings[r];
            if (ring.length < 2) continue;
            p.beginShape();
            for (let n of ring) p.curveVertex(n.x * p.width, n.y * p.height);
            p.curveVertex(ring[0].x * p.width, ring[0].y * p.height);
            p.endShape();
        }
        p.pop();
    }


    // ============================================================
    //  DRAWING
    // ============================================================

    function drawCreature(c) {
        p.push();
        p.translate(c.x, c.y);
        p.translate(0, p.sin(c.bob) * 4);

        if (spiderBracing) { p.translate(0, 6); p.scale(1.05, 0.92); }
        if (c.comfortMode) { p.translate(0, Math.sin(c.breathe * 0.5) * 3); p.scale(1.05); }

        if (c.curled) {
            p.scale(0.6);
            c.bounceAmt = 0;
            c.bodyAlpha = 255;
            p.translate(p.random(-3, 3), p.random(-1.5, 1.5));
        }

        let s = STATES[c.state];
        let bScale = 1 + p.sin(c.breathe) * c.bounceAmt;

        if (s.shakeAmt > 0) {
            p.translate(
                p.random(-s.shakeAmt, s.shakeAmt),
                p.random(-s.shakeAmt * 0.4, s.shakeAmt * 0.4)
            );
        }
        if (c.state === "frustrated") p.translate(p.random(-3, 3), p.random(-1, 1));
        if (c.state === "worried")    p.translate(p.random(-1, 1), p.random(-0.5, 0.5));
        if (c.state === "fear")       p.translate(p.random(-4, 4), p.random(-2, 2));

        let cur   = WEB_NODES[c.currentNode];
        let tgt   = WEB_NODES[c.targetNode];
        let angle = Math.atan2((tgt.y - cur.y) * p.height, (tgt.x - cur.x) * p.width);
        p.rotate(angle + p.HALF_PI);

        if (creature.celebrateTimer > 0) {
    creature.celebrateTimer--;
    creature.orbitAngle += 0.15;

    creature.x = p.width/2 + Math.cos(creature.orbitAngle) * 80;
    creature.y = p.height/2 + Math.sin(creature.orbitAngle) * 80;

    return; // override normal movement hopefully
}


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
        drawLegs(alpha, legSway, c);
        drawPedipalps(alpha);
        drawBody(alpha);
        drawEyes(c, alpha);
    }

    function drawLegs(alpha, sway, c) {
        p.strokeWeight(1.5);
        p.noFill();
        let brace = spiderBracing ? 6 : 0;
        // FIX: apply state modifiers before using sway, not after
        if (c.state === "frustrated") sway *= 0.3;
        if (c.state === "fear")       sway  = 0;
        let ls = sway + brace;
        let rs = -sway - brace;
        drawLeg(-8,  -8,  -16, -20+ls, -30, -22+ls, -32, -16+ls, alpha);
        drawLeg(-10, -2,  -20,  -8+ls, -34,  -4+ls, -38,   3+ls, alpha);
        drawLeg(-10,  4,  -18,  10+ls, -30,  18+ls, -34,  26+ls, alpha);
        drawLeg(-8,  10,  -14,  20+ls, -20,  30+ls, -20,  38+ls, alpha);
        drawLeg( 8,  -8,   16, -20+rs,  30, -22+rs,  32, -16+rs, alpha);
        drawLeg(10,  -2,   20,  -8+rs,  34,  -4+rs,  38,   3+rs, alpha);
        drawLeg(10,   4,   18,  10+rs,  30,  18+rs,  34,  26+rs, alpha);
        drawLeg( 8,  10,   14,  20+rs,  20,  30+rs,  20,  38+rs, alpha);
    }

    function drawLeg(x0,y0,cx1,cy1,cx2,cy2,x3,y3,alpha) {
        p.stroke(...BLACK, alpha);
        p.beginShape();
        p.vertex(x0, y0);
        p.bezierVertex(cx1, cy1, cx2, cy2, x3, y3);
        p.endShape();
    }

    // FIX: removed unused 'c' parameter
    function drawPedipalps(alpha) {
        p.stroke(...BLACK, alpha);
        p.strokeWeight(1.5);
        p.noFill();
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
        let dx     = p.mouseX - c.x;
        let dy     = p.mouseY - c.y;
        let angle  = Math.atan2(dy, dx);
        let lookX  = Math.cos(angle) * 1.2;
        let lookY  = Math.sin(angle) * 1.2;
        let pupilBig = c.state === 'excited';
        let squash   = c.state === "frustrated" ? 0.6 : c.state === "fear" ? 0.4 : 1.0;

        let front = [[-7,-11],[-2.5,-13],[2.5,-13],[7,-11]];
        let back  = [[-6,-7.5],[-2,-9],[2,-9],[6,-7.5]];

        for (let [ex,ey] of front) {
            p.noStroke();
            p.fill(...WHITE, alpha);
            p.ellipse(ex, ey, 4.8, 4.8 * squash);
            p.fill(...BLACK, alpha);
            p.ellipse(ex + lookX, ey + lookY, pupilBig ? 2.8 : 1.5);
        }
        for (let [ex,ey] of back) {
            p.noStroke();
            p.fill(...WHITE, alpha * 0.75);
            p.ellipse(ex, ey, 2.8, 2.8 * squash);
            p.fill(...BLACK, alpha);
            p.ellipse(ex + lookX, ey + lookY, pupilBig ? 1.6 : 0.9);
        }
    }


    // ============================================================
    //  INPUT: MOUSE CLICK
    // ============================================================

    function onCanvasClick() {
        if (!micActive) startMic();
        let d = p.dist(p.mouseX, p.mouseY, creature.x, creature.y);
        if (d < CREATURE_SIZE * 0.7) creature.need = p.max(0, creature.need - CLICK_FEED);
    }


    // ============================================================
    //  MOUSE DRAG / RELEASE
    // ============================================================

    p.mousePressed = function() {
        for (let d of debris) {
            if (p.dist(p.mouseX, p.mouseY, d.x, d.y) < d.size) {
                selectedDebris  = d;
                d.dragging      = true;
                d.offsetX       = d.x - p.mouseX;
                d.offsetY       = d.y - p.mouseY;
                break;
            }
        }
        if (bouquetAvailable && bouquet) {
            if (p.dist(p.mouseX, p.mouseY, bouquet.x, bouquet.y) < bouquet.size / 2) {
                bouquet.dragging = true;
                bouquet.offsetX  = bouquet.x - p.mouseX;
                bouquet.offsetY  = bouquet.y - p.mouseY;
            }
        }
    };

    p.mouseDragged = function() {
      // Bouquet drop
if (bouquet && bouquet.dragging) {
    bouquet.dragging = false;

    let d = p.dist(bouquet.x, bouquet.y, creature.x, creature.y);

    // Accept bouquet if close enough AND trust is at least 0.3
    if (d < CREATURE_SIZE * 0.9 && creature.trustLevel >= 0.3) {

        // Calm the spider
        fearLevel = Math.max(0, fearLevel - 0.5);
        frustrationTimer = 0;
        creature.freezeTimer = 0;

        // Boost relationship + trust
        relationshipLevel = Math.min(1, relationshipLevel + 0.25);
        creature.trustLevel = Math.min(1, creature.trustLevel + 0.4);

        // Start celebration mode
        creature.celebrateTimer = 300;   // ~5 seconds of circles

        // Trigger web fade to next web
        startWebFade();

        // Remove bouquet
        bouquetAvailable = false;
        bouquet = null;
    }
    creature.state = "comfort";
creature.trustLevel = Math.min(1, creature.trustLevel + 0.4);
relationshipLevel = Math.min(1, relationshipLevel + 0.5);
fearLevel = Math.max(0, fearLevel - 0.5);
frustrationTimer = 0;
creature.orbitAngle = 0;

}

        if (selectedDebris && selectedDebris.dragging) {
            selectedDebris.x = p.mouseX + selectedDebris.offsetX;
            selectedDebris.y = p.mouseY + selectedDebris.offsetY;
        }
    };

    p.mouseReleased = function() {
// Bouquet drop
if (bouquet && bouquet.dragging) {
    bouquet.dragging = false;
    let d = p.dist(bouquet.x, bouquet.y, creature.x, creature.y);

    if (d < CREATURE_SIZE * 1.2 && creature.trustLevel >= 0.3) {

        // Calm + relationship boost
        creature.state = "comfort";
        creature.trustLevel = Math.min(1, creature.trustLevel + 0.4);
        relationshipLevel = Math.min(1, relationshipLevel + 0.5);
        fearLevel = Math.max(0, fearLevel - 0.5);
        frustrationTimer = 0;

        // Celebration circles + web drawing
        creature.orbitAngle = 0;
        creature.celebrateTimer = 300; // 5 seconds
        startWebFade();

        // Remove bouquet
        bouquetAvailable = false;
        bouquet = null;
    }
}


        // Debris drop into envelope
        if (selectedDebris) {
            let b = envelopeBounds;
            if (
                selectedDebris.x > b.x && selectedDebris.x < b.x + b.w &&
                selectedDebris.y > b.y && selectedDebris.y < b.y + b.h
            ) {
                debris = debris.filter(d => d !== selectedDebris);
                envelopeBounce = 1;
                if (selectedDebris.img === debrisImg1) debris1Count++;
                if (selectedDebris.img === debrisImg2) debris2Count++;

                if (debris1Count + debris2Count >= 10 && !bouquetAvailable) {
                    bouquetAvailable = true;
                    bouquet = {
                        x:        b.x + b.w / 2,
                        y:        b.y - 40,
                        size:     90,
                        dragging: false,
                        offsetX:  0,
                        offsetY:  0,
                    };
                }
            }
            selectedDebris.dragging = false;
            selectedDebris          = null;
        }
    };


    // ============================================================
    //  MICROPHONE
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
        } catch(e) { console.log('Mic unavailable:', e); }
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
            loudEvents.push(Date.now());
            loudEvents = loudEvents.filter(t => Date.now() - t < 60000);
            if (loudEvents.length >= 3) { frustrationTimer = 60 * 60; loudEvents = []; }
            if (c.micLevel * 100 > 50) fearLevel = Math.min(1, fearLevel + 0.15);
            c.freezeTimer   = 120;
            c.returningHome = true;
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
            c.need        = data.need        || 50;
            c.totalVisits = (data.totalVisits || 0) + 1;
            c.lastVisit   = data.lastVisit   || null;

            // FIX: guard against null lastVisit before using it
            if (c.lastVisit) {
                let hours = Math.min((Date.now() - c.lastVisit) / 3600000, AFK_MAX_HOURS);
                c.need           = Math.min(c.need + hours * AFK_PER_HOUR, 100);
                c.trustBuildRate = 0.001 / (1 + hours * 0.15);
                c.awayTooLong    = hours >= 1;
            }
        } catch(e) {
            c.totalVisits = 1;
        }
    }


    // ============================================================
    //  SIDEBAR SYNC
    // ============================================================

    // FIX: colorFor moved outside updateSidebar so it is a proper named function
    function colorFor(value) {
        if (value < 0.33) return "#66dd88";
        if (value < 0.66) return "#ffaa00";
        return "#ff4444";
    }

    function updateSidebar(c) {
        // Icon value labels (in state card)
        let relVal = document.getElementById("ui-relationship-val");
        if (relVal) relVal.textContent = Math.floor(relationshipLevel * 100);

        let fearVal = document.getElementById("ui-fear-val");
        if (fearVal) fearVal.textContent = Math.floor(fearLevel * 100);

        let noiseVal = document.getElementById("ui-noise-val");
        if (noiseVal) noiseVal.textContent = Math.floor(c.micLevel * 100);

        // Bar colours
        let relBar   = document.getElementById("ui-relationship-bar");
        let fearBar  = document.getElementById("ui-fear-bar");
        let noiseBar = document.getElementById("ui-noise-bar");
        if (relBar)   { relBar.style.width   = (relationshipLevel * 100) + "%"; relBar.style.background   = colorFor(relationshipLevel); }
        if (fearBar)  { fearBar.style.width  = (fearLevel * 100)         + "%"; fearBar.style.background  = colorFor(fearLevel);         }
        if (noiseBar) { noiseBar.style.width = Math.min(100, c.micLevel * 100) + "%"; noiseBar.style.background = colorFor(c.micLevel);  }

        // State label colour
        if (ui.state) {
            ui.state.style.color =
                c.state === "fear"       ? "#ff4444" :
                c.state === "frustrated" ? "#ff8844" :
                c.state === "distressed" ? "#ffaa00" :
                c.state === "worried"    ? "#ffcc00" :
                c.state === "untrusted"  ? "#cccc00" :
                c.state === "calm"       ? "#66dd88" :
                c.state === "happy"      ? "#88ff88" : "#ffffff";
        }

        if (ui.hour)    ui.hour.textContent    = c.hour % 12 || 12;
        if (ui.period)  ui.period.textContent  = c.hour < 12 ? 'am' : 'pm';
        if (ui.state)   ui.state.textContent   = c.state;
        if (ui.desc)    ui.desc.textContent    = STATE_DESCRIPTIONS[c.state] || '';
        if (ui.needVal) ui.needVal.textContent = Math.floor(c.need);
        if (ui.needBar) ui.needBar.style.width = c.need + "%";
        if (ui.visits)  ui.visits.textContent  = c.totalVisits;
        if (ui.excited) ui.excited.textContent = c.exciteTimer > 0 ? 'yes!' : 'no';
        if (ui.watched) ui.watched.textContent = c.isWatched ? 'on' : 'away';
        if (ui.mic)     ui.mic.textContent     = micActive ? c.micLevel.toFixed(2) : '—';
        if (ui.trustVal) ui.trustVal.textContent = Math.floor(c.trustLevel * 100);
        if (ui.trustBar) ui.trustBar.style.width  = (c.trustLevel * 100) + "%";

        if (ui.day) {
            const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
            ui.day.textContent = days[new Date().getDay()];
        }

        if (ui.weather) {
            ui.weather.textContent = (weatherData && weatherData.current)
                ? describeWeather(weatherData.current.weather_code)
                : "loading…";
        }

        let uiEnv = document.getElementById("ui-envelope-count");
        if (uiEnv) uiEnv.textContent = debris1Count + debris2Count;

        let connBar = document.getElementById("ui-connection-bar");
        if (connBar) connBar.style.width = (connectionLevel * 100) + "%";

        // Time away
        if (ui.away) {
            focusAwayMinutes = focusLostAt ? Math.floor((Date.now() - focusLostAt) / 60000) : 0;
            ui.away.textContent = focusAwayMinutes + "m";
        }

        // AFK counter
        if (ui.afk && c.lastVisit) {
            ui.afk.textContent = Math.floor((Date.now() - c.lastVisit) / 60000) + "m";
        }
    }


    // ============================================================
    //  UTILITY
    // ============================================================

    function drawImageNoStretch(img) {
        if (!img) return;
        let imgRatio    = img.width / img.height;
        let canvasRatio = p.width   / p.height;
        let drawW, drawH;
        if (imgRatio > canvasRatio) { drawH = p.height; drawW = drawH * imgRatio; }
        else                        { drawW = p.width;  drawH = drawW / imgRatio; }
        p.image(img, (p.width - drawW) / 2, (p.height - drawH) / 2, drawW, drawH);
    }


    // ============================================================
    //  WINDOW RESIZE
    // ============================================================

    p.windowResized = function() {
        let sz = canvasSize();
        p.resizeCanvas(sz.w, sz.h);
    };


    // ============================================================
    //  SIDEBAR CONTROLS
    // ============================================================

    window._resetNeed = () => { if (creature) creature.need = 0; };
    window._maxNeed   = () => { if (creature) creature.need = 100; };
    window._setDecay  = v  => { DECAY_RATE = v; };
    window._setFeed   = v  => { CLICK_FEED = v; };

}, document.body);
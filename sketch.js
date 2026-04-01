// ============================================================
//  YOUR CREATURE  —  sketch.js   (spider edition)
//  MDDN242 Project 2
// ============================================================

new p5(function(p) {

    // ============================================================
    //  SETTINGS
    // ============================================================

    const SHOW_UI      = true;

    let CREATURE_SIZE  = 120;
    let DECAY_RATE     = 0.003;
    let AWAY_RATE      = 0.020;
    let AFK_PER_HOUR   = 5;
    let AFK_MAX_HOURS  = 168;
    let CLICK_FEED     = 20;
    let MIC_THRESHOLD  = 0.15;
    let EXCITED_FRAMES = 40;
    let BOUNCE_SCALE   = 1.0;

    const BODY_COL = [255, 126, 0];
    const BLACK    = [0, 0, 0];
    const WHITE    = [255, 255, 255];

    // ============================================================
    //  STATE MACHINE
    // ============================================================

    const STATES = {
        happy:      { bounceAmt: 0.04, shakeAmt: 0.0, alphaTarget: 255 },
        neutral:    { bounceAmt: 0.02, shakeAmt: 0.0, alphaTarget: 180 },
        distressed: { bounceAmt: 0.01, shakeAmt: 1.5, alphaTarget: 127 },
        excited:    { bounceAmt: 0.10, shakeAmt: 0.0, alphaTarget: 255 },
    };

    const STATE_DESCRIPTIONS = {
        happy:      'need is low — bouncy, fully visible',
        neutral:    'need is rising — slightly transparent',
        distressed: 'need is high — shaking, 50% transparent',
        excited:    'heard a sound! — big pupils, roaming',
    };

    function getState(c) {
        if (c.exciteTimer > 0) return 'excited';
        if (c.need <= 30)      return 'happy';
        if (c.need <= 70)      return 'neutral';
        return 'distressed';
    }


    // ============================================================
    //  CREATURE FACTORY
    // ============================================================

    function createCreature(x, y) {
        return {
            x, y,
            need:  50,
            state: 'neutral',
            bounceAmt: 0.02,
            bodyAlpha: 255,
            originX: x, originY: y,
            wanderX: 0, wanderY: 0,
            wanderTargetX: 0, wanderTargetY: 0,
            wanderChangeTimer: 0,
            exciteTimer: 0,
            orbitAngle:  0,
            breathe: 0,
            bob:     0,
            hour:    new Date().getHours(),
            isWatched: true,
            micLevel:  0,
            lastVisit:   null,
            totalVisits: 0,
        };
    }

    let creature;
    let micAnalyser = null;
    let micActive   = false;
    let micData     = null;

    let ui = {};


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

    p.setup = function() {
        let sz  = canvasSize();
        let cnv = p.createCanvas(sz.w, sz.h);
        cnv.parent('canvas-container');
        cnv.mousePressed(onCanvasClick);

        creature = createCreature(p.width / 2, p.height / 2);
        loadState(creature);

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

        window.addEventListener('focus', () => { creature.isWatched = true; });
        window.addEventListener('blur',  () => { creature.isWatched = false; });

        setInterval(() => { saveState(creature); creature.hour = new Date().getHours(); }, 30000);
        window.addEventListener('beforeunload', () => saveState(creature));
    };


    // ============================================================
    //  DRAW LOOP
    // ============================================================

    p.draw = function() {
        p.background(51, 35, 94);
        updateMic(creature);
        updateCreature(creature);
        drawCreature(creature);
        if (p.frameCount % 6 === 0) updateSidebar(creature);
    };


    // ============================================================
    //  CREATURE LOGIC
    // ============================================================

    function updateCreature(c) {
        let rate = c.isWatched ? DECAY_RATE : AWAY_RATE;
        c.need = p.constrain(c.need + rate, 0, 100);

        c.state = getState(c);
        let s = STATES[c.state];
        c.bounceAmt = p.lerp(c.bounceAmt, s.bounceAmt * BOUNCE_SCALE, 0.08);
        c.bodyAlpha = p.lerp(c.bodyAlpha, s.alphaTarget, 0.05);

        c.breathe += 0.018;
        c.bob     += 0.012;

        if (c.exciteTimer > 0) {
            c.exciteTimer--;
            let mouseOnCanvas = p.mouseX >= 0 && p.mouseX <= p.width &&
                                p.mouseY >= 0 && p.mouseY <= p.height;
            if (mouseOnCanvas) {
                const ORBIT_RADIUS = CREATURE_SIZE * 0.55;
                let distToMouse = p.dist(c.x, c.y, p.mouseX, p.mouseY);
                if (distToMouse > ORBIT_RADIUS * 1.5) {
                    c.wanderTargetX = p.mouseX - c.originX;
                    c.wanderTargetY = p.mouseY - c.originY;
                } else {
                    c.orbitAngle += 0.025;
                    c.wanderTargetX = (p.mouseX - c.originX) + Math.cos(c.orbitAngle) * ORBIT_RADIUS;
                    c.wanderTargetY = (p.mouseY - c.originY) + Math.sin(c.orbitAngle) * ORBIT_RADIUS;
                }
            } else {
                c.wanderChangeTimer--;
                if (c.wanderChangeTimer <= 0) {
                    let pad = CREATURE_SIZE * 0.6;
                    c.wanderTargetX = p.random(pad, p.width  - pad) - c.originX;
                    c.wanderTargetY = p.random(pad, p.height - pad) - c.originY;
                    c.wanderChangeTimer = p.floor(p.random(30, 70));
                }
            }
        } else {
            c.wanderTargetX = 0;
            c.wanderTargetY = 0;
        }

        c.wanderX = p.lerp(c.wanderX, c.wanderTargetX, 0.04);
        c.wanderY = p.lerp(c.wanderY, c.wanderTargetY, 0.04);
        c.x = c.originX + c.wanderX;
        c.y = c.originY + c.wanderY;
    }


    // ============================================================
    //  DRAWING
    // ============================================================

    function drawCreature(c) {
        p.push();
        p.translate(c.x, c.y);
        p.translate(0, p.sin(c.bob) * 6);

        let s = STATES[c.state];
        let bScale = 1 + p.sin(c.breathe) * c.bounceAmt;

        if (s.shakeAmt > 0) {
            p.translate(
                p.random(-s.shakeAmt, s.shakeAmt),
                p.random(-s.shakeAmt * 0.4, s.shakeAmt * 0.4)
            );
        }

        // Scale so CREATURE_SIZE maps to the full spider span
        let sc = CREATURE_SIZE / 55.0 * bScale;
        p.scale(sc);

        drawSpider(c);
        p.pop();
    }


    // ============================================================
    //  SPIDER DRAWING
    //  Origin (0,0) = centre of spider body.
    //  Based directly on the pixel art sprite.
    // ============================================================

    function drawSpider(c) {
        let alpha = c.bodyAlpha;
        let legSway = p.sin(c.breathe * 1.3) * 2.5;
        drawLegs(alpha, legSway);
        drawPedipalps(c, alpha);
        drawBody(alpha);
        drawEyes(c, alpha);
    }


    // ── 8 legs ───────────────────────────────────────────────

    function drawLegs(alpha, sway) {
        p.strokeWeight(1.5);
        p.noFill();

        // Each call: start on body edge, two bezier control points, tip
        // Left legs — sway +, right legs — sway -
        let ls = sway;
        let rs = -sway;

        // LEFT
        drawLeg(-8, -8,   -16, -20+ls,  -30, -22+ls,  -32, -16+ls, alpha);
        drawLeg(-10, -2,  -20, -8+ls,   -34, -4+ls,   -38, 3+ls,   alpha);
        drawLeg(-10, 4,   -18, 10+ls,   -30, 18+ls,   -34, 26+ls,  alpha);
        drawLeg(-8, 10,   -14, 20+ls,   -20, 30+ls,   -20, 38+ls,  alpha);

        // RIGHT
        drawLeg(8, -8,    16, -20+rs,   30, -22+rs,   32, -16+rs,  alpha);
        drawLeg(10, -2,   20, -8+rs,    34, -4+rs,    38, 3+rs,    alpha);
        drawLeg(10, 4,    18, 10+rs,    30, 18+rs,    34, 26+rs,   alpha);
        drawLeg(8, 10,    14, 20+rs,    20, 30+rs,    20, 38+rs,   alpha);
    }

    function drawLeg(x0, y0, cx1, cy1, cx2, cy2, x3, y3, alpha) {
        p.stroke(...BLACK, alpha);
        p.beginShape();
        p.vertex(x0, y0);
        p.bezierVertex(cx1, cy1, cx2, cy2, x3, y3);
        p.endShape();
    }


    // ── Pedipalps ────────────────────────────────────────────

    function drawPedipalps(c, alpha) {
        p.stroke(...BLACK, alpha);
        p.strokeWeight(1.5);
        p.noFill();

        let mouseAngle = p.atan2(p.mouseY - c.y, p.mouseX - c.x);
        let lean = p.constrain(mouseAngle * 0.08, -0.25, 0.25);

        // Left pedipalp
        p.beginShape();
        p.vertex(-4, -14);
        p.bezierVertex(-7+lean, -22, -13+lean, -26, -9+lean, -31);
        p.endShape();

        // Right pedipalp
        p.beginShape();
        p.vertex(4, -14);
        p.bezierVertex(7+lean, -22, 13+lean, -26, 9+lean, -31);
        p.endShape();
    }


    // ── Body ─────────────────────────────────────────────────

    function drawBody(alpha) {
        p.noStroke();

        // Abdomen — large orange rear section
        p.fill(...BODY_COL, alpha);
        p.ellipse(0, 9, 32, 30);

        // Cephalothorax — smaller darker front section
        p.fill(190, 85, 0, alpha);
        p.ellipse(0, -7, 24, 20);

        // Subtle outline
        p.stroke(...BLACK, alpha * 0.5);
        p.strokeWeight(0.8);
        p.noFill();
        p.ellipse(0, 9, 32, 30);
        p.ellipse(0, -7, 24, 20);
        p.noStroke();

        // Pedicel (waist)
        p.fill(...BLACK, alpha);
        p.ellipse(0, 1, 7, 6);
    }


    // ── Eyes ─────────────────────────────────────────────────

    function drawEyes(c, alpha) {
        let angle     = p.atan2(p.mouseY - c.y, p.mouseX - c.x);
        let mouseDist = p.dist(p.mouseX, p.mouseY, c.x, c.y);
        let move      = p.min(1.0, mouseDist * 0.006);
        let px        = p.cos(angle) * move;
        let py        = p.sin(angle) * move;

        let pupilBig = c.state === 'excited';

        // Front row — 4 main eyes
        let front = [[-7, -11], [-2.5, -13], [2.5, -13], [7, -11]];
        for (let [ex, ey] of front) {
            p.noStroke();
            p.fill(...WHITE, alpha);
            p.ellipse(ex, ey, 4.8, 4.8);
            p.fill(...BLACK, alpha);
            p.ellipse(ex + px, ey + py, pupilBig ? 2.8 : 1.5, pupilBig ? 2.8 : 1.5);
        }

        // Back row — 4 smaller secondary eyes
        let back = [[-6, -7.5], [-2, -9], [2, -9], [6, -7.5]];
        for (let [ex, ey] of back) {
            p.noStroke();
            p.fill(...WHITE, alpha * 0.75);
            p.ellipse(ex, ey, 2.8, 2.8);
            p.fill(...BLACK, alpha);
            p.ellipse(ex + px * 0.4, ey + py * 0.4, pupilBig ? 1.6 : 0.9, pupilBig ? 1.6 : 0.9);
        }
    }


    // ============================================================
    //  INPUT: MOUSE CLICK
    // ============================================================

    function onCanvasClick() {
        if (!micActive) startMic();
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
        if (c.micLevel > MIC_THRESHOLD) c.exciteTimer = EXCITED_FRAMES;
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
    }


    // ============================================================
    //  SIDEBAR SYNC
    // ============================================================

    function updateSidebar(c) {
        ui.hour.textContent    = c.hour % 12 || 12;
        ui.period.textContent  = c.hour < 12 ? 'am' : 'pm';
        ui.state.textContent   = c.state;
        ui.desc.textContent    = STATE_DESCRIPTIONS[c.state] || '';
        ui.needVal.textContent = Math.floor(c.need);
        ui.visits.textContent  = c.totalVisits;
        ui.excited.textContent = c.exciteTimer > 0 ? 'yes!' : 'no';
        ui.watched.textContent = c.isWatched ? 'on' : 'away';
        ui.mic.textContent     = micActive ? c.micLevel.toFixed(2) : '—';

        ui.needBar.style.width = c.need + '%';
        ui.needBar.style.backgroundColor =
            c.need < 30 ? '#283713' :
            c.need < 70 ? '#c9973a' : '#c0522a';
    }


    // ============================================================
    //  WINDOW RESIZE
    // ============================================================

    p.windowResized = function() {
        let sz = canvasSize();
        p.resizeCanvas(sz.w, sz.h);
        creature.originX = p.width / 2;
        creature.originY = p.height / 2;
    };


    // ============================================================
    //  SIDEBAR CONTROLS
    // ============================================================

    window._resetNeed = () => { if (creature) creature.need = 0; };
    window._maxNeed   = () => { if (creature) creature.need = 100; };
    window._setDecay  = v => { DECAY_RATE = v; };
    window._setFeed   = v => { CLICK_FEED = v; };

}, document.body);
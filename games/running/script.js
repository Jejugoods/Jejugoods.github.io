// TIGER RUN GAME SCRIPT
// v2.9.1 - Debugging Added

// Global Error Handler for Mobile/User Debugging
window.onerror = function (msg, url, lineNo, columnNo, error) {
    const errorMsg = `Error: ${msg}\nLine: ${lineNo}\nColumn: ${columnNo}`;
    // console.error(errorMsg); // Still log to console

    // Create a visible error box on screen
    let errorBox = document.getElementById('debug-error-box');
    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.id = 'debug-error-box';
        errorBox.style.position = 'fixed';
        errorBox.style.top = '0';
        errorBox.style.left = '0';
        errorBox.style.width = '100%';
        errorBox.style.background = 'rgba(255, 0, 0, 0.8)';
        errorBox.style.color = 'white';
        errorBox.style.padding = '10px';
        errorBox.style.zIndex = '99999';
        errorBox.style.fontFamily = 'monospace';
        errorBox.style.fontSize = '12px';
        errorBox.style.wordBreak = 'break-all';
        document.body.appendChild(errorBox);
    }
    errorBox.innerText = errorMsg;
    return false;
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// Off-screen canvas removed for performance


// ==================== CONFIGURATION ====================
let W = 800;
let H = 350;
let SCALE = 1;

// Physics Constants
let speed = 6.5;
const GRAVITY = 0.7;
const JUMP_FORCE_1 = -13;
const JUMP_FORCE_2 = -10;

// Sizing
const TIGER_W = 130;
const TIGER_H = 92;

// Floor Level
const FLOOR_Y = H - 55;
const GROUND_Y = FLOOR_Y - TIGER_H;

// VISUAL OFFSETS
const TIGER_VISUAL_OFFSET_Y = 10;

// Assets Configuration
const ASSETS = {
    tiger_run: 'assets/tiger_run_24-Photoroom.png?v=2', // Force reload, 4x6 Grid
    tiger_jump: 'assets/tiger_jump.png',
    tiger_slide: 'assets/tiger_slide.png',
    tiger_hurt: 'assets/tiger_hurt.png',

    // bg_sky removed
    bg_mountain: 'assets/bg_mountain.png',
    bg_forest: 'assets/bg_forest.png',

    ground_main: 'assets/ground_main.png',

    obs_rock_small: 'assets/obs_rock_small.png',
    obs_stump: 'assets/obs_stump.png',
    obs_bird: 'assets/obs_bird.png',

    item_meat: 'assets/item_meat.png',
    item_gem: 'assets/item_gem.png',
    item_potion: 'assets/item_potion.png',

    platform_floating: 'assets/platform_floating.png'
};

// Game State
let gameState = 'start';
let score = 0;
let meatScore = 0;
let lastTime = 0;
let gameFrameCount = 0;

// World Objects
const tiger = {
    x: 80,
    y: GROUND_Y,
    w: TIGER_W,
    h: TIGER_H,
    vy: 0,
    state: 'run',
    jumpCount: 0,
    maxJumps: 2,
    slideTimer: 0,
    animFrame: 0,
    animTimer: 0,
    grounded: true,
    onPlatform: false
};

let bgMountains = [];
let bgTrees = [];
let groundTiles = [];
let obstacles = [];
let meats = [];
let obstacleTimer = 0;
// Removed duplicate declarations
let difficultyTimer = 0;
let feverTimer = 0; // Fever Mode Timer (Frames)
let gameTime = 60; // 60 Seconds Countdown
let meatBonusCounter = 0; // Track meats for time bonus
let tutorialFlags = { jump: false, slide: false }; // Track shown hints

const TILE_W = 128;
const GROUND_H = 80;

// Image Loading
const images = {};
let loadedCount = 0;
const totalImages = Object.keys(ASSETS).length;

function loadAssets() {
    console.log('Starting asset load...');
    Object.entries(ASSETS).forEach(([name, src]) => {
        const img = new Image();
        img.onload = () => {
            loadedCount++;
            if (loadedCount === totalImages) {
                console.log('All assets loaded');
                initGame();
            }
        };
        img.onerror = () => {
            console.warn('Failed to load asset:', name);
            loadedCount++;
            if (loadedCount === totalImages) {
                initGame();
            }
        };
        img.src = src;
        images[name] = img;
    });
}

function initGame() {
    resizeCanvas();
    drawStartBg();
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isLandscape = vw > vh;

    W = 800;
    H = 350;

    if (isLandscape) {
        SCALE = Math.min(vw / W, vh / H);
    } else {
        SCALE = vw / W;
        if (H * SCALE > vh * 0.6) {
            SCALE = (vh * 0.6) / H;
        }
    }

    canvas.style.width = (W * SCALE) + 'px';
    canvas.style.height = (H * SCALE) + 'px';

    canvas.width = W * SCALE * dpr;
    canvas.height = H * SCALE * dpr;

    ctx.resetTransform();
    ctx.scale(SCALE * dpr, SCALE * dpr);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 200));

function initWorld() {
    bgMountains = [];
    bgTrees = [];
    groundTiles = [];
    obstacles = [];
    meats = [];
    obstacleTimer = 0;
    // Removed duplicate assignment
    difficultyTimer = 0;
    feverTimer = 0;
    feverTimer = 0;
    gameTime = 60;
    meatBonusCounter = 0;
    tutorialFlags = { jump: false, slide: false, double: false };
    speed = 6.5;
    speed = 6.5;

    // Parallax Setup
    for (let i = 0; i < 3; i++) {
        bgMountains.push({ x: i * 800, y: 0, w: 800, h: 350 });
        bgTrees.push({ x: i * 800, y: 0, w: 800, h: 350 });
    }

    // Ground Setup
    for (let i = 0; i < Math.ceil(W / TILE_W) + 4; i++) {
        groundTiles.push({
            x: i * TILE_W,
            img: 'ground_main',
            w: TILE_W + 1,
            h: GROUND_H
        });
    }
}

function spawnObstacle() {
    // FEVER MODE: No Obstacles
    if (feverTimer > 0) return;

    const r = Math.random();
    let obj;
    // Helper: Top Y of object given its height, so it sits on FLOOR_Y
    const onFloor = (h) => FLOOR_Y - h;

    if (r < 0.3) {
        // Small Rock
        const h = 70;
        obj = {
            x: W + 20, y: onFloor(h) + 25,
            w: 70, h: h,
            img: 'obs_rock_small', type: 'ground'
        };
        spawnMeatLine(W + 50, FLOOR_Y - 120, 3, 50);
    } else if (r < 0.5) {
        // Tall Stump (DOUBLE JUMP)
        const h = 130; // Slightly taller (was 120) based on user "raise stump"
        obj = {
            x: W + 20, y: onFloor(h) + 20,
            w: 70, h: h,
            img: 'obs_stump', type: 'ground'
        };
        spawnMeatLine(W + 30, FLOOR_Y - 150, 2, 50);
    } else if (r < 0.7) {
        // Platform
        obj = {
            x: W + 20, y: FLOOR_Y - 160, w: 160, h: 50,
            img: 'platform_floating', type: 'platform'
        };
        spawnMeatLine(W + 40, FLOOR_Y - 200, 3, 40);
    } else if (r < 0.85) {
        // Bird
        obj = {
            x: W + 20, y: FLOOR_Y - 110, w: 90, h: 60,
            img: 'obs_bird', type: 'overhead'
        };
        spawnMeatLine(W + 30, FLOOR_Y - 30, 3, 40);
    } else {
        // Double Rock
        obstacles.push({
            x: W + 180, y: onFloor(70) + 25, w: 70, h: 70,
            img: 'obs_rock_small', type: 'ground'
        });
        obj = {
            x: W + 20, y: onFloor(70) + 25, w: 70, h: 70,
            img: 'obs_rock_small', type: 'ground'
        };
        spawnMeatLine(W + 80, FLOOR_Y - 140, 5, 40);
    }

    // ATTACH TUTORIAL HINT (First time only)
    // ATTACH TUTORIAL HINT (First time only)
    if (obj) {
        // Priority 1: Double Jump (High Stump)
        if (!tutorialFlags.double && obj.img === 'obs_stump') {
            obj.hint = 'DOUBLE';
            tutorialFlags.double = true;
        }
        // Priority 2: Slide (Bird)
        else if (!tutorialFlags.slide && obj.type === 'overhead') {
            obj.hint = 'SLIDE';
            tutorialFlags.slide = true;
        }
        // Priority 3: Jump (Rock, Platform) - Only if not already tagged
        else if (!tutorialFlags.jump && (obj.type === 'ground' || obj.type === 'platform')) {
            obj.hint = 'JUMP';
            tutorialFlags.jump = true;
        }
        obstacles.push(obj);
    }

    // Rare Gem or POTION
    const rareChance = Math.random();
    if (rareChance < 0.05) {
        // POTION! (Mega Score)
        meats.push({
            x: W + 100 + Math.random() * 150,
            y: FLOOR_Y - 140 - Math.random() * 60,
            w: 60, h: 60, // Bigger
            img: 'item_potion',
            type: 'potion',
            bobOffset: Math.random() * Math.PI * 2
        });
    } else if (rareChance < 0.15) {
        // Gem
        meats.push({
            x: W + 100 + Math.random() * 150,
            y: FLOOR_Y - 140 - Math.random() * 60,
            w: 55, h: 55, // Bigger
            img: 'item_gem',
            type: 'gem',
            bobOffset: Math.random() * Math.PI * 2
        });
    }
}

function spawnMeatLine(x, y, count, spacing) {
    for (let i = 0; i < count; i++) {
        meats.push({
            x: x + i * spacing,
            y: y,
            w: 50, h: 50, // Meat Bigger (was 45)
            img: 'item_meat',
            type: 'meat',
            bobOffset: Math.random() * Math.PI * 2
        });
    }
}

function update(dt) {
    const dtScale = dt / 16.666;

    gameFrameCount++;
    difficultyTimer++;

    if (difficultyTimer % 300 === 0 && speed < 15) {
        speed += 0.3;
    }

    if (gameFrameCount % 60 === 0) {
        score += Math.floor(speed * 0.5);
    }

    document.getElementById('score-display').textContent = score.toLocaleString();
    document.getElementById('meat-count').textContent = '🍖 ' + meatScore;
    document.getElementById('speed-display').textContent = 'x' + speed.toFixed(1);

    // Physics
    if (tiger.state !== 'slide' || !tiger.grounded) {
        tiger.vy += GRAVITY * dtScale;
        tiger.y += tiger.vy * dtScale;
    }

    // Speed Increment (Gradually faster over time)
    speed = Math.min(20, speed + 0.0005 * dtScale);

    // Ground Check
    if (tiger.y >= GROUND_Y) {
        tiger.y = GROUND_Y;
        tiger.vy = 0;
        tiger.grounded = true;
        tiger.jumpCount = 0;
        if (tiger.state === 'jump') tiger.state = 'run';
    }

    // Platform Logic
    let onPlatform = false;
    if (tiger.vy >= 0) {
        const footX = tiger.x + tiger.w / 2;
        const footY = tiger.y + tiger.h;
        for (const obs of obstacles) {
            if (obs.type === 'platform') {
                if (footX > obs.x && footX < obs.x + obs.w) {
                    if (footY >= obs.y && footY <= obs.y + 30) {
                        tiger.y = obs.y - tiger.h;
                        tiger.vy = 0;
                        tiger.grounded = true;
                        tiger.jumpCount = 0;
                        tiger.state = 'run';
                        onPlatform = true;
                        break;
                    }
                }
            }
        }
    }

    tiger.onPlatform = onPlatform;

    if (!onPlatform && tiger.y < GROUND_Y && tiger.grounded) {
        tiger.grounded = false;
    }

    if (tiger.y > GROUND_Y) {
        tiger.y = GROUND_Y;
        tiger.grounded = true;
    }


    // Animation
    tiger.animTimer += dtScale;
    // 24 frames needs to play fast. Run: ~24 frames per cycle.
    // User requested slower speed (5)
    const animThresh = tiger.state === 'run' ? 5 : 6;

    if (tiger.animTimer > animThresh) {
        tiger.animTimer = 0;
        const maxFrames = tiger.state === 'run' ? 24 : 4;
        tiger.animFrame = (tiger.animFrame + 1) % maxFrames;
    }

    if (tiger.state === 'slide') {
        tiger.slideTimer += dtScale;
        if (tiger.slideTimer > 50) endSlide();
    }

    // Move Bg
    bgMountains.forEach(m => {
        m.x -= (speed * 0.2) * dtScale;
        if (m.x + m.w < 0) { const maxX = Math.max(...bgMountains.map(b => b.x)); m.x = maxX + m.w - 2; }
    });
    // DISABLED Forest
    // bgTrees.forEach(t => {
    //    t.x -= (speed * 0.5) * dtScale;
    //    if (t.x + t.w < 0) { const maxX = Math.max(...bgTrees.map(b => b.x)); t.x = maxX + t.w - 2; }
    // });

    // Move Ground
    groundTiles.forEach(tile => {
        tile.x -= speed * dtScale;
    });
    // Check for recycling independently to ensure perfect snapping
    groundTiles.forEach(tile => {
        if (tile.x + tile.w < -20) {
            const maxX = Math.max(...groundTiles.map(t => t.x));
            tile.x = maxX + TILE_W - 2; // -2 for slight overlap to prevent gaps
        }
    });

    // Move Obstacles
    obstacleTimer += dtScale;
    const spawnInterval = Math.max(40, 100 - speed * 3) + Math.random() * 20;
    if (obstacleTimer > spawnInterval) {
        spawnObstacle();
        obstacleTimer = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= speed * dtScale;
        if (obstacles[i].x + obstacles[i].w < -100) obstacles.splice(i, 1);
    }

    // Game Timer Logic
    if (gameFrameCount % 60 === 0) {
        gameTime--;
        if (gameTime <= 0) {
            gameTime = 0;
            gameOver();
            return;
        }
    }
    document.getElementById('time-display').textContent = '⏳ ' + gameTime;

    // Move Meats
    for (let i = meats.length - 1; i >= 0; i--) {
        const c = meats[i];
        c.x -= speed * dtScale;
        if (c.x < -100) { meats.splice(i, 1); continue; }

        const bobY = Math.sin(gameFrameCount * 0.1 + c.bobOffset) * 5;
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2 + bobY;
        const tx = tiger.x + tiger.w / 2, ty = tiger.y + tiger.h / 2;

        if (Math.abs(cx - tx) < 50 && Math.abs(cy - ty) < 50) {
            if (c.type === 'potion') {
                score += 1000; meatScore += 5;
                feverTimer = 300; // 5 Seconds (approx 60fps)
            }
            else if (c.type === 'gem') { score += 500; meatScore += 10; }
            else {
                score += 100;
                meatScore += 1;
                meatBonusCounter++; // Track for bonus
                if (meatBonusCounter >= 10) {
                    gameTime += 5; // Bonus Time!
                    meatBonusCounter = 0;
                    // Optional: Float text effect could go here
                }
            }

            meats.splice(i, 1);
        }
    }

    // Fever Timer Tick
    if (feverTimer > 0) {
        feverTimer -= dtScale;

        // FEVER MODE: SPAWN MEAT WALL (Moved to update for high frequency)
        if (gameFrameCount % 6 === 0) { // Very dense (every 6 frames)
            // Spawn a vertical column of meat (5 items high)
            // User wanted "running to floating" covered
            for (let j = 0; j < 5; j++) {
                spawnMeatLine(W + 50, FLOOR_Y - 50 - (j * 45), 1, 0);
            }
        }
    }

    // Collision (Game Over)
    const slideActive = tiger.state === 'slide';
    const hx = tiger.x + 30;
    const hw = tiger.w - 60;
    const hh = slideActive ? tiger.h * 0.4 : tiger.h - 20;
    const hy = slideActive ? tiger.y + tiger.h - hh : tiger.y + 20;

    for (const obs of obstacles) {
        if (obs.type === 'platform') continue;

        // Tighten Obstacle Hitbox
        let ox = obs.x + 15, oy = obs.y + 15, ow = obs.w - 30, oh = obs.h - 15;

        // Custom Hitbox: Stump (More forgiving on top/sides)
        if (obs.img === 'obs_stump') {
            ox = obs.x + 25; ow = obs.w - 50;
            oy = obs.y + 25; oh = obs.h - 25;
        }

        // Custom Hitbox: Bird (More forgiving on bottom for sliding, but must hit standing tiger!)
        if (obs.type === 'overhead') {
            if (slideActive) continue;
            // oh = obs.h - 15 ensures the hitbox goes down enough to hit the tiger's head
            // ox, oy tightened slightly to allow grazing
            ox = obs.x + 20; oy = obs.y + 20; ow = obs.w - 40; oh = obs.h - 15;
        }

        if (hx < ox + ow && hx + hw > ox && hy < oy + oh && hy + hh > oy) {
            // FEVER MODE: INVINCIBLE
            if (feverTimer > 0) continue;

            gameOver();
            return;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, W, H);

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(1, '#D4EED4');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // FEVER MODE EFFECT (Rainbow Sky Overlay)
    if (feverTimer > 0) {
        ctx.save();
        const hue = (gameFrameCount * 5) % 360;
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.2)`;
        ctx.fillRect(0, 0, W, H);

        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText('🔥 FEVER MODE 🔥', W / 2, 100);
        ctx.fillText('🔥 FEVER MODE 🔥', W / 2, 100);
        ctx.restore();
    }

    // Low Opacity for "Simple" look
    ctx.save();
    ctx.globalAlpha = 0.4;
    // Mountains
    bgMountains.forEach(m => { if (images.bg_mountain) ctx.drawImage(images.bg_mountain, m.x, H - 350, m.w, 350); });

    // Forest - DISABLED
    // bgTrees.forEach(t => { if (images.bg_forest) ctx.drawImage(images.bg_forest, t.x, H - 300, t.w, 300); });
    ctx.restore();

    // Ground
    groundTiles.forEach(tile => {
        if (images.ground_main) {
            ctx.drawImage(images.ground_main, tile.x, FLOOR_Y - 30, tile.w, tile.h + 30);
        }
    });

    // Obstacles - SHADOW
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    obstacles.forEach(obs => {
        if (images[obs.img]) {
            ctx.drawImage(images[obs.img], obs.x, obs.y, obs.w, obs.h);
        } else {
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        }

        // DRAW TUTORIAL HINT
        if (obs.hint) {
            ctx.save();
            ctx.font = 'bold 20px Arial';
            ctx.globalAlpha = 0.8 + Math.sin(gameFrameCount * 0.2) * 0.2; // Blink
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;

            let hintText = '';
            let hintColor = 'white';

            if (obs.hint === 'JUMP') {
                hintText = '⬆️ JUMP';
                hintColor = 'white';
            } else if (obs.hint === 'SLIDE') {
                hintText = '⬇️ SLIDE';
                hintColor = '#FFFF00'; // Yellow
            } else if (obs.hint === 'DOUBLE') {
                hintText = '⬆️⬆️ DOUBLE';
                hintColor = '#00FFFF'; // Cyan
            }

            ctx.fillStyle = hintColor;
            ctx.strokeText(hintText, obs.x - 10, obs.y - 40);
            ctx.fillText(hintText, obs.x - 10, obs.y - 40);
            ctx.restore();
        }
    });
    ctx.restore();

    // Meats - SHADOW ADDED to ITEMS
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,0,0.6)'; // Yellowish glow/shadow for items
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;

    meats.forEach(c => {
        const bobY = Math.sin(gameFrameCount * 0.1 + c.bobOffset) * 5;
        if (images[c.img]) {
            ctx.drawImage(images[c.img], c.x, c.y + bobY, c.w, c.h);
        } else {
            ctx.fillStyle = 'brown'; ctx.beginPath(); ctx.arc(c.x + c.w / 2, c.y + c.h / 2, 12, 0, Math.PI * 2); ctx.fill();
        }
    });
    ctx.restore();

    drawTiger();
}

function drawTiger() {
    let img;
    let is2x2 = true;
    let isRun24 = false;

    if (gameState === 'gameover') {
        img = images.tiger_hurt;
        is2x2 = false;
        if (img) {
            // Apply Offset
            ctx.drawImage(img, tiger.x, tiger.y + TIGER_VISUAL_OFFSET_Y, tiger.w, tiger.h);
        } else {
            ctx.fillStyle = 'red'; ctx.fillRect(tiger.x, tiger.y, tiger.w, tiger.h);
        }
        return;
    }

    if (tiger.state === 'run') {
        img = images.tiger_run;
        is2x2 = false;
        isRun24 = true;
    }
    else if (tiger.state === 'jump') { img = images.tiger_jump; is2x2 = true; }
    else if (tiger.state === 'slide') {
        img = images.tiger_slide;
        is2x2 = true;
    }
    else { img = images.tiger_run; is2x2 = false; isRun24 = true; }

    if (img) {
        ctx.save();

        // --- ANIMATION TRANSFORM ---
        let sx = 1, sy = 1, oy = 0;
        let rotation = 0;

        if (tiger.state === 'run') {
            ctx.transform(1, 0, -0.05, 1, 0, 0);
        } else if (tiger.state === 'jump') {
            const verticalForce = tiger.vy / 10;
            sy = 1 - verticalForce * 0.15;
            sx = 1 + verticalForce * 0.05;
            sy = Math.max(0.7, Math.min(1.3, sy));
            sx = Math.max(0.7, Math.min(1.3, sx));
        } else if (tiger.state === 'slide') {
            rotation = (8 * Math.PI) / 180;
            sy = 0.8;
            sx = 1.2;
            oy = 8;
        }

        const cx = tiger.x + tiger.w / 2;
        const cy = tiger.y + tiger.h;

        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        ctx.scale(sx, sy);

        // Note: Draw relative to the transformed center
        // We moved origin to center (cx, cy), so draw at (-w/2, -h) adjusted

        // CALCULATE DRAW Y WITH OFFSET (relative to origin 0,0 which is now at bottom-center of tiger)
        const platformOffset = tiger.onPlatform ? 20 : 0;
        const localDrawY = -tiger.h + oy + TIGER_VISUAL_OFFSET_Y + platformOffset;

        // Determine Sprite Frame
        if (isRun24) {
            // Grid: 4 Columns x 6 Rows
            const runFrames = [16, 17, 18, 19, 20, 21, 22, 23];
            const spriteIdx = runFrames[Math.floor(tiger.animFrame) % 8];

            const col = spriteIdx % 4;
            const row = Math.floor(spriteIdx / 4);

            const fw = img.width / 4;
            const fh = img.height / 6;

            ctx.drawImage(img, col * fw, row * fh, fw, fh, -tiger.w / 2, localDrawY, tiger.w, tiger.h);
        } else if (is2x2) {
            const fw = img.width / 2;
            const fh = img.height / 2;
            const col = tiger.animFrame % 2;
            const row = Math.floor(tiger.animFrame / 2);

            ctx.drawImage(img, col * fw, row * fh, fw, fh, -tiger.w / 2, localDrawY, tiger.w, tiger.h);
        } else {
            // Single Frame
            let dH = tiger.h;
            let dY = localDrawY;
            if (tiger.state === 'slide') {
                dH = tiger.h * 0.7; // Squish slightly for slide visual if needed
                dY = (-tiger.h + oy + TIGER_VISUAL_OFFSET_Y + platformOffset); // Adjust alignment
            }
            ctx.drawImage(img, -tiger.w / 2, dY, tiger.w, dH);
        }

        ctx.restore();
        return;
    } else {
        ctx.fillStyle = 'orange'; ctx.fillRect(tiger.x, tiger.y, tiger.w, tiger.h);
    }


}

function drawStartBg() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(1, '#D4EED4');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Low Opacity for "Simple" look
    ctx.save();
    ctx.globalAlpha = 0.4;
    // Mountains
    // Mountains
    bgMountains.forEach(m => {
        if (images.bg_mountain && images.bg_mountain.naturalWidth > 0) {
            ctx.drawImage(images.bg_mountain, m.x, H - 350, m.w, 350);
        }
    });

    // Forest - DISABLED
    // bgTrees.forEach(t => { if (images.bg_forest) ctx.drawImage(images.bg_forest, t.x, H - 300, t.w, 300); });
    ctx.restore();

    const titleImg = images.tiger_jump;
    if (titleImg && titleImg.naturalWidth > 0) {
        const fw = titleImg.width / 2;
        const fh = titleImg.height / 2;
        ctx.drawImage(titleImg, 0, 0, fw, fh, W / 2 - 60, H / 2 - 80, 120, 120);
    }
}


function startGame() {
    tiger.x = 80;
    tiger.y = GROUND_Y;
    tiger.vy = 0;
    tiger.state = 'run';
    tiger.jumpCount = 0;
    tiger.grounded = true;
    score = 0;
    meatScore = 0;
    gameTime = 60; // Force reset
    feverTimer = 0; // Force reset
    meatBonusCounter = 0; // Force reset
    speed = 6.5;
    gameFrameCount = 0;
    initWorld();
    gameState = 'playing';

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('final-score').textContent = '점수: ' + score.toLocaleString();
    document.getElementById('final-meats').textContent = '🍖 ' + meatScore;
}

function gameLoop(timestamp) {
    if (gameState !== 'playing') {
        if (gameState === 'gameover') draw();
        return;
    }
    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}

// Input
function doJump() {
    if (tiger.state === 'slide') return;
    if (tiger.jumpCount >= tiger.maxJumps) return;
    tiger.vy = tiger.jumpCount === 0 ? JUMP_FORCE_1 : JUMP_FORCE_2;
    tiger.state = 'jump';
    tiger.jumpCount++;
    tiger.grounded = false;
}

function doSlide() {
    if (!tiger.grounded) return;
    tiger.state = 'slide';
    tiger.slideTimer = 0;
}

function endSlide() {
    tiger.state = tiger.grounded ? 'run' : 'jump';
    tiger.slideTimer = 0;
}

document.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (gameState !== 'playing') {
        if (['Space', 'ArrowUp', 'Enter'].includes(e.code)) { e.preventDefault(); startGame(); }
        return;
    }
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); doJump(); }
    if (['ArrowDown', 'KeyS'].includes(e.code)) { e.preventDefault(); doSlide(); }
});

document.addEventListener('keyup', e => {
    if ((e.code === 'ArrowDown' || e.code === 'KeyS') && tiger.state === 'slide') endSlide();
});

const touchLeft = document.getElementById('touch-left');
const touchRight = document.getElementById('touch-right');
if (touchLeft) touchLeft.addEventListener('touchstart', e => { e.preventDefault(); if (gameState === 'playing') doJump(); }, { passive: false });
if (touchRight) {
    touchRight.addEventListener('touchstart', e => { e.preventDefault(); if (gameState === 'playing') doSlide(); }, { passive: false });
    touchRight.addEventListener('touchend', e => { e.preventDefault(); if (tiger.state === 'slide') endSlide(); });
}

document.getElementById('start-screen').addEventListener('click', startGame);
document.getElementById('game-over-screen').addEventListener('click', startGame);

loadAssets();

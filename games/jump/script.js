const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
const GRAVITY = 0.4;
const JUMP_FORCE = -11;
const MOVEMENT_SPEED = 5;
const PLATFORM_WIDTH = 70;
const PLATFORM_HEIGHT = 20;
const PLATFORM_GAP_MIN = 60;
const PLATFORM_GAP_MAX = 130;

// Game State
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER
let score = 0;
let platforms = [];
let particles = [];
let keys = {
    ArrowLeft: false,
    ArrowRight: false
};
let frameCount = 0; // For animation

// Input Handling
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        keys[e.code] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        keys[e.code] = false;
    }
});

// Touch controls for mobile
window.addEventListener('touchstart', (e) => {
    const touchX = e.touches[0].clientX;
    const screenWidth = window.innerWidth;
    if (touchX < screenWidth / 2) {
        keys.ArrowLeft = true;
        keys.ArrowRight = false;
    } else {
        keys.ArrowRight = true;
        keys.ArrowLeft = false;
    }
});

window.addEventListener('touchend', () => {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
});

// Utility: Draw Stripe
function drawStripe(ctx, x, y, length, angle, width = 3) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.ellipse(0, 0, length, width, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// Player Class (White Tiger)
class Player {
    constructor() {
        this.width = 50;
        this.height = 50;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 150;
        this.vx = 0;
        this.vy = 0;
        this.facingRight = true;
    }

    draw() {
        ctx.save();

        // Flip context if facing left
        if (this.vx < -0.1) this.facingRight = false;
        if (this.vx > 0.1) this.facingRight = true;

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        ctx.translate(centerX, centerY);
        if (!this.facingRight) ctx.scale(-1, 1);

        // --- Body ---
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 5, 20, 18, 0, 0, Math.PI * 2); // Chubby body
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#2d3436';
        ctx.stroke();

        // Body Stripes
        drawStripe(ctx, -5, 5, 4, Math.PI / 4);
        drawStripe(ctx, 0, 5, 4, 0);
        drawStripe(ctx, 5, 5, 4, -Math.PI / 4);

        // --- Head ---
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -10, 18, 0, Math.PI * 2); // Big head
        ctx.fill();
        ctx.stroke();

        // Ears
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-12, -22, 6, 0, Math.PI * 2); // Left ear
        ctx.arc(12, -22, 6, 0, Math.PI * 2);  // Right ear
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ff7675'; // Pink inside ears
        ctx.beginPath();
        ctx.arc(-12, -22, 3, 0, Math.PI * 2);
        ctx.arc(12, -22, 3, 0, Math.PI * 2);
        ctx.fill();

        // Head Stripes (Forehead)
        drawStripe(ctx, 0, -22, 4, Math.PI / 2, 2);
        drawStripe(ctx, -8, -18, 3, Math.PI / 4, 1.5);
        drawStripe(ctx, 8, -18, 3, -Math.PI / 4, 1.5);

        // Face
        // Eyes
        ctx.fillStyle = '#fdcb6e'; // Golden eyes
        ctx.beginPath();
        ctx.arc(-7, -10, 4, 0, Math.PI * 2);
        ctx.arc(7, -10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black'; // Pupils
        ctx.beginPath();
        ctx.arc(-7, -10, 2, 0, Math.PI * 2);
        ctx.arc(7, -10, 2, 0, Math.PI * 2);
        ctx.fill();

        // Nose & Mouth
        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.arc(0, -4, 2.5, 0, Math.PI * 2); // Nose
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-3, 0);
        ctx.moveTo(0, -4);
        ctx.lineTo(3, 0); // Cat mouth
        ctx.stroke();

        // Cheeks
        ctx.fillStyle = 'rgba(255, 118, 117, 0.4)';
        ctx.beginPath();
        ctx.arc(-12, -5, 3, 0, Math.PI * 2);
        ctx.arc(12, -5, 3, 0, Math.PI * 2);
        ctx.fill();

        // --- Paws ---
        ctx.fillStyle = '#ffffff';
        // Hands
        ctx.beginPath();
        ctx.arc(-15, 5, 5, 0, Math.PI * 2);
        ctx.arc(15, 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Feet (if jumping vs standing)
        ctx.beginPath();
        ctx.arc(-10, 20, 6, 0, Math.PI * 2);
        ctx.arc(10, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // --- Tail ---
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(15, 15);
        ctx.quadraticCurveTo(25, 20, 25, 10);
        ctx.stroke();
        // Tail stripe
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(22, 18);
        ctx.lineTo(24, 16);
        ctx.stroke();

        ctx.restore();
    }

    update() {
        // Horizontal Movement
        if (keys.ArrowLeft) {
            this.vx = -MOVEMENT_SPEED;
        } else if (keys.ArrowRight) {
            this.vx = MOVEMENT_SPEED;
        } else {
            this.vx *= 0.8; // Friction
        }
        this.x += this.vx;

        // Vertical Movement
        this.vy += GRAVITY;
        this.y += this.vy;

        // Floor collision (only for start)
        if (this.y + this.height > canvas.height && score === 0) {
            this.y = canvas.height - this.height;
            this.vy = 0;
            this.jump(); // Auto jump on start
        }

        // Wrap around screen
        if (this.x + this.width < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = -this.width;
    }

    jump() {
        this.vy = JUMP_FORCE;
        // Create dust particles
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(this.x + this.width / 2, this.y + this.height));
        }
    }
}

// Platform Class (Clouds)
class Platform {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = PLATFORM_WIDTH;
        this.height = PLATFORM_HEIGHT;
        this.type = Math.random() < 0.1 ? 'moving' : 'normal';
        this.vx = this.type === 'moving' ? (Math.random() < 0.5 ? 2 : -2) : 0;
    }

    draw() {
        // Cloud Drawing
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#74b9ff'; // Light blue outline
        ctx.lineWidth = 2;

        // Main cloud shape (3 puffy circles)
        const radius = this.height / 1.5;

        ctx.beginPath();
        // Left puff
        ctx.arc(this.x + 10, this.y + 10, 15, 0, Math.PI * 2);
        // Middle puff (higher)
        ctx.arc(this.x + this.width / 2, this.y + 5, 20, 0, Math.PI * 2);
        // Right puff
        ctx.arc(this.x + this.width - 10, this.y + 10, 15, 0, Math.PI * 2);

        ctx.fill();
        ctx.stroke();

        // Flatten bottom slightly for visual logic (optional, but circle collision is fine)

        // Moving platform indicator
        if (this.type === 'moving') {
            ctx.fillStyle = '#81ecec';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + 10, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    update() {
        if (this.type === 'moving') {
            this.x += this.vx;
            if (this.x < 0 || this.x + this.width > canvas.width) {
                this.vx *= -1;
            }
        }
    }
}

// Particle Class (Sparkles/Dust)
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.vx = Math.random() * 2 - 1;
        this.vy = Math.random() * 2 - 1;
        this.alpha = 1;
        this.color = Math.random() < 0.5 ? '#ffffff' : '#f1c40f'; // White or Gold sparkles
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.05;
    }
    draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // Star shape or circle
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Background Drawing (Minhwa Style - Sun/Moon/Peaks)
function drawBackground() {
    // Sky Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0984e3'); // Deep Blue
    gradient.addColorStop(1, '#74b9ff'); // Light Blue
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sun (Red) - Top Right
    ctx.fillStyle = '#e17055';
    ctx.beginPath();
    ctx.arc(canvas.width - 50, 80, 40, 0, Math.PI * 2);
    ctx.fill();

    // Moon (White) - Top Left
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(50, 80, 35, 0, Math.PI * 2);
    ctx.fill();

    // Mountains (Green Peaks) - Bottom (Parallax)
    // We can move them down based on score to simulate climbing high
    const mountainOffset = score * 0.5;
    if (canvas.height - mountainOffset > 0) {
        ctx.fillStyle = '#00b894'; // Teal/Green
        ctx.beginPath();
        // Peak 1
        ctx.moveTo(0, canvas.height);
        ctx.lineTo(100, canvas.height - 150 + mountainOffset);
        ctx.lineTo(200, canvas.height);
        // Peak 2 (Center High)
        ctx.moveTo(150, canvas.height);
        ctx.lineTo(canvas.width / 2, canvas.height - 250 + mountainOffset);
        ctx.lineTo(canvas.width - 150, canvas.height);
        // Peak 3
        ctx.moveTo(canvas.width - 200, canvas.height);
        ctx.lineTo(canvas.width - 100, canvas.height - 150 + mountainOffset);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.fill();

        // Mountain Outlines
        ctx.strokeStyle = '#006266';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

// Game Logic
let player = new Player();

function initGame() {
    canvas.width = window.innerWidth > 480 ? 480 : window.innerWidth;
    canvas.height = window.innerHeight;
    player = new Player();
    platforms = [];
    score = 0;
    scoreElement.innerText = 0;

    // Create initial platforms
    let y = canvas.height - 100;
    while (y > 0) {
        let x = Math.random() * (canvas.width - PLATFORM_WIDTH);
        platforms.push(new Platform(x, y));
        y -= Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN) + PLATFORM_GAP_MIN;
    }
}

function update() {
    frameCount++;
    if (gameState !== 'PLAYING') return;

    // Clear & Draw Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    // Update & Draw Player
    player.update();
    player.draw();

    // Move Camera (Scroll platforms down if player goes up high)
    if (player.y < canvas.height / 2) {
        let deltaY = canvas.height / 2 - player.y;
        player.y += deltaY; // Keep player fixed relative to screen

        platforms.forEach(p => {
            p.y += deltaY;
        });

        score += Math.floor(deltaY);
        scoreElement.innerText = score;
    }

    // Platform Management
    platforms.forEach((p, index) => {
        p.update();
        p.draw();

        // Collision Check (Only when falling)
        // Hitbox usually a bit smaller than sprite
        if (
            player.vy > 0 &&
            player.x + player.width * 0.7 > p.x &&
            player.x + player.width * 0.3 < p.x + p.width &&
            player.y + player.height * 0.8 > p.y &&
            player.y + player.height * 0.8 < p.y + p.height + 15
        ) {
            player.jump();
        }

        // Remove platforms below screen
        if (p.y > canvas.height) {
            platforms.splice(index, 1);
        }
    });

    // Generate new platforms
    while (platforms[platforms.length - 1].y > PLATFORM_GAP_MIN) {
        let y = platforms[platforms.length - 1].y - (Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN) + PLATFORM_GAP_MIN);
        let x = Math.random() * (canvas.width - PLATFORM_WIDTH);
        platforms.push(new Platform(x, y));
    }

    // Particles
    particles.forEach((p, i) => {
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(i, 1);
    });

    // Game Over Check
    if (player.y > canvas.height) {
        gameOver();
    }

    requestAnimationFrame(update);
}

function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    initGame();
    update();
}

function gameOver() {
    gameState = 'GAMEOVER';
    finalScoreElement.innerText = score;
    gameOverScreen.classList.add('active');
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Handle resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth > 480 ? 480 : window.innerWidth;
    canvas.height = window.innerHeight;
});

// Initial Setup
canvas.width = window.innerWidth > 480 ? 480 : window.innerWidth;
canvas.height = window.innerHeight;
// Draw generic background on load
drawBackground();

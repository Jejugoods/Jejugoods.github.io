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
const JUMP_FORCE = -10;
const MOVEMENT_SPEED = 5;
const PLATFORM_WIDTH = 60;
const PLATFORM_HEIGHT = 15;
const PLATFORM_GAP_MIN = 50;
const PLATFORM_GAP_MAX = 120;

// Game State
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER
let score = 0;
let platforms = [];
let particles = [];
let keys = {
    ArrowLeft: false,
    ArrowRight: false
};

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


// Player Class
class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 150;
        this.vx = 0;
        this.vy = 0;
        this.color = '#ffffff'; // White tiger base
    }

    draw() {
        // Placeholder for Tiger Sprite
        ctx.fillStyle = this.color;

        // Body (Circle-ish)
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Stripes (Simple lines)
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y + 10);
        ctx.lineTo(this.x + 30, this.y + 10);
        ctx.moveTo(this.x + 5, this.y + 20);
        ctx.lineTo(this.x + 35, this.y + 20);
        ctx.stroke();

        // Eyes
        ctx.fillStyle = '#fdcb6e'; // Gold eyes
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + 18, 4, 0, Math.PI * 2);
        ctx.arc(this.x + 28, this.y + 18, 4, 0, Math.PI * 2);
        ctx.fill();

        // Wrap around screen
        if (this.x + this.width < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = -this.width;
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
    }

    jump() {
        this.vy = JUMP_FORCE;
        // Create dust particles
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(this.x + this.width / 2, this.y + this.height));
        }
    }
}

// Platform Class
class Platform {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = PLATFORM_WIDTH;
        this.height = PLATFORM_HEIGHT;
        this.type = Math.random() < 0.1 ? 'moving' : 'normal'; // 10% chance for moving platform
        this.vx = this.type === 'moving' ? (Math.random() < 0.5 ? 2 : -2) : 0;
    }

    draw() {
        // Placeholder for Cloud Platform
        ctx.fillStyle = '#dfe6e9'; // Cloud color
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2;

        // Draw cloud-like shape (3 circles)
        ctx.beginPath();
        ctx.arc(this.x, this.y + this.height / 2, this.height / 2, 0, Math.PI * 2);
        ctx.arc(this.x + this.width / 2, this.y, this.height / 1.5, 0, Math.PI * 2);
        ctx.arc(this.x + this.width, this.y + this.height / 2, this.height / 2, 0, Math.PI * 2);
        ctx.rect(this.x, this.y + this.height / 4, this.width, this.height / 2);
        ctx.fill();
        ctx.stroke();

        // If moving, maybe add visual indicator?
        if (this.type === 'moving') {
            ctx.fillStyle = '#74b9ff';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 5, 0, Math.PI * 2);
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

// Particle Class (Visual Flair)
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.vx = Math.random() * 2 - 1;
        this.vy = Math.random() * 2 - 1;
        this.alpha = 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.05;
    }
    draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
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
    if (gameState !== 'PLAYING') return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
            player.x + player.width * 0.8 > p.x &&
            player.x + player.width * 0.2 < p.x + p.width &&
            player.y + player.height > p.y &&
            player.y + player.height < p.y + p.height + 10
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

// 🏁 Traffic Light Racer Game
// A simple car racing game where the player must respond to traffic lights

class TrafficLightRacer {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();

        // Game state
        this.gameState = 'start'; // 'start', 'playing', 'gameOver'
        this.distance = 0;
        this.penalties = 0;
        this.maxPenalties = 3;
        this.timeLeft = 60;
        this.gameSpeed = 2;
        this.carSpeed = 0;
        this.maxCarSpeed = 8;

        // Traffic light states
        this.trafficLight = 'red'; // 'red', 'yellow', 'green'
        this.lightTimer = 0;
        this.lightDuration = 3000; // 3 seconds per light
        this.lightCycle = ['red', 'green', 'yellow'];
        this.currentLightIndex = 0;

        // Car properties
        this.car = {
            x: 0,
            y: 0,
            width: 40,
            height: 60,
            color: '#3B82F6' // Blue car
        };

        // Road properties
        this.roadLines = [];
        this.roadWidth = 300;
        this.lineOffset = 0;

        // Animation properties
        this.lastTime = 0;
        this.animationId = null;

        // Audio context for sound effects
        this.audioContext = null;
        this.initAudio();

        // Initialize game
        this.init();
    }

    setupCanvas() {
        // Set canvas to full screen
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.updateCarPosition();
        });
    }

    init() {
        this.updateCarPosition();
        this.initRoadLines();
        this.setupEventListeners();
        this.startGameLoop();
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    playPenaltySound() {
        if (!this.audioContext) return;
        
        // Create a simple beep sound for penalty
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    updateCarPosition() {
        this.car.x = (this.canvas.width - this.car.width) / 2;
        this.car.y = this.canvas.height - this.car.height - 50;
    }

    initRoadLines() {
        this.roadLines = [];
        const lineSpacing = 60;
        const numLines = Math.ceil(this.canvas.height / lineSpacing) + 2;
        
        for (let i = 0; i < numLines; i++) {
            this.roadLines.push({
                y: i * lineSpacing - lineSpacing
            });
        }
    }

    setupEventListeners() {
        // Start button
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });

        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleKeyPress(e) {
        if (this.gameState !== 'playing') return;

        const key = e.key.toLowerCase();
        if (key === 'arrowup' || key === 'w') {
            e.preventDefault();
            this.accelerate();
        }
    }

    accelerate() {
        if (this.trafficLight === 'green') {
            // Legal acceleration
            this.carSpeed = Math.min(this.carSpeed + 1, this.maxCarSpeed);
        } else {
            // Penalty for moving on red/yellow
            this.triggerPenalty();
        }
    }

    triggerPenalty() {
        this.penalties++;
        this.carSpeed = Math.max(this.carSpeed - 2, 0); // Speed penalty
        
        // Visual feedback
        this.showPenaltyFlash();
        this.shakeCanvas();
        
        // Audio feedback
        this.playPenaltySound();
        
        // Update UI
        document.getElementById('penalties').textContent = this.penalties;
        
        // Check game over
        if (this.penalties >= this.maxPenalties) {
            this.endGame('You ran too many red lights!');
        }
    }

    showPenaltyFlash() {
        const flash = document.getElementById('penaltyFlash');
        flash.classList.remove('hidden');
        flash.classList.add('flash');
        
        setTimeout(() => {
            flash.classList.add('hidden');
            flash.classList.remove('flash');
        }, 300);
    }

    shakeCanvas() {
        const container = document.getElementById('gameContainer');
        container.classList.add('shake');
        
        setTimeout(() => {
            container.classList.remove('shake');
        }, 500);
    }

    updateTrafficLight(deltaTime) {
        this.lightTimer += deltaTime;
        
        if (this.lightTimer >= this.lightDuration) {
            this.lightTimer = 0;
            this.currentLightIndex = (this.currentLightIndex + 1) % this.lightCycle.length;
            this.trafficLight = this.lightCycle[this.currentLightIndex];
            
            // Update HUD traffic light
            this.updateTrafficLightHUD();
        }
    }

    updateTrafficLightHUD() {
        const redLight = document.getElementById('redLight');
        const yellowLight = document.getElementById('yellowLight');
        const greenLight = document.getElementById('greenLight');
        
        // Reset all lights
        redLight.className = 'w-6 h-6 rounded-full bg-gray-600 absolute top-1 left-1';
        yellowLight.className = 'w-6 h-6 rounded-full bg-gray-600 absolute top-7 left-1';
        greenLight.className = 'w-6 h-6 rounded-full bg-gray-600 absolute top-13 left-1';
        
        // Activate current light
        switch (this.trafficLight) {
            case 'red':
                redLight.className = 'w-6 h-6 rounded-full bg-red-500 absolute top-1 left-1';
                break;
            case 'yellow':
                yellowLight.className = 'w-6 h-6 rounded-full bg-yellow-500 absolute top-7 left-1';
                break;
            case 'green':
                greenLight.className = 'w-6 h-6 rounded-full bg-green-500 absolute top-13 left-1';
                break;
        }
    }

    update(deltaTime) {
        if (this.gameState !== 'playing') return;

        // Update traffic light
        this.updateTrafficLight(deltaTime);

        // Update car movement and distance
        this.distance += this.carSpeed * (deltaTime / 16.67); // Normalize to 60fps
        
        // Natural speed decay
        this.carSpeed = Math.max(this.carSpeed - 0.05, 0);

        // Update road animation
        this.lineOffset += (this.gameSpeed + this.carSpeed) * (deltaTime / 16.67);
        if (this.lineOffset >= 60) {
            this.lineOffset = 0;
        }

        // Update timer
        this.timeLeft -= deltaTime / 1000;
        if (this.timeLeft <= 0) {
            this.endGame('Time\'s up!');
        }

        // Update UI
        document.getElementById('distance').textContent = Math.floor(this.distance);
        document.getElementById('timer').textContent = Math.ceil(Math.max(0, this.timeLeft));
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1F2937'; // Dark gray background
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw road
        this.drawRoad();

        // Draw traffic light on canvas
        this.drawTrafficLight();

        // Draw car
        this.drawCar();
    }

    drawRoad() {
        const centerX = this.canvas.width / 2;
        const roadHalfWidth = this.roadWidth / 2;

        // Draw road surface
        this.ctx.fillStyle = '#374151'; // Gray road
        this.ctx.fillRect(centerX - roadHalfWidth, 0, this.roadWidth, this.canvas.height);

        // Draw road edges
        this.ctx.fillStyle = '#FBBF24'; // Yellow lines
        this.ctx.fillRect(centerX - roadHalfWidth - 4, 0, 4, this.canvas.height);
        this.ctx.fillRect(centerX + roadHalfWidth, 0, 4, this.canvas.height);

        // Draw center line (dashed)
        this.ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < this.roadLines.length; i++) {
            const line = this.roadLines[i];
            const y = (line.y + this.lineOffset) % (this.canvas.height + 60);
            this.ctx.fillRect(centerX - 2, y, 4, 30);
        }

        // Draw sidewalks
        this.ctx.fillStyle = '#6B7280';
        this.ctx.fillRect(0, 0, centerX - roadHalfWidth - 4, this.canvas.height);
        this.ctx.fillRect(centerX + roadHalfWidth + 4, 0, this.canvas.width - (centerX + roadHalfWidth + 4), this.canvas.height);
    }

    drawTrafficLight() {
        const x = this.canvas.width / 2 - 20;
        const y = 50;
        
        // Traffic light pole
        this.ctx.fillStyle = '#374151';
        this.ctx.fillRect(x + 15, y + 80, 10, this.canvas.height - y - 80);
        
        // Traffic light housing
        this.ctx.fillStyle = '#1F2937';
        this.ctx.fillRect(x, y, 40, 80);
        this.ctx.strokeStyle = '#6B7280';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, 40, 80);

        // Light circles
        const lightSize = 10;
        const lightX = x + 20;
        
        // Red light
        this.ctx.fillStyle = this.trafficLight === 'red' ? '#EF4444' : '#7F1D1D';
        this.ctx.beginPath();
        this.ctx.arc(lightX, y + 15, lightSize, 0, Math.PI * 2);
        this.ctx.fill();

        // Yellow light
        this.ctx.fillStyle = this.trafficLight === 'yellow' ? '#FBBF24' : '#78350F';
        this.ctx.beginPath();
        this.ctx.arc(lightX, y + 40, lightSize, 0, Math.PI * 2);
        this.ctx.fill();

        // Green light
        this.ctx.fillStyle = this.trafficLight === 'green' ? '#10B981' : '#064E3B';
        this.ctx.beginPath();
        this.ctx.arc(lightX, y + 65, lightSize, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawCar() {
        const { x, y, width, height } = this.car;

        // Car body
        this.ctx.fillStyle = this.car.color;
        this.ctx.fillRect(x, y, width, height);

        // Car details
        this.ctx.fillStyle = '#1E293B'; // Dark blue for windows
        this.ctx.fillRect(x + 5, y + 5, width - 10, 20);

        // Wheels
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x + 8, y + height - 5, 6, 0, Math.PI * 2);
        this.ctx.arc(x + width - 8, y + height - 5, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Speed indicator (exhaust effect)
        if (this.carSpeed > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.carSpeed / this.maxCarSpeed * 0.5})`;
            for (let i = 0; i < 3; i++) {
                this.ctx.fillRect(x + width / 2 - 2, y + height + i * 8, 4, 6);
            }
        }
    }

    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();

        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    startGameLoop() {
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    startGame() {
        // Initialize audio context on user interaction
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.gameState = 'playing';
        this.distance = 0;
        this.penalties = 0;
        this.timeLeft = 60;
        this.carSpeed = 0;
        this.trafficLight = 'red';
        this.currentLightIndex = 0;
        this.lightTimer = 0;

        // Hide start screen
        document.getElementById('startScreen').style.display = 'none';
        
        // Update HUD
        document.getElementById('distance').textContent = '0';
        document.getElementById('timer').textContent = '60';
        document.getElementById('penalties').textContent = '0';
        
        this.updateTrafficLightHUD();
    }

    restartGame() {
        // Hide game over screen
        document.getElementById('gameOverScreen').classList.add('hidden');
        
        // Show start screen
        document.getElementById('startScreen').style.display = 'flex';
        
        this.gameState = 'start';
    }

    endGame(reason) {
        this.gameState = 'gameOver';
        
        // Update game over screen
        document.getElementById('finalDistance').textContent = Math.floor(this.distance);
        document.getElementById('finalPenalties').textContent = this.penalties;
        document.getElementById('gameOverReason').textContent = reason;
        
        // Show appropriate title
        const title = document.getElementById('gameOverTitle');
        if (this.penalties >= this.maxPenalties) {
            title.textContent = 'You Ran the Light!';
            title.className = 'text-3xl font-bold text-red-400 mb-4';
        } else {
            title.textContent = 'Time\'s Up!';
            title.className = 'text-3xl font-bold text-yellow-400 mb-4';
        }
        
        // Show game over screen
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    new TrafficLightRacer();
});

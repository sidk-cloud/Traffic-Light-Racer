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
        this.maxPenalties = 10; // More forgiving for kids
        this.timeLeft = 120; // 2 minutes
        this.gameSpeed = 2;
        this.carSpeed = 3; // Start with some speed
        this.maxCarSpeed = 12;
        this.autoAcceleration = 0.02; // Automatic acceleration rate

        // Traffic light states - Kid-friendly timing
        this.trafficLight = 'green'; // Start with green
        this.lightTimer = 0;
        this.lightChangeCount = 0;
        this.maxLightChanges = 2; // Only 2 light changes max in 2 minutes
        this.greenDuration = 50000; // 50 seconds of green
        this.yellowDuration = 3000; // 3 seconds yellow
        this.redDuration = 5000; // 5 seconds red
        this.nextLightChange = this.greenDuration;
        this.lightCycle = ['green', 'yellow', 'red'];
        this.currentLightIndex = 0;

        // Lane system (3 lanes)
        this.numLanes = 3;
        this.laneWidth = 90;
        this.currentLane = 1; // Start in middle lane (0, 1, 2)
        this.targetLane = 1;
        this.laneChangeSpeed = 0.15;
        this.isChangingLanes = false;

        // Car properties
        this.car = {
            x: 0,
            y: 0,
            width: 35,
            height: 55,
            color: '#3B82F6' // Blue car
        };

        // Road properties
        this.roadLines = [];
        this.roadWidth = this.numLanes * this.laneWidth;
        this.lineOffset = 0;

        // Obstacles
        this.obstacles = [];
        this.obstacleSpawnRate = 0.015; // Slightly reduced overall spawn rate
        this.middleLaneSpawnMultiplier = 3; // 3x more obstacles in middle lane
        this.obstacleTypes = [
            { type: 'car', color: '#EF4444', width: 35, height: 55 },
            { type: 'truck', color: '#F59E0B', width: 40, height: 70 },
            { type: 'construction', color: '#F97316', width: 30, height: 40 }
        ];

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
        // Calculate lane positions
        const centerX = this.canvas.width / 2;
        const roadStart = centerX - this.roadWidth / 2;
        const laneCenter = roadStart + (this.currentLane + 0.5) * this.laneWidth;
        
        this.car.x = laneCenter - this.car.width / 2;
        this.car.y = this.canvas.height - this.car.height - 50;
    }

    getLaneCenter(laneIndex) {
        const centerX = this.canvas.width / 2;
        const roadStart = centerX - this.roadWidth / 2;
        return roadStart + (laneIndex + 0.5) * this.laneWidth;
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
        
        // Lane changing
        if (key === 'arrowleft' || key === 'a') {
            e.preventDefault();
            this.changeLane(-1); // Move left
        } else if (key === 'arrowright' || key === 'd') {
            e.preventDefault();
            this.changeLane(1); // Move right
        }
        
        // Speed control
        if (key === 'arrowup' || key === 'w') {
            e.preventDefault();
            this.accelerate();
        } else if (key === 'arrowdown' || key === 's') {
            e.preventDefault();
            this.brake();
        }
    }

    changeLane(direction) {
        if (this.isChangingLanes) return;
        
        const newLane = this.targetLane + direction;
        if (newLane >= 0 && newLane < this.numLanes) {
            this.targetLane = newLane;
            this.isChangingLanes = true;
        }
    }

    updateLanePosition() {
        if (this.isChangingLanes) {
            const diff = this.targetLane - this.currentLane;
            if (Math.abs(diff) > 0.05) {
                this.currentLane += diff * this.laneChangeSpeed;
            } else {
                this.currentLane = this.targetLane;
                this.isChangingLanes = false;
            }
            this.updateCarPosition();
        }
    }

    accelerate() {
        // Always allow acceleration - no penalties for kids!
        this.carSpeed = Math.min(this.carSpeed + 0.5, this.maxCarSpeed);
    }

    brake() {
        // Always allow braking
        this.carSpeed = Math.max(this.carSpeed - 1, 0);
    }

    triggerPenalty() {
        this.penalties++;
        this.carSpeed = Math.max(this.carSpeed - 3, 0); // Bigger speed penalty
        
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
        
        // Only change lights if we haven't exceeded max changes and there's enough time left
        if (this.lightTimer >= this.nextLightChange && 
            this.lightChangeCount < this.maxLightChanges && 
            this.timeLeft > 20) { // Don't change in last 20 seconds
            
            this.lightTimer = 0;
            this.lightChangeCount++;
            this.currentLightIndex = (this.currentLightIndex + 1) % this.lightCycle.length;
            this.trafficLight = this.lightCycle[this.currentLightIndex];
            
            // Set duration for next light state
            if (this.trafficLight === 'green') {
                this.nextLightChange = this.greenDuration;
            } else if (this.trafficLight === 'yellow') {
                this.nextLightChange = this.yellowDuration;
            } else if (this.trafficLight === 'red') {
                this.nextLightChange = this.redDuration;
            }
            
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

        // Automatic acceleration when light is green
        if (this.trafficLight === 'green') {
            this.carSpeed = Math.min(this.carSpeed + this.autoAcceleration, this.maxCarSpeed);
        }

        // Update lane position
        this.updateLanePosition();

        // Update obstacles
        this.updateObstacles(deltaTime);

        // Spawn new obstacles
        this.spawnObstacles();

        // Check collisions
        this.checkCollisions();

        // Update car movement and distance
        this.distance += this.carSpeed * (deltaTime / 16.67); // Normalize to 60fps
        
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

    spawnObstacles() {
        // Base spawn rate
        let spawnRate = this.obstacleSpawnRate;
        
        // Check each lane
        for (let lane = 0; lane < this.numLanes; lane++) {
            let currentSpawnRate = spawnRate;
            
            // Increase spawn rate for middle lane (lane 1)
            if (lane === 1) {
                currentSpawnRate *= this.middleLaneSpawnMultiplier;
            }
            
            if (Math.random() < currentSpawnRate) {
                const obstacleType = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
                
                // Don't spawn directly on player if they're in this lane
                if (Math.abs(lane - this.currentLane) < 0.3) continue;
                
                const obstacle = {
                    ...obstacleType,
                    lane: lane,
                    x: this.getLaneCenter(lane) - obstacleType.width / 2,
                    y: -obstacleType.height,
                    speed: 1 + Math.random() * 2
                };
                
                this.obstacles.push(obstacle);
            }
        }
    }

    updateObstacles(deltaTime) {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.y += (this.gameSpeed + this.carSpeed + obstacle.speed) * (deltaTime / 16.67);
            
            // Remove obstacles that are off-screen
            if (obstacle.y > this.canvas.height + 100) {
                this.obstacles.splice(i, 1);
            }
        }
    }

    checkCollisions() {
        const carBounds = {
            left: this.car.x + 5,
            right: this.car.x + this.car.width - 5,
            top: this.car.y + 5,
            bottom: this.car.y + this.car.height - 5
        };

        for (let obstacle of this.obstacles) {
            const obstacleBounds = {
                left: obstacle.x,
                right: obstacle.x + obstacle.width,
                top: obstacle.y,
                bottom: obstacle.y + obstacle.height
            };

            if (carBounds.left < obstacleBounds.right &&
                carBounds.right > obstacleBounds.left &&
                carBounds.top < obstacleBounds.bottom &&
                carBounds.bottom > obstacleBounds.top) {
                
                this.handleCollision(obstacle);
                break;
            }
        }
    }

    handleCollision(obstacle) {
        // Gentler penalties for kids - just slow down, no penalty points
        this.carSpeed = Math.max(this.carSpeed - 1, 1); // Don't stop completely
        
        // Visual feedback (less intense)
        this.shakeCanvas();
        
        // Remove the obstacle
        const index = this.obstacles.indexOf(obstacle);
        if (index > -1) {
            this.obstacles.splice(index, 1);
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1F2937'; // Dark gray background
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw road
        this.drawRoad();

        // Draw obstacles
        this.drawObstacles();

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

        // Draw lane dividers
        this.ctx.fillStyle = '#FFFFFF';
        for (let i = 1; i < this.numLanes; i++) {
            const laneX = centerX - roadHalfWidth + i * this.laneWidth;
            
            // Dashed lines for lane dividers
            for (let j = 0; j < this.roadLines.length; j++) {
                const line = this.roadLines[j];
                const y = (line.y + this.lineOffset) % (this.canvas.height + 60);
                this.ctx.fillRect(laneX - 1, y, 2, 30);
            }
        }

        // Draw center line for middle lane
        const centerLaneX = centerX;
        for (let i = 0; i < this.roadLines.length; i++) {
            const line = this.roadLines[i];
            const y = (line.y + this.lineOffset) % (this.canvas.height + 60);
            this.ctx.fillRect(centerLaneX - 2, y, 4, 30);
        }

        // Draw sidewalks
        this.ctx.fillStyle = '#6B7280';
        this.ctx.fillRect(0, 0, centerX - roadHalfWidth - 4, this.canvas.height);
        this.ctx.fillRect(centerX + roadHalfWidth + 4, 0, this.canvas.width - (centerX + roadHalfWidth + 4), this.canvas.height);
    }

    drawObstacles() {
        for (let obstacle of this.obstacles) {
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Add details based on obstacle type
            if (obstacle.type === 'car') {
                // Car windows
                this.ctx.fillStyle = '#1E293B';
                this.ctx.fillRect(obstacle.x + 3, obstacle.y + 3, obstacle.width - 6, 15);
                
                // Car wheels
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath();
                this.ctx.arc(obstacle.x + 6, obstacle.y + obstacle.height - 5, 4, 0, Math.PI * 2);
                this.ctx.arc(obstacle.x + obstacle.width - 6, obstacle.y + obstacle.height - 5, 4, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (obstacle.type === 'truck') {
                // Truck cab
                this.ctx.fillStyle = '#DC2626';
                this.ctx.fillRect(obstacle.x + 2, obstacle.y + obstacle.height - 30, obstacle.width - 4, 25);
                
                // Truck wheels
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath();
                this.ctx.arc(obstacle.x + 6, obstacle.y + obstacle.height - 5, 5, 0, Math.PI * 2);
                this.ctx.arc(obstacle.x + obstacle.width - 6, obstacle.y + obstacle.height - 5, 5, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (obstacle.type === 'construction') {
                // Construction cone pattern
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fillRect(obstacle.x + 5, obstacle.y + 10, obstacle.width - 10, 3);
                this.ctx.fillRect(obstacle.x + 5, obstacle.y + 20, obstacle.width - 10, 3);
                this.ctx.fillRect(obstacle.x + 5, obstacle.y + 30, obstacle.width - 10, 3);
            }
        }
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
        this.timeLeft = 120; // 2 minutes
        this.carSpeed = 3; // Start with some speed
        this.trafficLight = 'green'; // Start with green
        this.currentLightIndex = 0;
        this.lightTimer = 0;
        this.lightChangeCount = 0;
        this.nextLightChange = this.greenDuration;
        
        // Reset lane position
        this.currentLane = 1;
        this.targetLane = 1;
        this.isChangingLanes = false;
        
        // Clear obstacles
        this.obstacles = [];

        // Hide start screen
        document.getElementById('startScreen').style.display = 'none';
        
        // Update HUD
        document.getElementById('distance').textContent = '0';
        document.getElementById('timer').textContent = '120';
        document.getElementById('penalties').textContent = '0';
        
        this.updateCarPosition();
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
        
        // Calculate a fun score based on distance
        const score = Math.floor(this.distance / 10);
        
        // Update game over screen with positive messaging
        document.getElementById('finalDistance').textContent = Math.floor(this.distance);
        document.getElementById('finalPenalties').textContent = score; // Show score instead of penalties
        document.getElementById('gameOverReason').textContent = 'Great job driving!';
        
        // Always show positive title for kids
        const title = document.getElementById('gameOverTitle');
        title.textContent = '🎉 Well Done Driver!';
        title.className = 'text-3xl font-bold text-green-400 mb-4';
        
        // Show game over screen
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    new TrafficLightRacer();
});

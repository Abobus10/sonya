class Garden {
    constructor(canvasId, onFlowerClick) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.onFlowerClick = onFlowerClick;

        this.width = 0;
        this.height = 0;

        // Weather state
        this.isRainy = true; // true = rain, false = sunset
        this.wind = -0.5;
        this.targetWind = -0.5;

        // Entities
        this.raindrops = [];
        this.splashes = [];
        this.plants = [];
        this.particles = []; // cursor trail
        this.ambientParticles = []; // sunset fireflies

        // NEW: Stars system
        this.stars = [];

        // NEW: Shooting stars
        this.shootingStars = [];

        // NEW: Grass blades
        this.grassBlades = [];

        // NEW: Lightning
        this.lightningAlpha = 0;

        // NEW: Puddle reflections
        this.puddles = [];

        // NEW: Sun rotation angle for rays
        this.sunRayAngle = 0;

        // NEW: Corona pulse phase
        this.coronaPulse = 0;

        // NEW: Frame counter for animations
        this.frameCount = 0;

        // Mouse interaction
        this.mouse = { x: 0, y: 0, isHoveringFlower: null };
        this.sun = { x: 0, y: 0, radius: 45, isDragging: false, hover: false, xRatio: 0.5, yRatio: 0.35, isDraggedByUser: false };
        this.onSunMove = null;

        // Bind events
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());
        
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        window.addEventListener('touchend', () => this.handleMouseUp());

        // Run resize setup after variables are initialized
        this.resize();

        // Preset messages for flowers
        this.messages = [
            "каждая капелька дождя это про то как сильно я люблю тебя, кошечка) с каждым днем все больше",
            "наши отношения это как этот закат после дождика) после любых туч все равно будет тепло и солнце",
            "просто спасибо что ты есть, сонечка) ты мое самое теплое солнышко в любой холод",
            "каждый цветочек тут распускается только что б ты улыбнулась, сонюша) потыкай на них",
            "помню вообще каждый момент с тобой и они греют меня изнутри как это закатное солнце)",
            "хочу смотреть с тобой на закаты и гулять под теплым дождиком всю жизнь, кошечка) люблю тебя очень сильно",
            "ты моя самая любимая сонюша во всей вселенной и даже больше))",
            "просто хочу обнять тебя очень крепко прямо сейчас и никуда не отпускать, сонечка)",
            "каждый день с тобой это лучший день в моей жизни честно, кошечка)",
            "ты даже не представляешь насколько сильно ты меня вдохновляешь делать всякие крутые штуки",
            "когда ты улыбаешься у меня внутри все просто расцветает как этот сад, сонюша))",
            "даже когда идет сильный дождь с тобой внутри всегда тепло и сухо, сонечка)",
            "ты мое самое уютное место на земле, кошечка) где бы мы ни были",
            "люблю твои глаза смех и вообще все в тебе, сонюша)) от кончиков пальцев до улыбки",
            "ты делаешь меня самым счастливым человеком на свете спасибо тебе за это)",
            "давай всегда быть вместе, сонечка) и через все дожди проходить только вдвоем"
        ];
        this.messageIndex = 0;

        // Initialize entities
        this.initRain();
        this.initPlants();
        this.initStars();
        this.initGrass();
        this.initPuddles();
        
        // Start animation loop
        this.animate();
    }

    resize() {
        const oldWidth = this.width;
        
        const cssWidth = window.innerWidth;
        const cssHeight = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = cssWidth * dpr;
        this.canvas.height = cssHeight * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        this.width = cssWidth;
        this.height = cssHeight;

        // Position the sun relatively
        this.sun.x = this.sun.xRatio * this.width;
        this.sun.y = this.sun.yRatio * this.height;
        
        if (this.plants && oldWidth > 0) {
            this.plants.forEach(plant => {
                if (plant.xRatio) {
                    plant.x = plant.xRatio * this.width;
                }
            });
        }

        // Re-initialize stars and grass on resize
        this.initStars();
        this.initGrass();
        this.initPuddles();
    }

    initRain() {
        this.raindrops = [];
        const count = Math.min(180, Math.floor(this.width / 8));
        for (let i = 0; i < count; i++) {
            this.raindrops.push(this.createRaindrop(i));
        }
    }

    createRaindrop(index) {
        // Assign rain layers: ~30% foreground, ~70% background
        const isForeground = Math.random() < 0.3;
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height - this.height,
            vy: isForeground ? (12 + Math.random() * 6) : (8 + Math.random() * 6),
            length: isForeground ? (14 + Math.random() * 18) : (10 + Math.random() * 15),
            weight: isForeground ? (1.5 + Math.random() * 2) : (1 + Math.random() * 1.5),
            opacity: isForeground ? (0.35 + Math.random() * 0.4) : (0.15 + Math.random() * 0.25),
            isForeground: isForeground,
            wobblePhase: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.02 + Math.random() * 0.03
        };
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < 120; i++) {
            this.stars.push({
                x: Math.random() * (this.width || window.innerWidth),
                y: Math.random() * (this.height || window.innerHeight) * 0.7,
                size: 0.5 + Math.random() * 2.5,
                baseOpacity: 0.2 + Math.random() * 0.6,
                twinkleSpeed: 0.015 + Math.random() * 0.04,
                phase: Math.random() * Math.PI * 2,
                currentOpacity: 0
            });
        }
    }

    initGrass() {
        this.grassBlades = [];
        const w = this.width || window.innerWidth;
        for (let i = 0; i < 100; i++) {
            this.grassBlades.push({
                x: Math.random() * w,
                height: 15 + Math.random() * 25,
                width: 1.5 + Math.random() * 2,
                swayPhase: Math.random() * Math.PI * 2,
                swaySpeed: 0.02 + Math.random() * 0.02,
                hue: 90 + Math.random() * 40, // green range
                lightness: 15 + Math.random() * 20
            });
        }
    }

    initPuddles() {
        this.puddles = [];
        const w = this.width || window.innerWidth;
        const h = this.height || window.innerHeight;
        const count = 3 + Math.floor(Math.random() * 3); // 3-5 puddles
        for (let i = 0; i < count; i++) {
            this.puddles.push({
                x: w * 0.1 + Math.random() * w * 0.8,
                y: h - 12 - Math.random() * 15,
                rx: 15 + Math.random() * 25,
                ry: 3 + Math.random() * 4,
                ripplePhase: Math.random() * Math.PI * 2,
                rippleSpeed: 0.03 + Math.random() * 0.02,
                opacity: 0
            });
        }
    }

    initPlants() {
        // Start with an empty canvas so Sonechka plants everything herself!
        this.plants = [];
    }

    spawnPlant(x, preGrow = false) {
        if (this.plants.length >= 12) return; // limit to prevent clutter

        const targetHeight = 180 + Math.random() * (this.height * 0.4);
        const petalColor = this.getRandomFlowerColor();
        
        // Stem curve control points
        const controlOffset1 = (Math.random() - 0.5) * 80;
        const controlOffset2 = (Math.random() - 0.5) * 80;

        const msg = this.messages[this.messageIndex];
        this.messageIndex = (this.messageIndex + 1) % this.messages.length;

        this.plants.push({
            x: x,
            xRatio: x / this.width,
            y: this.height - 15, // Starts slightly above bottom edge
            targetHeight: targetHeight,
            currentHeight: preGrow ? targetHeight * 0.4 : 0,
            growthSpeed: 0.5 + Math.random() * 0.5,
            progress: preGrow ? 0.4 : 0,
            controlOffset1: controlOffset1,
            controlOffset2: controlOffset2,
            stemColor: '#2d4a22',
            leafColor: '#4b7838',
            leaves: [
                { relHeight: 0.25, side: -1, progress: preGrow ? 1 : 0, size: 8 + Math.random() * 6, angle: -0.3 },
                { relHeight: 0.5, side: 1, progress: preGrow ? 1 : 0, size: 8 + Math.random() * 6, angle: 0.3 },
                { relHeight: 0.75, side: -1, progress: preGrow ? 1 : 0, size: 6 + Math.random() * 6, angle: -0.4 }
            ],
            flower: {
                budSize: 4,
                maxSize: 18 + Math.random() * 10,
                bloomProgress: 0,
                bloomSpeed: 0.01 + Math.random() * 0.015,
                color: petalColor,
                petalsCount: 5 + Math.floor(Math.random() * 4),
                message: msg,
                isHovered: false,
                pulse: 0,
                hasBloomBurst: false // NEW: Track if bloom burst has triggered
            }
        });
    }

    getRandomFlowerColor() {
        const colors = [
            { primary: '#ff7675', secondary: '#d63031', glow: 'rgba(255, 118, 117, 0.6)' }, // Soft red / Pink
            { primary: '#fdcb6e', secondary: '#e17055', glow: 'rgba(253, 203, 110, 0.6)' }, // Sunset Gold
            { primary: '#a29bfe', secondary: '#6c5ce7', glow: 'rgba(162, 155, 254, 0.6)' }, // Lavender
            { primary: '#e84393', secondary: '#b71540', glow: 'rgba(232, 67, 147, 0.6)' }, // Deep Pink
            { primary: '#81ecec', secondary: '#00cec9', glow: 'rgba(129, 236, 236, 0.6)' }, // Turquoise
            { primary: '#ffb8b8', secondary: '#ff7675', glow: 'rgba(255, 184, 184, 0.6)' }  // Rose
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    setWeather(isRainy) {
        this.isRainy = isRainy;
        this.targetWind = isRainy ? -0.8 : -0.1;
    }

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Check if event has a non-empty touches list (prevents simulated click crash on mobile)
        const hasTouches = e.touches && e.touches.length > 0;
        const clientX = hasTouches ? e.touches[0].clientX : e.clientX;
        const clientY = hasTouches ? e.touches[0].clientY : e.clientY;
        
        // Map raw viewport coordinates to internal canvas coordinates 1-to-1
        const scaleX = this.width / (rect.width || 1);
        const scaleY = this.height / (rect.height || 1);
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    checkFlowerTap(x, y) {
        let clickedFlower = null;
        let minDist = Infinity;
        
        // Generous 2.5x hit area for fingers on mobile, and precise 1.1x area for mouse cursors on desktop
        const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
        const multiplier = isMobile ? 2.5 : 1.1;

        this.plants.forEach(plant => {
            // Unconditional tap: Sonechka can click any spawned plant at its tip, even if it is still a growing bud!
            const dx = x - plant.tipX;
            const dy = y - plant.tipY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxRange = plant.flower.maxSize * multiplier;
            if (dist < maxRange && dist < minDist) {
                minDist = dist;
                clickedFlower = plant;
            }
        });

        if (clickedFlower) {
            // Force the flower to instantly bloom and grow fully if clicked, making it pop open!
            clickedFlower.flower.bloomProgress = 1.0;
            clickedFlower.progress = 1.0;
            clickedFlower.currentHeight = clickedFlower.targetHeight;
            
            // Re-calculate tip coordinates instantly so particles burst from the correct popped tip position
            const tip = this.getStemTipCoordinates(clickedFlower);
            clickedFlower.tipX = tip.x;
            clickedFlower.tipY = tip.y;

            this.triggerFlowerBurst(clickedFlower.tipX, clickedFlower.tipY, clickedFlower.flower.color.primary);
            this.onFlowerClick(clickedFlower.flower.message);
            return true;
        }
        return false;
    }

    handleMouseMove(e) {
        const coords = this.getCanvasCoords(e);
        this.mouse.x = coords.x;
        this.mouse.y = coords.y;

        // If dragging the sun
        if (this.sun.isDragging) {
            this.sun.x = coords.x;
            this.sun.y = Math.max(this.height * 0.1, Math.min(this.height - 120, coords.y));
            this.sun.xRatio = this.sun.x / this.width;
            this.sun.yRatio = this.sun.y / this.height;
            if (this.onSunMove) {
                this.onSunMove(this.sun.yRatio);
            }
        } else {
            // Check if hovering over the sun
            const dx = coords.x - this.sun.x;
            const dy = coords.y - this.sun.y;
            this.sun.hover = (!this.isRainy && Math.sqrt(dx*dx + dy*dy) < this.sun.radius * 1.3);
        }

        // Generate cursor particles
        if (Math.random() < 0.4) {
            this.particles.push({
                x: coords.x,
                y: coords.y,
                vx: (Math.random() - 0.5) * 2,
                vy: this.isRainy ? Math.random() * 2 + 1 : Math.random() * -1 - 0.5,
                size: Math.random() * 3 + 1,
                alpha: 1,
                color: this.isRainy ? 'rgba(112, 161, 255, 0.8)' : 'rgba(255, 214, 108, 0.9)'
            });
        }
    }

    handleMouseDown(e) {
        if (!this.isRainy) {
            const coords = this.getCanvasCoords(e);
            const dx = coords.x - this.sun.x;
            const dy = coords.y - this.sun.y;
            if (Math.sqrt(dx*dx + dy*dy) < this.sun.radius * 1.5) {
                this.sun.isDragging = true;
                this.sun.isDraggedByUser = true;
            }
        }
    }

    handleMouseUp() {
        this.sun.isDragging = false;
    }

    handleTouchStart(e) {
        if (e.touches && e.touches.length > 0) {
            const coords = this.getCanvasCoords(e);
            
            this.mouse.x = coords.x;
            this.mouse.y = coords.y;

            // Check if touch is on sun (more forgiving hit radius on mobile)
            if (!this.isRainy) {
                const dx = coords.x - this.sun.x;
                const dy = coords.y - this.sun.y;
                if (Math.sqrt(dx*dx + dy*dy) < this.sun.radius * 2.2) {
                    this.sun.isDragging = true;
                    this.sun.isDraggedByUser = true;
                    e.preventDefault();
                    return;
                }
            }

            // Check if touch is on flower
            if (this.checkFlowerTap(coords.x, coords.y)) {
                e.preventDefault();
                return;
            }

            // If rainy, spawn a new flower at touch location
            if (this.isRainy) {
                this.spawnPlant(coords.x);
                e.preventDefault(); // Prevents simulated click from spawning a duplicate flower
            }
        }
    }

    handleTouchMove(e) {
        if (e.touches && e.touches.length > 0) {
            const coords = this.getCanvasCoords(e);

            this.mouse.x = coords.x;
            this.mouse.y = coords.y;

            if (this.sun.isDragging) {
                this.sun.x = coords.x;
                this.sun.y = Math.max(this.height * 0.1, Math.min(this.height - 120, coords.y));
                this.sun.xRatio = this.sun.x / this.width;
                this.sun.yRatio = this.sun.y / this.height;
                if (this.onSunMove) {
                    this.onSunMove(this.sun.yRatio);
                }
                e.preventDefault(); // prevent screen scrolling while dragging
            }
        }
    }

    handleClick(e) {
        const coords = this.getCanvasCoords(e);

        // Prevent spawning a flower if we just dragged the sun
        if (this.sun.isDraggedByUser && !this.isRainy) {
            const dx = coords.x - this.sun.x;
            const dy = coords.y - this.sun.y;
            if (Math.sqrt(dx*dx + dy*dy) < this.sun.radius * 2.2) {
                return;
            }
        }

        // Check if click is on a flower
        if (this.checkFlowerTap(coords.x, coords.y)) {
            return;
        }

        // Otherwise, if it's raining, plant a flower at the clicked x position
        if (this.isRainy) {
            this.spawnPlant(coords.x);
        }
    }

    triggerFlowerBurst(x, y, color) {
        // Spawns 20 hardware-accelerated vector particles for smooth 60fps performance
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.0 + Math.random() * 5.0;
            const isHeart = Math.random() < 0.45;
            
            // Rosy red for hearts, warm glowing yellow/gold for sparkles
            const particleColor = isHeart ? color : '#fdcb6e';

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2.0, // upward bias
                size: isHeart ? 5 + Math.random() * 5 : 3 + Math.random() * 4,
                alpha: 1,
                isVectorShape: true,
                shapeType: isHeart ? 'heart' : 'sparkle',
                color: particleColor
            });
        }
    }

    update() {
        this.frameCount++;

        // Smooth wind transition
        this.wind += (this.targetWind - this.wind) * 0.05;

        // 1. Update Rain
        if (this.isRainy) {
            this.raindrops.forEach(drop => {
                drop.y += drop.vy;
                // Horizontal wobble using sine wave
                drop.wobblePhase += drop.wobbleSpeed;
                drop.x += this.wind * 2 + Math.sin(drop.wobblePhase) * 0.3;

                if (drop.y > this.height - 20) {
                    // Create splash with more particles
                    if (Math.random() < 0.25) {
                        const splashCount = 2 + Math.floor(Math.random() * 3);
                        for (let s = 0; s < splashCount; s++) {
                            this.splashes.push({
                                x: drop.x,
                                y: this.height - 20,
                                vx: (Math.random() - 0.5) * 5 + this.wind,
                                vy: -Math.random() * 3.5 - 1,
                                radius: 0.8 + Math.random() * 1.5,
                                alpha: 0.6
                            });
                        }
                        // Ripple ring effect on ground
                        this.splashes.push({
                            x: drop.x,
                            y: this.height - 20,
                            vx: 0,
                            vy: 0,
                            radius: 1,
                            alpha: 0.4,
                            isRipple: true,
                            maxRadius: 6 + Math.random() * 4,
                            expandSpeed: 0.3 + Math.random() * 0.2
                        });
                    }
                    // Reset raindrop
                    drop.y = -20;
                    drop.x = Math.random() * this.width;
                }
            });

            // Lightning flash
            if (Math.random() < 0.002) {
                this.lightningAlpha = 0.3 + Math.random() * 0.2;
            }
        }

        // Fade lightning
        if (this.lightningAlpha > 0) {
            this.lightningAlpha *= 0.88;
            if (this.lightningAlpha < 0.01) this.lightningAlpha = 0;
        }

        // 2. Update Splashes
        for (let i = this.splashes.length - 1; i >= 0; i--) {
            const splash = this.splashes[i];
            if (splash.isRipple) {
                splash.radius += splash.expandSpeed;
                splash.alpha -= 0.025;
            } else {
                splash.x += splash.vx;
                splash.y += splash.vy;
                splash.vy += 0.15; // gravity
                splash.alpha -= 0.02;
            }
            if (splash.alpha <= 0 || (splash.isRipple && splash.radius >= splash.maxRadius)) {
                this.splashes.splice(i, 1);
            }
        }

        // 3. Update Stems and Flowers
        let hoveredAny = null;
        
        this.plants.forEach(plant => {
            // Grow stems when it's raining (faster) or generally slowly
            const currentMax = this.isRainy ? plant.targetHeight : plant.targetHeight * 0.9;
            if (plant.currentHeight < currentMax) {
                plant.currentHeight += plant.growthSpeed * (this.isRainy ? 1.5 : 0.3);
                plant.progress = plant.currentHeight / plant.targetHeight;
            }

            // Grow leaves along with stem progress
            plant.leaves.forEach(leaf => {
                if (plant.progress > leaf.relHeight && leaf.progress < 1) {
                    leaf.progress += 0.02;
                }
            });

            // Calculate current flower position at the stem tip
            const tip = this.getStemTipCoordinates(plant);
            plant.tipX = tip.x;
            plant.tipY = tip.y;

            // Handle flower blooming state based on weather
            if (!this.isRainy && plant.progress > 0.5) {
                // Sunset: Bloom the flowers! (lower stem progress requirement to 50% for fast responsiveness)
                if (plant.flower.bloomProgress < 1) {
                    plant.flower.bloomProgress += plant.flower.bloomSpeed;
                }
                // NEW: Bloom burst when first reaching full bloom
                if (plant.flower.bloomProgress >= 0.95 && !plant.flower.hasBloomBurst) {
                    plant.flower.hasBloomBurst = true;
                    plant.flower.bloomBurstAlpha = 1.0;
                }
            } else {
                // Rainy: Close flowers back into buds
                if (plant.flower.bloomProgress > 0) {
                    plant.flower.bloomProgress -= plant.flower.bloomSpeed * 1.5;
                }
                if (plant.flower.bloomProgress < 0.5) {
                    plant.flower.hasBloomBurst = false; // reset so next bloom triggers burst again
                }
            }

            // Fade bloom burst
            if (plant.flower.bloomBurstAlpha > 0) {
                plant.flower.bloomBurstAlpha *= 0.93;
                if (plant.flower.bloomBurstAlpha < 0.01) plant.flower.bloomBurstAlpha = 0;
            }

            // Check hover state (only when flower is somewhat bloomed)
            if (plant.flower.bloomProgress > 0.3) {
                const dx = this.mouse.x - plant.tipX;
                const dy = this.mouse.y - plant.tipY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // Precise hover target matching the flower boundaries (1.1x size)
                if (dist < plant.flower.maxSize * 1.1) {
                    plant.flower.isHovered = true;
                    hoveredAny = plant;
                } else {
                    plant.flower.isHovered = false;
                }
            } else {
                plant.flower.isHovered = false;
            }

            // Update hover pulse
            if (plant.flower.isHovered) {
                plant.flower.pulse += 0.1;
            } else {
                plant.flower.pulse = 0;
            }
        });

        this.mouse.isHoveringFlower = hoveredAny;
        document.body.style.cursor = hoveredAny ? 'pointer' : 'default';

        // 4. Update Cursor Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.isEmoji) {
                p.vy += 0.12; // gravity for burst
                p.alpha -= 0.018; // decay slightly faster
            } else {
                p.alpha -= 0.015;
            }
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 5. Update Ambient Sunset Fireflies (Enhanced with trails and varied colors)
        if (!this.isRainy) {
            const fireflyColors = [
                { r: 255, g: 223, b: 108 }, // warm gold
                { r: 255, g: 183, b: 77 },  // soft orange
                { r: 255, g: 245, b: 157 }  // pale yellow
            ];

            if (this.ambientParticles.length < 60 && Math.random() < 0.1) {
                const colorChoice = fireflyColors[Math.floor(Math.random() * fireflyColors.length)];
                this.ambientParticles.push({
                    x: Math.random() * this.width,
                    y: this.height - 20 - Math.random() * 200,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: -Math.random() * 0.5 - 0.2,
                    size: 1 + Math.random() * 2.5,
                    alpha: 0.1,
                    maxAlpha: 0.3 + Math.random() * 0.5,
                    fadeSpeed: 0.005 + Math.random() * 0.005,
                    direction: 1,
                    color: colorChoice,
                    trail: [] // Store last 3 positions for trail
                });
            }

            for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
                const p = this.ambientParticles[i];
                
                // Store trail position
                p.trail.push({ x: p.x, y: p.y, alpha: p.alpha });
                if (p.trail.length > 3) p.trail.shift();

                p.x += p.vx + this.wind * 0.5;
                p.y += p.vy;
                
                // Fade in and out
                if (p.direction === 1) {
                    p.alpha += p.fadeSpeed;
                    if (p.alpha >= p.maxAlpha) p.direction = -1;
                } else {
                    p.alpha -= p.fadeSpeed;
                    if (p.alpha <= 0) {
                        this.ambientParticles.splice(i, 1);
                    }
                }
            }
        } else {
            this.ambientParticles = []; // clear fireflies in rain
        }

        // 6. Update Stars twinkle
        this.stars.forEach(star => {
            star.phase += star.twinkleSpeed;
            star.currentOpacity = star.baseOpacity * (0.5 + 0.5 * Math.sin(star.phase));
        });

        // 7. Shooting stars (sunset mode only)
        if (!this.isRainy) {
            if (Math.random() < 0.003) {
                const startX = Math.random() * this.width * 0.8;
                const startY = Math.random() * this.height * 0.3;
                this.shootingStars.push({
                    x: startX,
                    y: startY,
                    vx: 4 + Math.random() * 6,
                    vy: 2 + Math.random() * 3,
                    trail: [],
                    alpha: 1,
                    maxTrail: 12 + Math.floor(Math.random() * 8),
                    size: 1.5 + Math.random() * 1.5
                });
            }
        }

        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const ss = this.shootingStars[i];
            ss.trail.push({ x: ss.x, y: ss.y });
            if (ss.trail.length > ss.maxTrail) ss.trail.shift();
            ss.x += ss.vx;
            ss.y += ss.vy;
            ss.alpha -= 0.015;
            if (ss.alpha <= 0 || ss.x > this.width || ss.y > this.height) {
                this.shootingStars.splice(i, 1);
            }
        }

        // 8. Update grass sway
        this.grassBlades.forEach(blade => {
            blade.swayPhase += blade.swaySpeed;
        });

        // 9. Update sun ray rotation and corona
        this.sunRayAngle += 0.003;
        this.coronaPulse += 0.02;

        // 10. Update puddle visibility
        this.puddles.forEach(puddle => {
            if (this.isRainy) {
                puddle.opacity = Math.min(1, puddle.opacity + 0.01);
            } else {
                puddle.opacity = Math.max(0, puddle.opacity - 0.005);
            }
            puddle.ripplePhase += puddle.rippleSpeed;
        });
    }

    getStemTipCoordinates(plant) {
        return this.getInterpolatedPoint(plant, plant.progress);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw stars (behind everything, only in sunset)
        if (!this.isRainy) {
            this.drawStars();
        }

        // Draw moon (when sun is low)
        if (!this.isRainy && this.sun.yRatio > 0.65) {
            this.drawMoon();
        }

        // Draw shooting stars
        if (!this.isRainy) {
            this.drawShootingStars();
        }

        // Draw the draggable Sun (behind everything else)
        this.drawSun();

        // 1. Draw Stems (behind the ground hill)
        this.plants.forEach(plant => {
            this.drawStem(plant);
        });

        // 2. Draw Background Hill (Ground) - covers the base of the stems
        this.drawGround();

        // 2.5 Draw Grass blades (after ground, before flowers)
        this.drawGrass();

        // 2.6 Draw Puddles (on the ground during rain)
        this.drawPuddles();

        // 3. Draw Flowers (on top of everything)
        this.plants.forEach(plant => {
            this.drawFlower(plant);
        });

        // 4. Draw Raindrops (layered: background first, then foreground)
        if (this.isRainy) {
            // Background rain
            this.ctx.strokeStyle = 'rgba(174, 213, 255, 0.25)';
            this.ctx.lineWidth = 0.8;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.raindrops.forEach(drop => {
                if (!drop.isForeground) {
                    this.ctx.moveTo(drop.x, drop.y);
                    this.ctx.lineTo(drop.x + this.wind, drop.y + drop.length);
                }
            });
            this.ctx.stroke();

            // Foreground rain
            this.ctx.strokeStyle = 'rgba(174, 213, 255, 0.5)';
            this.ctx.lineWidth = 1.2;
            this.ctx.beginPath();
            this.raindrops.forEach(drop => {
                if (drop.isForeground) {
                    this.ctx.moveTo(drop.x, drop.y);
                    this.ctx.lineTo(drop.x + this.wind * 1.2, drop.y + drop.length);
                }
            });
            this.ctx.stroke();
        }

        // 5. Draw Splashes
        this.splashes.forEach(splash => {
            if (splash.isRipple) {
                // Ripple ring effect
                this.ctx.strokeStyle = `rgba(174, 213, 255, ${splash.alpha})`;
                this.ctx.lineWidth = 0.8;
                this.ctx.beginPath();
                this.ctx.ellipse(splash.x, splash.y, splash.radius, splash.radius * 0.4, 0, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = `rgba(174, 213, 255, ${splash.alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(splash.x, splash.y, splash.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // 6. Draw Ambient Sunset Particles (Fireflies with trails)
        if (!this.isRainy) {
            this.ambientParticles.forEach(p => {
                const c = p.color;
                
                // Draw trail
                if (p.trail.length > 1) {
                    for (let t = 0; t < p.trail.length; t++) {
                        const trailPt = p.trail[t];
                        const trailAlpha = (t / p.trail.length) * p.alpha * 0.4;
                        const trailSize = p.size * (t / p.trail.length) * 0.7;
                        this.ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${trailAlpha})`;
                        this.ctx.beginPath();
                        this.ctx.arc(trailPt.x, trailPt.y, trailSize, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }

                // Draw main firefly
                this.ctx.shadowBlur = p.size * 4;
                this.ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
                this.ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${p.alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            });
            // reset shadow
            this.ctx.shadowBlur = 0;
        }

        // 7. Draw Cursor & Burst Particles
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.alpha;
            
            if (p.isVectorShape) {
                if (p.shapeType === 'heart') {
                    this.drawHeart(p.x, p.y, p.size, p.color);
                } else {
                    this.drawSparkle(p.x, p.y, p.size, p.color);
                }
            } else {
                if (!this.isRainy) {
                    this.ctx.shadowBlur = p.size * 2;
                    this.ctx.shadowColor = p.color;
                }
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0; // reset
            }
        });
        this.ctx.globalAlpha = 1.0; // reset master alpha

        // 8. Draw Lightning flash overlay
        if (this.lightningAlpha > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningAlpha})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    drawStars() {
        this.stars.forEach(star => {
            if (star.currentOpacity <= 0.01) return;

            const grad = this.ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, star.size * 2
            );
            grad.addColorStop(0, `rgba(255, 255, 255, ${star.currentOpacity})`);
            grad.addColorStop(0.4, `rgba(220, 230, 255, ${star.currentOpacity * 0.5})`);
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            this.ctx.shadowBlur = star.size * 3;
            this.ctx.shadowColor = `rgba(200, 220, 255, ${star.currentOpacity * 0.6})`;
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.shadowBlur = 0;
    }

    drawMoon() {
        const moonX = this.width * 0.8;
        const moonY = this.height * 0.12;
        const moonR = 25;

        // How low is the sun? Map 0.65->0.85 to 0->1 for moon intensity
        const intensity = Math.min(1, Math.max(0, (this.sun.yRatio - 0.65) / 0.2));

        this.ctx.save();
        this.ctx.globalAlpha = intensity * 0.9;

        // Bluish glow
        const moonGlow = this.ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 3);
        moonGlow.addColorStop(0, 'rgba(180, 200, 255, 0.15)');
        moonGlow.addColorStop(0.5, 'rgba(120, 150, 220, 0.05)');
        moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = moonGlow;
        this.ctx.beginPath();
        this.ctx.arc(moonX, moonY, moonR * 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Moon disc
        const discGrad = this.ctx.createRadialGradient(moonX - 3, moonY - 3, 0, moonX, moonY, moonR);
        discGrad.addColorStop(0, '#e8eef5');
        discGrad.addColorStop(0.7, '#c8d6e5');
        discGrad.addColorStop(1, '#a0b4c8');
        this.ctx.fillStyle = discGrad;
        this.ctx.beginPath();
        this.ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        this.ctx.fill();

        // Crescent shadow (dark circle overlapping to create crescent)
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        this.ctx.beginPath();
        this.ctx.arc(moonX + moonR * 0.5, moonY - moonR * 0.15, moonR * 0.82, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalCompositeOperation = 'source-over';

        this.ctx.restore();
    }

    drawShootingStars() {
        this.shootingStars.forEach(ss => {
            if (ss.trail.length < 2) return;
            for (let t = 1; t < ss.trail.length; t++) {
                const trailAlpha = (t / ss.trail.length) * ss.alpha * 0.6;
                const trailWidth = ss.size * (t / ss.trail.length);
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${trailAlpha})`;
                this.ctx.lineWidth = trailWidth;
                this.ctx.beginPath();
                this.ctx.moveTo(ss.trail[t - 1].x, ss.trail[t - 1].y);
                this.ctx.lineTo(ss.trail[t].x, ss.trail[t].y);
                this.ctx.stroke();
            }
            // Head glow
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = `rgba(255, 255, 255, ${ss.alpha})`;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${ss.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(ss.x, ss.y, ss.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }

    drawHeart(x, y, size, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + size * 0.3);
        this.ctx.bezierCurveTo(x - size * 0.5, y - size * 0.1, x - size, y + size * 0.2, x - size, y + size * 0.6);
        this.ctx.bezierCurveTo(x - size, y + size * 0.95, x - size * 0.4, y + size * 1.25, x, y + size * 1.5);
        this.ctx.bezierCurveTo(x + size * 0.4, y + size * 1.25, x + size, y + size * 0.95, x + size, y + size * 0.6);
        this.ctx.bezierCurveTo(x + size, y + size * 0.2, x + size * 0.5, y - size * 0.1, x, y + size * 0.3);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawSparkle(x, y, size, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - size);
        this.ctx.quadraticCurveTo(x, y, x + size, y);
        this.ctx.quadraticCurveTo(x, y, x, y + size);
        this.ctx.quadraticCurveTo(x, y, x - size, y);
        this.ctx.quadraticCurveTo(x, y, x, y - size);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawSun() {
        if (this.isRainy) return;

        this.ctx.save();
        
        const sunRatio = this.sun.yRatio || 0.35;

        // NEW: Rotating sun rays (8 triangular rays)
        this.ctx.save();
        this.ctx.translate(this.sun.x, this.sun.y);
        this.ctx.rotate(this.sunRayAngle);
        
        const rayCount = 8;
        const innerR = this.sun.radius * 1.2;
        const outerR = this.sun.radius * 2.5;
        const rayWidth = 0.12; // half-angle in radians
        
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2;
            const rayAlpha = 0.08 + Math.sin(this.frameCount * 0.02 + i) * 0.03;
            
            this.ctx.fillStyle = sunRatio < 0.6
                ? `rgba(255, 200, 100, ${rayAlpha})`
                : `rgba(230, 100, 64, ${rayAlpha})`;
            
            this.ctx.beginPath();
            this.ctx.moveTo(
                Math.cos(angle - rayWidth) * innerR,
                Math.sin(angle - rayWidth) * innerR
            );
            this.ctx.lineTo(
                Math.cos(angle) * outerR,
                Math.sin(angle) * outerR
            );
            this.ctx.lineTo(
                Math.cos(angle + rayWidth) * innerR,
                Math.sin(angle + rayWidth) * innerR
            );
            this.ctx.closePath();
            this.ctx.fill();
        }
        this.ctx.restore();

        // NEW: Corona effect (pulsing outer ring)
        const coronaSize = this.sun.radius * (1.6 + Math.sin(this.coronaPulse) * 0.15);
        const coronaGrad = this.ctx.createRadialGradient(
            this.sun.x, this.sun.y, this.sun.radius * 0.9,
            this.sun.x, this.sun.y, coronaSize
        );
        const coronaColor = sunRatio < 0.6 ? '255, 190, 90' : '230, 92, 64';
        coronaGrad.addColorStop(0, `rgba(${coronaColor}, 0.15)`);
        coronaGrad.addColorStop(0.5, `rgba(${coronaColor}, 0.06)`);
        coronaGrad.addColorStop(1, `rgba(${coronaColor}, 0)`);
        
        this.ctx.fillStyle = coronaGrad;
        this.ctx.beginPath();
        this.ctx.arc(this.sun.x, this.sun.y, coronaSize, 0, Math.PI * 2);
        this.ctx.fill();

        // Outer glowing halo
        const outerGlow = this.ctx.createRadialGradient(
            this.sun.x, this.sun.y, 0,
            this.sun.x, this.sun.y, this.sun.radius * 3.5
        );
        
        const glowColor = sunRatio < 0.6 ? 'rgba(255, 179, 71, 0.25)' : 'rgba(230, 92, 64, 0.15)';
        
        outerGlow.addColorStop(0, glowColor);
        outerGlow.addColorStop(0.3, 'rgba(255, 127, 80, 0.08)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.fillStyle = outerGlow;
        this.ctx.beginPath();
        this.ctx.arc(this.sun.x, this.sun.y, this.sun.radius * 3.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Main sun disc
        this.ctx.shadowBlur = this.sun.hover ? 35 : 20;
        this.ctx.shadowColor = sunRatio < 0.6 ? '#ffb347' : '#e65c40';
        
        const sunGrad = this.ctx.createRadialGradient(
            this.sun.x, this.sun.y, 0,
            this.sun.x, this.sun.y, this.sun.radius
        );
        sunGrad.addColorStop(0, '#ffffff');
        sunGrad.addColorStop(0.4, '#fff2cc');
        sunGrad.addColorStop(1, sunRatio < 0.6 ? '#ffb347' : '#e65c40');

        this.ctx.fillStyle = sunGrad;
        this.ctx.beginPath();
        this.ctx.arc(this.sun.x, this.sun.y, this.sun.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
        this.ctx.shadowBlur = 0; // reset
    }

    drawGround() {
        const hillGrad = this.ctx.createLinearGradient(0, this.height - 80, 0, this.height);
        if (this.isRainy) {
            hillGrad.addColorStop(0, '#11171a');
            hillGrad.addColorStop(1, '#080b0c');
        } else {
            hillGrad.addColorStop(0, '#1c1328');
            hillGrad.addColorStop(1, '#0e0817');
        }

        this.ctx.fillStyle = hillGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        this.ctx.lineTo(0, this.height - 20);
        this.ctx.quadraticCurveTo(this.width / 2, this.height - 35, this.width, this.height - 20);
        this.ctx.lineTo(this.width, this.height);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawGrass() {
        const groundY = this.height - 18; // slightly above ground line
        this.grassBlades.forEach(blade => {
            const sway = Math.sin(blade.swayPhase) * (3 + Math.abs(this.wind) * 8);
            
            const baseX = blade.x;
            const baseY = groundY;
            const tipX = baseX + sway;
            const tipY = baseY - blade.height;

            // Green gradient for each blade
            const alpha = this.isRainy ? 0.5 : 0.7;
            const lightness = blade.lightness;
            
            this.ctx.strokeStyle = `hsla(${blade.hue}, 50%, ${lightness}%, ${alpha})`;
            this.ctx.lineWidth = blade.width;
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(baseX, baseY);
            this.ctx.quadraticCurveTo(
                baseX + sway * 0.3, baseY - blade.height * 0.5,
                tipX, tipY
            );
            this.ctx.stroke();
        });
    }

    drawPuddles() {
        this.puddles.forEach(puddle => {
            if (puddle.opacity <= 0.01) return;

            this.ctx.save();
            this.ctx.globalAlpha = puddle.opacity * 0.4;

            // Puddle base
            const puddleGrad = this.ctx.createRadialGradient(
                puddle.x, puddle.y, 0,
                puddle.x, puddle.y, puddle.rx
            );
            puddleGrad.addColorStop(0, 'rgba(100, 150, 200, 0.3)');
            puddleGrad.addColorStop(0.7, 'rgba(80, 120, 180, 0.15)');
            puddleGrad.addColorStop(1, 'rgba(60, 100, 160, 0)');

            this.ctx.fillStyle = puddleGrad;
            this.ctx.beginPath();
            this.ctx.ellipse(puddle.x, puddle.y, puddle.rx, puddle.ry, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Ripple rings
            if (this.isRainy) {
                const rippleR = puddle.rx * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(puddle.ripplePhase)));
                const rippleAlpha = 0.15 * (0.5 + 0.5 * Math.cos(puddle.ripplePhase));
                this.ctx.strokeStyle = `rgba(174, 213, 255, ${rippleAlpha})`;
                this.ctx.lineWidth = 0.5;
                this.ctx.beginPath();
                this.ctx.ellipse(puddle.x, puddle.y, rippleR, rippleR * 0.35, 0, 0, Math.PI * 2);
                this.ctx.stroke();

                // Second ripple offset
                const ripple2Phase = puddle.ripplePhase + Math.PI * 0.7;
                const ripple2R = puddle.rx * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(ripple2Phase)));
                const ripple2Alpha = 0.1 * (0.5 + 0.5 * Math.cos(ripple2Phase));
                this.ctx.strokeStyle = `rgba(174, 213, 255, ${ripple2Alpha})`;
                this.ctx.beginPath();
                this.ctx.ellipse(puddle.x, puddle.y, ripple2R, ripple2R * 0.35, 0, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            this.ctx.restore();
        });
    }

    drawStem(plant) {
        if (plant.currentHeight < 5) return;

        const steps = Math.floor(plant.progress * 30);
        if (steps < 2) return;

        // 1. Draw the stem path
        this.ctx.strokeStyle = plant.stemColor;
        this.ctx.lineWidth = Math.max(1.5, 3.5 * (1 - plant.progress * 0.4));
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        const start = this.getInterpolatedPoint(plant, 0);
        this.ctx.moveTo(start.x, start.y);

        for (let i = 1; i <= steps; i++) {
            const t = (i / steps) * plant.progress;
            const pt = this.getInterpolatedPoint(plant, t);
            this.ctx.lineTo(pt.x, pt.y);
        }
        this.ctx.stroke();

        // 2. Draw the leaves at their fixed relative positions along the grown part of the stem
        plant.leaves.forEach(leaf => {
            if (plant.progress > leaf.relHeight && leaf.progress > 0) {
                const pt = this.getInterpolatedPoint(plant, leaf.relHeight);
                this.drawLeaf(pt.x, pt.y, leaf);
            }
        });
    }

    getInterpolatedPoint(plant, t) {
        const x0 = plant.x;
        const y0 = this.height - 15;

        const cx1 = x0 + plant.controlOffset1;
        const cy1 = y0 - plant.targetHeight * 0.33;
        
        const cx2 = x0 + plant.controlOffset2;
        const cy2 = y0 - plant.targetHeight * 0.66;
        
        let x3 = x0 + (plant.controlOffset1 + plant.controlOffset2) * 0.5 + this.wind * 50;
        
        // Lean towards the sun when it is visible (Sunset mode)
        if (!this.isRainy) {
            const lean = (this.sun.x - x0) * 0.12;
            x3 += lean;
        }

        const y3 = y0 - plant.targetHeight;

        const oneMinusT = 1 - t;
        const x = Math.pow(oneMinusT, 3) * x0 + 
                  3 * Math.pow(oneMinusT, 2) * t * cx1 + 
                  3 * oneMinusT * Math.pow(t, 2) * cx2 + 
                  Math.pow(t, 3) * x3;

        const y = Math.pow(oneMinusT, 3) * y0 + 
                  3 * Math.pow(oneMinusT, 2) * t * cy1 + 
                  3 * oneMinusT * Math.pow(t, 2) * cy2 + 
                  Math.pow(t, 3) * y3;

        return { x, y };
    }

    drawLeaf(x, y, leaf) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(leaf.angle + this.wind * 0.2);

        this.ctx.fillStyle = leaf.progress < 1 ? 'rgba(75, 120, 56, 0.4)' : '#3b622c';
        
        const size = leaf.size * leaf.progress;

        this.ctx.beginPath();
        // Leaf shape using bezier curves
        if (leaf.side === -1) {
            this.ctx.moveTo(0, 0);
            this.ctx.quadraticCurveTo(-size * 1.5, -size * 0.5, -size * 2, -size * 0.2);
            this.ctx.quadraticCurveTo(-size * 1.2, size * 0.5, 0, 0);
        } else {
            this.ctx.moveTo(0, 0);
            this.ctx.quadraticCurveTo(size * 1.5, -size * 0.5, size * 2, -size * 0.2);
            this.ctx.quadraticCurveTo(size * 1.2, size * 0.5, 0, 0);
        }
        
        this.ctx.fill();
        this.ctx.restore();
    }

    drawFlower(plant) {
        if (plant.currentHeight < 20 || plant.progress < 0.7) return;

        const tipX = plant.tipX;
        const tipY = plant.tipY;
        const flower = plant.flower;

        this.ctx.save();
        this.ctx.translate(tipX, tipY);

        // Slow hover rotation or wind sway
        const rotationAngle = this.wind * 0.3 + (flower.isHovered ? Math.sin(Date.now() / 150) * 0.05 : 0);
        this.ctx.rotate(rotationAngle);

        if (flower.bloomProgress > 0.05) {
            // BLOOMED STATE (Sunset Mode)
            const currentSize = flower.maxSize * flower.bloomProgress;

            // NEW: Radial light burst on first full bloom
            if (flower.bloomBurstAlpha > 0) {
                const burstRadius = currentSize * (2.5 + (1 - flower.bloomBurstAlpha) * 3);
                const burstGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, burstRadius);
                burstGrad.addColorStop(0, `rgba(255, 255, 255, ${flower.bloomBurstAlpha * 0.5})`);
                burstGrad.addColorStop(0.3, `rgba(255, 230, 180, ${flower.bloomBurstAlpha * 0.3})`);
                burstGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = burstGrad;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, burstRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Draw glowing halo around hovered flower
            if (flower.isHovered) {
                const glowPulse = currentSize * (1.3 + Math.sin(flower.pulse) * 0.15);
                const radialGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, glowPulse);
                radialGlow.addColorStop(0, flower.color.glow);
                radialGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
                radialGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = radialGlow;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, glowPulse, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Draw petals
            const petals = flower.petalsCount;
            const angleStep = (Math.PI * 2) / petals;

            this.ctx.shadowBlur = flower.isHovered ? 12 : 5;
            this.ctx.shadowColor = flower.color.primary;

            for (let i = 0; i < petals; i++) {
                this.ctx.save();
                this.ctx.rotate(i * angleStep + (flower.bloomProgress * Math.PI * 0.2));

                const petalGrad = this.ctx.createLinearGradient(0, 0, 0, -currentSize);
                petalGrad.addColorStop(0, flower.color.secondary);
                petalGrad.addColorStop(0.7, flower.color.primary);
                petalGrad.addColorStop(1, '#ffffff');

                this.ctx.fillStyle = petalGrad;

                // Make petals fold out beautifully
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.bezierCurveTo(
                    -currentSize * 0.45, -currentSize * 0.35, 
                    -currentSize * 0.35, -currentSize * 0.95, 
                    0, -currentSize
                );
                this.ctx.bezierCurveTo(
                    currentSize * 0.35, -currentSize * 0.95, 
                    currentSize * 0.45, -currentSize * 0.35, 
                    0, 0
                );
                this.ctx.fill();

                // NEW: Draw delicate petal veins
                if (flower.bloomProgress > 0.5) {
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 * flower.bloomProgress})`;
                    this.ctx.lineWidth = 0.4;
                    this.ctx.beginPath();
                    // Center vein
                    this.ctx.moveTo(0, -currentSize * 0.1);
                    this.ctx.quadraticCurveTo(0, -currentSize * 0.5, 0, -currentSize * 0.85);
                    this.ctx.stroke();
                    // Side veins
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -currentSize * 0.3);
                    this.ctx.quadraticCurveTo(-currentSize * 0.12, -currentSize * 0.55, -currentSize * 0.18, -currentSize * 0.7);
                    this.ctx.stroke();
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -currentSize * 0.3);
                    this.ctx.quadraticCurveTo(currentSize * 0.12, -currentSize * 0.55, currentSize * 0.18, -currentSize * 0.7);
                    this.ctx.stroke();
                }

                this.ctx.restore();
            }

            // Draw flower center (pistil)
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = '#fff';
            
            const centerSize = (currentSize * 0.3) * (1 + Math.sin(Date.now() / 250) * 0.08);
            const centerGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, centerSize);
            centerGrad.addColorStop(0, '#ffffff');
            centerGrad.addColorStop(0.5, '#fdcb6e');
            centerGrad.addColorStop(1, '#e17055');

            this.ctx.fillStyle = centerGrad;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, centerSize, 0, Math.PI * 2);
            this.ctx.fill();

        } else {
            // BUD STATE (Rainy Mode)
            const budSize = plant.flower.budSize;
            this.ctx.shadowBlur = 2;
            this.ctx.shadowColor = plant.flower.color.secondary;

            this.ctx.fillStyle = plant.flower.color.secondary;
            this.ctx.beginPath();
            // Ellipse bud
            this.ctx.ellipse(0, 0, budSize, budSize * 1.5, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Tiny green sepals wrapping the bud
            this.ctx.fillStyle = '#2d4a22';
            this.ctx.beginPath();
            this.ctx.moveTo(-budSize, budSize * 0.5);
            this.ctx.quadraticCurveTo(0, 0, -budSize * 0.3, -budSize * 0.8);
            this.ctx.quadraticCurveTo(-budSize * 0.2, budSize * 0.2, 0, budSize * 1.5);
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.moveTo(budSize, budSize * 0.5);
            this.ctx.quadraticCurveTo(0, 0, budSize * 0.3, -budSize * 0.8);
            this.ctx.quadraticCurveTo(budSize * 0.2, budSize * 0.2, 0, budSize * 1.5);
            this.ctx.fill();
        }

        this.ctx.restore();
        this.ctx.shadowBlur = 0; // reset
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

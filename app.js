// Ambient Audio Engine using Web Audio API
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = true;
        this.isRainy = true;
        
        // Node references
        this.masterGain = null;
        this.rainGain = null;
        this.musicGain = null;
        this.rainSource = null;
        this.synthInterval = null;

        // Sufjan Stevens - Mystery of Love Intro Chords (Transposed to Capo 4: E - F# - G#m - F#)
        this.chords = [
            [52, 59, 64, 68, 71], // E (Capo 4 C shape: E2, B2, E3, G#3, B3)
            [54, 61, 66, 70, 73], // F# (Capo 4 D shape: F#2, C#3, F#3, A#3, C#4)
            [56, 63, 68, 71, 75], // G#m (Capo 4 Em shape: G#2, D#3, G#3, B3, D#4)
            [54, 61, 66, 70, 73]  // F# (Capo 4 D shape: F#2, C#3, F#3, A#3, C#4)
        ];
        this.currentChordIndex = 0;
    }

    init() {
        if (this.ctx) return;
        // Create context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Master Volume
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // Rain Channel
        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        this.rainGain.connect(this.masterGain);
        this.createRainNode();

        // Music Channel
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);

        // Setup delay effect for ambient dreaminess
        this.delayNode = this.ctx.createDelay(1.0);
        this.delayNode.delayTime.setValueAtTime(0.6, this.ctx.currentTime);
        
        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.setValueAtTime(0.35, this.ctx.currentTime);

        this.delayNode.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode); // feedback loop
        this.delayNode.connect(this.musicGain);

        // Start the music loop
        this.startMusic();
    }

    createRainNode() {
        // Create pink noise buffer for rain sound
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            // Pink noise filtering
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11; // rescale
            b6 = white * 0.115926;
        }

        this.rainSource = this.ctx.createBufferSource();
        this.rainSource.buffer = noiseBuffer;
        this.rainSource.loop = true;

        // Bandpass Filter to shape rain (remove low rumble, focus on soft high patter)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.Q.setValueAtTime(0.5, this.ctx.currentTime);

        // Lowpass Filter for smoothing
        const lpf = this.ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(3000, this.ctx.currentTime);

        // LFO for wind amplitude modulation
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime); // 1 cycle every 6.6 sec

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(this.rainGain.gain); // Modulate volume

        // Connections
        this.rainSource.connect(filter);
        filter.connect(lpf);
        lpf.connect(this.rainGain);

        lfo.start();
        this.rainSource.start();
    }

    startMusic() {
        const playChord = () => {
            const chord = this.chords[this.currentChordIndex];
            this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;

            const now = this.ctx.currentTime;
            
            // Fingerpicking arpeggio pattern representing "Mystery of Love" acoustic feel
            const pattern = [0, 1, 2, 3, 4, 2, 3, 4];
            const noteStep = 0.18; // 180ms delay between plucks (~83 BPM eighth notes)

            // Play the arpeggio pattern twice per chord
            const playPattern = (patternStartTime) => {
                pattern.forEach((noteIdx, stepIdx) => {
                    const noteTime = patternStartTime + (stepIdx * noteStep);
                    const midiNote = chord[noteIdx];
                    const freq = this.midiToFreq(midiNote);

                    // Create warm triangle pluck
                    const osc = this.ctx.createOscillator();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, noteTime);

                    // Dynamic lowpass filter to mimic wooden guitar body resonance
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(1000, noteTime);
                    filter.frequency.exponentialRampToValueAtTime(350, noteTime + 1.8);

                    // Volume envelope
                    const gain = this.ctx.createGain();
                    gain.gain.setValueAtTime(0, noteTime);
                    
                    // Root note has slightly more velocity/presence
                    const peakVolume = (noteIdx === 0) ? 0.12 : 0.06;
                    gain.gain.linearRampToValueAtTime(peakVolume, noteTime + 0.015);
                    
                    // Decays naturally
                    const decayTime = (noteIdx === 0) ? 2.5 : 1.2;
                    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + decayTime);

                    osc.connect(filter);
                    filter.connect(gain);

                    gain.connect(this.musicGain);
                    gain.connect(this.delayNode);

                    osc.start(noteTime);
                    osc.stop(noteTime + decayTime + 0.2);
                });
            };

            // Play twice for 3.2 seconds total cycle (2 * 1.44s + small pause)
            playPattern(now);
            playPattern(now + 1.44);
        };

        // Play initial chord and start loop
        playChord();
        this.synthInterval = setInterval(playChord, 3200); // Shift every 3.2 seconds
    }

    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    setWeatherState(isRainy) {
        this.isRainy = isRainy;
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (isRainy) {
            // Fade rain in, reduce music volume slightly
            this.rainGain.gain.cancelScheduledValues(now);
            this.rainGain.gain.linearRampToValueAtTime(0.06, now + 4);
            
            this.musicGain.gain.cancelScheduledValues(now);
            this.musicGain.gain.linearRampToValueAtTime(0.22, now + 4);
        } else {
            // Fade rain out, boost music volume slightly
            this.rainGain.gain.cancelScheduledValues(now);
            this.rainGain.gain.linearRampToValueAtTime(0.005, now + 4.5); // Almost completely silent in sunset
            
            this.musicGain.gain.cancelScheduledValues(now);
            this.musicGain.gain.linearRampToValueAtTime(0.35, now + 4.5);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (!this.ctx) return this.isMuted;

        const now = this.ctx.currentTime;
        if (this.isMuted) {
            // Fade master to zero
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.linearRampToValueAtTime(0, now + 0.8);
        } else {
            // Unmute
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.linearRampToValueAtTime(1.0, now + 1.2);
        }
        return this.isMuted;
    }
}

// UI Controller Class
class App {
    constructor() {
        this.isRainy = true;
        this.audio = new AudioEngine();
        this.typewriterTimeout = null;
        this.lastOpenTime = 0;
        
        // Dom Elements
        this.introOverlay = document.getElementById('introOverlay');
        this.startBtn = document.getElementById('startBtn');
        this.weatherToggleBtn = document.getElementById('weatherToggle');
        this.soundToggleBtn = document.getElementById('soundToggle');
        
        this.letterModal = document.getElementById('letterModal');
        this.modalCloseBtn = this.letterModal.querySelector('.modal-close');
        this.modalBackdrop = this.letterModal.querySelector('.modal-backdrop');
        this.letterText = this.letterModal.querySelector('.letter-text');

        this.starsContainer = document.getElementById('starsContainer');
        this.floatingClouds = document.getElementById('floatingClouds');
        this.introParticles = document.getElementById('introParticles');
        this.lensFlare = document.querySelector('.lens-flare');

        // Create HTML/CSS Flash element for transitions
        this.flashEl = document.createElement('div');
        this.flashEl.id = 'weatherFlash';
        document.body.appendChild(this.flashEl);

        // Generate intro screen floating particles
        this.initIntroParticles();

        // Initialize Garden
        this.garden = new Garden('gardenCanvas', (msg) => this.openLetter(msg));
        
        // Bind Sun movement to sky dynamic colors and lens flare
        this.garden.onSunMove = (ratio) => this.handleSunMove(ratio);

        // Bind events
        this.startBtn.addEventListener('click', () => this.startExperience());
        this.weatherToggleBtn.addEventListener('click', () => this.toggleWeather());
        this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
        
        this.modalCloseBtn.addEventListener('click', () => this.closeLetter());
        this.modalBackdrop.addEventListener('click', () => this.closeLetter());
    }

    initIntroParticles() {
        if (!this.introParticles) return;
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'intro-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.bottom = Math.random() * 20 + '%';
            
            const size = 1.5 + Math.random() * 3.5;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            
            p.style.setProperty('--drift-duration', (5 + Math.random() * 8) + 's');
            p.style.setProperty('--drift-delay', (Math.random() * 6) + 's');
            
            this.introParticles.appendChild(p);
        }
    }

    startExperience() {
        if (this.audio.ctx) return;
        // Initialize audio context on user action (browser requirement)
        this.audio.init();
        
        // Hide intro overlay with fade
        this.introOverlay.classList.add('hidden');

        // Generate DOM stars and clouds
        this.generateDOMStars();
        this.generateDOMClouds();

        // Completely remove intro card from layout flow after fade-out transition finishes
        setTimeout(() => {
            this.introOverlay.style.display = 'none';
        }, 1200);

        // Unmute audio immediately (synchronously) to satisfy strict iOS/Safari policies
        this.toggleSound(false); // turn sound on
    }

    generateDOMStars() {
        if (!this.starsContainer) return;
        this.starsContainer.innerHTML = '';
        for (let i = 0; i < 80; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            
            const size = 1 + Math.random() * 2;
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            
            star.style.setProperty('--twinkle-duration', (2 + Math.random() * 4) + 's');
            star.style.setProperty('--twinkle-delay', (Math.random() * 5) + 's');
            
            this.starsContainer.appendChild(star);
        }
    }

    generateDOMClouds() {
        if (!this.floatingClouds) return;
        this.floatingClouds.innerHTML = '';
        const cloudCount = 6;
        for (let i = 0; i < cloudCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud';
            cloud.style.top = (5 + Math.random() * 45) + '%';
            
            const width = 80 + Math.random() * 140;
            const height = width * 0.4;
            cloud.style.width = width + 'px';
            cloud.style.height = height + 'px';
            
            cloud.style.setProperty('--cloud-speed', (30 + Math.random() * 45) + 's');
            // stagger delays so clouds enter at different positions
            cloud.style.animationDelay = -(Math.random() * 50) + 's';
            
            this.floatingClouds.appendChild(cloud);
        }
    }

    toggleWeather() {
        this.isRainy = !this.isRainy;
        
        // Trigger subtle flash overlay
        if (this.flashEl) {
            this.flashEl.style.opacity = '0.08';
            setTimeout(() => {
                this.flashEl.style.opacity = '0';
            }, 300);
        }

        const btnIcon = this.weatherToggleBtn.querySelector('.btn-icon');
        const btnText = this.weatherToggleBtn.querySelector('.btn-text');

        if (this.isRainy) {
            document.body.className = 'weather-rainy';
            btnIcon.textContent = '🌧️';
            btnText.textContent = 'Идет дождь...';
            this.garden.setWeather(true);
            this.audio.setWeatherState(true);
        } else {
            document.body.className = 'weather-sunset';
            btnIcon.textContent = '🌅';
            btnText.textContent = 'Наступил закат';
            this.garden.setWeather(false);
            this.audio.setWeatherState(false);
        }
    }

    toggleSound(forceState) {
        let isMutedNow;
        if (typeof forceState === 'boolean') {
            // Explicitly set state if specified
            if (this.audio.isMuted !== forceState) {
                isMutedNow = this.audio.toggleMute();
            } else {
                isMutedNow = this.audio.isMuted;
            }
        } else {
            isMutedNow = this.audio.toggleMute();
        }

        const icon = this.soundToggleBtn.querySelector('.audio-icon');
        const text = this.soundToggleBtn.querySelector('.audio-text');

        if (isMutedNow) {
            this.soundToggleBtn.classList.remove('active');
            icon.textContent = '🔇';
            text.textContent = 'Без звука';
        } else {
            this.soundToggleBtn.classList.add('active');
            icon.textContent = '🔊';
            text.textContent = 'Звук включен';
        }
    }

    handleSunMove(ratio) {
        // Map ratio (0.1 to 0.8) to interpolation factor (0 to 1)
        const t = Math.max(0, Math.min(1, (ratio - 0.1) / 0.7));

        // Interpolate sky colors based on sun position (from rich golden sunset to deep dark red-indigo)
        const topColor = this.interpolateColor('#1e0b36', '#090412', t);
        const midColor = this.interpolateColor('#9e1b4f', '#31092a', t);
        const botColor = this.interpolateColor('#ffb347', '#7d1f11', t);

        const skySunset = document.querySelector('.sky-sunset');
        if (skySunset) {
            skySunset.style.background = `linear-gradient(180deg, ${topColor} 0%, ${midColor} 35%, ${botColor} 100%)`;
        }

        // Adjust ambient sun glow opacity
        const sunGlow = document.querySelector('.sun-glow');
        if (sunGlow) {
            sunGlow.style.opacity = (1 - t * 0.7);
        }

        // Position lens flare following the sun with offset
        if (this.lensFlare && this.garden && this.garden.sun) {
            // place flare slightly offset in opposite direction to center
            const sunX = this.garden.sun.x;
            const sunY = this.garden.sun.y;
            this.lensFlare.style.left = (sunX + (this.garden.width / 2 - sunX) * 0.35) + 'px';
            this.lensFlare.style.top = (sunY + (this.garden.height / 2 - sunY) * 0.35) + 'px';
        }
    }

    interpolateColor(hex1, hex2, factor) {
        const r1 = parseInt(hex1.slice(1, 3), 16);
        const g1 = parseInt(hex1.slice(3, 5), 16);
        const b1 = parseInt(hex1.slice(5, 7), 16);

        const r2 = parseInt(hex2.slice(1, 3), 16);
        const g2 = parseInt(hex2.slice(3, 5), 16);
        const b2 = parseInt(hex2.slice(5, 7), 16);

        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);

        return `rgb(${r}, ${g}, ${b})`;
    }

    openLetter(msg) {
        if (this.typewriterTimeout) {
            clearTimeout(this.typewriterTimeout);
        }
        this.letterText.textContent = '';
        this.letterModal.classList.remove('hidden');
        this.lastOpenTime = Date.now(); // Record open timestamp to prevent immediate auto-close on mobile

        let idx = 0;
        const type = () => {
            if (idx < msg.length) {
                this.letterText.textContent += msg.charAt(idx);
                idx++;
                // Natural typewriter rhythm
                this.typewriterTimeout = setTimeout(type, 25 + Math.random() * 20);
            }
        };
        
        // Wait for modal transition to finish
        this.typewriterTimeout = setTimeout(type, 350);
    }

    closeLetter() {
        // Ignore close requests if the modal was just opened (prevents accidental tap propagation close)
        if (Date.now() - this.lastOpenTime < 400) {
            return;
        }
        if (this.typewriterTimeout) {
            clearTimeout(this.typewriterTimeout);
            this.typewriterTimeout = null;
        }
        this.letterModal.classList.add('hidden');
    }
}

// Launch application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

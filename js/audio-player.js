/* ============================================
   Fast CET — Audio Player (audio-player.js)
   Custom audio player with coral orange theme
   ============================================ */

const AudioPlayer = {
  _audio: null,
  _container: null,
  _state: {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1,
    speeds: [0.75, 1, 1.25, 1.5],
  },

  /**
   * Initialize audio player
   * @param {string} containerId - container element ID
   * @param {object} options
   *   - src: string (initial audio source)
   *   - title: string (track title)
   *   - onEnd: function callback
   *   - onTimeUpdate: function(currentTime, duration)
   */
  init(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this._container = container;
    this._options = options;

    this._audio = new Audio();
    this._audio.preload = 'metadata';

    this._render();
    this._bindEvents();

    if (options.src) {
      this.load(options.src);
    }
  },

  /** Render custom player UI */
  _render() {
    const title = this._options.title || '';
    this._container.innerHTML = `
      <div class="audio-player">
        <div class="audio-player__info">
          <span class="audio-player__title">${this._escape(title)}</span>
          <span class="audio-player__time">
            <span class="audio-player__current">0:00</span>
            <span class="audio-player__sep">/</span>
            <span class="audio-player__duration">0:00</span>
          </span>
        </div>

        <div class="audio-player__progress" data-action="seek">
          <div class="audio-player__progress-track">
            <div class="audio-player__progress-fill"></div>
            <div class="audio-player__progress-thumb"></div>
          </div>
        </div>

        <div class="audio-player__controls">
          <button class="audio-player__btn audio-player__btn--play" data-action="play" aria-label="播放">
            <svg class="audio-player__icon audio-player__icon--play" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,3 20,12 6,21"/>
            </svg>
            <svg class="audio-player__icon audio-player__icon--pause" viewBox="0 0 24 24" fill="currentColor" style="display:none">
              <rect x="5" y="3" width="5" height="18"/>
              <rect x="14" y="3" width="5" height="18"/>
            </svg>
          </button>

          <div class="audio-player__speeds">
            ${this._state.speeds.map(s => `
              <button class="audio-player__speed${s === 1 ? ' is-active' : ''}" data-action="speed" data-speed="${s}">
                ${s}x
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Cache DOM refs
    this._refs = {
      playBtn: this._container.querySelector('[data-action="play"]'),
      iconPlay: this._container.querySelector('.audio-player__icon--play'),
      iconPause: this._container.querySelector('.audio-player__icon--pause'),
      progress: this._container.querySelector('.audio-player__progress'),
      progressFill: this._container.querySelector('.audio-player__progress-fill'),
      progressThumb: this._container.querySelector('.audio-player__progress-thumb'),
      currentTime: this._container.querySelector('.audio-player__current'),
      duration: this._container.querySelector('.audio-player__duration'),
      speedBtns: this._container.querySelectorAll('[data-action="speed"]'),
    };
  },

  /** Bind audio + UI events */
  _bindEvents() {
    const audio = this._audio;

    audio.addEventListener('loadedmetadata', () => {
      this._state.duration = audio.duration;
      this._refs.duration.textContent = this._formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      this._state.currentTime = audio.currentTime;
      this._refs.currentTime.textContent = this._formatTime(audio.currentTime);
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      this._refs.progressFill.style.width = `${pct}%`;
      this._refs.progressThumb.style.left = `${pct}%`;
      if (this._options.onTimeUpdate) {
        this._options.onTimeUpdate(audio.currentTime, audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      this._state.isPlaying = false;
      this._updatePlayIcon();
      if (this._options.onEnd) this._options.onEnd();
    });

    audio.addEventListener('play', () => {
      this._state.isPlaying = true;
      this._updatePlayIcon();
    });

    audio.addEventListener('pause', () => {
      this._state.isPlaying = false;
      this._updatePlayIcon();
    });

    // UI: play/pause
    this._refs.playBtn.addEventListener('click', () => this.toggle());

    // UI: progress bar seek
    this._refs.progress.addEventListener('click', (e) => {
      const rect = this._refs.progress.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      this.seek(pct * this._state.duration);
    });

    // UI: speed buttons
    this._refs.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        this.setSpeed(speed);
      });
    });

    // Keyboard: space to toggle
    this._keyHandler = (e) => {
      if (e.code === 'Space' && document.activeElement === document.body) {
        e.preventDefault();
        this.toggle();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  },

  /** Load audio source */
  load(src) {
    this._audio.src = src;
    this._audio.load();
    this._state.isPlaying = false;
    this._updatePlayIcon();
    this._refs.progressFill.style.width = '0%';
    this._refs.progressThumb.style.left = '0%';
    this._refs.currentTime.textContent = '0:00';
  },

  /** Play / resume */
  play() {
    this._audio.play().catch(() => {});
  },

  /** Pause */
  pause() {
    this._audio.pause();
  },

  /** Toggle play/pause */
  toggle() {
    if (this._state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  },

  /** Seek to position (seconds) */
  seek(time) {
    this._audio.currentTime = Math.max(0, Math.min(time, this._state.duration));
  },

  /** Set playback speed */
  setSpeed(speed) {
    this._state.speed = speed;
    this._audio.playbackRate = speed;
    this._refs.speedBtns.forEach(btn => {
      const s = parseFloat(btn.dataset.speed);
      btn.classList.toggle('is-active', s === speed);
    });
  },

  /** Update play/pause icon visibility */
  _updatePlayIcon() {
    if (this._state.isPlaying) {
      this._refs.iconPlay.style.display = 'none';
      this._refs.iconPause.style.display = 'block';
    } else {
      this._refs.iconPlay.style.display = 'block';
      this._refs.iconPause.style.display = 'none';
    }
  },

  /** Format seconds to m:ss */
  _formatTime(sec) {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  },

  _escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /** Destroy player and cleanup */
  destroy() {
    if (this._audio) {
      this._audio.pause();
      this._audio.src = '';
    }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
    if (this._container) {
      this._container.innerHTML = '';
    }
  },

  /** Get current state */
  getState() {
    return { ...this._state };
  },
};
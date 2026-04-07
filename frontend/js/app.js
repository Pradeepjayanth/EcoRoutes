/**
 * App Controller v2
 * Main application — binds events, manages state, orchestrates all modules
 */

const App = {
  state: {
    locations: [],
    source: null, // {name, lat, lng}
    dest: null,
    userMode: 'normal',
    routeData: null,
    loading: false,
    dashOpen: false,
  },

  async init() {
    console.log('🌿 EcoRoute AI — India-Wide Routing Enabled...');

    // Init subsystems
    Particles.init();
    MapModule.init();

    this.bindEvents();
    this.startClock();
    
    console.log('✅ Application ready');
    Utils.showToast('Search any location in India to get started!', 'success');
  },

  bindEvents() {
    // Autocomplete for Source
    const srcInput = document.getElementById('source-input');
    const srcSugg = document.getElementById('source-suggestions');
    srcInput.addEventListener('input', Utils.debounce(async (e) => {
      const results = await Utils.searchLocations(e.target.value);
      this.showSuggestions(srcSugg, results, (item) => {
        this.state.source = item;
        srcInput.value = item.name;
        MapModule.map.flyTo([item.lat, item.lng], 12);
        this.updateBtn();
      });
    }, 400));

    // Autocomplete for Destination
    const destInput = document.getElementById('dest-input');
    const destSugg = document.getElementById('dest-suggestions');
    destInput.addEventListener('input', Utils.debounce(async (e) => {
      const results = await Utils.searchLocations(e.target.value);
      this.showSuggestions(destSugg, results, (item) => {
        this.state.dest = item;
        destInput.value = item.name;
        MapModule.map.flyTo([item.lat, item.lng], 12);
        this.updateBtn();
      });
    }, 400));

    // Close suggestions on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        srcSugg.classList.remove('visible');
        destSugg.classList.remove('visible');
      }
    });

    // Find button
    document.getElementById('find-btn').addEventListener('click', () => this.findRoutes());

    // Mode cards
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.state.userMode = card.dataset.mode;

        const descs = {
          normal: 'Standard routing with balanced priorities',
          asthma: 'Avoids high pollution zones, prioritizes clean air',
          elderly: 'Avoids heavy traffic and complex intersections',
          cyclist: 'Prefers cycle paths, avoids highways',
        };
        document.getElementById('mode-desc').textContent = descs[this.state.userMode];

        if (this.state.routeData) this.findRoutes();
      });
    });

    // Dashboard toggle
    document.getElementById('dash-toggle').addEventListener('click', () => {
      const panel = document.getElementById('dash-panel');
      this.state.dashOpen = !this.state.dashOpen;
      panel.classList.toggle('visible', this.state.dashOpen);
      document.getElementById('dash-arrow').textContent = this.state.dashOpen ? '▼' : '▲';
    });

    // AQI toggle
    document.getElementById('t-current').addEventListener('click', () => {
      document.getElementById('t-current').classList.add('active');
      document.getElementById('t-predicted').classList.remove('active');
      Dashboard.togglePrediction(false);
    });
    document.getElementById('t-predicted').addEventListener('click', () => {
      document.getElementById('t-predicted').classList.add('active');
      document.getElementById('t-current').classList.remove('active');
      Dashboard.togglePrediction(true);
    });

    // Enter key
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !this.state.loading) {
        const btn = document.getElementById('find-btn');
        if (!btn.disabled) this.findRoutes();
      }
    });
  },

  showSuggestions(el, items, onSelect) {
    el.innerHTML = '';
    if (!items.length) {
      el.classList.remove('visible');
      return;
    }
    el.classList.add('visible');
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.innerHTML = `
        <div class="suggestion-name">${item.name}</div>
        <div class="suggestion-sub">${item.fullName}</div>
      `;
      div.onclick = () => {
        onSelect(item);
        el.classList.remove('visible');
      };
      el.appendChild(div);
    });
  },

  async loadLocations() {
    // Deprecated for India-wide search, but keeping signature
    console.log('Using dynamic search instead of static locations.');
  },

  updateBtn() {
    const btn = document.getElementById('find-btn');
    btn.disabled = !(this.state.source && this.state.dest);
  },

  async findRoutes() {
    if (this.state.loading) return;
    const { source, dest, userMode } = this.state;
    if (!source || !dest) return;

    this.setLoading(true);
    this.setStatus('Predicting...', true);

    try {
      const data = await Utils.post('/predict_route', {
        source_coords: [source.lat, source.lng],
        dest_coords: [dest.lat, dest.lng],
        source_name: source.name,
        dest_name: dest.name,
        user_type: userMode,
      });

      this.state.routeData = data;
      MapModule.displayRoutes(data);
      Dashboard.update(data);

      const saved = data.comparison.pollutionSavedValue;
      if (saved > 0) {
        Utils.showToast(`Eco route saves ${saved}% pollution exposure! 🌿`, 'success');
      } else {
        Utils.showToast('Routes calculated successfully!', 'success');
      }
      this.setStatus('Routes Ready');
    } catch (err) {
      console.error('Route error:', err);
      Utils.showToast(err.message || 'Failed to find routes', 'error');
      this.setStatus('Error', false);
    } finally {
      this.setLoading(false);
    }
  },

  setLoading(on) {
    this.state.loading = on;
    document.getElementById('loading-overlay').classList.toggle('visible', on);
    const btn = document.getElementById('find-btn');
    if (on) {
      btn.disabled = true;
      btn.textContent = '⏳ Computing...';
    } else {
      this.updateBtn();
      btn.textContent = '🔍 Find Best Routes';
    }
  },

  setStatus(text, predicting = false) {
    document.getElementById('status-text').textContent = text;
    const pill = document.getElementById('status-pill');
    if (predicting) {
      pill.style.borderColor = 'rgba(255,159,67,0.3)';
      pill.style.background = 'rgba(255,159,67,0.08)';
      pill.style.color = '#ff9f43';
    } else {
      pill.style.borderColor = 'rgba(0,232,143,0.15)';
      pill.style.background = 'rgba(0,232,143,0.08)';
      pill.style.color = '#00e88f';
    }
  },

  startClock() {
    const el = document.getElementById('nav-clock');
    const tick = () => { el.textContent = Utils.formatTime(new Date()); };
    tick();
    setInterval(tick, 1000);
  },
};

// ——— BOOT ———
document.addEventListener('DOMContentLoaded', () => App.init());

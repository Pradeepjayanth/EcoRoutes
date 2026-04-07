/**
 * Utility Functions v2
 * API client, toast, AQI helpers, animation utilities
 */

const Utils = {
  // FastAPI backend on port 8000
  API_BASE: 'http://127.0.0.1:8000',

  async apiRequest(endpoint, options = {}) {
    const url = `${this.API_BASE}${endpoint}`;
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || 'API request failed');
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },

  async get(endpoint) { return this.apiRequest(endpoint); },

  async post(endpoint, body) {
    return this.apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const msg = document.getElementById('toast-msg');
    toast.className = `toast ${type}`;
    icon.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    msg.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => toast.classList.remove('visible'), 4000);
  },

  getAQIColor(aqi) {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
  },

  getAQILevel(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy (Sensitive)';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  },

  aqiToPercent(aqi) { return Math.min(100, (aqi / 300) * 100); },

  createAQIGauge(aqi, size = 90) {
    const color = this.getAQIColor(aqi);
    const pct = this.aqiToPercent(aqi);
    const r = 34;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return `
      <div class="aqi-gauge" style="width:${size}px;height:${size}px;">
        <svg viewBox="0 0 80 80">
          <circle class="aqi-gauge-bg" cx="40" cy="40" r="${r}"/>
          <circle class="aqi-gauge-fill" cx="40" cy="40" r="${r}"
            stroke="${color}" style="color:${color};"
            stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
        </svg>
        <div class="aqi-gauge-text">
          <div class="aqi-gauge-number" style="color:${color};">${aqi}</div>
          <div class="aqi-gauge-sublabel">AQI</div>
        </div>
      </div>`;
  },

  formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });
  },

  animateCounter(el, target, duration = 900) {
    const start = parseInt(el.textContent) || 0;
    const t0 = performance.now();
    function tick(now) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  },

  debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  },

  async searchLocations(query) {
    if (!query || query.length < 3) return [];
    try {
      // Use Nominatim for India-only results
      const url = `https://nominatim.openstreetmap.org/search?format=json&viewbox=68.1,35.5,97.4,6.7&bounded=1&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'EcoRouteAI/2.0' }
      });
      const data = await response.json();
      return data.map(item => ({
        name: item.display_name.split(',')[0],
        fullName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
      }));
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  },

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
};

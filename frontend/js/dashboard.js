/**
 * Dashboard Module v2
 * Route comparison, Chart.js data viz, AQI gauge, savings, advisories
 */

const Dashboard = {
  currentData: null,
  showPredicted: false,
  aqiChart: null,
  compareChart: null,

  update(data) {
    this.currentData = data;
    this.renderStats(data);
    this.renderInsights(data);
    this.renderRouteComparison(data);
    this.renderSavings(data);
    this.renderAQIChart(data);
    this.renderCompareChart(data);
    this.renderAQIDisplay(data);
    this.renderAdvisory(data);

    const panel = document.getElementById('dash-panel');
    panel.classList.add('visible');
  },

  // ——— Stats Row ———
  renderStats(data) {
    const el = document.getElementById('stats-row');
    const { fastestRoute: fast, ecoRoute: eco, comparison: cmp } = data;
    el.innerHTML = `
      <div class="stat-card green anim-scale">
        <div class="stat-value green" id="sv-saved">${cmp.pollutionSavedValue}%</div>
        <div class="stat-label">Pollution Saved</div>
      </div>
      <div class="stat-card blue anim-scale">
        <div class="stat-value cyan">₹${eco.fuelCost}</div>
        <div class="stat-label">Eco Fuel Cost</div>
      </div>
      <div class="stat-card orange anim-scale">
        <div class="stat-value blue">${eco.estimatedTime}</div>
        <div class="stat-label">Est. Time (min)</div>
      </div>
      <div class="stat-card purple anim-scale">
        <div class="stat-value orange">${Math.round(eco.co2Emissions/1000)}</div>
        <div class="stat-label">CO₂ (kg)</div>
      </div>`;
    el.style.display = 'grid';

    // Animate counters
    requestAnimationFrame(() => {
      Utils.animateCounter(document.getElementById('sv-saved'), cmp.pollutionSavedValue);
    });
  },

  // ——— AI Insights (sidebar) ———
  renderInsights(data) {
    const el = document.getElementById('insights-content');
    const { fastestRoute: fast, ecoRoute: eco, comparison: cmp } = data;
    el.innerHTML = `
      <div class="insights-grid">
        <div class="insight-item">
          <div class="insight-value green" id="ins-aqi">${eco.avgAQI}</div>
          <div class="insight-label">Eco AQI</div>
        </div>
        <div class="insight-item">
          <div class="insight-value cyan" id="ins-saved">${cmp.pollutionSavedValue}%</div>
          <div class="insight-label">Saved</div>
        </div>
        <div class="insight-item">
          <div class="insight-value orange" id="ins-time">${eco.estimatedTime}m</div>
          <div class="insight-label">Time</div>
        </div>
      </div>`;
    Utils.animateCounter(document.getElementById('ins-aqi'), eco.avgAQI);
  },

  // ——— Route Comparison Cards ———
  renderRouteComparison(data) {
    const el = document.getElementById('route-comparison');
    const { fastestRoute: fast, ecoRoute: eco } = data;

    el.innerHTML = `
      <div class="route-card fastest anim-fade"
           onmouseenter="MapModule.highlightRoute('fastest')"
           onmouseleave="MapModule.resetHighlight()">
        <div class="route-badge fastest">🔴 Fastest Route</div>
        <div class="route-meta">
          ${this._metaRow('Distance', `${fast.totalDistance} km`)}
          ${this._metaRow('Est. Time', `${fast.estimatedTime} min`)}
          ${this._metaRow('Fuel Cost', `⛽ ₹${fast.fuelCost}`)}
          ${this._metaRow('CO₂ Emission', `🌍 ${(fast.co2Emissions/1000).toFixed(1)} kg`)}
          ${this._metaRow('Avg AQI', `<span style="color:${Utils.getAQIColor(fast.avgAQI)}">${fast.avgAQI}</span>`)}
          ${this._metaRow('Max AQI', `<span style="color:${Utils.getAQIColor(fast.maxAQI)}">${fast.maxAQI}</span>`)}
        </div>
        ${this._segBar(fast.segments)}
        ${this._routePath(fast, '#ff4757')}
      </div>
      <div class="route-card eco active anim-fade"
           onmouseenter="MapModule.highlightRoute('eco')"
           onmouseleave="MapModule.resetHighlight()">
        <div class="route-badge eco">🟢 Eco-Friendly Route</div>
        <div class="route-meta">
          ${this._metaRow('Distance', `${eco.totalDistance} km`)}
          ${this._metaRow('Est. Time', `${eco.estimatedTime} min`)}
          ${this._metaRow('Fuel Cost', `⛽ ₹${eco.fuelCost}`)}
          ${this._metaRow('CO₂ Emission', `🌍 ${(eco.co2Emissions/1000).toFixed(1)} kg`)}
          ${this._metaRow('Avg AQI', `<span style="color:${Utils.getAQIColor(eco.avgAQI)}">${eco.avgAQI}</span>`)}
          ${this._metaRow('Max AQI', `<span style="color:${Utils.getAQIColor(eco.maxAQI)}">${eco.maxAQI}</span>`)}
        </div>
        ${this._segBar(eco.segments)}
        ${this._routePath(eco, '#00e88f')}
      </div>`;
    el.style.display = 'grid';
  },

  _metaRow(label, value) {
    return `<div class="route-meta-row"><span class="route-meta-key">${label}</span><span class="route-meta-val">${value}</span></div>`;
  },

  _segBar(segments) {
    if (!segments?.length) return '';
    return `<div class="segment-bar">${segments.map(s =>
      `<div class="segment-bar-item" style="background:${Utils.getAQIColor(s.aqi)};"></div>`
    ).join('')}</div>`;
  },

  _routePath(route, color) {
    return `<div class="route-path">${route.pathNames.map((n, i) => {
      let cls = '';
      if (i === 0) cls = 'start';
      else if (i === route.pathNames.length - 1) cls = 'end';
      return `<div class="route-step">
        <div class="route-dot ${cls}" style="${!cls ? `background:${color};` : ''}"></div>
        <span class="route-step-name">${n}</span>
      </div>`;
    }).join('')}</div>`;
  },

  // ——— Eco Impact Panel ———
  renderSavings(data) {
    const el = document.getElementById('savings-banner');
    const { comparison: cmp } = data;
    
    // Eco Impact Panel Content
    el.innerHTML = `
      <div style="font-family:'Inter', sans-serif; display: flex; justify-content: space-around; align-items: center; padding: 12px 0;">
        <div style="text-align:center;">
          <div style="font-size:1.8rem; font-weight:800; color:var(--accent-green); margin-bottom:4px;">-${cmp.pollutionSaved}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:1px;">Pollution Saved</div>
        </div>
        <div style="width:1px; height:40px; background:var(--border-glass);"></div>
        <div style="text-align:center;">
          <div style="font-size:1.8rem; font-weight:800; color:#5A9EE4; margin-bottom:4px;">₹${cmp.fuelSaved > 0 ? cmp.fuelSaved : 0}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:1px;">Fuel Savings</div>
        </div>
        <div class="eco-desktop-only" style="width:1px; height:40px; background:var(--border-glass);"></div>
        <div class="eco-desktop-only" style="text-align:center;">
          <div style="font-size:1.8rem; font-weight:800; color:#FCA311; margin-bottom:4px;">${cmp.co2Saved > 0 ? cmp.co2Saved : 0}g</div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:1px;">CO₂ Reduced</div>
        </div>
      </div>
      <div class="savings-desc" style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px;">🌱 ${cmp.recommendation}</div>`;
    el.style.display = 'block';
  },

  // ——— Chart.js: AQI Prediction Timeline ———
  async renderAQIChart(data) {
    const card = document.getElementById('chart-card');
    const eco = data.ecoRoute;
    if (!eco?.segments?.length) { card.style.display = 'none'; return; }

    try {
      const zone = eco.segments[0].zone;
      const pred = await Utils.post('/api/predict_aqi', { zone, minutes_ahead: 30 });
      const ts = [
        { timeOffset: 0, predictedAQI: pred.currentAQI },
        ...(pred.timeSeries || []),
      ];

      const labels = ts.map(t => `+${t.timeOffset}m`);
      const values = ts.map(t => t.predictedAQI);
      const colors = values.map(v => Utils.getAQIColor(v));

      if (this.aqiChart) this.aqiChart.destroy();

      const ctx = document.getElementById('aqi-chart').getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 180);
      gradient.addColorStop(0, 'rgba(0,232,143,0.25)');
      gradient.addColorStop(1, 'rgba(0,232,143,0)');

      this.aqiChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Predicted AQI',
            data: values,
            fill: true,
            backgroundColor: gradient,
            borderColor: '#00e88f',
            borderWidth: 2.5,
            pointBackgroundColor: colors,
            pointBorderColor: '#0c1220',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            tension: 0.4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(12,18,32,0.9)',
              borderColor: 'rgba(100,130,180,0.15)',
              borderWidth: 1,
              titleColor: '#edf2f7',
              bodyColor: '#8899b0',
              titleFont: { family: 'Inter', weight: '700' },
              bodyFont: { family: 'JetBrains Mono' },
              padding: 12,
              cornerRadius: 10,
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(100,130,180,0.06)' },
              ticks: { color: '#556580', font: { family: 'JetBrains Mono', size: 10 } },
            },
            y: {
              grid: { color: 'rgba(100,130,180,0.06)' },
              ticks: { color: '#556580', font: { family: 'JetBrains Mono', size: 10 } },
            },
          },
        },
      });
      card.style.display = 'block';
    } catch (e) {
      console.error('AQI chart error:', e);
      card.style.display = 'none';
    }
  },

  // ——— Chart.js: Route Comparison ———
  renderCompareChart(data) {
    const card = document.getElementById('compare-chart-card');
    const { fastestRoute: fast, ecoRoute: eco } = data;

    const labels = ['Distance (km)', 'Time (min)', 'Avg AQI', 'Max AQI'];
    const fastData = [fast.totalDistance, fast.estimatedTime, fast.avgAQI, fast.maxAQI];
    const ecoData = [eco.totalDistance, eco.estimatedTime, eco.avgAQI, eco.maxAQI];

    if (this.compareChart) this.compareChart.destroy();

    const ctx = document.getElementById('compare-chart').getContext('2d');
    this.compareChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Fastest',
            data: fastData,
            backgroundColor: 'rgba(255,71,87,0.6)',
            borderColor: '#ff4757',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.5,
          },
          {
            label: 'Eco-Friendly',
            data: ecoData,
            backgroundColor: 'rgba(0,232,143,0.5)',
            borderColor: '#00e88f',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#8899b0',
              font: { family: 'Inter', size: 11, weight: '600' },
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(12,18,32,0.9)',
            borderColor: 'rgba(100,130,180,0.15)',
            borderWidth: 1,
            titleColor: '#edf2f7',
            bodyColor: '#8899b0',
            titleFont: { family: 'Inter', weight: '700' },
            bodyFont: { family: 'JetBrains Mono' },
            padding: 12,
            cornerRadius: 10,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#556580', font: { family: 'Inter', size: 10, weight: '600' } },
          },
          y: {
            grid: { color: 'rgba(100,130,180,0.06)' },
            ticks: { color: '#556580', font: { family: 'JetBrains Mono', size: 10 } },
          },
        },
      },
    });

    card.style.display = 'block';
  },

  // ——— AQI Display (sidebar) ———
  renderAQIDisplay(data) {
    const el = document.getElementById('aqi-display');
    const eco = data.ecoRoute;
    const fast = data.fastestRoute;
    if (!eco) return;

    const aqi = this.showPredicted ? eco.avgAQI : fast.avgAQI;
    const label = this.showPredicted ? 'Predicted (Eco Route)' : 'Current (Fastest Route)';
    const color = Utils.getAQIColor(aqi);

    el.innerHTML = `
      <div class="aqi-gauge-wrap">
        ${Utils.createAQIGauge(aqi)}
        <div class="aqi-info">
          <div class="aqi-level" style="color:${color};">${Utils.getAQILevel(aqi)}</div>
          <div class="aqi-desc">${label}<br>
            <span style="font-size:0.68rem;">
              Eco: ${eco.avgAQI} AQI • Fast: ${fast.avgAQI} AQI
            </span>
          </div>
        </div>
      </div>`;
  },

  // ——— Advisory ———
  renderAdvisory(data) {
    const card = document.getElementById('card-advisory');
    const el = document.getElementById('advisory-content');
    if (!data.healthAdvisory) { card.style.display = 'none'; return; }

    const { advisories } = data.healthAdvisory;
    el.innerHTML = advisories.map(a => `
      <div class="advisory-item">
        <span class="advisory-icon">${a.icon}</span>
        <span class="advisory-text ${a.severity}">${a.message}</span>
      </div>`).join('');
    card.style.display = 'block';
  },

  togglePrediction(predicted) {
    this.showPredicted = predicted;
    if (this.currentData) this.renderAQIDisplay(this.currentData);
  },
};

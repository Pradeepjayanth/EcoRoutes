/**
 * Map Module v2
 * Enhanced Leaflet map with glowing route lines, animated markers, and dark theme
 */

const MapModule = {
  map: null,
  markers: [],
  routeLayers: [],
  locationMarkers: {},
  animFrame: null,

  init() {
    this.map = L.map('map', {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    this.map.zoomControl.setPosition('bottomright');
  },

  createIcon(color, label, size = 36) {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width:${size}px;height:${size}px;
          background:${color};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border:3px solid rgba(255,255,255,0.35);
          box-shadow:0 2px 16px ${color}66, 0 0 30px ${color}33;
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:15px;font-weight:800;color:#fff;">${label}</span>
        </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size],
    });
  },

  createAQIMarker(loc) {
    const color = Utils.getAQIColor(loc.currentAQI);
    const marker = L.circleMarker([loc.lat, loc.lng], {
      radius: 7,
      fillColor: color,
      fillOpacity: 0.5,
      color: color,
      weight: 2,
      opacity: 0.7,
    }).addTo(this.map);

    marker.bindPopup(`
      <div class="popup-title">${loc.name}</div>
      <div class="popup-zone">📍 ${loc.zone} zone</div>
      <div class="popup-aqi" style="background:${color}18;color:${color};">
        AQI: ${loc.currentAQI} — ${Utils.getAQILevel(loc.currentAQI)}
      </div>
    `);

    this.locationMarkers[loc.id] = marker;
    return marker;
  },

  showLocations(locations) {
    locations.forEach(l => this.createAQIMarker(l));
  },

  clearRoutes() {
    this.routeLayers.forEach(l => this.map.removeLayer(l));
    this.routeLayers = [];
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  },

  drawRoute(coords, color, weight = 5, dash = null, glow = false) {
    // Glow layer first
    if (glow) {
      const glowLine = L.polyline(coords, {
        color: color, weight: weight + 8, opacity: 0.12,
        lineCap: 'round', lineJoin: 'round',
      }).addTo(this.map);
      this.routeLayers.push(glowLine);
    }

    const line = L.polyline(coords, {
      color: color, weight: weight, opacity: 0.85,
      dashArray: dash, lineCap: 'round', lineJoin: 'round',
    }).addTo(this.map);
    this.routeLayers.push(line);

    return line;
  },

  animateRoute(coords, color) {
    const icon = L.divIcon({
      className: 'route-anim-dot',
      html: `<div style="
        width:14px;height:14px;
        background:${color};
        border-radius:50%;
        box-shadow:0 0 16px ${color}, 0 0 32px ${color}55;
        border:2px solid rgba(255,255,255,0.5);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const marker = L.marker(coords[0], { icon: icon }).addTo(this.map);
    this.markers.push(marker);

    let step = 0;
    const total = 250;

    const tick = () => {
      step = (step + 1) % total;
      const progress = step / total;
      const segs = coords.length - 1;
      const sp = progress * segs;
      const si = Math.floor(sp);
      const sf = sp - si;

      if (si < segs) {
        const lat = coords[si][0] + (coords[si + 1][0] - coords[si][0]) * sf;
        const lng = coords[si][1] + (coords[si + 1][1] - coords[si][1]) * sf;
        marker.setLatLng([lat, lng]);
      }
      this.animFrame = requestAnimationFrame(tick);
    };
    tick();
  },

  displayRoutes(data) {
    this.clearRoutes();
    const { fastestRoute, ecoRoute, source, destination } = data;

    // Fastest → red, dashed
    if (fastestRoute?.coordinates) {
      this.drawRoute(fastestRoute.coordinates, '#ff4757', 4, '10 8', false);
    }
    // Eco → green, solid, glowing, animated
    if (ecoRoute?.coordinates) {
      this.drawRoute(ecoRoute.coordinates, '#00e88f', 5, null, true);
      this.animateRoute(ecoRoute.coordinates, '#00e88f');
    }

    // Source marker
    if (source) {
      const m = L.marker([source.lat, source.lng], {
        icon: this.createIcon('#3b8bff', 'A'),
      }).addTo(this.map);
      m.bindPopup(`<div class="popup-title">📍 Start: ${source.name}</div>`);
      this.markers.push(m);
    }

    // Destination marker
    if (destination) {
      const m = L.marker([destination.lat, destination.lng], {
        icon: this.createIcon('#ff4757', 'B'),
      }).addTo(this.map);
      m.bindPopup(`<div class="popup-title">🏁 End: ${destination.name}</div>`);
      this.markers.push(m);
    }

    // AQI indicators along eco route
    if (ecoRoute?.segments) {
      ecoRoute.segments.forEach((seg, i) => {
        if (i < ecoRoute.coordinates.length - 1) {
          const midLat = (ecoRoute.coordinates[i][0] + ecoRoute.coordinates[i + 1][0]) / 2;
          const midLng = (ecoRoute.coordinates[i][1] + ecoRoute.coordinates[i + 1][1]) / 2;
          const c = Utils.getAQIColor(seg.aqi);

          const circle = L.circleMarker([midLat, midLng], {
            radius: 15, fillColor: c, fillOpacity: 0.18,
            color: c, weight: 1.5, opacity: 0.5,
          }).addTo(this.map);

          circle.bindPopup(`
            <div class="popup-title">${seg.fromName} → ${seg.toName}</div>
            <div class="popup-zone">${seg.zone} zone • ${seg.roadType} road</div>
            <div class="popup-aqi" style="background:${c}18;color:${c};">
              AQI: ${seg.aqi} • Traffic: ${seg.traffic}/10
            </div>
          `);
          this.routeLayers.push(circle);
        }
      });
    }

    // Fit bounds
    const all = [...(fastestRoute?.coordinates || []), ...(ecoRoute?.coordinates || [])];
    if (all.length) this.map.fitBounds(L.latLngBounds(all).pad(0.15));

    document.getElementById('map-legend').classList.add('visible');
  },

  highlightRoute(type) {
    let idx = 0;
    this.routeLayers.forEach(layer => {
      if (!(layer instanceof L.Polyline) || layer instanceof L.CircleMarker) return;
      idx++;
      // Eco route layers are index 2,3 (glow + line), fastest is index 1
      if (type === 'eco') {
        layer.setStyle({ opacity: idx <= 1 ? 0.25 : 0.95 });
      } else {
        layer.setStyle({ opacity: idx <= 1 ? 0.95 : 0.35 });
      }
    });
  },

  resetHighlight() {
    let idx = 0;
    this.routeLayers.forEach(layer => {
      if (!(layer instanceof L.Polyline) || layer instanceof L.CircleMarker) return;
      idx++;
      layer.setStyle({ opacity: idx <= 1 ? 0.85 : 0.85 });
    });
  },
};

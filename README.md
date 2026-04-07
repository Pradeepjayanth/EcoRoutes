# 🌿 EcoRoute AI — AI-Based Predictive Eco Smart Routing System

A full-stack intelligent navigation system that predicts future pollution levels and provides eco-friendly route suggestions personalized to user health profiles.

![EcoRoute AI](https://img.shields.io/badge/EcoRoute-AI%20Powered-00d68f?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=for-the-badge&logo=leaflet)

## ✨ Features

### 🌍 Interactive Map & Routing
- Dark-themed Leaflet map with CartoDB Dark Matter tiles
- Visual route comparison (blue = fastest, green = eco-friendly)
- Animated route traversal dot
- AQI indicators along route segments

### 🤖 AI-Based Pollution Prediction
- LSTM-style time-series simulation for next 20-30 minutes
- Multi-factor AQI prediction (traffic, seasonal, wind effects)
- SVG-based prediction timeline chart
- Current vs. Predicted AQI toggle

### 👤 Personalization System
| Mode | Behavior |
|------|----------|
| 👤 Normal | Balanced routing |
| 🫁 Asthma | Avoids high AQI zones (3x sensitivity) |
| 👴 Elderly | Avoids heavy traffic, prefers residential |
| 🚴 Cyclist | Avoids highways, prefers cycle paths |

### 🧮 Smart Routing (Dijkstra's Algorithm)
- Graph-based city model with 12 nodes and 22 edges
- Multi-weighted edges (distance, AQI, traffic, road type)
- Personalized weight adjustments per user profile

### 📊 Visualization Dashboard
- Real-time stats cards (pollution saved, distance, time, AQI)
- Side-by-side route comparison
- AQI segment color bars
- Circular AQI gauge
- Health advisory system

## 🚀 Quick Start

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Start the server
npm start

# 3. Open in browser
# http://localhost:3000
```

## 📁 Project Structure

```
designathon/
├── backend/
│   ├── server.js                 # Express server
│   ├── package.json
│   ├── routes/
│   │   └── api.js                # API endpoints
│   └── services/
│       ├── predictionService.js  # AQI prediction (LSTM simulation)
│       ├── routingService.js     # Graph routing (Dijkstra)
│       └── personalizationService.js  # User profiles
├── frontend/
│   ├── index.html                # Main page
│   ├── css/
│   │   └── style.css             # Design system
│   └── js/
│       ├── app.js                # Application controller
│       ├── map.js                # Leaflet map module
│       ├── dashboard.js          # Dashboard & charts
│       └── utils.js              # Utilities & API client
└── README.md
```

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/predict_route` | Get fastest & eco routes |
| `POST` | `/api/predict_aqi` | Predict AQI for a zone |
| `GET`  | `/api/locations` | List all locations |
| `GET`  | `/api/zones` | List all zones with AQI |
| `GET`  | `/api/user_profiles` | List user profiles |
| `GET`  | `/api/health` | Health check |

### Example Request

```json
POST /api/predict_route
{
  "source": "A",
  "destination": "J",
  "user_type": "asthma"
}
```

## ⚙️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Map:** Leaflet.js with CartoDB Dark Matter tiles
- **Backend:** Node.js + Express.js
- **Styling:** Custom CSS design system (dark mode, glassmorphism)
- **Algorithm:** Dijkstra's shortest path with multi-factor weights
- **Prediction:** LSTM-style time-series simulation

## 🏗️ ML Integration Ready

The prediction service is structured for future ML model integration:

```javascript
// Replace lstmStylePrediction() with:
// - TensorFlow.js model inference
// - Python ML API call (Flask/FastAPI)
// - Real sensor data integration
```

## 📄 License

MIT

"""
AI Pollution Prediction Service
Simulates LSTM-style AQI prediction using time-series logic.
Structured for future ML model integration (LSTM/Transformer).
"""

import math
import random
from datetime import datetime
from typing import Optional

# Simulated base AQI data for different zones
ZONE_BASE_AQI = {
    "downtown": 120,
    "industrial": 180,
    "residential": 65,
    "park": 35,
    "highway": 145,
    "suburb": 55,
    "market": 110,
    "university": 70,
    "hospital": 80,
    "airport": 160,
}


def get_base_aqi_by_coords(lat: float, lng: float) -> int:
    """Estimate base AQI by coordinates in India (simplified)."""
    # Northern regions (Delhi, Punjab, UP) usually have higher base pollution
    # Lat 24-32 is generally higher pollution
    if 24 <= lat <= 32:
        return 140
    # Industrial/Coastal hubs
    if 18 <= lat <= 20 and 72 <= lng <= 74: # Mumbai area
        return 110
    if 12 <= lat <= 14 and 77 <= lng <= 79: # Bangalore area
        return 75
    # Default cleaner regions
    return 60


def get_traffic_multiplier(hour: int) -> float:
    """Traffic multipliers by hour of day."""
    if 7 <= hour <= 9:
        return 1.6  # Morning rush
    if 17 <= hour <= 19:
        return 1.7  # Evening rush
    if 12 <= hour <= 14:
        return 1.2  # Lunch traffic
    if hour >= 22 or hour <= 5:
        return 0.5  # Night (low traffic)
    return 1.0


def get_seasonal_factor(month: int) -> float:
    """Seasonal variation factor for air quality."""
    if month >= 11 or month <= 2:
        return 1.3  # Winter inversion layers
    if 5 <= month <= 7:
        return 1.15  # Summer ozone
    return 1.0


def get_wind_effect() -> float:
    """Wind effect simulation."""
    wind_speed = random.uniform(0, 30)
    if wind_speed > 20:
        return 0.7
    if wind_speed > 10:
        return 0.85
    return 1.0


def lstm_style_prediction(base_aqi: float, minutes_ahead: int) -> list:
    """
    LSTM-Style Simulation.
    Generates time-series prediction by simulating temporal patterns.
    In production, replace with trained LSTM/GRU model.
    """
    timesteps = max(1, math.ceil(minutes_ahead / 5))
    predictions = []
    current_value = base_aqi

    for i in range(timesteps):
        memory_retention = 0.85
        input_noise = (random.random() - 0.45) * 15
        mean_reversion = (base_aqi - current_value) * 0.1

        current_value = (
            current_value * memory_retention
            + input_noise
            + mean_reversion
            + base_aqi * (1 - memory_retention)
        )

        predictions.append({
            "timeOffset": (i + 1) * 5,
            "predictedAQI": max(10, round(current_value)),
            "confidence": max(0.6, round(0.95 - (i * 0.05), 2)),
        })

    return predictions


def get_aqi_category(aqi: int) -> dict:
    """Get AQI category and health implications."""
    if aqi <= 50:
        return {"level": "Good", "color": "#00e400", "risk": "low", "emoji": "🟢"}
    if aqi <= 100:
        return {"level": "Moderate", "color": "#ffff00", "risk": "moderate", "emoji": "🟡"}
    if aqi <= 150:
        return {"level": "Unhealthy for Sensitive", "color": "#ff7e00", "risk": "high", "emoji": "🟠"}
    if aqi <= 200:
        return {"level": "Unhealthy", "color": "#ff0000", "risk": "very-high", "emoji": "🔴"}
    if aqi <= 300:
        return {"level": "Very Unhealthy", "color": "#8f3f97", "risk": "severe", "emoji": "🟣"}
    return {"level": "Hazardous", "color": "#7e0023", "risk": "extreme", "emoji": "⚫"}


def predict_aqi(zone: str, minutes_ahead: int = 20) -> dict:
    """Main prediction function."""
    now = datetime.now()
    hour = now.hour
    month = now.month

    base_aqi = ZONE_BASE_AQI.get(zone, 80)
    traffic_mult = get_traffic_multiplier(hour)
    seasonal_factor = get_seasonal_factor(month)
    wind_effect = get_wind_effect()

    adjusted_aqi = round(base_aqi * traffic_mult * seasonal_factor * wind_effect)

    time_series = lstm_style_prediction(adjusted_aqi, minutes_ahead)

    final_prediction = (
        time_series[-1]
        if time_series
        else {"predictedAQI": adjusted_aqi, "confidence": 1.0}
    )
    category = get_aqi_category(final_prediction["predictedAQI"])

    return {
        "currentAQI": adjusted_aqi,
        "currentCategory": get_aqi_category(adjusted_aqi),
        "predictedAQI": final_prediction["predictedAQI"],
        "predictedCategory": category,
        "predictionMinutes": minutes_ahead,
        "timeSeries": time_series,
        "factors": {
            "baseAQI": base_aqi,
            "trafficMultiplier": traffic_mult,
            "seasonalFactor": seasonal_factor,
            "windEffect": round(wind_effect, 2),
            "hour": hour,
            "zone": zone,
        },
        "modelInfo": {
            "type": "LSTM-Simulation",
            "version": "2.0.0",
            "note": "Simulated prediction. Replace with trained model for production.",
        },
    }

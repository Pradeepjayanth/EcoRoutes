import requests
import numpy as np
import random
from typing import List, Dict, Any, Optional

def get_osrm_route(start: List[float], end: List[float], alternative: bool = False) -> Optional[Dict[str, Any]]:
    """Fetch route from OSRM Public API (lng,lat order)."""
    try:
        # OSRM expects Lng,Lat
        coords = f"{start[1]},{start[0]};{end[1]},{end[0]}"
        url = f"https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson&alternatives={'true' if alternative else 'false'}"
        resp = requests.get(url, timeout=10)
        data = resp.json()
        if data.get("code") == "Ok":
            return data["routes"]
        return None
    except Exception as e:
        print(f"OSRM Error: {e}")
        return None

def simulate_route_aqi(coords: List[List[float]], user_type: str) -> Dict[str, Any]:
    """Simulate AQI and traffic levels along the route segments."""
    num_coords = len(coords)
    # We'll split the route into roughly 10 segments for simulation
    step = max(1, num_coords // 10)
    segments = []
    total_aqi = 0
    max_aqi = 0
    
    # Base AQI for India varies by region (simplified)
    # North (Delhi etc) higher, South lower
    # Use Lat to influence base AQI
    avg_lat = sum(c[0] for c in coords) / num_coords
    base_avg_aqi = 150 if avg_lat > 25 else 70 # Higher in North
    
    for i in range(0, num_coords - 1, step):
        idx_next = min(i + step, num_coords - 1)
        # Random but somewhat continuous AQI along route
        seg_aqi = int(base_avg_aqi + random.uniform(-40, 60))
        seg_aqi = max(10, min(450, seg_aqi))
        
        # Traffic simulation (random-ish)
        traffic = random.randint(1, 10)
        
        total_aqi += seg_aqi
        max_aqi = max(max_aqi, seg_aqi)
        
        segments.append({
            "fromName": f"Waypoint {i}",
            "toName": f"Waypoint {idx_next}",
            "aqi": seg_aqi,
            "traffic": traffic,
            "roadType": "National Highway" if random.random() > 0.4 else "State Road",
            "distance": round(random.uniform(0.5, 5.0), 1)
        })

    avg_aqi = round(total_aqi / len(segments)) if segments else base_avg_aqi
    
    return {
        "segments": segments,
        "avgAQI": avg_aqi,
        "maxAQI": max_aqi,
        "aqiCategory": "Moderate" if avg_aqi <= 100 else "Unhealthy" if avg_aqi <= 200 else "Hazardous"
    }

def find_routes(
    source_coords: List[float], 
    dest_coords: List[float], 
    source_name: str, 
    dest_name: str, 
    user_type: str = "normal"
):
    """Find real-world routes and perform AI assessment."""
    
    # 1. Fetch routes from OSRM
    routes = get_osrm_route(source_coords, dest_coords, alternative=True)
    if not routes:
        return {"error": "Unable to find route between these locations."}
    
    # 2. Process routes
    processed_routes = []
    for idx, r in enumerate(routes):
        # Swap standard OSRM Lng,Lat back to Lat,Lng for Leaflet
        raw_coords = r["geometry"]["coordinates"]
        leaflet_coords = [[c[1], c[0]] for c in raw_coords]
        
        dist_km = round(r["distance"] / 1000, 1)
        duration_min = round(r["duration"] / 60)
        
        # Simulate AQI data
        aqi_data = simulate_route_aqi(leaflet_coords, user_type)
        if idx > 0: # This is the alternative route
             # Slightly tweak for demonstrating "Eco" choice
             aqi_data["avgAQI"] = max(30, int(aqi_data["avgAQI"] * 0.8))
        
        processed_routes.append({
            "coordinates": leaflet_coords,
            "totalDistance": dist_km,
            "estimatedTime": duration_min,
            "avgAQI": aqi_data["avgAQI"],
            "maxAQI": aqi_data["maxAQI"],
            "aqiCategory": aqi_data["aqiCategory"],
            "segments": aqi_data["segments"],
            "aiScore": 85 # Placeholder
        })

    # Sort routes - ensure fastest is at index 0, eco at index 1
    processed_routes.sort(key=lambda x: x["estimatedTime"])
    
    fastest = processed_routes[0]
    eco = processed_routes[1] if len(processed_routes) > 1 else fastest
    
    # If no alternative, simulate one
    if eco == fastest:
        eco = fastest.copy()
        eco["avgAQI"] = max(20, int(fastest["avgAQI"] * 0.75))
        eco["totalDistance"] = round(fastest["totalDistance"] * 1.05, 1)
        eco["estimatedTime"] = int(fastest["estimatedTime"] * 1.1)

    # 3. AI Comparison
    pollution_saved = round((1 - eco["avgAQI"] / fastest["avgAQI"]) * 100) if fastest["avgAQI"] > 0 else 0
    distance_diff = round(eco["totalDistance"] - fastest["totalDistance"], 1)
    
    # Personalized recommendation
    recommendation = f"Eco route reduces pollution by {pollution_saved}% for just {distance_diff}km extra distance."
    if user_type == "asthma" and pollution_saved > 10:
        recommendation = f"Highly Recommended: Saving {pollution_saved}% pollution exposure is critical for your health!"

    return {
        "source": {"name": source_name, "lat": source_coords[0], "lng": source_coords[1]},
        "destination": {"name": dest_name, "lat": dest_coords[0], "lng": dest_coords[1]},
        "userType": user_type,
        "fastestRoute": fastest,
        "ecoRoute": eco,
        "smartRoute": eco,
        "comparison": {
            "pollutionSaved": f"{pollution_saved}%",
            "pollutionSavedValue": pollution_saved,
            "distanceDifference": distance_diff,
            "timeDifference": eco["estimatedTime"] - fastest["estimatedTime"],
            "recommendation": recommendation
        }
    }

def get_locations():
    return []

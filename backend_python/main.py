"""
EcoRoute AI — FastAPI Backend Server
AI-Based Predictive Eco Smart Routing System
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os

from services.prediction import predict_aqi, ZONE_BASE_AQI
from services.routing import find_routes, get_locations
from services.personalization import get_health_advisory, get_user_profiles
from segmentation import analyze_road_image

app = FastAPI(
    title="EcoRoute AI API",
    description="AI-Based Predictive Eco Smart Routing System",
    version="2.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ——— Request Models ———

class RouteRequest(BaseModel):
    source_coords: list[float]
    dest_coords: list[float]
    source_name: Optional[str] = "Source"
    dest_name: Optional[str] = "Destination"
    user_type: Optional[str] = "normal"

class AQIRequest(BaseModel):
    zone: str
    minutes_ahead: Optional[int] = 20

# ——— API Endpoints ———

@app.post("/predict_route")
async def predict_route(req: RouteRequest):
    """Main endpoint — finds real routes across India."""
    result = find_routes(
        req.source_coords, req.dest_coords, 
        req.source_name, req.dest_name, 
        req.user_type
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    advisory = get_health_advisory(req.user_type, result["ecoRoute"]["avgAQI"])
    return {
        "success": True,
        **result,
        "healthAdvisory": advisory,
        "timestamp": datetime.now().isoformat(),
    }

@app.post("/get-routes")
async def get_routes_alt(req: RouteRequest):
    """Alias for predict_route to match requirements."""
    return await predict_route(req)

@app.post("/analyze-road")
async def analyze_road(file: UploadFile = File(...)):
    """Analyze road image using semantic segmentation."""
    try:
        contents = await file.read()
        return analyze_road_image(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/locations")
async def api_locations():
    """Returns all available locations with current AQI."""
    return {"success": True, "locations": get_locations()}

@app.post("/api/predict_aqi")
async def api_predict_aqi(req: AQIRequest):
    """Predict AQI for a specific zone."""
    prediction = predict_aqi(req.zone, req.minutes_ahead)
    return {"success": True, **prediction}

@app.get("/aqi-data")
async def get_aqi_data():
    """Return AQI data for all zones."""
    return await api_zones()

@app.get("/api/zones")
async def api_zones():
    """Returns all available zones with base AQI."""
    zones = []
    for zone, base_aqi in ZONE_BASE_AQI.items():
        prediction = predict_aqi(zone, 0)
        zones.append({
            "zone": zone,
            "baseAQI": base_aqi,
            "currentAQI": prediction["currentAQI"],
            "category": prediction["currentCategory"],
        })
    return {"success": True, "zones": zones}

@app.get("/api/user_profiles")
async def api_user_profiles():
    """Returns available user profiles."""
    return {"success": True, "profiles": get_user_profiles()}

@app.get("/api/health")
async def api_health():
    """Health check."""
    return {
        "status": "healthy",
        "service": "EcoRoute AI API",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
    }

# ——— Serve Frontend Static Files ———

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

if os.path.exists(FRONTEND_DIR):
    # Static assets (css, js)
    css_dir = os.path.join(FRONTEND_DIR, "css")
    js_dir = os.path.join(FRONTEND_DIR, "js")
    
    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")

@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    print("\n🌿 EcoRoute AI — FastAPI Backend Starting...")
    print("📡 API Docs: http://127.0.0.1:8000/docs")
    print("🌐 Frontend: http://127.0.0.1:8000\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)

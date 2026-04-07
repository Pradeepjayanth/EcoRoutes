"""
Semantic Segmentation Service
Runs DeepLabV3 (with simulation fallback) to analyze road images.
Extracts: vehicle_density, road_quality, pedestrian_density, obstruction_level
"""

import random
import math
from datetime import datetime
from typing import Optional

# Try to import cv2 for video stream handling
try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False

# Try to import torch for real inference; fall back gracefully
try:
    import torch
    import torchvision.transforms as T
    from torchvision.models.segmentation import deeplabv3_resnet50
    import numpy as np
    try:
        from PIL import Image
        import io
        TORCH_AVAILABLE = True
    except ImportError:
        TORCH_AVAILABLE = False
except ImportError:
    TORCH_AVAILABLE = False

# --- Pascal VOC class labels (DeepLabV3 output) ---
VOC_CLASSES = [
    "background", "aeroplane", "bicycle", "bird", "boat",
    "bottle", "bus", "car", "cat", "chair",
    "cow", "diningtable", "dog", "horse", "motorbike",
    "person", "pottedplant", "sheep", "sofa", "train", "tvmonitor"
]

# Class indices for metrics
VEHICLE_CLASSES = {7, 6, 14}    # car, bus, motorbike
PERSON_CLASSES  = {15}           # person
BACKGROUND_ROAD = {0}            # background often = road in urban scenes

_MODEL = None

def _load_model():
    global _MODEL
    if _MODEL is not None or not TORCH_AVAILABLE:
        return _MODEL
    try:
        _MODEL = deeplabv3_resnet50(pretrained=True)
        _MODEL.eval()
        print("✅ DeepLabV3 model loaded successfully")
    except Exception as e:
        print(f"⚠️  Could not load DeepLabV3 model: {e}")
        _MODEL = None
    return _MODEL


def _run_real_segmentation(image_source) -> dict:
    """Run actual DeepLabV3 inference on image bytes or a numpy array (CV2 frame)."""
    model = _load_model()
    if model is None:
        return None
    try:
        if isinstance(image_source, bytes):
            img = Image.open(io.BytesIO(image_source)).convert("RGB")
        else:
            # Assume it's an OpenCV BGR frame
            img = Image.fromarray(cv2.cvtColor(image_source, cv2.COLOR_BGR2RGB))

        transform = T.Compose([
            T.Resize((520, 520)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        inp = transform(img).unsqueeze(0)
        with torch.no_grad():
            out = model(inp)["out"][0]
        seg_map = out.argmax(0).numpy()

        total_px = seg_map.size
        vehicle_px  = int(np.isin(seg_map, list(VEHICLE_CLASSES)).sum())
        person_px   = int(np.isin(seg_map, list(PERSON_CLASSES)).sum())
        road_px     = int(np.isin(seg_map, list(BACKGROUND_ROAD)).sum())

        vehicle_ratio   = vehicle_px / total_px
        person_ratio    = person_px  / total_px
        road_ratio      = road_px    / total_px

        vehicle_density = (
            "high"   if vehicle_ratio > 0.15 else
            "medium" if vehicle_ratio > 0.06 else "low"
        )
        pedestrian_density = (
            "high"   if person_ratio > 0.10 else
            "medium" if person_ratio > 0.04 else "low"
        )
        road_quality    = round(min(1.0, road_ratio * 2.0), 2)
        obstruction_pct = vehicle_ratio + person_ratio
        obstruction_level = (
            "high"   if obstruction_pct > 0.25 else
            "medium" if obstruction_pct > 0.10 else "low"
        )

        return {
            "vehicle_density":     vehicle_density,
            "road_quality":        road_quality,
            "pedestrian_density":  pedestrian_density,
            "obstruction_level":   obstruction_level,
            "vehicle_pixel_ratio": round(vehicle_ratio, 4),
            "person_pixel_ratio":  round(person_ratio,  4),
            "road_pixel_ratio":    round(road_ratio,    4),
            "inference_mode":      "deeplabv3_real",
        }
    except Exception as e:
        print(f"⚠️  Real inference failed: {e}")
        return None


# --- Simulation helpers ---

def _time_based_seed() -> int:
    """Return an int seed that changes every 5 seconds (for realistic variation)."""
    return int(datetime.now().timestamp()) // 5


def _simulate_road_scene(zone: str = "downtown", seed: Optional[int] = None) -> dict:
    """
    Simulate segmentation metrics for a given zone.
    Mimics what a real DeepLabV3 run would produce.
    """
    if seed is None:
        seed = _time_based_seed()
    rng = random.Random(seed)

    # Zone base characteristics
    zone_profiles = {
        "downtown":    {"veh": 0.28, "ped": 0.12, "road": 0.55},
        "industrial":  {"veh": 0.35, "ped": 0.04, "road": 0.45},
        "residential": {"veh": 0.10, "ped": 0.06, "road": 0.70},
        "park":        {"veh": 0.03, "ped": 0.15, "road": 0.60},
        "highway":     {"veh": 0.40, "ped": 0.01, "road": 0.50},
        "suburb":      {"veh": 0.08, "ped": 0.04, "road": 0.75},
        "market":      {"veh": 0.22, "ped": 0.20, "road": 0.45},
        "university":  {"veh": 0.12, "ped": 0.18, "road": 0.60},
        "hospital":    {"veh": 0.18, "ped": 0.12, "road": 0.58},
        "airport":     {"veh": 0.45, "ped": 0.05, "road": 0.40},
    }

    profile = zone_profiles.get(zone, zone_profiles["downtown"])
    hour   = datetime.now().hour
    rush   = 1.0 + 0.4 * math.sin(math.pi * (hour - 8) / 10) if 7 <= hour <= 19 else 0.6

    veh  = min(0.70, profile["veh"]  * rush + rng.uniform(-0.05, 0.05))
    ped  = min(0.40, profile["ped"]  * rush + rng.uniform(-0.03, 0.03))
    road = max(0.20, profile["road"] + rng.uniform(-0.05, 0.05))

    vehicle_density = (
        "high"   if veh > 0.22 else
        "medium" if veh > 0.10 else "low"
    )
    pedestrian_density = (
        "high"   if ped > 0.12 else
        "medium" if ped > 0.05 else "low"
    )
    road_quality = round(min(1.0, road), 2)
    obstruction  = veh + ped
    obstruction_level = (
        "high"   if obstruction > 0.35 else
        "medium" if obstruction > 0.18 else "low"
    )

    return {
        "vehicle_density":     vehicle_density,
        "road_quality":        road_quality,
        "pedestrian_density":  pedestrian_density,
        "obstruction_level":   obstruction_level,
        "vehicle_pixel_ratio": round(veh,  4),
        "person_pixel_ratio":  round(ped,  4),
        "road_pixel_ratio":    round(road, 4),
        "inference_mode":      "simulation",
        "zone":                zone,
        "hour":                hour,
    }


def analyze_road_image(image_bytes: Optional[bytes] = None, zone: str = "downtown") -> dict:
    """
    Public entry point.
    Tries real segmentation first; falls back to simulation.
    """
    result = None
    if image_bytes and TORCH_AVAILABLE:
        result = _run_real_segmentation(image_bytes)

    if result is None:
        result = _simulate_road_scene(zone)

    # Attach confidence + timestamp
    result["confidence"]  = 0.94 if result["inference_mode"] == "deeplabv3_real" else 0.82
    result["timestamp"]   = datetime.now().isoformat()
    result["torch_available"] = TORCH_AVAILABLE
    return result


def get_zone_segmentation(zone: str) -> dict:
    """Return simulated segmentation metrics for a named zone (no image needed)."""
    return _simulate_road_scene(zone)


def density_to_score(density: str) -> float:
    """Convert categorical density to numeric 0-1 score (lower = better)."""
    return {"low": 0.1, "medium": 0.5, "high": 0.9}.get(density, 0.5)

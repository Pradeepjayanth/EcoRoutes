"""
Smart Route Scoring Service
Hybrid scoring: distance + time + AQI + vehicle_density + road_quality
Adjusts weights per user travel profile.
"""

from typing import Optional


# --- Profile weight configurations ---
PROFILE_WEIGHTS = {
    "normal": {
        "distance":        0.30,
        "time":            0.20,
        "aqi":             0.30,
        "vehicle_density": 0.10,
        "road_quality":    0.10,
    },
    "asthma": {
        "distance":        0.15,
        "time":            0.10,
        "aqi":             0.50,
        "vehicle_density": 0.20,
        "road_quality":    0.05,
    },
    "elderly": {
        "distance":        0.20,
        "time":            0.15,
        "aqi":             0.25,
        "vehicle_density": 0.20,
        "road_quality":    0.20,
    },
    "cyclist": {
        "distance":        0.20,
        "time":            0.15,
        "aqi":             0.25,
        "vehicle_density": 0.30,
        "road_quality":    0.10,
    },
}


def _normalize(value: float, min_val: float, max_val: float) -> float:
    """Min-max normalize to [0, 1]. Returns 0.5 on zero-range."""
    if max_val == min_val:
        return 0.5
    return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))


def density_penalty(density: str) -> float:
    """Convert categorical density → penalty [0..1]. Higher = worse."""
    return {"low": 0.1, "medium": 0.5, "high": 0.9}.get(density, 0.5)


def road_quality_penalty(quality: float) -> float:
    """Invert road_quality (0..1 where 1=perfect) → penalty [0..1]."""
    return round(1.0 - max(0.0, min(1.0, quality)), 4)


def compute_route_score(
    distance_km:          float,
    time_minutes:         float,
    avg_aqi:              int,
    vehicle_density:      str   = "medium",
    road_quality:         float = 0.7,
    pedestrian_density:   str   = "low",
    user_type:            str   = "normal",
    # Reference bounds for normalization (pass all candidates' values)
    ref_distances:        Optional[list] = None,
    ref_times:            Optional[list] = None,
    ref_aqis:             Optional[list] = None,
) -> dict:
    """
    Compute a composite route score (lower is better, 0..1).
    Returns the score plus a breakdown for the AI explanation panel.
    """
    weights = PROFILE_WEIGHTS.get(user_type, PROFILE_WEIGHTS["normal"])

    # Normalization bounds
    d_min  = min(ref_distances or [distance_km]) ;  d_max = max(ref_distances or [distance_km * 1.5])
    t_min  = min(ref_times     or [time_minutes]); t_max  = max(ref_times     or [time_minutes * 1.5])
    a_min  = min(ref_aqis      or [avg_aqi])     ;  a_max = max(ref_aqis      or [max(avg_aqi * 1.5, 1)])

    # Individual normalized penalties [0=best, 1=worst]
    d_score  = _normalize(distance_km,           d_min, d_max)
    t_score  = _normalize(time_minutes,          t_min, t_max)
    a_score  = _normalize(float(avg_aqi),        float(a_min), float(a_max))
    v_score  = density_penalty(vehicle_density)
    r_score  = road_quality_penalty(road_quality)

    # Weighted composite
    composite = (
        weights["distance"]        * d_score +
        weights["time"]            * t_score +
        weights["aqi"]             * a_score +
        weights["vehicle_density"] * v_score +
        weights["road_quality"]    * r_score
    )
    composite = round(composite, 4)

    # Human-readable score (0..100, higher = better)
    human_score = round((1.0 - composite) * 100, 1)

    # Grade
    if human_score >= 80:
        grade, grade_color = "A", "#00e88f"
    elif human_score >= 65:
        grade, grade_color = "B", "#7fffb3"
    elif human_score >= 50:
        grade, grade_color = "C", "#ffdf6b"
    elif human_score >= 35:
        grade, grade_color = "D", "#ff9f43"
    else:
        grade, grade_color = "F", "#ff4d4d"

    # AI explanation reasons
    explanations   = []
    warnings       = []

    if a_score < 0.35:
        explanations.append("Lower AQI exposure along this route")
    elif a_score > 0.65:
        warnings.append(f"Elevated pollution (AQI ≈ {avg_aqi})")

    if v_score < 0.35:
        explanations.append("Low vehicle density detected by AI")
    elif v_score > 0.65:
        warnings.append("High vehicle density — expect congestion")

    if r_score < 0.35:
        explanations.append("Better road condition (AI-assessed)")
    elif r_score > 0.65:
        warnings.append("Degraded road surface detected")

    if d_score < 0.35:
        explanations.append("Shorter overall distance")

    if t_score < 0.35:
        explanations.append("Faster estimated travel time")

    if pedestrian_density == "low":
        explanations.append("Minimal pedestrian conflict zones")
    elif pedestrian_density == "high":
        warnings.append("High pedestrian activity — drive cautiously")

    return {
        "score":         composite,
        "humanScore":    human_score,
        "grade":         grade,
        "gradeColor":    grade_color,
        "breakdown": {
            "distance":        round(d_score,  4),
            "time":            round(t_score,  4),
            "aqi":             round(a_score,  4),
            "vehicleDensity":  round(v_score,  4),
            "roadQuality":     round(r_score,  4),
        },
        "weights":         weights,
        "explanations":    explanations,
        "warnings":        warnings,
        "userType":        user_type,
    }


def score_all_routes(routes: list, user_type: str = "normal") -> list:
    """
    Score a list of route dicts (each must have distance, time, aqi, segmentation keys).
    Returns routes with 'aiScore' field injected, sorted best→worst.
    """
    distances = [r["totalDistance"]   for r in routes]
    times     = [r["estimatedTime"]   for r in routes]
    aqis      = [r.get("avgAQI", 80)  for r in routes]

    scored = []
    for r in routes:
        seg   = r.get("segmentation", {})
        score = compute_route_score(
            distance_km        = r["totalDistance"],
            time_minutes       = r["estimatedTime"],
            avg_aqi            = r.get("avgAQI", 80),
            vehicle_density    = seg.get("vehicle_density",    "medium"),
            road_quality       = seg.get("road_quality",        0.7),
            pedestrian_density = seg.get("pedestrian_density", "low"),
            user_type          = user_type,
            ref_distances      = distances,
            ref_times          = times,
            ref_aqis           = aqis,
        )
        scored.append({**r, "aiScore": score})

    # Sort by composite score (lower = better)
    scored.sort(key=lambda x: x["aiScore"]["score"])
    return scored

"""
Personalization Service
Adjusts route weights based on user health profile and travel type.
"""

USER_PROFILES = {
    "normal": {
        "label": "Normal User",
        "icon": "👤",
        "description": "Standard routing with balanced priorities",
        "aqiSensitivity": 1.0,
        "trafficSensitivity": 1.0,
        "avoidHighways": False,
        "avoidHighTraffic": False,
        "maxAcceptableAQI": 200,
        "preferPaths": False,
    },
    "asthma": {
        "label": "Asthma Sensitive",
        "icon": "🫁",
        "description": "Avoids high pollution zones, prioritizes clean air routes",
        "aqiSensitivity": 3.0,
        "trafficSensitivity": 1.5,
        "avoidHighways": False,
        "avoidHighTraffic": False,
        "maxAcceptableAQI": 100,
        "preferPaths": False,
    },
    "elderly": {
        "label": "Elderly Friendly",
        "icon": "👴",
        "description": "Avoids heavy traffic and complex intersections",
        "aqiSensitivity": 1.5,
        "trafficSensitivity": 3.0,
        "avoidHighways": True,
        "avoidHighTraffic": True,
        "maxAcceptableAQI": 150,
        "preferPaths": False,
    },
    "cyclist": {
        "label": "Cyclist Safe",
        "icon": "🚴",
        "description": "Prefers cycle paths and residential roads, avoids highways",
        "aqiSensitivity": 1.8,
        "trafficSensitivity": 2.0,
        "avoidHighways": True,
        "avoidHighTraffic": True,
        "maxAcceptableAQI": 130,
        "preferPaths": True,
    },
}


def apply_personalization(user_type: str, edge: dict, aqi: int) -> float:
    """
    Apply personalization factor to route edge weight.
    Returns a multiplier for the edge weight.
    """
    profile = USER_PROFILES.get(user_type, USER_PROFILES["normal"])
    factor = 1.0

    # AQI sensitivity
    if aqi > profile["maxAcceptableAQI"]:
        factor *= 1 + (profile["aqiSensitivity"] * 2)
    elif aqi > 100:
        factor *= 1 + (profile["aqiSensitivity"] * (aqi / 200))

    # Highway avoidance
    if profile["avoidHighways"] and edge.get("roadType") == "highway":
        factor *= 5.0

    # High traffic avoidance
    if profile["avoidHighTraffic"] and edge.get("traffic", 0) > 6:
        factor *= 1 + (profile["trafficSensitivity"] * 0.8)

    # Path preference (for cyclists)
    if profile["preferPaths"] and edge.get("roadType") == "path":
        factor *= 0.4

    # Residential road bonus for elderly and cyclists
    if user_type in ("elderly", "cyclist") and edge.get("roadType") == "residential":
        factor *= 0.7

    return factor


def get_health_advisory(user_type: str, aqi: int) -> dict:
    """Get health advisory based on user type and AQI."""
    profile = USER_PROFILES.get(user_type, USER_PROFILES["normal"])
    advisories = []

    if user_type == "asthma":
        if aqi > 150:
            advisories.append({
                "severity": "critical",
                "message": "⚠️ High pollution alert! Consider postponing outdoor travel or use a mask.",
                "icon": "🚨",
            })
        elif aqi > 100:
            advisories.append({
                "severity": "warning",
                "message": "⚠️ Moderate pollution. Carry your inhaler and consider the eco route.",
                "icon": "⚠️",
            })
        else:
            advisories.append({
                "severity": "info",
                "message": "✅ Air quality is acceptable for your condition.",
                "icon": "✅",
            })

    if user_type == "elderly":
        if aqi > 100:
            advisories.append({
                "severity": "warning",
                "message": "🏥 Elevated pollution levels. Route avoids high-traffic areas.",
                "icon": "🏥",
            })
        advisories.append({
            "severity": "info",
            "message": "🚶 Route optimized for comfort with lower traffic density.",
            "icon": "🚶",
        })

    if user_type == "cyclist":
        if aqi > 130:
            advisories.append({
                "severity": "warning",
                "message": "🚴 High pollution for cycling. Consider reduced intensity.",
                "icon": "🚴",
            })
        advisories.append({
            "severity": "info",
            "message": "🛤️ Route prefers cycle paths and residential streets.",
            "icon": "🛤️",
        })

    if not advisories:
        advisories.append({
            "severity": "info",
            "message": "👍 Conditions are suitable for your journey.",
            "icon": "👍",
        })

    return {
        "userType": user_type,
        "profile": {
            "label": profile["label"],
            "icon": profile["icon"],
            "description": profile["description"],
        },
        "advisories": advisories,
    }


def get_user_profiles() -> list:
    """Get all user profiles."""
    return [{"id": k, **v} for k, v in USER_PROFILES.items()]

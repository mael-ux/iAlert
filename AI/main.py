"""
iAlert - FastAPI Server for GenAI chatbot and disaster data
Handles chatbot and country/disaster-data endpoints
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Literal, Optional
import os

from AI.chat_agent import (
    ChatError,
    RateLimitedError,
    get_or_create_session,
    resolve_coords,
    run_chat_turn,
)
from AI.disasters import DisasterService, normalize_eonet

# Initialize FastAPI app
app = FastAPI(
    title="iAlert AI Service",
    description="GenAI chatbot and disaster-data API",
    version="1.0.0"
)

# CORS configuration - allows requests from your mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for data
countries_by_continent = {}

# Pydantic models for request/response validation
# GenAI chatbot models (POST /api/chat)
class ToolCall(BaseModel):
    name: str
    args: Dict
    cached: bool = False

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    units: Literal["metric", "imperial"] = "metric"

class ChatResponse(BaseModel):
    response: str
    session_id: str
    tool_calls: Optional[List[ToolCall]] = None

# Prepare static country data on startup
@app.on_event("startup")
async def load_model_and_data():
    """Prepare static country data"""
    global countries_by_continent

    # Static list of countries by continent
    countries_by_continent = {
        "Asia": [
            "Afghanistan", "Armenia", "Azerbaijan", "Bangladesh", "Bhutan",
            "Brunei", "Cambodia", "China", "Georgia", "India", "Indonesia",
            "Iran", "Iraq", "Israel", "Japan", "Jordan", "Kazakhstan",
            "Korea", "Kuwait", "Kyrgyzstan", "Laos", "Lebanon", "Malaysia",
            "Maldives", "Mongolia", "Myanmar", "Nepal", "Oman", "Pakistan",
            "Palestine", "Philippines", "Qatar", "Russia", "Saudi Arabia",
            "Singapore", "Sri Lanka", "Syria", "Taiwan", "Tajikistan",
            "Thailand", "Turkey", "Turkmenistan", "United Arab Emirates",
            "Uzbekistan", "Vietnam", "Yemen"
        ],
        "Europe": [
            "Albania", "Andorra", "Austria", "Belarus", "Belgium",
            "Bosnia And Herzegovina", "Bulgaria", "Croatia", "Cyprus",
            "Czechia", "Denmark", "Estonia", "Finland", "France",
            "Germany", "Greece", "Hungary", "Iceland", "Ireland",
            "Italy", "Kosovo", "Latvia", "Liechtenstein", "Lithuania",
            "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro",
            "Netherlands", "North Macedonia", "Norway", "Poland",
            "Portugal", "Romania", "Russia", "San Marino", "Serbia",
            "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland",
            "Ukraine", "United Kingdom", "Vatican"
        ],
        "Africa": [
            "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso",
            "Burundi", "Cameroon", "Cape Verde", "Central African Republic",
            "Chad", "Comoros", "Congo", "Djibouti", "Egypt",
            "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia",
            "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau",
            "Ivory Coast", "Kenya", "Lesotho", "Liberia", "Libya",
            "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius",
            "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria",
            "Rwanda", "Sao Tome And Principe", "Senegal", "Seychelles",
            "Sierra Leone", "Somalia", "South Africa", "South Sudan",
            "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda",
            "Zambia", "Zimbabwe"
        ],
        "America": [
            "Antigua And Barbuda", "Argentina", "Bahamas", "Barbados",
            "Belize", "Bolivia", "Brazil", "Canada", "Chile", "Colombia",
            "Costa Rica", "Cuba", "Dominica", "Dominican Republic",
            "Ecuador", "El Salvador", "Grenada", "Guatemala", "Guyana",
            "Haiti", "Honduras", "Jamaica", "Mexico", "Nicaragua",
            "Panama", "Paraguay", "Peru", "Saint Kitts And Nevis",
            "Saint Lucia", "Saint Vincent And The Grenadines",
            "Suriname", "Trinidad And Tobago", "United States",
            "Uruguay", "Venezuela"
        ],
        "Oceania": [
            "Australia", "Fiji", "Kiribati", "Marshall Islands",
            "Micronesia", "Nauru", "New Zealand", "Palau",
            "Papua New Guinea", "Samoa", "Solomon Islands", "Tonga",
            "Tuvalu", "Vanuatu"
        ]
    }
        
    print(f"✅ Loaded {sum(len(v) for v in countries_by_continent.values())} countries across {len(countries_by_continent)} continents")

# Health check endpoint
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "iAlert AI Service",
        "status": "online",
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "countries_loaded": len(countries_by_continent),
        "total_countries": sum(len(v) for v in countries_by_continent.values())
    }

# Get countries by continent
@app.get("/api/countries/{continent}")
async def get_countries(continent: str):
    """
    Get list of countries for a given continent
    
    Args:
        continent: One of Asia, Europe, Africa, America, Oceania
    
    Returns:
        Dictionary with continent name (string) and list of countries
    """
    # Normalize continent name (capitalize first letter)
    continent = continent.capitalize()
    
    if continent not in countries_by_continent:
        raise HTTPException(
            status_code=404,
            detail=f"Continent '{continent}' not found. Available: {list(countries_by_continent.keys())}"
        )
    
    return {
        "continent": continent,
        "countries": countries_by_continent[continent]
    }

# Get all continents
@app.get("/api/continents")
async def get_continents() -> Dict[str, List[str]]:
    """Get list of all available continents"""
    return {
        "continents": list(countries_by_continent.keys())
    }

# GenAI conversational agent (lazy Gemini init: missing GEMINI_API_KEY
# returns 503 on this route only; all other routes keep working)
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Conversational weather/disaster-risk chat backed by Gemini with a
    single get_weather_free tool. Unknown or expired session_ids
    start a fresh session without error.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=400,
            detail="message must be a non-empty string",
        )

    session = get_or_create_session(request.session_id)

    # Explicit lat/lon are validated here so out-of-bounds values fail fast
    # with 400 before reaching the agent loop.
    if (request.lat is None) != (request.lon is None):
        raise HTTPException(
            status_code=400,
            detail="lat and lon must be provided together",
        )
    if request.lat is not None and request.lon is not None:
        check = resolve_coords(request.lat, request.lon, session)
        if check is None:
            raise HTTPException(
                status_code=400,
                detail="Invalid coordinates: lat must be -90..90, "
                       "lon -180..180",
            )

    try:
        text, tool_calls = run_chat_turn(
            message=request.message,
            session=session,
            lat=request.lat,
            lon=request.lon,
            units=request.units,
        )
    except RateLimitedError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc.detail),
            headers={"Retry-After": str(exc.retry_after or 60)},
        )
    except ChatError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc.detail),
        )

    return ChatResponse(
        response=text,
        session_id=session.session_id,
        tool_calls=[ToolCall(**tc) for tc in tool_calls] or None,
    )

# Initialize disaster ingestion service
disaster_service = DisasterService()

# Disasters proxy endpoint (bypasses mobile network restrictions)
@app.get("/api/disasters/sources")
async def get_disaster_sources():
    """List available real-time natural disaster data sources."""
    return {
        "sources": disaster_service.available_sources(),
    }


@app.get("/api/disasters")
async def get_disasters(
    limit: int = 150,
    days: int = 30,
    force_refresh: bool = False,
    sources: Optional[str] = None,
):
    """
    Fetch active natural disasters from multiple authoritative global APIs
    (NASA EONET, GDACS, USGS Earthquakes, NASA FIRMS).
    Tolerates partial failures and returns cached/stale data on error.
    """
    source_list = [s.strip() for s in sources.split(",")] if sources else None
    result = disaster_service.fetch_all(
        sources=source_list,
        limit=limit,
        days=days,
        force_refresh=force_refresh,
    )
    if result.get("count", 0) == 0 and not result.get("sources"):
        raise HTTPException(
            status_code=503,
            detail="Unable to fetch disasters from any source.",
        )
    return result

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not found",
            "detail": str(exc.detail) if hasattr(exc, 'detail') else "Resource not found"
        },
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": "An unexpected error occurred"
        },
    )

# For local development
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
"""
iAlert - FastAPI Server for Disaster Predictions
Handles chatbot and ML model predictions
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
from typing import Dict, List
import os

# Initialize FastAPI app
app = FastAPI(
    title="iAlert AI Service",
    description="Disaster prediction and chatbot API",
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

# Global variables for model and data
modelo = None
codificador = None
countries_by_continent = {}

# Pydantic models for request/response validation
class PredictionRequest(BaseModel):
    region: str
    country: str

class PredictionResponse(BaseModel):
    status: str
    region: str
    country: str
    predictions: Dict[str, float]

# Load model and prepare data on startup
@app.on_event("startup")
async def load_model_and_data():
    """Load the trained model and prepare country data"""
    global modelo, codificador, countries_by_continent
    
    try:
        # Load the trained model files
        modelo = joblib.load("modelo_desastres.pkl")
        codificador = joblib.load("codificador_labels.pkl")
        
        print("✅ Model loaded successfully!")
        
        # Prepare countries by continent
        # This is extracted from your training data
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
        
    except FileNotFoundError as e:
        print(f"❌ Error: Model files not found - {e}")
        print("Make sure 'modelo_desastres.pkl' and 'codificador_labels.pkl' are in the same directory")
    except Exception as e:
        print(f"❌ Error loading model: {e}")

# Health check endpoint
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "iAlert AI Service",
        "status": "online",
        "model_loaded": modelo is not None,
        "version": "1.0.0"
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_status": "loaded" if modelo is not None else "not loaded",
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

# Predict disaster
@app.post("/api/predict-disaster", response_model=PredictionResponse)
async def predict_disaster(request: PredictionRequest):
    """
    Predict disaster probabilities for a given region and country
    
    Args:
        request: PredictionRequest with region and country
    
    Returns:
        Prediction probabilities for different disaster types
    """
    if modelo is None or codificador is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please contact administrator."
        )
    
    try:
        # Normalize inputs (Title case to match training data)
        region = request.region.title()
        country = request.country.title()
        
        # Create input dataframe (must match training data structure)
        df = pd.DataFrame({
            "Region": [region],
            "Country": [country]
        })
        
        # Get probabilities from model
        probabilities = modelo.predict_proba(df)[0]
        labels = codificador.classes_
        
        # Create predictions dictionary
        predictions = {
            labels[i]: float(probabilities[i])
            for i in range(len(labels))
        }
        
        # Sort by probability (highest first)
        predictions = dict(sorted(predictions.items(), key=lambda x: x[1], reverse=True))
        
        return PredictionResponse(
            status="ok",
            region=region,
            country=country,
            predictions=predictions
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction error: {str(e)}"
        )

# Get model info
@app.get("/api/model-info")
async def get_model_info():
    """Get information about the loaded model"""
    if modelo is None or codificador is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "model_type": str(type(modelo)),
        "disaster_types": list(codificador.classes_),
        "num_disaster_types": len(codificador.classes_),
        "features": ["Region", "Country"]
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {
        "error": "Not found",
        "detail": str(exc.detail) if hasattr(exc, 'detail') else "Resource not found"
    }

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return {
        "error": "Internal server error",
        "detail": "An unexpected error occurred"
    }

# For local development
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
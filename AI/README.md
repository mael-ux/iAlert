# 🤖 iAlert AI Service

FastAPI-based microservice for disaster prediction and chatbot functionality.

## 📋 Overview

This service provides:
- 🌍 **Country/Continent data** - Lists of countries organized by continent
- 🔮 **Disaster predictions** - ML-based probability predictions for natural disasters
- 💬 **Chatbot backend** - Powers the mobile app's disaster prediction chatbot

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     Mobile App (React Native)       │
└──────────┬──────────────────────────┘
           │
           ├─────────────────┬─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌─────────────┐   ┌──────────┐   ┌──────────────┐
    │  Node.js    │   │ FastAPI  │   │   FastAPI    │
    │  Backend    │   │ AI Svc   │   │   Docs UI    │
    │             │   │          │   │  (Auto-gen)  │
    │ • Weather   │   │ • ML     │   │              │
    │ • Users     │   │ • Chat   │   └──────────────┘
    │ • Zones     │   │ • Data   │
    └─────────────┘   └──────────┘
```

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   pip install -r AI/requirements.txt
   ```

2. **Make sure you have the model files:**
   ```bash
   ls AI/
   # Should show:
   # modelo_desastres.pkl
   # codificador_labels.pkl
   ```

3. **Run the server:**
   ```bash
   uvicorn AI.main:app --reload --port 8000
   ```

4. **Test it:**
   ```bash
   # Open browser
   http://localhost:8000          # API root
   http://localhost:8000/docs     # Interactive API docs (Swagger UI)
   http://localhost:8000/redoc    # Alternative docs (ReDoc)
   
   # Or use the test script
   python AI/test_api.py
   ```

### Production Deployment

See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for full instructions.

**TL;DR:**
```bash
# 1. Push to GitHub
git add AI/
git commit -m "Add AI service"
git push

# 2. Deploy to Render
# - Go to dashboard.render.com
# - New > Blueprint
# - Select your repo
# - Done!
```

## 📡 API Endpoints

### Health & Info

#### `GET /`
Root endpoint - basic service info
```json
{
  "service": "iAlert AI Service",
  "status": "online",
  "model_loaded": true,
  "version": "1.0.0"
}
```

#### `GET /api/health`
Detailed health check
```json
{
  "status": "healthy",
  "model_status": "loaded",
  "countries_loaded": 5,
  "total_countries": 195
}
```

#### `GET /api/model-info`
Information about the ML model
```json
{
  "model_type": "RandomForestClassifier",
  "disaster_types": ["Flood", "Storm", "Earthquake", ...],
  "num_disaster_types": 15,
  "features": ["Region", "Country"]
}
```

### Data Endpoints

#### `GET /api/continents`
Get list of all continents
```json
{
  "continents": ["Asia", "Europe", "Africa", "America", "Oceania"]
}
```

#### `GET /api/countries/{continent}`
Get countries for a specific continent

**Example:** `GET /api/countries/asia`
```json
{
  "continent": "Asia",
  "countries": [
    "Afghanistan",
    "Armenia",
    "Azerbaijan",
    "Bangladesh",
    ...
  ]
}
```

### Prediction Endpoint

#### `POST /api/predict-disaster`
Get disaster probability predictions for a region/country

**Request Body:**
```json
{
  "region": "Asia",
  "country": "Japan"
}
```

**Response:**
```json
{
  "status": "ok",
  "region": "Asia",
  "country": "Japan",
  "predictions": {
    "Flood": 0.4078,
    "Storm": 0.2381,
    "Earthquake": 0.1063,
    "Landslide": 0.0892,
    "Volcanic Activity": 0.0654,
    ...
  }
}
```

## 🧪 Testing

### Manual Testing with curl

```bash
# Health check
curl http://localhost:8000/api/health

# Get countries
curl http://localhost:8000/api/countries/asia

# Predict disaster
curl -X POST http://localhost:8000/api/predict-disaster \
  -H "Content-Type: application/json" \
  -d '{"region": "Asia", "country": "Japan"}'
```

### Automated Testing

```bash
python AI/test_api.py
```

## 📦 Dependencies

- **FastAPI** - Modern web framework
- **Uvicorn** - ASGI server
- **scikit-learn** - Machine learning
- **pandas** - Data manipulation
- **joblib** - Model serialization

See [requirements.txt](requirements.txt) for versions.

## 🗂️ File Structure

```
AI/
├── main.py                    # FastAPI application
├── requirements.txt           # Python dependencies
├── test_api.py               # API test suite
│
├── modelo_desastres.pkl      # Trained ML model
├── codificador_labels.pkl    # Label encoder
│
├── entrenar.py               # Training script (reference)
├── predict.py                # Old CLI prediction (reference)
└── interfaz_desastres.py     # Old GUI (reference)
```

## 🔧 Configuration

### Environment Variables

- `PORT` - Server port (default: 8000)
- `PYTHON_VERSION` - Python version for Render (3.11.0)

### Model Files

The service requires two files:
1. `modelo_desastres.pkl` - RandomForest classifier
2. `codificador_labels.pkl` - LabelEncoder for disaster types

These must be in the `AI/` directory.

## 🌐 CORS

CORS is enabled for all origins (`*`) to allow mobile app access.

**For production**, update in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app-domain.com"],  # Restrict this
    ...
)
```

## 📊 Monitoring

### Render Dashboard
- View logs in real-time
- Monitor resource usage
- Check deployment status

### Health Check Endpoint
Set up monitoring tools to ping:
```
https://your-service.onrender.com/api/health
```

## 🐛 Troubleshooting

### Common Issues

**Model not loading:**
- ✅ Check `.pkl` files exist in `AI/` folder
- ✅ Verify files are in GitHub repo
- ✅ Check file sizes (< 100MB each)

**CORS errors:**
- ✅ Verify CORS middleware is enabled
- ✅ Check mobile app URL matches server URL

**Cold starts (Render free tier):**
- ⏰ First request after 15min inactivity takes ~30s
- 💡 Consider upgrading to paid tier for always-on

**Import errors:**
- ✅ Verify all dependencies in `requirements.txt`
- ✅ Check Python version compatibility

## 📈 Performance

### Response Times
- Health check: ~50ms
- Countries list: ~50ms
- Prediction: ~100-200ms

### Free Tier Limitations
- Spins down after 15 minutes of inactivity
- 750 hours/month free
- Shared CPU/RAM

## 🔐 Security

**Current setup:**
- ✅ HTTPS enabled (Render provides SSL)
- ✅ Input validation via Pydantic
- ⚠️ CORS open to all origins
- ⚠️ No authentication

**For production:**
- Add API key authentication
- Restrict CORS origins
- Add rate limiting
- Enable request logging

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Render Documentation](https://render.com/docs)
- [scikit-learn Docs](https://scikit-learn.org/)

## 🤝 Contributing

This is part of the iAlert project. See main README for contribution guidelines.

## 📄 License

Part of the iAlert disaster monitoring system.

## 🆘 Support

Issues? Check:
1. [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)
2. Render logs
3. Test with `test_api.py`

---

**Built with ❤️ for iAlert**
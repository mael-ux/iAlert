# 🤖 iAlert AI Service

FastAPI-based microservice for disaster data and GenAI chatbot functionality.

## 📋 Overview

This service provides:
- 🌍 **Country/Continent data** - Lists of countries organized by continent
- 🛰️ **Disaster data** - Active disasters proxied from NASA EONET
- 💬 **Chatbot backend** - Powers the mobile app's GenAI disaster-risk chat

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
    │ • Weather   │   │ • Chat   │   │              │
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

2. **Run the server:**
   ```bash
   uvicorn AI.main:app --reload --port 8000
   ```

3. **Test it:**
   ```bash
   # Open browser
   http://localhost:8000          # API root
   http://localhost:8000/docs     # Interactive API docs (Swagger UI)
   http://localhost:8000/redoc    # Alternative docs (ReDoc)
   
    # Or use the test script
    python AI/test_chat.py
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
  "version": "1.0.0"
}
```

#### `GET /api/health`
Detailed health check
```json
{
  "status": "healthy",
  "countries_loaded": 5,
  "total_countries": 195
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

## 🧪 Testing

### Manual Testing with curl

```bash
# Health check
curl http://localhost:8000/api/health

# Get countries
curl http://localhost:8000/api/countries/asia
```

### Automated Testing

```bash
python AI/test_chat.py
```

## 📦 Dependencies

- **FastAPI** - Modern web framework
- **Uvicorn** - ASGI server
- **google-genai** - GenAI chatbot backend
- **httpx** - HTTP client for chatbot tool calls

See [requirements.txt](requirements.txt) for versions.

## 🗂️ File Structure

```
AI/
├── main.py                    # FastAPI application
├── requirements.txt           # Python dependencies
├── chat_agent.py              # GenAI chatbot agent
├── test_chat.py               # Chatbot test suite
```

## 🔧 Configuration

### Environment Variables

- `PORT` - Server port (default: 8000)
- `PYTHON_VERSION` - Python version for Render (3.11.0)
- `GEMINI_API_KEY` - API key for the GenAI chatbot (`/api/chat` returns 503 without it)

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
- Chat: depends on Gemini API latency

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

## 🤝 Contributing

This is part of the iAlert project. See main README for contribution guidelines.

## 📄 License

Part of the iAlert disaster monitoring system.

## 🆘 Support

Issues? Check:
1. [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)
2. Render logs
3. Test with `test_chat.py`

---

**Built with ❤️ for iAlert**
"""
Test script for iAlert AI Service
Run this locally to verify everything works before deploying to Render
"""

import requests
import json

# Change this to your Render URL after deployment
# For local testing: http://localhost:8000
BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test the health check endpoint"""
    print("\n🔍 Testing Health Check...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_get_continents():
    """Test getting list of continents"""
    print("\n🌍 Testing Get Continents...")
    try:
        response = requests.get(f"{BASE_URL}/api/continents")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Continents: {data['continents']}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_get_countries(continent="Asia"):
    """Test getting countries for a continent"""
    print(f"\n🗺️  Testing Get Countries for {continent}...")
    try:
        response = requests.get(f"{BASE_URL}/api/countries/{continent}")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Countries: {data['countries'][:5]}... ({len(data['countries'])} total)")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_predict_disaster(region="Asia", country="Japan"):
    """Test disaster prediction"""
    print(f"\n🔮 Testing Disaster Prediction for {country}, {region}...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/predict-disaster",
            json={"region": region, "country": country}
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        
        if data.get("status") == "ok":
            print(f"✅ Predictions for {data['country']}, {data['region']}:")
            # Show top 5 predictions
            predictions = sorted(
                data['predictions'].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5]
            
            for disaster, prob in predictions:
                print(f"  • {disaster}: {prob*100:.2f}%")
            
            return True
        else:
            print(f"❌ Unexpected response: {data}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_model_info():
    """Test getting model information"""
    print("\n📊 Testing Model Info...")
    try:
        response = requests.get(f"{BASE_URL}/api/model-info")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Disaster Types: {len(data['disaster_types'])} types")
        print(f"Sample types: {data['disaster_types'][:5]}...")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("🧪 iAlert AI Service - API Tests")
    print("=" * 60)
    
    tests = [
        ("Health Check", test_health_check),
        ("Get Continents", test_get_continents),
        ("Get Countries", lambda: test_get_countries("Asia")),
        ("Predict Disaster", lambda: test_predict_disaster("Asia", "Japan")),
        ("Model Info", test_model_info),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            success = test_func()
            results.append((name, success))
        except Exception as e:
            print(f"❌ {name} failed with exception: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 Test Summary")
    print("=" * 60)
    
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Your API is ready to deploy! 🚀")
    else:
        print("\n⚠️  Some tests failed. Please fix the issues before deploying.")
    
    return passed == total

if __name__ == "__main__":
    print("\n💡 Make sure your server is running first:")
    print("   uvicorn AI.main:app --reload --port 8000\n")
    
    input("Press Enter to start tests...")
    
    success = run_all_tests()
    exit(0 if success else 1)
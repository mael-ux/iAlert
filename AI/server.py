from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd
import uvicorn

app = FastAPI()

# Cargar modelo
modelo = joblib.load("modelo_desastres.pkl")
codificador = joblib.load("codificador_labels.pkl")

class Peticion(BaseModel):
    region: str
    country: str

@app.post("/predecir")
def predecir(data: Peticion):
    try:
        df = pd.DataFrame({
            "Region": [data.region.title()],
            "Country": [data.country.title()]
        })

        probs = modelo.predict_proba(df)[0]
        clases = codificador.classes_

        salida = sorted(
            list(zip(clases, probs)),
            key=lambda x: x[1],
            reverse=True
        )

        return {
            "status": "ok",
            "region": data.region,
            "country": data.country,
            "predicciones": [
                {"desastre": d, "probabilidad": float(p)}
                for d, p in salida
            ]
        }

    except Exception as e:
        return {"status": "error", "detalle": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)


import sys
import joblib
import pandas as pd
import json

# Cargar modelo entrenado
modelo = joblib.load("modelo_desastres.pkl")
codificador = joblib.load("codificador_labels.pkl")

# Obtener argumentos enviados desde Node.js
if len(sys.argv) < 3:
    print(json.dumps({"error": "Missing arguments"}))
    sys.exit()

region = sys.argv[1]
country = sys.argv[2]

# Preparar entrada
df = pd.DataFrame({
    "Region": [region],
    "Country": [country]
})

try:
    # Obtener probabilidades
    probabilities = modelo.predict_proba(df)[0]
    labels = codificador.classes_

    # Convertir a dict
    resultados = {
        labels[i]: float(probabilities[i])
        for i in range(len(labels))
    }

    # Imprimir JSON limpio para Node.js
    print(json.dumps(resultados))

except Exception as e:
    print(json.dumps({"error": str(e)}))

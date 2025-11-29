import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
import warnings

# Ignorar advertencias futuras de scikit-learn para una salida más limpia
warnings.filterwarnings("ignore", category=FutureWarning)

def entrenar_modelo_desastres(file_path):
    """
    Carga, limpia, entrena y evalúa un modelo de predicción de desastres
    basado en Región y País. Filtra automáticamente clases con pocos registros.
    """
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        print(f"Error al leer el archivo: {e}")
        return None, None

    print("Datos cargados exitosamente.")

    features = ['Region', 'Country']
    target = 'Disaster Type'

    # Limpiar nulos
    df_clean = df[features + [target]].dropna()
    if df_clean.empty:
        print("Error: No hay datos después de limpiar valores nulos.")
        return None, None

    # Normalizar texto (elimina diferencias de mayúsculas y espacios)
    df_clean['Region'] = df_clean['Region'].astype(str).str.strip().str.title()
    df_clean['Country'] = df_clean['Country'].astype(str).str.strip().str.title()
    df_clean[target] = df_clean[target].astype(str).str.strip().str.title()

    # Mostrar distribución original
    print("\nDistribución original de desastres:")
    print(df_clean[target].value_counts())

    # --- Filtrar clases con al menos 2 registros ---
    class_counts = df_clean[target].value_counts()
    valid_classes = class_counts[class_counts >= 2].index
    invalid_classes = class_counts[class_counts < 2].index

    if len(invalid_classes) > 0:
        print("\n Se eliminarán los siguientes tipos de desastre por tener solo 1 registro:")
        print(list(invalid_classes))

    df_clean = df_clean[df_clean[target].isin(valid_classes)]

    if df_clean.empty:
        print("Error: No hay clases con suficientes registros para entrenar.")
        return None, None

    print(f"\nSe usarán {len(valid_classes)} tipos de desastre con al menos 2 registros.")
    print(f"Total de registros después de filtrar: {len(df_clean)}")

    # Definir X e y
    X = df_clean[features]
    y = df_clean[target]

    # Codificar etiquetas
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    # Validación final antes de dividir
    from collections import Counter
    counts = Counter(y_encoded)
    min_count = min(counts.values())
    print(f"\nEl tamaño mínimo de clase después del filtrado es: {min_count}")

    # Si alguna clase sigue con un solo registro, quitar el stratify
    stratify_option = y_encoded if min_count >= 2 else None
    if stratify_option is None:
        print("\n Advertencia: se desactivó 'stratify' porque aún hay clases con pocos registros.")

    # División train/test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded,
        test_size=0.3,
        random_state=42,
        stratify=stratify_option
    )

    print(f"\nTotal de registros: {len(X)}")
    print(f"Entrenamiento: {len(X_train)}, Prueba: {len(X_test)}")

    # Crear pipeline
    categorical_transformer = OneHotEncoder(handle_unknown='ignore')
    preprocessor = ColumnTransformer([('cat', categorical_transformer, features)])
    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('model', model)])

    print("\nEntrenando el modelo...")
    pipeline.fit(X_train, y_train)
    print("¡Entrenamiento completado!")

    # Evaluación
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Precisión (Accuracy) del modelo: {acc:.2%}")

    return pipeline, le


def predecir_desastres_usuario(pipeline, label_encoder):
    """
    Pide al usuario una Región y País y muestra las probabilidades de desastre.
    """
    if not pipeline or not label_encoder:
        print("El modelo no está entrenado. Saliendo.")
        return

    print("\n--- Sistema de Predicción de Probabilidad de Desastres ---")
    print("Introduce una Región y un País para ver las probabilidades de desastre.")
    print("Escribe 'salir' en cualquier momento para terminar.")

    # Obtener listas de regiones y países como ejemplo para el usuario
    regiones_ejemplo = list(df['Region'].dropna().unique())
    paises_ejemplo = list(df['Country'].dropna().unique())

    print(f"\nEjemplos de Regiones: {', '.join(regiones_ejemplo[:5])}, etc.")
    
    while True:
        user_region = input(f"\nIngresa la Región (Continente): ")
        if user_region.lower() == 'salir':
            break
            
        paises_en_region = list(df[df['Region'] == user_region]['Country'].dropna().unique())
        if paises_en_region:
            print(f"Ejemplos de Países en '{user_region}': {', '.join(paises_en_region[:3])}...")
        else:
            print("Escribe el nombre del país (ej. Mexico, Japan, Germany)...")

        user_country = input(f"Ingresa el País: ")
        if user_country.lower() == 'salir':
            break

        # --- Predicción ---
        input_data = pd.DataFrame({
            'Region': [user_region],
            'Country': [user_country]
        })

        try:
            probabilities = pipeline.predict_proba(input_data)[0]
            class_names = label_encoder.classes_
            prob_dict = dict(zip(class_names, probabilities))
            sorted_probs = sorted(prob_dict.items(), key=lambda item: item[1], reverse=True)

            print(f"\n--- Resultados para: {user_country}, {user_region} ---")
            
            found = False
            for disaster_type, prob in sorted_probs:
                if prob > 0:
                    print(f"- {disaster_type}: {prob:.2%}")
                    found = True
            
            if not found:
                print("No se encontraron datos históricos para esta combinación de País/Región.")
                print("El modelo predice una probabilidad de 0% para todos los desastres.")

        except Exception as e:
            print(f"Error durante la predicción: {e}")
            print("Asegúrate de haber escrito los nombres correctamente.")


# --- Ejecución Principal ---
# Nombre del archivo Excel
nombre_archivo = r"C:\Users\marqu\OneDrive\Escritorio\iAlert\AI\public_emdat_custom_request_2025-10-26_4a89000d-cedd-4bd7-b279-71aa2a2f6035.xlsx"

# Cargar el DataFrame global para los ejemplos (solo lectura)
try:
    df = pd.read_excel(nombre_archivo)
except Exception:
    df = pd.DataFrame(columns=['Region', 'Country'])

# 1. Entrenar el modelo
modelo_entrenado, codificador_labels = entrenar_modelo_desastres(nombre_archivo)

# 2. Iniciar el modo de predicción interactivo
if modelo_entrenado:
    predecir_desastres_usuario(modelo_entrenado, codificador_labels)

# --- Guardar el modelo entrenado para usarlo en la interfaz ---
import joblib

if modelo_entrenado and codificador_labels:
    joblib.dump(modelo_entrenado, "modelo_desastres.pkl")
    joblib.dump(codificador_labels, "codificador_labels.pkl")
    print("\n Modelo y codificador guardados correctamente (archivos .pkl creados).")
else:
    print("\n No se pudo guardar el modelo porque no se entrenó correctamente.")

import tkinter as tk
from tkinter import ttk, messagebox
import pandas as pd
import joblib

# --- Cargar el modelo y los datos ---
try:
    modelo = joblib.load("modelo_desastres.pkl")
    label_encoder = joblib.load("codificador_labels.pkl")
    df = pd.read_excel("public_emdat_custom_request_2025-10-26_4a89000d-cedd-4bd7-b279-71aa2a2f6035.xlsx")
except Exception as e:
    messagebox.showerror("Error", f"No se pudo cargar el modelo o los datos.\n\n{e}")
    raise SystemExit

# --- Limpiar y preparar datos para menús ---
df['Region'] = df['Region'].astype(str).str.strip().str.title()
df['Country'] = df['Country'].astype(str).str.strip().str.title()

# Obtener lista de regiones únicas
regiones = sorted(df['Region'].dropna().unique().tolist())

# --- Funciones de la interfaz ---
def actualizar_paises(event=None):
    """Actualiza los países según la región seleccionada"""
    region_sel = combo_region.get()
    paises = sorted(df[df['Region'] == region_sel]['Country'].dropna().unique().tolist())
    combo_pais['values'] = paises
    if paises:
        combo_pais.current(0)

def predecir():
    """Realiza la predicción de desastres"""
    region = combo_region.get()
    pais = combo_pais.get()

    if not region or not pais:
        messagebox.showwarning("Advertencia", "Selecciona una región y un país.")
        return

    # Crear DataFrame con los datos de entrada
    entrada = pd.DataFrame({'Region': [region], 'Country': [pais]})

    try:
        probabilidades = modelo.predict_proba(entrada)[0]
        clases = label_encoder.classes_

        resultados = sorted(zip(clases, probabilidades), key=lambda x: x[1], reverse=True)
        texto = f"Predicción para {pais}, {region}\n\n"

        for desastre, prob in resultados:
            texto += f"{desastre}: {prob:.2%}\n"

        messagebox.showinfo("Resultados de Predicción", texto)

    except Exception as e:
        messagebox.showerror("Error de predicción", str(e))


# --- Crear la ventana principal ---
ventana = tk.Tk()
ventana.title("Predicción de Desastres Naturales")
ventana.geometry("420x280")
ventana.resizable(False, False)

# --- Etiquetas y menús ---
ttk.Label(ventana, text="Seleccione la Región (Continente):", font=("Arial", 11)).pack(pady=5)
combo_region = ttk.Combobox(ventana, values=regiones, state="readonly", width=35)
combo_region.pack(pady=5)
combo_region.bind("<<ComboboxSelected>>", actualizar_paises)

ttk.Label(ventana, text="Seleccione el País:", font=("Arial", 11)).pack(pady=5)
combo_pais = ttk.Combobox(ventana, state="readonly", width=35)
combo_pais.pack(pady=5)

ttk.Button(ventana, text="Predecir Desastre ", command=predecir).pack(pady=15)

ttk.Label(ventana, text="Proyecto: Predicción de Desastres Naturales", font=("Arial", 9, "italic")).pack(pady=10)

ventana.mainloop()

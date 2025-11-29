import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Modal, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { WebView } from "react-native-webview";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy"; // Using legacy as we discussed
import { COLORS } from "../../constants/colors";

// These paths are correct
const threeJsAsset = require("../../assets/js/three.txt");
const threeGlobeAsset = require("../../assets/js/three-globe.txt");
// --- ICON ASSETS (local) ---
// NOTE: ajusta nombres si en tu carpeta cambian (respeta mayúsculas)
const iconFiles = {
  wildfires: require("../../assets/images/Fuego.jpg"),
  floods: require("../../assets/images/Inundacion.png"),
  landslides: require("../../assets/images/Landslide.png"),
  severeStorms: require("../../assets/images/Tormenta E.png"),
  volcanoes: require("../../assets/images/Volcan.png"),
};

export default function GlobeMap({ points = null, style }) {
  const [htmlContent, setHtmlContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [iconMap, setIconMap] = useState({}); // base64 data URLs to pass into webview // ← AGREGADO

  // Modal state to show details when a point is clicked // ← AGREGADO
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedIconDataUrl, setSelectedIconDataUrl] = useState(null);

  const defaultPoints = [
    { lat: 19.4326, lng: -99.1332, size: 0.02, color: 'red', city: 'CDMX' },
    { lat: 20.9674, lng: -89.5926, size: 0.02, color: 'yellow', city: 'Mérida' },
    { lat: 21.1619, lng: -86.8515, size: 0.02, color: 'orange', city: 'Cancún' }
  ];

  useEffect(() => {
    const loadAssetsAndBuildHtml = async () => {
      try {
        // 1) download three.js and three-globe code as before
        const threeJsLocalUri = (await Asset.fromModule(threeJsAsset).downloadAsync()).localUri;
        const threeGlobeLocalUri = (await Asset.fromModule(threeGlobeAsset).downloadAsync()).localUri;

        const threeJsCode = await FileSystem.readAsStringAsync(threeJsLocalUri);
        const threeGlobeCode = await FileSystem.readAsStringAsync(threeGlobeLocalUri);

        // 2) Convert local icon images to base64 data URLs to send into WebView
        //    This allows the web content to use local images (no external hosting).
        const iconDataUrls = {};
        for (const [key, moduleRef] of Object.entries(iconFiles)) {
          try {
            const assetLocal = await Asset.fromModule(moduleRef).downloadAsync(); // ← AGREGADO
            // read as base64
            const b64 = await FileSystem.readAsStringAsync(assetLocal.localUri, { encoding: FileSystem.EncodingType.Base64 }); // ← AGREGADO
            // create data URL (assume png or jpg by file extension)
            const ext = assetLocal.localUri.split('.').pop().toLowerCase();
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
            iconDataUrls[key] = `data:${mime};base64,${b64}`; // ← AGREGADO
          } catch (err) {
            console.warn('Failed to load icon for', key, err);
          }
        }
        setIconMap(iconDataUrls); // save to state in case RN needs it too // ← AGREGADO

        // 3) Build HTML for WebView. We pass:
        //    - three.js code
        //    - three-globe code
        //    - iconDataUrls as JSON
        //    - categories to query from EONET
        const categories = ["wildfires","floods","volcanoes","landslides","severeStorms"]; // ← CAMBIADO (categorías)
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { margin: 0; overflow: hidden; background-color: #000; }
                canvas { display: block; }
              </style>
              <script>${threeJsCode}</script>
              <script>${threeGlobeCode}</script>
            </head>
            <body>
              <script>
                (async function() {
                  try {
                    const ICON_MAP = ${JSON.stringify(iconDataUrls)}; // ← AGREGADO: base64 icons map

                    // Helper: fetch EONET events for our categories
                    async function fetchEonetEvents(categories) {
                      const categoryParams = categories.map(c => 'category=' + encodeURIComponent(c)).join('&');
                      const url = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&' + categoryParams;
                      const resp = await fetch(url);
                      if (!resp.ok) throw new Error('EONET fetch failed: ' + resp.status);
                      const data = await resp.json();
                      return data.events || [];
                    }

                    // Basic three.js scene
                    const scene = new THREE.Scene();

                    const globe = new ThreeGlobe()
                      .globeImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-blue-marble.jpg') // ← CAMBIADO
                      .nightImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg')        // ← AGREGADO
                      .bumpImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png')     // ← CAMBIADO
                      .pointAltitude('magnitude')
                      .pointColor('color')
                      .pointLabel('title');

                    scene.add(globe);

                    // Lights (more bright so globe isn't dark)
                    scene.add(new THREE.AmbientLight(0xffffff, 1)); // ← CAMBIADO
                    scene.add(new THREE.DirectionalLight(0xffffff, 1)); // ← CAMBIADO

                    const camera = new THREE.PerspectiveCamera();
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    camera.position.z = 350;

                    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                    renderer.setSize(window.innerWidth, window.innerHeight);
                    document.body.appendChild(renderer.domElement);

                    // Useful constants
                    const GLOBE_RADIUS = 100; // ← AGREGADO: ajuste de radio para posicionar sprites (modificar si es necesario)
                    const spriteGroup = new THREE.Group();
                    scene.add(spriteGroup);

                    // Utility: lat/lon -> Cartesian on sphere of radius r
                    function latLngToCartesian(lat, lon, r) {
                      const phi = (90 - lat) * (Math.PI / 180);
                      const theta = (lon + 180) * (Math.PI / 180);
                      const x = - (r * Math.sin(phi) * Math.cos(theta));
                      const z = (r * Math.sin(phi) * Math.sin(theta));
                      const y = (r * Math.cos(phi));
                      return new THREE.Vector3(x, y, z);
                    }

                    // Raycaster for clicks
                    const raycaster = new THREE.Raycaster();
                    const mouse = new THREE.Vector2();
                    function onClick(event) {
                      const rect = renderer.domElement.getBoundingClientRect();
                      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                      mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
                      raycaster.setFromCamera(mouse, camera);
                      const intersects = raycaster.intersectObjects(spriteGroup.children, true);
                      if (intersects.length > 0) {
                        const obj = intersects[0].object;
                        const payload = obj.userData || null;
                        if (payload) {
                          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'eventClick', payload }));
                        }
                      }
                    }
                    renderer.domElement.addEventListener('click', onClick);

                    // Load EONET events and create sprites
                    const rawEvents = await fetchEonetEvents(${JSON.stringify(categories)});
                    const points = [];

                    const loader = new THREE.TextureLoader();

                    // create sprite for each event
                    await Promise.all(rawEvents.map(async evt => {
                      if (!evt.geometry || evt.geometry.length === 0) return;
                      const geom = evt.geometry[evt.geometry.length - 1];
                      const coords = geom.coordinates;
                      const lat = coords[1];
                      const lng = coords[0];

                      const catSlug = evt.categories && evt.categories[0] && evt.categories[0].slug ? evt.categories[0].slug : 'unknown';
                      const iconData = ICON_MAP[catSlug] || null;

                      const payload = {
                        lat,
                        lng,
                        title: evt.title,
                        id: evt.id,
                        category: catSlug,
                        date: geom.date,
                        description: evt.description || '',
                        magnitude: 0.4
                      };

                      // push for globe.pointsData as fallback/legend
                      points.push(Object.assign({}, payload, { color: catSlug === 'wildfires' ? 'orange' : (catSlug === 'volcanoes' ? 'crimson' : 'cyan') }));

                      if (!iconData) return; // no icon available

                      return new Promise(resolve => {
                        // Load texture from data URL (works with TextureLoader)
                        loader.load(iconData, (texture) => {
                          // Create sprite material (transparent)
                          const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
                          const sprite = new THREE.Sprite(material);

                          // Size of the sprite (tweakable). Use smaller values if icons look too large.
                          const spriteSize = 8; // ← AGREGADO: tamaño base del sprite, ajustar si se necesita
                          sprite.scale.set(spriteSize, spriteSize, 1);

                          // Position the sprite slightly above the globe surface along surface normal
                          const pos = latLngToCartesian(lat, lng, GLOBE_RADIUS + 2); // +2 to float slightly above surface
                          sprite.position.copy(pos);

                          // attach payload so clicks can access full info
                          sprite.userData = payload;

                          spriteGroup.add(sprite);
                          resolve();
                        }, undefined, (err) => {
                          console.warn('Texture load error for icon', err);
                          resolve();
                        });
                      });
                    }));

                    // also set points on globe (fallback visual)
                    globe.pointsData(points);

                    function animate() {
                      requestAnimationFrame(animate);
                      globe.rotation.y += 0.0025;
                      // rotate the spriteGroup along with globe so sprites move with it
                      spriteGroup.rotation.copy(globe.rotation); // ← AGREGADO: hace que los sprites sigan la rotación del globo
                      renderer.render(scene, camera);
                    }
                    animate();

                    window.addEventListener('resize', () => {
                      camera.aspect = window.innerWidth / window.innerHeight;
                      camera.updateProjectionMatrix();
                      renderer.setSize(window.innerWidth, window.innerHeight);
                    });

                    // notify RN that initial load is done
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready', count: points.length }));

                  } catch (e) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.message }));
                  }
                })();
              </script>
            </body>
          </html>
        `;

        setHtmlContent(html);
        setLoading(false); // ← CAMBIADO

      } catch (e) {
        console.error("Failed to load assets for WebView", e);
        setLoading(false); // ← AGREGADO
      }
    };

    loadAssetsAndBuildHtml();
  }, []); 

  // Handler for messages from WebView (EONET events clicks, ready, errors)
  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        console.log('Globe ready, events shown:', data.count);
      } else if (data.type === 'error') {
        console.warn('WebView error:', data.message);
      } else if (data.type === 'eventClick' && data.payload) {
        const payload = data.payload;
        // Map category to our icon data url (we passed same map to webview)
        const iconDataUrl = iconMap[payload.category] || null; // ← AGREGADO
        payload._iconDataUrl = iconDataUrl; // attach for modal
        setSelectedEvent(payload); // ← AGREGADO
        setSelectedIconDataUrl(iconDataUrl); // ← AGREGADO
        setModalVisible(true); // ← AGREGADO
      } else {
        console.log('WebView message:', data);
      }
    } catch (err) {
      // sometimes messages are simple text (not JSON)
      console.log('WebView raw message:', event.nativeEvent.data);
    }
  };

  if (loading || !htmlContent) {
    return (
      <View style={[styles.container, styles.centerLoader]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }} 
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true} 
        onMessage={onMessage} // ← CAMBIADO: manejador de mensajes para clicks
      />

      {/* --- Modal que muestra info del desastre al oprimir un punto --- */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                {selectedIconDataUrl ? (
                  <Image source={{ uri: selectedIconDataUrl }} style={{ width: 64, height: 64, marginRight: 10, borderRadius: 6 }} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{selectedEvent?.title || 'Evento'}</Text>
                  <Text style={{ color: '#666', marginTop: 4 }}>{selectedEvent?.category || ''} • {selectedEvent?.date ? new Date(selectedEvent.date).toLocaleString() : ''}</Text>
                </View>
              </View>

              <Text style={{ marginBottom: 8 }}>{selectedEvent?.description || 'Sin descripción adicional.'}</Text>

              <View style={{ marginVertical: 8 }}>
                <Text style={{ fontWeight: '600' }}>Coordenadas</Text>
                <Text>{selectedEvent ? `${selectedEvent.lat.toFixed(4)}, ${selectedEvent.lng.toFixed(4)}` : ''}</Text>
              </View>

              {/* Botón con la imagen del desastre (según pediste) */}
              <TouchableOpacity
                style={modalStyles.iconButton}
                onPress={() => {
                  // Aquí puedes manejar acción adicional (abrir web, reportar, etc.)
                  // Por ahora solo cierra el modal
                  setModalVisible(false);
                }}
              >
                {selectedIconDataUrl ? (
                  <Image source={{ uri: selectedIconDataUrl }} style={{ width: 32, height: 32, marginRight: 8 }} />
                ) : null}
                <Text style={{ color: '#fff', fontWeight: '600' }}>Ver detalles del desastre</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[modalStyles.secondaryButton]} onPress={() => setModalVisible(false)}>
                <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Cerrar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  centerLoader: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

// Modal styles
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  iconButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  }
});

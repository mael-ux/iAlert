// mobile/app/components/globeMap.jsx - FIXED VERSION
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Modal, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import { WebView } from "react-native-webview";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy"; 
import { COLORS } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";

const threeJsAsset = require("../../assets/js/three.txt");
const threeGlobeAsset = require("../../assets/js/three-globe.txt");

// ============================================================================
// COMPLETE EONET CATEGORY MAPPING
// ============================================================================
const iconFiles = {
  // Existing icons
  wildfires: require("../../assets/images/Fuego.jpg"),
  floods: require("../../assets/images/Inundacion.png"),
  landslides: require("../../assets/images/Landslide.png"),
  severeStorms: require("../../assets/images/Tormenta E.png"),
  volcanoes: require("../../assets/images/Volcan.png"),
  
  // TODO: Add these icons to your assets/images folder
  // For now, using existing icons as placeholders
  drought: require("../../assets/images/Fuego.jpg"), // Use fire as placeholder
  earthquakes: require("../../assets/images/Volcan.png"), // Use volcano as placeholder
  dustHaze: require("../../assets/images/Tormenta E.png"), // Use storm as placeholder
  manmade: require("../../assets/images/Inundacion.png"), // Use flood as placeholder
  seaLakeIce: require("../../assets/images/Inundacion.png"), // Use flood as placeholder
  snow: require("../../assets/images/Tormenta E.png"), // Use storm as placeholder
  tempExtremes: require("../../assets/images/Fuego.jpg"), // Use fire as placeholder
  waterColor: require("../../assets/images/Inundacion.png"), // Use flood as placeholder
};

// ============================================================================
// DISASTER TYPE INFO (for better UX)
// ============================================================================
const DISASTER_INFO = {
  wildfires: { name: "Wildfire", color: "#ff4500", emoji: "🔥" },
  volcanoes: { name: "Volcano", color: "#dc143c", emoji: "🌋" },
  severeStorms: { name: "Severe Storm", color: "#4169e1", emoji: "⛈️" },
  floods: { name: "Flood", color: "#1e90ff", emoji: "🌊" },
  earthquakes: { name: "Earthquake", color: "#8b4513", emoji: "🏚️" },
  landslides: { name: "Landslide", color: "#a0522d", emoji: "⛰️" },
  drought: { name: "Drought", color: "#daa520", emoji: "🏜️" },
  dustHaze: { name: "Dust & Haze", color: "#d2691e", emoji: "🌫️" },
  tempExtremes: { name: "Temperature Extreme", color: "#ff6347", emoji: "🌡️" },
  seaLakeIce: { name: "Sea/Lake Ice", color: "#add8e6", emoji: "🧊" },
  snow: { name: "Snow", color: "#f0f8ff", emoji: "❄️" },
  waterColor: { name: "Water Color Change", color: "#20b2aa", emoji: "💧" },
  manmade: { name: "Man-made Event", color: "#696969", emoji: "⚠️" },
};

export default function GlobeMap({ points = null, style }) {
  const [htmlContent, setHtmlContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [iconMap, setIconMap] = useState({});

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const loadAssetsAndBuildHtml = async () => {
      try {
        // 1. Load three.js libraries
        const threeJsLocalUri = (await Asset.fromModule(threeJsAsset).downloadAsync()).localUri;
        const threeGlobeLocalUri = (await Asset.fromModule(threeGlobeAsset).downloadAsync()).localUri;

        const threeJsCode = await FileSystem.readAsStringAsync(threeJsLocalUri);
        const threeGlobeCode = await FileSystem.readAsStringAsync(threeGlobeLocalUri);

        // 2. Convert icons to base64
        const iconDataUrls = {};
        for (const [key, moduleRef] of Object.entries(iconFiles)) {
          try {
            const assetLocal = await Asset.fromModule(moduleRef).downloadAsync();
            const b64 = await FileSystem.readAsStringAsync(assetLocal.localUri, {
              encoding: FileSystem.EncodingType.Base64
            });
            const ext = assetLocal.localUri.split('.').pop().toLowerCase();
            const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
            iconDataUrls[key] = `data:${mime};base64,${b64}`;
          } catch (err) {
            console.warn("Failed to load icon for", key, err);
          }
        }

        setIconMap(iconDataUrls);

        // 3. ALL EONET Categories
        const categories = Object.keys(iconFiles);

        // 4. Build HTML
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
                    const ICON_MAP = ${JSON.stringify(iconDataUrls)};
                    const DISASTER_INFO = ${JSON.stringify(DISASTER_INFO)};

                    // Fetch EONET events
                    async function fetchEonetEvents(categories) {
                      const categoryParams = categories.map(c => 'category=' + encodeURIComponent(c)).join('&');
                      const url = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&' + categoryParams;
                      const resp = await fetch(url);
                      if (!resp.ok) throw new Error('EONET fetch failed: ' + resp.status);
                      const data = await resp.json();
                      return data.events || [];
                    }

                    // Setup scene
                    const scene = new THREE.Scene();

                    const globe = new ThreeGlobe()
                      .globeImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-blue-marble.jpg')
                      .nightImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg')
                      .bumpImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png')
                      .pointAltitude('magnitude')
                      .pointColor('color')
                      .pointLabel('title');

                    scene.add(globe);

                    // Lighting
                    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
                    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
                    dirLight.position.set(5, 3, 5);
                    scene.add(dirLight);

                    // Camera
                    const camera = new THREE.PerspectiveCamera();
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    camera.position.z = 300;

                    // Renderer
                    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                    renderer.setSize(window.innerWidth, window.innerHeight);
                    document.body.appendChild(renderer.domElement);

                    const GLOBE_RADIUS = 100;
                    const spriteGroup = new THREE.Group();
                    scene.add(spriteGroup);

                    // Convert lat/lng to 3D position
                    function latLngToCartesian(lat, lon, r) {
                      const phi = (90 - lat) * (Math.PI / 180);
                      const theta = (lon + 180) * (Math.PI / 180);
                      const x = - (r * Math.sin(phi) * Math.cos(theta));
                      const z = (r * Math.sin(phi) * Math.sin(theta));
                      const y = (r * Math.cos(phi));
                      return new THREE.Vector3(x, y, z);
                    }

                    // Click detection
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
                          window.ReactNativeWebView.postMessage(JSON.stringify({ 
                            type: 'eventClick', 
                            payload 
                          }));
                        }
                      }
                    }
                    renderer.domElement.addEventListener('click', onClick);

                    // Load events and create sprites
                    const rawEvents = await fetchEonetEvents(${JSON.stringify(categories)});
                    const points = [];
                    const loader = new THREE.TextureLoader();

                    await Promise.all(rawEvents.map(async evt => {
                      if (!evt.geometry || evt.geometry.length === 0) return;
                      const geom = evt.geometry[evt.geometry.length - 1];
                      const coords = geom.coordinates;
                      const lat = coords[1];
                      const lng = coords[0];

                      const catSlug = evt.categories && evt.categories[0] && evt.categories[0].id 
                        ? evt.categories[0].id 
                        : 'unknown';
                      
                      const iconData = ICON_MAP[catSlug] || null;
                      const disasterInfo = DISASTER_INFO[catSlug] || { 
                        name: catSlug, 
                        color: '#888888', 
                        emoji: '📍' 
                      };

                      const payload = {
                        lat,
                        lng,
                        title: evt.title,
                        id: evt.id,
                        category: catSlug,
                        categoryName: disasterInfo.name,
                        emoji: disasterInfo.emoji,
                        date: geom.date,
                        description: evt.description || '',
                        link: evt.sources && evt.sources[0] ? evt.sources[0].url : null,
                        magnitude: 0.4
                      };

                      points.push(Object.assign({}, payload, { color: disasterInfo.color }));

                      if (!iconData) return;

                      return new Promise(resolve => {
                        loader.load(iconData, (texture) => {
                          const material = new THREE.SpriteMaterial({ 
                            map: texture, 
                            depthTest: true,
                            sizeAttenuation: false // FIXED: Icons stay same size
                          });
                          const sprite = new THREE.Sprite(material);
                          
                          sprite.scale.set(0.05, 0.05, 1); // FIXED: Smaller, consistent size
                          
                          const pos = latLngToCartesian(lat, lng, GLOBE_RADIUS + 2);
                          sprite.position.copy(pos);
                          
                          // FIXED: Make sprite always face camera
                          sprite.userData = payload;
                          
                          spriteGroup.add(sprite);
                          resolve();
                        }, undefined, (err) => {
                          console.warn('Texture load error', err);
                          resolve();
                        });
                      });
                    }));

                    globe.pointsData(points);

                    // Animation loop
                    function animate() {
                      requestAnimationFrame(animate);
                      globe.rotation.y += 0.002; // Slow rotation
                      
                      // FIXED: Make sprites face camera (billboard effect)
                      spriteGroup.children.forEach(sprite => {
                        sprite.quaternion.copy(camera.quaternion);
                      });
                      
                      renderer.render(scene, camera);
                    }
                    animate();

                    // Handle resize
                    window.addEventListener('resize', () => {
                      camera.aspect = window.innerWidth / window.innerHeight;
                      camera.updateProjectionMatrix();
                      renderer.setSize(window.innerWidth, window.innerHeight);
                    });

                    window.ReactNativeWebView.postMessage(JSON.stringify({ 
                      type: 'ready', 
                      count: points.length 
                    }));

                  } catch (e) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ 
                      type: 'error', 
                      message: e.message 
                    }));
                  }
                })();
              </script>
            </body>
          </html>
        `;

        setHtmlContent(html);
        setLoading(false);

      } catch (e) {
        console.error("Failed to load assets for WebView", e);
        setLoading(false);
      }
    };

    loadAssetsAndBuildHtml();
  }, []); 

  // Handle messages from WebView
  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        console.log('✅ Globe ready. Showing', data.count, 'events');
      } else if (data.type === 'error') {
        console.warn('❌ Globe error:', data.message);
      } else if (data.type === 'eventClick' && data.payload) {
        setSelectedEvent(data.payload);
        setModalVisible(true);
      }
    } catch (err) {
      console.log('WebView message:', event.nativeEvent.data);
    }
  };

  if (loading || !htmlContent) {
    return (
      <View style={[styles.container, styles.centerLoader]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading disasters...</Text>
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
        onMessage={onMessage}
      />

      {/* Event Details Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Header with emoji */}
              <View style={modalStyles.header}>
                <Text style={modalStyles.emoji}>{selectedEvent?.emoji || '📍'}</Text>
                <TouchableOpacity 
                  style={modalStyles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={modalStyles.title}>{selectedEvent?.title || 'Event'}</Text>
              
              {/* Category & Date */}
              <View style={modalStyles.metaRow}>
                <View style={modalStyles.badge}>
                  <Text style={modalStyles.badgeText}>{selectedEvent?.categoryName || selectedEvent?.category}</Text>
                </View>
                <Text style={modalStyles.date}>
                  {selectedEvent?.date ? new Date(selectedEvent.date).toLocaleDateString() : ''}
                </Text>
              </View>

              {/* Description */}
              {selectedEvent?.description && (
                <Text style={modalStyles.description}>{selectedEvent.description}</Text>
              )}

              {/* Coordinates */}
              <View style={modalStyles.infoSection}>
                <Ionicons name="location" size={20} color={COLORS.primary} />
                <Text style={modalStyles.infoText}>
                  {selectedEvent?.lat?.toFixed(4)}, {selectedEvent?.lng?.toFixed(4)}
                </Text>
              </View>

              {/* More Info Link */}
              {selectedEvent?.link && (
                <TouchableOpacity 
                  style={modalStyles.linkButton}
                  onPress={() => {
                    // Open link in browser
                    const { Linking } = require('react-native');
                    Linking.openURL(selectedEvent.link);
                  }}
                >
                  <Ionicons name="open-outline" size={20} color={COLORS.white} />
                  <Text style={modalStyles.linkText}>View Source</Text>
                </TouchableOpacity>
              )}

              {/* Close Button */}
              <TouchableOpacity 
                style={modalStyles.closeButtonBottom} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={modalStyles.closeText}>Close</Text>
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
  loadingText: {
    marginTop: 12,
    color: COLORS.textLight,
    fontSize: 14,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 48,
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  badge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  description: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
  },
  linkButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  linkText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonBottom: {
    padding: 16,
    alignItems: 'center',
  },
  closeText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});
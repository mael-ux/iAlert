// mobile/app/components/globeMap.jsx - WORKING VERSION
// Fetches disasters from YOUR backend (which proxies EONET)
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Modal, Text, TouchableOpacity, ScrollView } from "react-native";
import { WebView } from "react-native-webview";
import { COLORS } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";

// Import AI_API_URL with fallback
let AI_API_URL;
try {
  const imported = require("../../constants/ai-api");
  AI_API_URL = imported.AI_API_URL;
} catch (e) {
  // Fallback if constants file doesn't exist
  AI_API_URL = "https://ialert-ai-service.onrender.com/api";
  console.warn("⚠️ Using fallback AI_API_URL");
}

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

export default function GlobeMap({ style }) {
  const [htmlContent, setHtmlContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [disastersData, setDisastersData] = useState([]);

  useEffect(() => {
    fetchDisasters();
  }, []);

  const fetchDisasters = async () => {
    try {
      console.log('🌍 Fetching disasters from backend...');
      
      // Fetch from YOUR backend (not EONET directly - that's blocked!)
      // NOTE: Using /api prefix to match backend route
      const response = await fetch(`${AI_API_URL}/disasters`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Loaded ${data.count} disasters from backend`);
      
      setDisastersData(data.events);
      buildGlobe(data.events);
      
    } catch (err) {
      console.error('❌ Failed to fetch disasters:', err);
      // Fallback: show globe without disasters
      buildGlobe([]);
    }
  };

  const buildGlobe = (events) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              margin: 0; 
              overflow: hidden; 
              background: linear-gradient(to bottom, #000428, #004e92);
            }
            canvas { display: block; }
            #info {
              position: absolute;
              top: 10px;
              left: 10px;
              color: white;
              font-family: Arial;
              background: rgba(0,0,0,0.7);
              padding: 10px;
              border-radius: 5px;
              font-size: 12px;
            }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        </head>
        <body>
          <div id="info">🌍 Loading disasters...</div>
          <script>
            const DISASTER_INFO = ${JSON.stringify(DISASTER_INFO)};
            const DISASTERS = ${JSON.stringify(events)};
            
            // Setup scene
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 250;

            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);

            // Create Earth
            const geometry = new THREE.SphereGeometry(100, 64, 64);
            const textureLoader = new THREE.TextureLoader();
            
            // Use a simpler, more reliable texture
            const earthTexture = textureLoader.load(
              'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
              () => {
                console.log('✅ Earth texture loaded');
                document.getElementById('info').textContent = '🌍 ' + DISASTERS.length + ' disasters';
              },
              undefined,
              (err) => {
                console.error('Texture failed, using color');
                material.color.set(0x2233ff);
                document.getElementById('info').textContent = '🌍 ' + DISASTERS.length + ' disasters';
              }
            );
            
            const material = new THREE.MeshPhongMaterial({
              map: earthTexture,
              color: 0x2233ff,
              shininess: 5
            });
            
            const earth = new THREE.Mesh(geometry, material);
            scene.add(earth);

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
            directionalLight.position.set(5, 3, 5);
            scene.add(directionalLight);

            // Stars
            const starsGeometry = new THREE.BufferGeometry();
            const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
            const starsVertices = [];
            for (let i = 0; i < 5000; i++) {
              starsVertices.push(
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000
              );
            }
            starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
            const stars = new THREE.Points(starsGeometry, starsMaterial);
            scene.add(stars);

            // Convert lat/lng to 3D
            function latLngToVector3(lat, lon, radius) {
              const phi = (90 - lat) * (Math.PI / 180);
              const theta = (lon + 180) * (Math.PI / 180);
              return new THREE.Vector3(
                -(radius * Math.sin(phi) * Math.cos(theta)),
                radius * Math.cos(phi),
                radius * Math.sin(phi) * Math.sin(theta)
              );
            }

            // Add disaster markers
            const markerGroup = new THREE.Group();
            scene.add(markerGroup);
            const markers = [];

            console.log('Adding', DISASTERS.length, 'disaster markers');

            DISASTERS.forEach((evt, idx) => {
              const info = DISASTER_INFO[evt.category] || { color: '#888888', emoji: '📍', name: evt.category };
              
              // Create marker - LARGER and BRIGHTER
              const markerGeometry = new THREE.SphereGeometry(3, 16, 16);
              const markerMaterial = new THREE.MeshBasicMaterial({ 
                color: info.color,
                transparent: false
              });
              const marker = new THREE.Mesh(markerGeometry, markerMaterial);
              
              const pos = latLngToVector3(evt.lat, evt.lng, 103);
              marker.position.copy(pos);
              
              marker.userData = {
                title: evt.title,
                category: evt.category,
                categoryName: info.name,
                emoji: info.emoji,
                lat: evt.lat,
                lng: evt.lng,
                date: evt.date,
                description: evt.description || '',
                link: evt.link
              };
              
              markerGroup.add(marker);
              markers.push(marker);
              
              if (idx < 5) {
                console.log('Marker', idx, ':', evt.title, 'at', evt.lat, evt.lng, 'color:', info.color);
              }
            });

            console.log('✅ Added', markers.length, 'markers to scene');

            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'ready', 
              count: markers.length 
            }));

            // Click handling
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            renderer.domElement.addEventListener('click', (event) => {
              const rect = renderer.domElement.getBoundingClientRect();
              mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
              mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

              raycaster.setFromCamera(mouse, camera);
              const intersects = raycaster.intersectObjects(markers);

              if (intersects.length > 0) {
                console.log('Clicked marker:', intersects[0].object.userData.title);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'eventClick',
                  payload: intersects[0].object.userData
                }));
              }
            });

            // Animation
            let autoRotate = true;
            let lastTouchX = 0;

            renderer.domElement.addEventListener('touchstart', (e) => {
              autoRotate = false;
              lastTouchX = e.touches[0].clientX;
            });

            renderer.domElement.addEventListener('touchmove', (e) => {
              const touchX = e.touches[0].clientX;
              const delta = touchX - lastTouchX;
              earth.rotation.y += delta * 0.005;
              markerGroup.rotation.y += delta * 0.005;
              lastTouchX = touchX;
            });

            renderer.domElement.addEventListener('touchend', () => {
              setTimeout(() => { autoRotate = true; }, 2000);
            });

            function animate() {
              requestAnimationFrame(animate);
              
              if (autoRotate) {
                earth.rotation.y += 0.001;
                markerGroup.rotation.y += 0.001;
              }
              
              renderer.render(scene, camera);
            }
            animate();

            window.addEventListener('resize', () => {
              camera.aspect = window.innerWidth / window.innerHeight;
              camera.updateProjectionMatrix();
              renderer.setSize(window.innerWidth, window.innerHeight);
            });
          </script>
        </body>
      </html>
    `;

    setHtmlContent(html);
    setLoading(false);
  };

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        console.log(`✅ Globe ready. Showing ${data.count} disasters`);
      } else if (data.type === 'eventClick') {
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
        <Text style={styles.loadingText}>Loading globe...</Text>
        <Text style={styles.loadingSubtext}>Fetching disaster data...</Text>
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
        onMessage={onMessage}
      />

      {/* Event Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.emoji}>{selectedEvent?.emoji || '📍'}</Text>
                <TouchableOpacity 
                  style={modalStyles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={modalStyles.title}>{selectedEvent?.title || 'Event'}</Text>
              
              <View style={modalStyles.metaRow}>
                <View style={modalStyles.badge}>
                  <Text style={modalStyles.badgeText}>{selectedEvent?.categoryName}</Text>
                </View>
                <Text style={modalStyles.date}>
                  {selectedEvent?.date ? new Date(selectedEvent.date).toLocaleDateString() : ''}
                </Text>
              </View>

              {selectedEvent?.description && (
                <Text style={modalStyles.description}>{selectedEvent.description}</Text>
              )}

              <View style={modalStyles.infoSection}>
                <Ionicons name="location" size={20} color={COLORS.primary} />
                <Text style={modalStyles.infoText}>
                  {selectedEvent?.lat?.toFixed(4)}°, {selectedEvent?.lng?.toFixed(4)}°
                </Text>
              </View>

              {selectedEvent?.link && (
                <TouchableOpacity 
                  style={modalStyles.linkButton}
                  onPress={() => {
                    const { Linking } = require('react-native');
                    Linking.openURL(selectedEvent.link);
                  }}
                >
                  <Ionicons name="open-outline" size={20} color={COLORS.white} />
                  <Text style={modalStyles.linkText}>View NASA Source</Text>
                </TouchableOpacity>
              )}

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
    backgroundColor: '#000',
  },
  centerLoader: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    color: COLORS.white,
    opacity: 0.7,
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
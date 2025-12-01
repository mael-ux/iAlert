import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Modal, Text, TouchableOpacity, ScrollView } from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation } from '@react-navigation/native';
import { COLORS } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";

// Import AI_API_URL with fallback
let AI_API_URL;
try {
  const imported = require("../../constants/ai-api");
  AI_API_URL = imported.AI_API_URL;
} catch (e) {
  AI_API_URL = "https://ialert-ai-service.onrender.com/api";
}

const DISASTER_INFO = {
  wildfires: { name: "Wildfire", color: "#ff4500", emoji: "🔥", icon: "flame" },
  volcanoes: { name: "Volcano", color: "#dc143c", emoji: "🌋", icon: "triangle" },
  severeStorms: { name: "Severe Storm", color: "#4169e1", emoji: "⛈️", icon: "flash" },
  floods: { name: "Flood", color: "#1e90ff", emoji: "🌊", icon: "water" },
  earthquakes: { name: "Earthquake", color: "#8b4513", emoji: "🏚️", icon: "pulse" },
  landslides: { name: "Landslide", color: "#a0522d", emoji: "⛰️", icon: "trending-down" },
  drought: { name: "Drought", color: "#daa520", emoji: "🏜️", icon: "sunny" },
  dustHaze: { name: "Dust & Haze", color: "#d2691e", emoji: "🌫️", icon: "cloud" },
  tempExtremes: { name: "Temperature Extreme", color: "#ff6347", emoji: "🌡️", icon: "thermometer" },
  seaLakeIce: { name: "Sea/Lake Ice", color: "#add8e6", emoji: "🧊", icon: "snow" },
  snow: { name: "Snow", color: "#f0f8ff", emoji: "❄️", icon: "snow" },
  waterColor: { name: "Water Color Change", color: "#20b2aa", emoji: "💧", icon: "water" },
  manmade: { name: "Man-made Event", color: "#696969", emoji: "⚠️", icon: "warning" },
};

export default function GlobeMap({ style }) {
  const navigation = useNavigation();
  const [htmlContent, setHtmlContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [disastersData, setDisastersData] = useState([]);
  const [legendVisible, setLegendVisible] = useState(true);
  const [disasterCounts, setDisasterCounts] = useState({});

  // Hide tab bar on this screen
  useEffect(() => {
    const parent = navigation?.getParent();
    if (parent) {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        parent.setOptions({ tabBarStyle: undefined });
      };
    }
  }, []);

  useEffect(() => {
    fetchDisasters();
  }, []);

  const fetchDisasters = async () => {
    try {
      console.log('🌍 Fetching disasters from backend...');
      const response = await fetch(`${AI_API_URL}/disasters`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Loaded ${data.count} disasters`);
      
      const counts = {};
      data.events.forEach(evt => {
        counts[evt.category] = (counts[evt.category] || 0) + 1;
      });
      
      setDisastersData(data.events);
      setDisasterCounts(counts);
      buildGlobe(data.events);
      
    } catch (err) {
      console.error('❌ Failed to fetch disasters:', err);
      buildGlobe([]);
    }
  };

  const buildGlobe = (events) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              margin: 0; 
              overflow: hidden; 
              /* Darker Background */
              background: radial-gradient(circle at center, #0a0a1a 0%, #000000 100%);
              touch-action: none;
            }
            canvas { display: block; }
            #info {
              position: absolute;
              top: 50px;
              right: 20px;
              color: rgba(255,255,255,0.8);
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              font-size: 12px;
              pointer-events: none;
            }
          </style>
          <!-- Load Three.js and OrbitControls -->
          <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
        </head>
        <body>
          <div id="info">${events.length} active events loaded</div>
          <script>
            const DISASTER_INFO = ${JSON.stringify(DISASTER_INFO)};
            const DISASTERS = ${JSON.stringify(events)};
            
            // Setup scene
            const scene = new THREE.Scene();
            // Add some fog for depth
            scene.fog = new THREE.FogExp2(0x000000, 0.0008);

            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 250;

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            document.body.appendChild(renderer.domElement);

            // --- CONTROLS (Pinch zoom & Rotate) ---
            const controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.enableZoom = true;
            controls.minDistance = 150;
            controls.maxDistance = 450;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.8;

            // Earth
            const geometry = new THREE.SphereGeometry(100, 64, 64);
            const textureLoader = new THREE.TextureLoader();
            
            const earthTexture = textureLoader.load(
              'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
              undefined, undefined,
              () => material.color.set(0x1122aa) // Fallback color
            );
            
            const material = new THREE.MeshPhongMaterial({
              map: earthTexture,
              bumpScale: 0.05,
              shininess: 5,
              specular: 0x111111
            });
            
            const earth = new THREE.Mesh(geometry, material);
            scene.add(earth);

            // Atmosphere Glow
            const atmosphereGeo = new THREE.SphereGeometry(102, 64, 64);
            const atmosphereMat = new THREE.MeshPhongMaterial({
              color: 0x2244cc,
              transparent: true,
              opacity: 0.1,
              side: THREE.BackSide
            });
            const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
            scene.add(atmosphere);

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
            directionalLight.position.set(50, 30, 50);
            scene.add(directionalLight);

            // Stars
            const starsGeometry = new THREE.BufferGeometry();
            const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.7 });
            const starsVertices = [];
            for (let i = 0; i < 5000; i++) {
              starsVertices.push(
                (Math.random() - 0.5) * 1500,
                (Math.random() - 0.5) * 1500,
                (Math.random() - 0.5) * 1500
              );
            }
            starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
            const stars = new THREE.Points(starsGeometry, starsMaterial);
            scene.add(stars);

            // Utility: Lat/Lng to Vector3
            function latLngToVector3(lat, lon, radius) {
              const phi = (90 - lat) * (Math.PI / 180);
              const theta = (lon + 180) * (Math.PI / 180);
              return new THREE.Vector3(
                -(radius * Math.sin(phi) * Math.cos(theta)),
                radius * Math.cos(phi),
                radius * Math.sin(phi) * Math.sin(theta)
              );
            }

            // Markers
            const markers = [];
            
            DISASTERS.forEach((evt) => {
              const info = DISASTER_INFO[evt.category] || { color: '#ff0000', emoji: '📍', name: evt.category };
              
              const canvas = document.createElement('canvas');
              canvas.width = 64;
              canvas.height = 64;
              const ctx = canvas.getContext('2d');
              
              // Glow
              const gradient = ctx.createRadialGradient(32, 32, 10, 32, 32, 30);
              gradient.addColorStop(0, info.color);
              gradient.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = gradient;
              ctx.fillRect(0,0,64,64);
              
              // Core
              ctx.fillStyle = info.color;
              ctx.beginPath();
              ctx.arc(32, 32, 12, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 2;
              ctx.stroke();

              const texture = new THREE.CanvasTexture(canvas);
              const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
              const sprite = new THREE.Sprite(spriteMaterial);
              
              const pos = latLngToVector3(evt.lat, evt.lng, 105);
              sprite.position.copy(pos);
              sprite.scale.set(8, 8, 1); // Size relative to world
              
              sprite.userData = { ...evt, ...info };
              scene.add(sprite);
              markers.push(sprite);
            });

            // Raycaster for clicks
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            // Detect clicks vs drags
            let isDragging = false;
            renderer.domElement.addEventListener('mousedown', () => isDragging = false);
            renderer.domElement.addEventListener('mousemove', () => isDragging = true);
            renderer.domElement.addEventListener('touchstart', () => isDragging = false);
            renderer.domElement.addEventListener('touchmove', () => isDragging = true);

            const handleInteraction = (event) => {
              if (isDragging) return; // Don't trigger click if dragging/rotating

              const rect = renderer.domElement.getBoundingClientRect();
              let clientX, clientY;
              
              if (event.changedTouches && event.changedTouches.length > 0) {
                clientX = event.changedTouches[0].clientX;
                clientY = event.changedTouches[0].clientY;
              } else {
                clientX = event.clientX;
                clientY = event.clientY;
              }

              mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
              mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

              raycaster.setFromCamera(mouse, camera);
              const intersects = raycaster.intersectObjects(markers);

              if (intersects.length > 0) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'eventClick',
                  payload: intersects[0].object.userData
                }));
              }
            };

            renderer.domElement.addEventListener('click', handleInteraction);
            // Also handle touchend for better mobile response if click is flaky
            renderer.domElement.addEventListener('touchend', handleInteraction);

            window.addEventListener('resize', () => {
              camera.aspect = window.innerWidth / window.innerHeight;
              camera.updateProjectionMatrix();
              renderer.setSize(window.innerWidth, window.innerHeight);
            });

            function animate() {
              requestAnimationFrame(animate);
              controls.update(); // Update OrbitControls
              renderer.render(scene, camera);
            }
            animate();
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
      if (data.type === 'eventClick') {
        setSelectedEvent(data.payload);
        setModalVisible(true);
      }
    } catch (err) {
      // ignore
    }
  };

  if (loading || !htmlContent) {
    return (
      <View style={[styles.container, styles.centerLoader]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading satellite data...</Text>
      </View>
    );
  }

  // Get top disaster types for legend
  const topDisasters = Object.entries(disasterCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, count]) => ({
      ...DISASTER_INFO[category],
      category,
      count
    }));

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={onMessage}
        scrollEnabled={false}
      />

      {/* Legend Overlay - Moved to BOTTOM */}
      {legendVisible && (
        <View style={styles.legendContainer}>
          <View style={styles.legendHeader}>
            <Text style={styles.legendTitle}>Active Disasters</Text>
            <TouchableOpacity onPress={() => setLegendVisible(false)}>
              <Ionicons name="close-circle" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.legendScroll}
          >
            {topDisasters.map((disaster) => (
              <View key={disaster.category} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: disaster.color }]} />
                <Text style={styles.legendEmoji}>{disaster.emoji}</Text>
                <View>
                  <Text style={styles.legendName}>{disaster.name}</Text>
                  <Text style={styles.legendCount}>{disaster.count} active</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <Text style={styles.legendTip}>💡 Pinch to zoom • Drag to rotate</Text>
        </View>
      )}

      {/* Toggle Legend Button - Moved DOWN */}
      {!legendVisible && (
        <TouchableOpacity 
          style={styles.legendToggle}
          onPress={() => setLegendVisible(true)}
        >
          <Ionicons name="information-circle" size={24} color={COLORS.white} />
          <Text style={styles.legendToggleText}>Show Legend</Text>
        </TouchableOpacity>
      )}

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
                  <Text style={modalStyles.linkText}>View Source</Text>
                </TouchableOpacity>
              )}
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
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  legendContainer: {
    position: 'absolute',
    bottom: 0, // MOVED TO BOTTOM
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 10, 20, 0.95)', // Darker background
    backdropFilter: 'blur(10px)',
    paddingTop: 16,
    paddingBottom: 40, // Extra padding for safe area
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  legendScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
    borderRadius: 12,
    gap: 8,
    minWidth: 160,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  legendEmoji: {
    fontSize: 20,
  },
  legendName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  legendCount: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  legendTip: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 12,
  },
  legendToggle: {
    position: 'absolute',
    bottom: 40, // MOVED DOWN
    left: '50%',
    transform: [{ translateX: -75 }],
    backgroundColor: 'rgba(20, 20, 40, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  legendToggleText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
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
    backgroundColor: COLORS.primary + '15',
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
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
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
});
// mobile/app/components/globeMap.jsx - PREMIUM VERSION
// High-res textures, disaster icons, free 360° rotation, zoom controls
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
  console.warn("⚠️ Using fallback AI_API_URL");
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
      console.log(`✅ Loaded ${data.count} disasters from backend`);
      
      setDisastersData(data.events);
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
              background: linear-gradient(to bottom, #000428, #004e92);
              touch-action: none;
            }
            canvas { display: block; }
            #info {
              position: absolute;
              top: 10px;
              left: 10px;
              color: white;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: rgba(0,0,0,0.7);
              padding: 12px 16px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              backdrop-filter: blur(10px);
            }
            #controls {
              position: absolute;
              bottom: 20px;
              right: 20px;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .control-btn {
              width: 50px;
              height: 50px;
              background: rgba(255,255,255,0.9);
              border: none;
              border-radius: 50%;
              font-size: 24px;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              transition: transform 0.2s;
            }
            .control-btn:active {
              transform: scale(0.95);
            }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        </head>
        <body>
          <div id="info">🌍 Loading...</div>
          <div id="controls">
            <button class="control-btn" onclick="zoomIn()">+</button>
            <button class="control-btn" onclick="zoomOut()">−</button>
            <button class="control-btn" onclick="resetView()">⟲</button>
          </div>
          <script>
            const DISASTER_INFO = ${JSON.stringify(DISASTER_INFO)};
            const DISASTERS = ${JSON.stringify(events)};
            
            // Setup scene
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 250;

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            document.body.appendChild(renderer.domElement);

            // Create Earth with HIGH-RES daytime texture
            const geometry = new THREE.SphereGeometry(100, 128, 128);
            const textureLoader = new THREE.TextureLoader();
            
            // High-resolution Earth texture
            const earthTexture = textureLoader.load(
              'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
              () => {
                console.log('✅ Earth texture loaded');
                document.getElementById('info').textContent = '🌍 ' + DISASTERS.length + ' active disasters';
              },
              undefined,
              (err) => {
                console.error('Texture failed');
                material.color.set(0x2233ff);
              }
            );
            
            // Better material with higher quality
            const material = new THREE.MeshPhongMaterial({
              map: earthTexture,
              bumpScale: 0.05,
              shininess: 15,
              specular: 0x333333
            });
            
            const earth = new THREE.Mesh(geometry, material);
            scene.add(earth);

            // Enhanced lighting for daytime look
            const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 3, 5);
            scene.add(directionalLight);

            // Add rim light for better visibility
            const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
            rimLight.position.set(-5, 0, -5);
            scene.add(rimLight);

            // Stars
            const starsGeometry = new THREE.BufferGeometry();
            const starsMaterial = new THREE.PointsMaterial({ 
              color: 0xffffff, 
              size: 2,
              transparent: true,
              opacity: 0.8
            });
            const starsVertices = [];
            for (let i = 0; i < 10000; i++) {
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

            // Add disaster markers with ICONS as sprites
            const markerGroup = new THREE.Group();
            scene.add(markerGroup);
            const markers = [];

            DISASTERS.forEach((evt) => {
              const info = DISASTER_INFO[evt.category] || { color: '#ff0000', emoji: '📍', name: evt.category };
              
              // Create sprite with icon texture
              const canvas = document.createElement('canvas');
              canvas.width = 64;
              canvas.height = 64;
              const ctx = canvas.getContext('2d');
              
              // Draw circle background
              ctx.fillStyle = info.color;
              ctx.beginPath();
              ctx.arc(32, 32, 28, 0, Math.PI * 2);
              ctx.fill();
              
              // Add white border
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 4;
              ctx.stroke();
              
              // Add small white dot in center instead of emoji
              ctx.fillStyle = 'white';
              ctx.beginPath();
              ctx.arc(32, 32, 8, 0, Math.PI * 2);
              ctx.fill();
              
              const texture = new THREE.CanvasTexture(canvas);
              const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                transparent: true,
                sizeAttenuation: false
              });
              const sprite = new THREE.Sprite(spriteMaterial);
              
              const pos = latLngToVector3(evt.lat, evt.lng, 104);
              sprite.position.copy(pos);
              sprite.scale.set(0.05, 0.05, 1);
              
              sprite.userData = {
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
              
              markerGroup.add(sprite);
              markers.push(sprite);
            });

            console.log('✅ Added', markers.length, 'disaster markers');

            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'ready', 
              count: markers.length 
            }));

            // Click/Tap handling
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            renderer.domElement.addEventListener('click', (event) => {
              const rect = renderer.domElement.getBoundingClientRect();
              mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
              mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

              raycaster.setFromCamera(mouse, camera);
              const intersects = raycaster.intersectObjects(markers);

              if (intersects.length > 0) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'eventClick',
                  payload: intersects[0].object.userData
                }));
              }
            });

            // FREE 360° ROTATION + ZOOM
            let isDragging = false;
            let previousTouch = { x: 0, y: 0 };
            let rotationX = 0;
            let rotationY = 0;
            let autoRotate = true;
            let targetZoom = 250;
            let currentZoom = 250;

            // Touch controls for rotation
            renderer.domElement.addEventListener('touchstart', (e) => {
              if (e.touches.length === 1) {
                isDragging = true;
                autoRotate = false;
                previousTouch = {
                  x: e.touches[0].clientX,
                  y: e.touches[0].clientY
                };
              }
            });

            renderer.domElement.addEventListener('touchmove', (e) => {
              if (isDragging && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - previousTouch.x;
                const deltaY = e.touches[0].clientY - previousTouch.y;
                
                // Rotate both Earth and markers
                rotationY += deltaX * 0.005;
                rotationX += deltaY * 0.005;
                
                // Clamp vertical rotation
                rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));
                
                previousTouch = {
                  x: e.touches[0].clientX,
                  y: e.touches[0].clientY
                };
              }
            });

            renderer.domElement.addEventListener('touchend', () => {
              isDragging = false;
              setTimeout(() => { autoRotate = true; }, 3000);
            });

            // Zoom controls
            window.zoomIn = () => {
              targetZoom = Math.max(150, targetZoom - 30);
            };

            window.zoomOut = () => {
              targetZoom = Math.min(400, targetZoom + 30);
            };

            window.resetView = () => {
              targetZoom = 250;
              rotationX = 0;
              rotationY = 0;
              autoRotate = true;
            };

            // Animation loop
            function animate() {
              requestAnimationFrame(animate);
              
              // Smooth zoom
              currentZoom += (targetZoom - currentZoom) * 0.1;
              camera.position.z = currentZoom;
              
              // Apply rotations
              earth.rotation.y = rotationY;
              earth.rotation.x = rotationX;
              markerGroup.rotation.y = rotationY;
              markerGroup.rotation.x = rotationX;
              
              // Auto-rotate if not dragging
              if (autoRotate) {
                rotationY += 0.001;
              }
              
              // Rotate stars slowly
              stars.rotation.y += 0.0002;
              
              renderer.render(scene, camera);
            }
            animate();

            // Handle resize
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
        scrollEnabled={false}
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
                  <Text style={modalStyles.linkText}>View Source</Text>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
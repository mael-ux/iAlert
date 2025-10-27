import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy"; // Using legacy as we discussed
import { COLORS } from "../../constants/colors";

// These paths are correct
const threeJsAsset = require("../../assets/js/three.txt");
const threeGlobeAsset = require("../../assets/js/three-globe.txt");

export default function GlobeMap({ points = null, style }) {
  const [htmlContent, setHtmlContent] = useState(null);

  const defaultPoints = [
    { lat: 19.4326, lng: -99.1332, size: 0.02, color: 'red', city: 'CDMX' },
    { lat: 20.9674, lng: -89.5926, size: 0.02, color: 'yellow', city: 'Mérida' },
    { lat: 21.1619, lng: -86.8515, size: 0.02, color: 'orange', city: 'Cancún' }
  ];

  useEffect(() => {
    const loadAssetsAndBuildHtml = async () => {
      try {
        const threeJsLocalUri = (await Asset.fromModule(threeJsAsset).downloadAsync()).localUri;
        const threeGlobeLocalUri = (await Asset.fromModule(threeGlobeAsset).downloadAsync()).localUri;

        const threeJsCode = await FileSystem.readAsStringAsync(threeJsLocalUri);
        const threeGlobeCode = await FileSystem.readAsStringAsync(threeGlobeLocalUri);

        // --- THIS IS THE NEW, CORRECT HTML ---
        // It builds a full Three.js scene to host the globe object
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
                window.addEventListener('load', () => {
                  try {
                    window.ReactNativeWebView.postMessage('Script: initGlobe() called');

                    if (!window.THREE) {
                      window.ReactNativeWebView.postMessage('Error: window.THREE is not defined');
                      return;
                    }
                    window.ReactNativeWebView.postMessage('Script: window.THREE is OK');

                    const Globe = window.ThreeGlobe; 
                    if (!Globe) {
                      window.ReactNativeWebView.postMessage('Error: window.ThreeGlobe is not defined');
                      return;
                    }
                    window.ReactNativeWebView.postMessage('Script: window.ThreeGlobe is OK');
                    
                    // --- THREE.JS SCENE SETUP ---

                    // 1. Scene
                    const scene = new THREE.Scene();

                    // 2. Globe Instance
                    const globe = new Globe()
                      .globeImageUrl('https://vasturiano.github.io/three-globe/example/img/earth-dark.jpg')
                      .bumpImageUrl('https://vasturiano.github.io/three-globe/example/img/earth-topology.png')
                      .pointAltitude('size')
                      .pointColor('color');
                    
                    globe.pointsData(${JSON.stringify(points ?? defaultPoints)});
                    scene.add(globe); // Add globe to the scene

                    // Add some light
                    scene.add(new THREE.AmbientLight(0xbbbbbb));
                    scene.add(new THREE.DirectionalLight(0xffffff, 0.6));

                    // 3. Camera
                    const camera = new THREE.PerspectiveCamera();
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    camera.position.z = 300; // Zoom out

                    // 4. Renderer
                    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                    renderer.setSize(window.innerWidth, window.innerHeight);
                    document.body.appendChild(renderer.domElement); // Add canvas to body

                    // 5. Animate loop
                    function animate() {
                      requestAnimationFrame(animate);
                      globe.rotation.y += 0.005; // Make it spin
                      renderer.render(scene, camera);
                    }
                    animate();

                    // 6. Handle window resizing
                    window.addEventListener('resize', () => {
                      camera.aspect = window.innerWidth / window.innerHeight;
                      camera.updateProjectionMatrix();
                      renderer.setSize(window.innerWidth, window.innerHeight);
                    });
                    
                    // --- END OF SETUP ---

                    window.ReactNativeWebView.postMessage('Script: Globe initialized');

                  } catch (e) {
                    window.ReactNativeWebView.postMessage('Error: ' + e.message);
                  }
                });
              </script>
            </body>
          </html>
        `;
        
        setHtmlContent(html);

      } catch (e) {
        console.error("Failed to load assets for WebView", e);
      }
    };

    loadAssetsAndBuildHtml();
  }, []); 

  if (!htmlContent) {
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
        onMessage={(event) => {
          console.log('[WebView Message]:', event.nativeEvent.data);
        }}
      />
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
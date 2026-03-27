/**
 * index.web.tsx — versão WEB do "Onde Estou?"
 * Usado automaticamente pelo Expo quando roda no browser.
 * Usa Leaflet (via CDN) injetado em um <div> para evitar
 * a dependência de react-native-maps que é nativo apenas.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface MarkerItem {
  id: string;
  coordinate: Coordinate;
  title: string;
  emoji: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const { height: SH } = Dimensions.get('window');
const PANEL_HEIGHT = SH * 0.42;

const COLORS = {
  bg:      '#080C18',
  surface: '#0F1629',
  card:    '#141C30',
  border:  '#1E2D4A',
  cyan:    '#00E5C0',
  cyanDim: '#00E5C018',
  red:     '#FF4D6D',
  redDim:  '#FF4D6D18',
  text:    '#E2E8F0',
  muted:   '#4A6080',
};

const EMOJIS = ['📌','🏠','🌳','☕','🍕','🏥','⭐','🏖','🏢','🎯'];

// ─── Leaflet Map Web Component ─────────────────────────────────────────────────

interface LeafletMapProps {
  onMapReady: (mapInstance: any) => void;
  onMapClick: (coord: Coordinate) => void;
  markers: MarkerItem[];
  onMarkerClick: (id: string) => void;
  flyToCoord: Coordinate | null;
  userLocation: Coordinate | null;
}

function LeafletMap({
  onMapReady,
  onMapClick,
  markers,
  onMarkerClick,
  flyToCoord,
  userLocation,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const leafletMarkersRef = useRef<Record<string, any>>({});

  // Inject Leaflet CSS + JS once
  useEffect(() => {
    const existingCSS = document.getElementById('leaflet-css');
    if (!existingCSS) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);
    }

    const existingJS = document.getElementById('leaflet-js');
    if (existingJS) {
      initMap();
      return;
    }

    const script   = document.createElement('script');
    script.id      = 'leaflet-js';
    script.src     = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload  = initMap;
    document.head.appendChild(script);
  }, []);

  function initMap() {
    if (!containerRef.current || mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(containerRef.current, { zoomControl: false }).setView([-14.235, -51.925], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('click', (e: any) => {
      onMapClick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    });

    mapRef.current = map;
    onMapReady(map);
  }

  // Sync markers
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map) return;

    const existingIds = new Set(markers.map(m => m.id));

    // Remove deleted markers
    Object.keys(leafletMarkersRef.current).forEach(id => {
      if (!existingIds.has(id)) {
        map.removeLayer(leafletMarkersRef.current[id]);
        delete leafletMarkersRef.current[id];
      }
    });

    // Add new markers
    markers.forEach(m => {
      if (leafletMarkersRef.current[m.id]) return;

      const icon = L.divIcon({
        html: `<div style="
          width:42px;height:42px;
          background:#0F1629;
          border:2px solid #1E2D4A;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;
          box-shadow:0 3px 10px #0008;
          cursor:pointer;
        ">${m.emoji}</div>`,
        className: '',
        iconSize:   [42, 42],
        iconAnchor: [21, 21],
      });

      const leafletMarker = L.marker(
        [m.coordinate.latitude, m.coordinate.longitude],
        { icon }
      ).addTo(map);

      leafletMarker.on('click', () => onMarkerClick(m.id));

      leafletMarkersRef.current[m.id] = leafletMarker;
    });
  }, [markers]);

  // Fly to coord when requested
  useEffect(() => {
    if (!flyToCoord || !mapRef.current) return;
    mapRef.current.flyTo(
      [flyToCoord.latitude, flyToCoord.longitude], 16,
      { duration: 1 }
    );
  }, [flyToCoord]);

  // User location dot
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map || !userLocation) return;

    const userIcon = L.divIcon({
      html: `<div style="
        width:18px;height:18px;
        background:#00E5C0;
        border:3px solid #fff;
        border-radius:50%;
        box-shadow:0 0 0 6px #00E5C033, 0 0 16px #00E5C0;
      "></div>`,
      className: '',
      iconSize:   [18, 18],
      iconAnchor: [9, 9],
    });

    L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon, zIndexOffset: 999 })
      .addTo(map)
      .bindTooltip('Você está aqui', { permanent: false, direction: 'top' });

    map.flyTo([userLocation.latitude, userLocation.longitude], 15, { duration: 1.4 });
  }, [userLocation]);

  return (
    <div
      ref={containerRef as any}
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        cursor: 'crosshair',
      }}
    />
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OndeEstouWeb() {
  const mapInstanceRef = useRef<any>(null);

  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [markers, setMarkers]           = useState<MarkerItem[]>([]);
  const [gpsStatus, setGpsStatus]       = useState<'searching' | 'active' | 'denied'>('searching');
  const [pendingCoord, setPendingCoord] = useState<Coordinate | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [markerName, setMarkerName]     = useState('');
  const [panelOpen, setPanelOpen]       = useState(false);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [flyTo, setFlyTo]               = useState<Coordinate | null>(null);

  const panelAnim    = useRef(new Animated.Value(0)).current;
  const hintAnim     = useRef(new Animated.Value(1)).current;
  const markerCount  = useRef(0);

  // Panel animation
  useEffect(() => {
    Animated.spring(panelAnim, {
      toValue: panelOpen ? 1 : 0,
      tension: 80, friction: 12, useNativeDriver: true,
    }).start();
  }, [panelOpen]);

  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_HEIGHT, 0],
  });

  // Hint fade
  useEffect(() => {
    const t = setTimeout(() =>
      Animated.timing(hintAnim, { toValue: 0, duration: 600, useNativeDriver: true }).start()
    , 4000);
    return () => clearTimeout(t);
  }, []);

  // Geolocation (browser API)
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(coord);
        setGpsStatus('active');
      },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleMapClick = useCallback((coord: Coordinate) => {
    setPendingCoord(coord);
    setMarkerName('');
    setModalVisible(true);
  }, []);

  const confirmMarker = useCallback(() => {
    if (!pendingCoord) return;
    markerCount.current += 1;
    const title = markerName.trim() || `Ponto ${markerCount.current}`;
    const emoji = EMOJIS[(markerCount.current - 1) % EMOJIS.length];
    setMarkers(prev => [...prev, {
      id: `m_${Date.now()}`,
      coordinate: pendingCoord,
      title,
      emoji,
    }]);
    setModalVisible(false);
    setPendingCoord(null);
    setMarkerName('');
  }, [pendingCoord, markerName]);

  const removeMarker = useCallback((id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const flyToMarker = useCallback((item: MarkerItem) => {
    setSelectedId(item.id);
    setFlyTo({ ...item.coordinate, ...{} });
    setPanelOpen(false);
    // re-trigger even if same coord
    setTimeout(() => setFlyTo(item.coordinate), 0);
  }, []);

  const centerOnUser = useCallback(() => {
    if (userLocation) setFlyTo({ ...userLocation });
  }, [userLocation]);

  const dotColor   = gpsStatus === 'active' ? COLORS.cyan : gpsStatus === 'denied' ? '#FF4D6D' : '#FFB800';
  const statusText = gpsStatus === 'active' ? 'GPS ativo' : gpsStatus === 'denied' ? 'Sem permissão' : 'Localizando…';

  return (
    <View style={styles.root}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={{ fontSize: 18 }}>📍</Text>
          </View>
          <Text style={styles.logoTitle}>
            Onde<Text style={{ color: COLORS.cyan }}>Estou</Text>?
          </Text>
        </View>
        <View style={styles.statusPill}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </View>

      {/* Map area */}
      <View style={{ flex: 1 }}>
        <LeafletMap
          onMapReady={m => (mapInstanceRef.current = m)}
          onMapClick={handleMapClick}
          markers={markers}
          onMarkerClick={id => setSelectedId(id)}
          flyToCoord={flyTo}
          userLocation={userLocation}
        />

        {/* Hint */}
        <Animated.View style={[styles.hint, { opacity: hintAnim }]} pointerEvents="none">
          <Text style={styles.hintText}>🖱 Clique no mapa para adicionar marcador</Text>
        </Animated.View>

        {/* FABs */}
        <View style={styles.fabStack}>
          <TouchableOpacity
            style={[styles.fab, !userLocation && { opacity: 0.35 }]}
            onPress={centerOnUser}
            disabled={!userLocation}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 20 }}>⊕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fab, styles.fabPrimary]}
            onPress={() => setPanelOpen(v => !v)}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 20 }}>{panelOpen ? '✕' : '📋'}</Text>
            {markers.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{markers.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Markers panel */}
        <Animated.View style={[styles.panel, { transform: [{ translateY: panelTranslateY }] }]}>
          <View style={styles.panelHandle} />
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Marcadores</Text>
            <View style={styles.countBadge}>
              <Text style={{ color: COLORS.cyan, fontSize: 11, fontWeight: '700' }}>{markers.length}</Text>
            </View>
          </View>

          {markers.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 36, opacity: 0.3 }}>🗺</Text>
              <Text style={styles.emptyText}>Nenhum marcador ainda.</Text>
              <Text style={[styles.emptyText, { opacity: 0.5, fontSize: 11 }]}>Clique no mapa para adicionar.</Text>
            </View>
          ) : (
            <FlatList
              data={[...markers].reverse()}
              keyExtractor={m => m.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, selectedId === item.id && styles.rowSelected]}
                  onPress={() => flyToMarker(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.rowEmoji}>
                    <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.rowCoords}>
                      {item.coordinate.latitude.toFixed(5)}, {item.coordinate.longitude.toFixed(5)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeMarker(item.id)}
                    hitSlop={12}
                  >
                    <Text style={{ color: COLORS.red, fontWeight: '700', fontSize: 12 }}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}
        </Animated.View>
      </View>

      {/* Add Marker Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Novo Marcador 📌</Text>
            {pendingCoord && (
              <Text style={styles.modalCoords}>
                {pendingCoord.latitude.toFixed(5)}, {pendingCoord.longitude.toFixed(5)}
              </Text>
            )}
            <TextInput
              style={styles.input}
              placeholder="Nome do local (ex: Minha Casa)"
              placeholderTextColor={COLORS.muted}
              value={markerName}
              onChangeText={setMarkerName}
              autoFocus
              maxLength={40}
              onSubmitEditing={confirmMarker}
              returnKeyType="done"
              selectionColor={COLORS.cyan}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)} activeOpacity={0.75}>
                <Text style={{ color: COLORS.muted, fontWeight: '600', fontSize: 13 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={confirmMarker} activeOpacity={0.8}>
                <Text style={{ color: '#000', fontWeight: '800', fontSize: 13 }}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 100,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.cyan,
    alignItems: 'center', justifyContent: 'center',
  },
  logoTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: COLORS.card, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, borderColor: COLORS.border,
  },
  dot: { width: 7, height: 7, borderRadius: 99 },
  statusText: { fontSize: 10, color: COLORS.muted, fontFamily: 'monospace' },

  hint: {
    position: 'absolute', bottom: 90, alignSelf: 'center',
    backgroundColor: COLORS.surface + 'DD',
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: COLORS.border,
  },
  hintText: { color: COLORS.muted, fontSize: 11, fontFamily: 'monospace' },

  fabStack: { position: 'absolute', right: 16, bottom: 24, gap: 12, alignItems: 'center' },
  fab: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabPrimary: { backgroundColor: COLORS.cyan, borderColor: COLORS.cyan },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: COLORS.red, borderRadius: 99,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 8, zIndex: 200,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, elevation: 20,
  },
  panelHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 12,
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 10,
  },
  panelTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  countBadge: {
    backgroundColor: COLORS.cyanDim, borderWidth: 1,
    borderColor: COLORS.cyan + '44', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 2,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12, marginBottom: 8, gap: 12,
  },
  rowSelected: { borderColor: COLORS.cyan + '88' },
  rowEmoji: {
    width: 40, height: 40, backgroundColor: COLORS.surface,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  rowCoords: { fontSize: 10, color: COLORS.muted, fontFamily: 'monospace' },
  removeBtn: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: COLORS.redDim, alignItems: 'center', justifyContent: 'center',
  },

  overlay: {
    flex: 1, backgroundColor: '#00000099',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalBox: {
    width: '100%', backgroundColor: COLORS.surface,
    borderRadius: 18, padding: 24,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 40, elevation: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  modalCoords: { fontSize: 10, color: COLORS.muted, fontFamily: 'monospace', marginBottom: 18 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 14, marginBottom: 16,
  },
  btnCancel: {
    flex: 1, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  btnConfirm: {
    flex: 1, backgroundColor: COLORS.cyan,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
});
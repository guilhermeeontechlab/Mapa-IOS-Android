import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';

interface Coordinate {
  latitude: number;
  longitude: number;
}

export default function MapaScreen() {
  const [location, setLocation] = useState<Coordinate | null>(null);
  const [markers, setMarkers] = useState<Coordinate[]>([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à localização para mostrar o mapa.');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  const handleMapPress = (e: MapPressEvent) => {
    setMarkers([...markers, e.nativeEvent.coordinate]);
  };

  const clearMarkers = () => {
    setMarkers([]);
  };

  return (
    <View style={styles.container}>
      {location ? (
        <>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton
          >
            {markers.map((coord, index) => (
              <Marker
                key={index}
                coordinate={coord}
                pinColor="#FF6B6B"
                title={`Marcador ${index + 1}`}
                description={`Lat: ${coord.latitude.toFixed(4)}, Long: ${coord.longitude.toFixed(4)}`}
              />
            ))}
          </MapView>

          <View style={styles.infoContainer}>
            <View style={styles.infoCard}>
              <Text style={styles.title}>📍 Onde Estou?</Text>
              <Text style={styles.subtitle}>Toque no mapa para adicionar marcadores</Text>
              <Text style={styles.markerCount}>
                {markers.length} {markers.length === 1 ? 'marcador' : 'marcadores'} adicionado{markers.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {markers.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={clearMarkers}>
                <Text style={styles.clearButtonText}>🗑️ Limpar Marcadores</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>📡 Carregando sua localização...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F4FE',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  infoContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 10,
  },
  markerCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498DB',
  },
  clearButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

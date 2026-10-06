import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface PlaceMapHandle {
  moveTo: (to: Coords, zoom: number) => void;
}

// The map stops moving for this long before the picker reads its centre (one reverse geocode per drag, not
// one per frame).
const SETTLE_MS = 600;

// The job location map (CHQ-163): Google Maps on Android, Apple Maps on iOS, through expo-maps. It only draws;
// the picker owns the place, and the pin is the picker's overlay at the map's centre, so moving the map moves
// the place. `onSettle` reports the centre once the camera has come to rest.
export const PlaceMap = forwardRef<
  PlaceMapHandle,
  {
    initial: Coords;
    zoom: number;
    dark: boolean;
    onSettle: (centre: Coords) => void;
  }
>(function PlaceMap({ initial, zoom, dark, onSettle }, ref) {
  const google = useRef<GoogleMaps.MapView>(null);
  const apple = useRef<AppleMaps.MapView>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useImperativeHandle(ref, () => ({
    moveTo: (to, z) => {
      if (Platform.OS === 'ios') apple.current?.setCameraPosition({ coordinates: to, zoom: z });
      else google.current?.setCameraPosition({ coordinates: to, zoom: z, duration: 400 });
    },
  }));
  const onCameraMove = (e: { coordinates: { latitude?: number; longitude?: number } }) => {
    const { latitude, longitude } = e.coordinates;
    if (latitude == null || longitude == null) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSettle({ latitude, longitude }), SETTLE_MS);
  };
  const camera = { coordinates: initial, zoom };
  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        ref={apple}
        style={StyleSheet.absoluteFill}
        cameraPosition={camera}
        colorScheme={dark ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
        uiSettings={{ compassEnabled: false, myLocationButtonEnabled: false, togglePitchEnabled: false }}
        onCameraMove={onCameraMove}
      />
    );
  }
  return (
    <GoogleMaps.View
      ref={google}
      style={StyleSheet.absoluteFill}
      cameraPosition={camera}
      colorScheme={dark ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT}
      uiSettings={{
        compassEnabled: false,
        mapToolbarEnabled: false,
        myLocationButtonEnabled: false,
        zoomControlsEnabled: false,
        rotationGesturesEnabled: false,
        tiltGesturesEnabled: false,
        indoorLevelPickerEnabled: false,
      }}
      onCameraMove={onCameraMove}
    />
  );
});

import { useEffect, useState } from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import type { JobLocation } from '@klokka/api-client';
import { appConfig } from '@/config';
import { useAuth } from '@/auth';
import { useT } from '@/i18n/LocaleProvider';
import { useTheme } from '@/theme';

// The API's map image for a job (CHQ-156): requested at a fixed size (served at 2x) and scaled to the card's
// width, so nothing is measured. The bearer rides the image request; the Maps key never leaves the server.
// When the server has no map (no key, Static API off) the card simply shows no picture.
const MAP_WIDTH = 400;

export function MapImage({
  workspaceId,
  location,
  height,
  style,
}: {
  workspaceId: string;
  location: JobLocation;
  height: number;
  // Extra image style (a radius, a border): it disappears with the image when the map cannot load.
  style?: StyleProp<ImageStyle>;
}) {
  const t = useT();
  const theme = useTheme();
  const auth = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    void auth.getAccessToken().then((value) => {
      if (live) setToken(value);
    });
    return () => {
      live = false;
    };
  }, [auth]);
  if (failed || token === null) return null;
  const query = `latitude=${location.latitude}&longitude=${location.longitude}&width=${MAP_WIDTH}&height=${height}&dark=${theme.mode === 'dark'}`;
  return (
    <Image
      // An array: React Native's Android Image forwards headers only from an array source (CHQ-163).
      source={[
        {
          uri: `${appConfig().apiBaseUrl}/workspaces/${workspaceId}/map.png?${query}`,
          headers: { Authorization: `Bearer ${token}` },
        },
      ]}
      style={[styles.map, { height, backgroundColor: theme.color.surface2 }, style]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityLabel={t('places.mapOf', { place: location.name })}
      testID="job-map"
    />
  );
}

const styles = StyleSheet.create({
  map: { width: '100%' },
});

// Google Maps directions (app or browser); no key needed.
export function directionsUrl(location: JobLocation): string {
  const query = `${location.latitude},${location.longitude}`;
  const place = location.placeId ? `&query_place_id=${encodeURIComponent(location.placeId)}` : '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}${place}`;
}

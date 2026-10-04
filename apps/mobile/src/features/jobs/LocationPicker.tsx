import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import type { JobLocation } from '@klokka/api-client';
import { useApi } from '@/api/ApiProvider';
import { usePlaceSearch, useRecentPlaces } from '@/data/workspace';
import { useT } from '@/i18n/LocaleProvider';
import { problemMessage } from '@/lib/problems';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Button, Icon, TextField, type IconName } from '@/ui';
import { MapImage } from './MapImage';

const styles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[3],
      minHeight: t.tapMin + t.space[2],
      paddingVertical: t.space[1],
      borderRadius: t.radius.md,
    },
    on: { backgroundColor: t.color.surface2 },
    icon: {
      width: 40,
      height: 40,
      borderRadius: t.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.color.surface2,
    },
    preview: {
      borderRadius: t.radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.color.border,
      backgroundColor: t.color.surface2,
    },
    previewText: { padding: t.space[3], gap: 2 },
  });

// Debounce: one autocomplete call per pause in typing, not per keystroke.
const TYPING_PAUSE_MS = 250;

function useDebounced(value: string): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

// The job's place (CHQ-156): search through the API (Google Places, the key stays on the server), the
// workspace's recent places when nothing is typed, "use where I am now", or no place at all. One search
// is one Google session: the same id from the first keystroke to the place picked.
export function LocationPicker({
  workspaceId,
  value,
  onPick,
}: {
  workspaceId: string;
  value: JobLocation | null;
  onPick: (location: JobLocation | null) => void;
}) {
  const t = useT();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const api = useApi();
  const session = useRef(Crypto.randomUUID());
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<JobLocation | null>(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebounced(query);
  const search = usePlaceSearch(workspaceId, debounced, session.current);
  const recent = useRecentPlaces(workspaceId);
  const typing = debounced.trim().length >= 2;

  useEffect(() => {
    if (!search.error) return;
    void problemMessage(search.error, t).then(setError);
  }, [search.error, t]);

  const choose = async (placeId: string) => {
    setBusy(true);
    setError(null);
    try {
      const place = await api.places.getPlace({ workspaceId, placeId, session: session.current });
      setPicked(place);
      session.current = Crypto.randomUUID();
    } catch (e) {
      setError(await problemMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  const useHere = async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setError(t('places.locationDenied'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const place = await api.places.reverseGeocode({
        workspaceId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setPicked(place);
    } catch (e) {
      setError(await problemMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  const row = (
    key: string,
    icon: IconName,
    iconColor: string,
    title: string,
    subtitle: string | null,
    onPress: () => void,
    selected = false,
  ) => (
    <AppPressable
      key={key}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityState={{ selected }}
      onPress={onPress}
      pressScale={0.99}
      style={[s.row, selected ? s.on : null]}
      testID={`place-${key}`}
    >
      <View style={s.icon}>
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText weight={600} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" tone="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </AppPressable>
  );

  const results = typing ? (search.data ?? []) : [];
  const recents = typing ? [] : (recent.data ?? []);

  return (
    <View style={{ gap: theme.space[3] }}>
      <TextField
        label={t('places.search')}
        placeholder={t('places.search')}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setError(null);
        }}
        autoCorrect={false}
        returnKeyType="search"
        testID="place-search"
      />
      {picked ? (
        <View style={s.preview} testID="place-preview">
          <MapImage workspaceId={workspaceId} location={picked} height={120} />
          <View style={s.previewText}>
            <AppText weight={700}>{picked.name}</AppText>
            {picked.address ? (
              <AppText variant="small" tone="muted">
                {picked.address}
              </AppText>
            ) : null}
          </View>
        </View>
      ) : null}
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <View>
        {row(
          'here',
          'crosshair',
          theme.color.accent,
          t('places.useHere'),
          t('places.useHereHint'),
          () => void useHere(),
        )}
        {typing || recents.length > 0 ? (
          <AppText variant="eyebrow" tone="muted" style={{ marginTop: theme.space[2] }}>
            {typing ? t('places.results') : t('places.recent')}
          </AppText>
        ) : null}
        {results.map((r) =>
          row(
            r.placeId,
            'map-pin',
            theme.color.primary,
            r.primaryText,
            r.secondaryText ?? null,
            () => void choose(r.placeId),
          ),
        )}
        {typing && search.isSuccess && results.length === 0 ? (
          <AppText variant="small" tone="muted">
            {t('places.noResults')}
          </AppText>
        ) : null}
        {recents.map((p, i) =>
          row(
            `recent-${i}`,
            'map-pin',
            theme.color.textMuted,
            p.name,
            p.address ?? null,
            () => setPicked(p),
            picked?.name === p.name && picked.latitude === p.latitude,
          ),
        )}
        {row(
          'none',
          'x',
          theme.color.textMuted,
          t('places.none'),
          null,
          () => setPicked(null),
          picked === null,
        )}
      </View>
      <AppText variant="caption" tone="muted" align="right">
        {t('places.poweredBy')}
      </AppText>
      <Button
        label={picked ? t('places.use', { name: picked.name }) : t('places.saveWithout')}
        onPress={() => onPick(picked)}
        loading={busy}
        testID="place-use"
      />
    </View>
  );
}

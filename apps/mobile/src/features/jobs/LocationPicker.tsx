import { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import type { JobLocation } from '@klokka/api-client';
import { useApi } from '@/api/ApiProvider';
import { usePlaceSearch, useRecentPlaces } from '@/data/workspace';
import { useT } from '@/i18n/LocaleProvider';
import { problemMessage } from '@/lib/problems';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Button, Icon, Separator, type IconName } from '@/ui';
import { PlaceMap, type Coords, type PlaceMapHandle } from './PlaceMap';

// Debounce: one autocomplete call per pause in typing, not per keystroke.
const TYPING_PAUSE_MS = 250;
// Where the map opens with no place and no recent places: all of Sweden.
const COUNTRY: Coords = { latitude: 62.2, longitude: 15.6 };
const COUNTRY_ZOOM = 4.2;
const PLACE_ZOOM = 16;
const RECENT_ZOOM = 12;
// A settled map centre this close to the picked place is the place itself (the camera's own landing, rounding).
const SAME_PLACE_METRES = 15;
const RECENT_SHOWN = 3;
const PIN = 40;

const styles = (t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.color.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], paddingHorizontal: t.space[2] },
    back: { minWidth: t.tapMin, height: t.tapMin, flexDirection: 'row', alignItems: 'center', gap: 2 },
    search: { paddingHorizontal: t.space[4], paddingVertical: t.space[2] },
    input: {
      minHeight: 48,
      borderRadius: t.radius.control,
      borderWidth: 1,
      borderColor: t.color.border,
      backgroundColor: t.color.surface,
      paddingHorizontal: t.space[4],
      color: t.color.text,
      ...t.text('body', 500),
    },
    focused: { borderColor: t.color.focus },
    body: { flex: 1, overflow: 'hidden' },
    pin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -PIN / 2, marginTop: -PIN },
    hint: {
      position: 'absolute',
      alignSelf: 'center',
      top: '50%',
      marginTop: t.space[2],
      paddingHorizontal: t.space[3],
      paddingVertical: t.space[1],
      borderRadius: t.radius.chip,
      backgroundColor: t.color.bg,
    },
    panel: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.color.surface,
      borderTopLeftRadius: t.radius.card,
      borderTopRightRadius: t.radius.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: t.color.border,
      paddingHorizontal: t.space[4],
      paddingTop: t.space[3],
      gap: t.space[3],
    },
    results: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.color.bg },
    resultsContent: { paddingHorizontal: t.space[4], paddingBottom: t.space[4] },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[3],
      minHeight: 52,
      paddingVertical: t.space[1],
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: t.radius.chip,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.color.surface2,
    },
  });

function useDebounced(value: string): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

function metresBetween(a: Coords, b: Coords): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

// The job's place (CHQ-156, a full-screen map since CHQ-163): Google Maps on Android, Apple Maps on iOS. Search
// goes through the API (Google Places, the key stays on the server); picking a result, a recent place or
// "where I am now" moves the map there, and moving the map moves the place (reverse geocoded by the API). The
// layout is fixed: results fill the space under the search field, so nothing jumps while typing. One search is
// one Google session: the same id from the first keystroke to the place picked.
export function LocationPicker({
  visible,
  workspaceId,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  workspaceId: string;
  value: JobLocation | null;
  onPick: (location: JobLocation | null) => void;
  onClose: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const api = useApi();
  const insets = useSafeAreaInsets();
  const map = useRef<PlaceMapHandle>(null);
  const session = useRef(Crypto.randomUUID());
  // Where the camera was last sent; its own landing there is not a drag.
  const flying = useRef<Coords | null>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [picked, setPicked] = useState<JobLocation | null>(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebounced(query);
  // Only while the field has focus: the picked result stays in it and must not search in the background.
  const search = usePlaceSearch(workspaceId, focused ? debounced : '', session.current);
  const recent = useRecentPlaces(workspaceId, visible);
  const typing = focused && debounced.trim().length >= 2;
  const recents = (recent.data ?? []).slice(0, RECENT_SHOWN);
  const start = value ?? recents[0] ?? null;

  useEffect(() => {
    if (!visible) return;
    setPicked(value);
    setQuery('');
    setError(null);
  }, [visible, value]);

  useEffect(() => {
    if (!search.error) return;
    void problemMessage(search.error, t).then(setError);
  }, [search.error, t]);

  const show = (place: JobLocation) => {
    setPicked(place);
    setError(null);
    flying.current = place;
    map.current?.moveTo(place, PLACE_ZOOM);
  };

  // The tapped result stays in the search field (CHQ-176): a tap on the field again shows the results again, and
  // the user can type on, such as the house number after a street picked from two letters.
  const choose = async (placeId: string, text: string) => {
    Keyboard.dismiss();
    setFocused(false);
    setQuery(text);
    setBusy(true);
    setError(null);
    try {
      const place = await api.places.getPlace({ workspaceId, placeId, session: session.current });
      session.current = Crypto.randomUUID();
      show(place);
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
      show({ ...place, latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (e) {
      setError(await problemMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  // The map came to rest. Our own flight landing is not a change; a drag away from the picked place renames
  // the place after the spot under the pin, which keeps the pin's exact position.
  const onSettle = async (centre: Coords) => {
    if (flying.current) {
      const landed = metresBetween(centre, flying.current) < SAME_PLACE_METRES;
      flying.current = null;
      if (landed) return;
    }
    if (!picked || metresBetween(centre, picked) < SAME_PLACE_METRES) return;
    setBusy(true);
    try {
      const place = await api.places.reverseGeocode({ workspaceId, ...centre });
      setPicked({ ...place, ...centre });
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
  ) => (
    <AppPressable
      key={key}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      pressScale={0.99}
      style={s.row}
      testID={`place-${key}`}
    >
      <View style={s.icon}>
        <Icon name={icon} size={18} color={iconColor} />
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
  const errorLine = error ? (
    <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
      {error}
    </AppText>
  ) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[s.root, { paddingTop: insets.top }]} testID="place-picker">
        <View style={s.header}>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={onClose}
            style={s.back}
            testID="place-back"
          >
            <Icon
              name="chevron-left"
              size={24}
              color={Platform.OS === 'ios' ? theme.color.accent : theme.color.text}
            />
            {Platform.OS === 'ios' ? <AppText tone="accent">{t('common.back')}</AppText> : null}
          </AppPressable>
          <AppText variant="h3" accessibilityRole="header">
            {t('places.title')}
          </AppText>
        </View>
        <View style={s.search}>
          <TextInput
            accessibilityLabel={t('places.search')}
            placeholder={t('places.search')}
            placeholderTextColor={theme.color.textMuted}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setError(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCorrect={false}
            returnKeyType="search"
            style={[s.input, focused ? s.focused : null]}
            testID="place-search"
          />
        </View>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View style={s.body}>
            {visible ? (
              <View
                style={StyleSheet.absoluteFill}
                accessible
                accessibilityLabel={t('places.map')}
                testID="place-map"
              >
                <PlaceMap
                  ref={map}
                  initial={start ?? COUNTRY}
                  zoom={value ? PLACE_ZOOM : start ? RECENT_ZOOM : COUNTRY_ZOOM}
                  dark={theme.mode === 'dark'}
                  onSettle={(c) => void onSettle(c)}
                />
              </View>
            ) : null}
            {picked && !typing ? (
              <>
                <View style={s.pin} pointerEvents="none">
                  <Svg width={PIN} height={PIN} viewBox="0 0 24 24">
                    <Path
                      d="M12 23s-8-7.2-8-13a8 8 0 0 1 16 0c0 5.8-8 13-8 13z"
                      fill={theme.color.primary}
                      stroke={theme.color.bg}
                      strokeWidth={1}
                    />
                    <Circle cx={12} cy={10} r={3} fill={theme.color.bg} />
                  </Svg>
                </View>
                <View style={s.hint} pointerEvents="none">
                  <AppText variant="caption">{t('places.moveMapHint')}</AppText>
                </View>
              </>
            ) : null}

            {typing ? (
              <ScrollView
                style={s.results}
                contentContainerStyle={s.resultsContent}
                keyboardShouldPersistTaps="handled"
                testID="place-results"
              >
                <AppText variant="eyebrow" tone="muted" style={{ paddingVertical: theme.space[2] }}>
                  {t('places.results')}
                </AppText>
                {results.map((r, i) => (
                  <View key={r.placeId}>
                    {i > 0 ? <Separator /> : null}
                    {row(
                      r.placeId,
                      'map-pin',
                      theme.color.primary,
                      r.primaryText,
                      r.secondaryText ?? null,
                      () => void choose(r.placeId, r.primaryText),
                    )}
                  </View>
                ))}
                {search.isSuccess && results.length === 0 ? (
                  <AppText variant="small" tone="muted">
                    {t('places.noResults')}
                  </AppText>
                ) : null}
                {errorLine}
                <AppText variant="caption" tone="muted" align="right" style={{ paddingTop: theme.space[2] }}>
                  {t('places.poweredBy')}
                </AppText>
              </ScrollView>
            ) : picked ? (
              <View
                style={[s.panel, { paddingBottom: insets.bottom + theme.space[4] }]}
                testID="place-picked"
              >
                <View>
                  <AppText variant="lead" weight={700} numberOfLines={2}>
                    {picked.name}
                  </AppText>
                  {picked.address ? (
                    <AppText variant="small" tone="muted" numberOfLines={2}>
                      {picked.address}
                    </AppText>
                  ) : null}
                </View>
                {errorLine}
                <Button
                  label={t('places.useThisPlace')}
                  onPress={() => onPick(picked)}
                  loading={busy}
                  testID="place-use"
                />
                <Button
                  label={t('places.none')}
                  variant="ghost"
                  compact
                  onPress={() => onPick(null)}
                  testID="place-none"
                />
              </View>
            ) : (
              <View style={[s.panel, { paddingBottom: insets.bottom + theme.space[3] }]} testID="place-start">
                {row(
                  'here',
                  'crosshair',
                  theme.color.accent,
                  t('places.useHere'),
                  t('places.useHereHint'),
                  () => void useHere(),
                )}
                {recents.length > 0 ? (
                  <AppText variant="eyebrow" tone="muted">
                    {t('places.recent')}
                  </AppText>
                ) : null}
                {recents.map((p, i) =>
                  row(`recent-${i}`, 'map-pin', theme.color.textMuted, p.name, p.address ?? null, () =>
                    show(p),
                  ),
                )}
                {row('none', 'x', theme.color.textMuted, t('places.none'), null, () => onPick(null))}
                {errorLine}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

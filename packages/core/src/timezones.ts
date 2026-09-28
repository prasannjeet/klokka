// Time zones for the workspace pickers (CHQ-145): IANA ids, Europe first (where Klokka's employers
// are), then the rest of the world, each group alphabetical. The runtime's own list is used where it
// exists (browsers, Node: Intl.supportedValuesOf); Hermes has none, so a curated list stands in.

export const CURATED_TIME_ZONES: readonly string[] = [
  'Europe/Amsterdam',
  'Europe/Andorra',
  'Europe/Athens',
  'Europe/Belgrade',
  'Europe/Berlin',
  'Europe/Bratislava',
  'Europe/Brussels',
  'Europe/Bucharest',
  'Europe/Budapest',
  'Europe/Chisinau',
  'Europe/Copenhagen',
  'Europe/Dublin',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'Europe/Kyiv',
  'Europe/Lisbon',
  'Europe/Ljubljana',
  'Europe/London',
  'Europe/Luxembourg',
  'Europe/Madrid',
  'Europe/Malta',
  'Europe/Monaco',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Prague',
  'Europe/Riga',
  'Europe/Rome',
  'Europe/Sarajevo',
  'Europe/Skopje',
  'Europe/Sofia',
  'Europe/Stockholm',
  'Europe/Tallinn',
  'Europe/Tirane',
  'Europe/Vienna',
  'Europe/Vilnius',
  'Europe/Warsaw',
  'Europe/Zagreb',
  'Europe/Zurich',
  'Atlantic/Canary',
  'Atlantic/Faroe',
  'Atlantic/Reykjavik',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'America/Anchorage',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Chicago',
  'America/Denver',
  'America/Halifax',
  'America/Lima',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Phoenix',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/St_Johns',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Bangkok',
  'Asia/Dhaka',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Jerusalem',
  'Asia/Karachi',
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Manila',
  'Asia/Riyadh',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tehran',
  'Asia/Tokyo',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Melbourne',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  'UTC',
];

// The zones this runtime knows, or none (Hermes, older engines).
export function runtimeTimeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  try {
    return intl.supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
}

// An IANA region id ("Europe/Stockholm", "America/Argentina/Buenos_Aires", "Etc/GMT-1") or UTC. Offsets such
// as "UTC+1", "GMT+01:00" or "+01:00" are not: the API refuses them and Intl cannot format with them (CHQ-145).
const IANA = /^(?:UTC|[A-Z][A-Za-z]+(?:\/[A-Za-z0-9_+-]+)+)$/;

export function isIanaTimeZone(zone: string | null | undefined): zone is string {
  return typeof zone === 'string' && IANA.test(zone);
}

// Europe for the pickers' first group includes the Atlantic islands (Iceland, the Faroes, the Canaries).
export function isEuropeanTimeZone(zone: string): boolean {
  return zone.startsWith('Europe/') || zone.startsWith('Atlantic/');
}

// Europe, then the Atlantic islands, then everything else.
function region(zone: string): number {
  if (zone.startsWith('Europe/')) return 0;
  if (zone.startsWith('Atlantic/')) return 1;
  return 2;
}

// Every option for a picker, Europe first, IANA ids only. The current value is an option too when the list
// does not know it (a zone another runtime knows), so a picker never silently changes it; an offset is not.
export function timeZoneOptions(
  current?: string,
  supported: readonly string[] = runtimeTimeZones(),
): string[] {
  const known = supported.filter(isIanaTimeZone);
  const zones = new Set(known.length > 0 ? known : CURATED_TIME_ZONES);
  if (isIanaTimeZone(current)) zones.add(current);
  return [...zones].sort((a, b) => region(a) - region(b) || a.localeCompare(b));
}

// The id as a person reads it: "America/New_York" becomes "America/New York". The id itself is data
// (the same in every language), so it is shown rather than translated.
export function timeZoneLabel(zone: string): string {
  return zone.replace(/_/g, ' ');
}

// Picker search: every word of the query must appear in the label, case- and accent-insensitive.
export function matchesTimeZone(zone: string, query: string): boolean {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const label = fold(timeZoneLabel(zone));
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => label.includes(word));
}

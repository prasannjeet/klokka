'use client';

// A small map with a pin for a job's place, through the API's map proxy. When the picture cannot be had (no
// Maps key, the Static API off, offline) it is left out and the card still says where (CHQ-156).
import { useState } from 'react';
import type { JobLocation } from '@klokka/api-client';
import { useT } from '@/lib/i18n';
import { mapImageUrl, useDarkMode } from '@/lib/jobs';

export function MapImage({
  workspaceId,
  location,
  width,
  height,
}: {
  workspaceId: string;
  location: JobLocation;
  width: number;
  height: number;
}) {
  const t = useT();
  const dark = useDarkMode();
  const src = mapImageUrl(workspaceId, location, width, height, dark);
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return null;
  // A plain <img>: the map is a private, per-user image from the BFF, which next/image would cache server-side.
  return (
    <img
      className="job-map"
      src={src}
      width={width}
      height={height}
      alt={t('places.mapOf', { place: location.name })}
      loading="lazy"
      onError={() => setFailed(src)}
    />
  );
}

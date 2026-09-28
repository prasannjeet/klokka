'use client';

// Export CSV (CHQ-129): the API's export of a month, whole workspace or one person, fetched through the BFF
// so a problem (a closed session, a server error) shows as a message instead of a downloaded error page.
import { useState } from 'react';
import type { IsoMonth } from '@klokka/core';
import { bffUrl } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { problemMessage, toProblem } from '@/lib/problem';
import { ResponseError } from '@klokka/api-client';
import { Icon } from './icons';
import { useToast } from './toast';

function fileNameOf(disposition: string | null, fallback: string): string {
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition ?? '');
  return m?.[1] ? decodeURIComponent(m[1]) : fallback;
}

export function CsvButton({
  workspaceId,
  slug,
  month,
  membershipId,
  personName,
  small,
}: {
  workspaceId: string;
  slug: string;
  month: IsoMonth;
  membershipId?: string;
  personName?: string;
  small?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const query = membershipId ? `?membershipId=${encodeURIComponent(membershipId)}` : '';
      const response = await fetch(bffUrl(`workspaces/${workspaceId}/months/${month}/export.csv${query}`));
      if (!response.ok) throw new ResponseError(response, 'export failed');
      const blob = await response.blob();
      const file = fileNameOf(response.headers.get('content-disposition'), `${slug}-${month}.csv`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: t('web.csv.downloaded', { file }),
        body: personName ? t('web.csv.personBody', { name: personName }) : t('web.csv.monthBody'),
        icon: 'download',
      });
    } catch (error) {
      toast({ title: problemMessage(t, await toProblem(error)), tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={small ? 'btn btn-ghost btn-sm' : 'btn btn-ghost'}
      type="button"
      disabled={busy}
      onClick={download}
    >
      <Icon name="download" />
      {t('week.exportCsv')}
    </button>
  );
}

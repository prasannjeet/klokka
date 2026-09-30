import { statSync } from 'node:fs';
import { join } from 'node:path';
import Image from 'next/image';
import { formatNumber } from '@klokka/core/format';
import { RichText } from '@/components/RichText';
import { Icon } from '@/components/ui/Icon';
import { downloadHref, previewSize, templateFiles } from '@/lib/downloads';
import type { Locale } from '@/lib/i18n';
import type { en } from '@/lib/i18n/pages/template';

type Labels = typeof en.tool;

/** A file's size for its button label, read when the page is prerendered: "8 kB". */
function size(file: string, locale: Locale): string {
  const bytes = statSync(join(process.cwd(), 'public', 'downloads', file)).size;
  return `${formatNumber(Math.max(1, Math.round(bytes / 1024)), locale)} kB`;
}

/** The template page's download block: the two files of the page's language, a preview of the sheet. */
export function TemplateDownloads({ t, locale }: { t: Labels; locale: Locale }) {
  const files = templateFiles[locale];
  return (
    <div className="td card">
      <div className="td-copy">
        <h2 className="h3">{t.downloadTitle}</h2>
        <div className="td-actions">
          <a className="btn btn-primary" href={downloadHref(files.xlsx)} download>
            <Icon name="download" />
            {t.xlsxLabel.replace('{size}', size(files.xlsx, locale))}
          </a>
          <a className="btn btn-ghost" href={downloadHref(files.pdf)} download>
            <Icon name="download" />
            {t.pdfLabel.replace('{size}', size(files.pdf, locale))}
          </a>
        </div>
        <p className="small muted">{t.formats}</p>
        <p>
          <RichText text={t.live} locale={locale} />
        </p>
      </div>
      <Image
        className="td-preview"
        src={downloadHref(files.preview)}
        width={previewSize.width}
        height={previewSize.height}
        alt={t.previewAlt}
        sizes="(min-width: 900px) 320px, 90vw"
      />
    </div>
  );
}

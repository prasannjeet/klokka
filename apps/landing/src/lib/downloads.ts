// The timesheet template's files under public/downloads, one set per language. scripts/templates.ts writes them
// (and imports this file under Node's type stripping, so it stays import-free); the template page links them.

export interface TemplateFiles {
  xlsx: string;
  pdf: string;
  /** The PDF's first page as a PNG (pdftoppm -r 80), shown on the page as a preview. */
  preview: string;
}

export const templateFiles: { readonly sv: TemplateFiles; readonly en: TemplateFiles } = {
  sv: {
    xlsx: 'tidrapport-mall.xlsx',
    pdf: 'tidrapport-mall.pdf',
    preview: 'tidrapport-mall-excel-pdf.png',
  },
  en: {
    xlsx: 'timesheet-template.xlsx',
    pdf: 'timesheet-template.pdf',
    preview: 'timesheet-template-excel-pdf.png',
  },
};

/** The preview's pixel size: an A4 page at 80 dpi (test/pages.test.ts reads it back from the PNG header). */
export const previewSize = { width: 662, height: 936 } as const;

/** Site path of a file in public/downloads. */
export function downloadHref(file: string): string {
  return `/downloads/${file}`;
}

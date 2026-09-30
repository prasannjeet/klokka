// Writes the timesheet template to public/downloads, per language: a monthly xlsx with formulas, the same sheet as
// an A4 PDF for printing, and a PNG preview of the PDF for the template page. Run from apps/landing:
//   node scripts/templates.ts        (or: npm run templates -w @klokka/landing)
// Node strips the types natively, so this file (and what it imports) uses erasable TypeScript only. The output is
// committed and deterministic: fixed dates in the metadata and in the zip entries, so a re-run gives the same bytes.
// The preview needs pdftoppm (poppler-utils) on the PATH.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { templateFiles } from '../src/lib/downloads.ts';
import { en, sv } from '../src/lib/i18n/pages/template.ts';

type Labels = typeof en.tool;

const FIXED_DATE = new Date('2026-09-30T00:00:00Z');
const OUT_DIR = fileURLToPath(new URL('../public/downloads/', import.meta.url));
const DAYS = 31;
const FIRST_ROW = 7;
const LAST_ROW = FIRST_ROW + DAYS - 1;
const TOTAL_ROW = LAST_ROW + 1;

const thin = { style: 'thin' as const, color: { argb: 'FF9CA3AF' } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const line = { bottom: { style: 'thin' as const, color: { argb: 'FF111827' } } };

async function xlsx(t: Labels, lang: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Klokka';
  wb.lastModifiedBy = 'Klokka';
  wb.created = FIXED_DATE;
  wb.modified = FIXED_DATE;
  wb.title = t.sheetTitle;
  Object.assign(wb, { language: lang }); // written to docProps/core.xml; missing from exceljs's typings
  wb.calcProperties = { fullCalcOnLoad: true };

  const ws = wb.addWorksheet(t.sheetName, {
    views: [{ state: 'frozen', ySplit: FIRST_ROW - 1, showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
      printArea: `A1:G${TOTAL_ROW + 8}`,
    },
  });
  ws.columns = [
    { width: 8 },
    { width: 12 },
    { width: 9 },
    { width: 9 },
    { width: 11 },
    { width: 9 },
    { width: 34 },
  ];

  ws.mergeCells('A1:E1');
  ws.getCell('A1').value = t.sheetTitle;
  ws.getCell('A1').font = { bold: true, size: 18 };
  ws.mergeCells('F1:G1');
  ws.getCell('F1').value = t.source;
  ws.getCell('F1').font = { size: 9, color: { argb: 'FF6B7280' } };
  ws.getCell('F1').alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(1).height = 28;

  const field = (row: number, label: string, from: string, to: string) => {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`A${row}`).font = { bold: true };
    ws.mergeCells(`${from}${row}:${to}${row}`);
    ws.getCell(`${from}${row}`).border = line;
    for (const col of columnsBetween(from, to)) ws.getCell(`${col}${row}`).border = line;
    ws.getRow(row).height = 22;
  };
  field(3, t.business, 'B', 'E');
  field(4, t.employee, 'B', 'E');
  ws.getCell('F3').value = t.month;
  ws.getCell('F3').font = { bold: true };
  ws.getCell('F3').alignment = { horizontal: 'right' };
  ws.getCell('G3').border = line;

  const header = ws.getRow(FIRST_ROW - 1);
  header.values = [t.date, t.weekday, t.start, t.end, t.break, t.hours, t.note];
  header.height = 20;
  header.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    cell.border = box;
    cell.alignment = { vertical: 'middle', horizontal: cell.col === '7' ? 'left' : 'center' };
  });

  for (let day = 1; day <= DAYS; day++) {
    const r = FIRST_ROW + day - 1;
    const row = ws.getRow(r);
    row.getCell(1).value = day;
    // End minus start (plus a day when the end is earlier: a night shift), in hours, minus the break in minutes;
    // blank until both times exist. No MOD: engines disagree on its sign for negative numbers.
    row.getCell(6).value = {
      formula: `IF(OR(C${r}="",D${r}=""),"",(D${r}-C${r}+IF(D${r}<C${r},1,0))*24-E${r}/60)`,
    };
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.border = box;
      if (c <= 6) cell.alignment = { horizontal: 'center' };
    }
    row.getCell(3).numFmt = 'hh:mm';
    row.getCell(4).numFmt = 'hh:mm';
    row.getCell(5).numFmt = '0';
    row.getCell(6).numFmt = '0.00';
  }

  ws.mergeCells(`A${TOTAL_ROW}:E${TOTAL_ROW}`);
  const totalLabel = ws.getCell(`A${TOTAL_ROW}`);
  totalLabel.value = t.total;
  totalLabel.font = { bold: true };
  totalLabel.alignment = { horizontal: 'right' };
  const total = ws.getCell(`F${TOTAL_ROW}`);
  total.value = { formula: `SUM(F${FIRST_ROW}:F${LAST_ROW})` };
  total.numFmt = '0.00';
  total.font = { bold: true };
  total.alignment = { horizontal: 'center' };
  total.border = box;
  total.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  ws.getRow(TOTAL_ROW).height = 20;

  const hintRow = TOTAL_ROW + 1;
  ws.mergeCells(`A${hintRow}:G${hintRow}`);
  ws.getCell(`A${hintRow}`).value = t.xlsxHint;
  ws.getCell(`A${hintRow}`).font = { size: 9, color: { argb: 'FF6B7280' } };
  ws.getCell(`A${hintRow}`).alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(hintRow).height = 26;

  const signature = (row: number, left: string, right: string) => {
    ws.getRow(row).height = 30;
    for (const [from, to] of [
      ['A', 'C'],
      ['E', 'G'],
    ] as const) {
      ws.mergeCells(`${from}${row}:${to}${row}`);
      for (const col of columnsBetween(from, to)) ws.getCell(`${col}${row}`).border = line;
    }
    ws.mergeCells(`A${row + 1}:C${row + 1}`);
    ws.mergeCells(`E${row + 1}:G${row + 1}`);
    ws.getCell(`A${row + 1}`).value = left;
    ws.getCell(`E${row + 1}`).value = right;
    for (const cell of [ws.getCell(`A${row + 1}`), ws.getCell(`E${row + 1}`)])
      cell.font = { size: 9, color: { argb: 'FF6B7280' } };
  };
  signature(TOTAL_ROW + 3, t.signEmployee, t.signEmployer);
  signature(TOTAL_ROW + 6, t.signDate, t.signDate);

  return deterministicZip(Buffer.from(await wb.xlsx.writeBuffer()));
}

function columnsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let c = from.charCodeAt(0); c <= to.charCodeAt(0); c++) out.push(String.fromCharCode(c));
  return out;
}

/** exceljs stamps every zip entry with the current time; repack with a fixed date, same entry order. */
async function deterministicZip(buffer: Buffer): Promise<Buffer> {
  const source = await JSZip.loadAsync(buffer);
  const out = new JSZip();
  for (const entry of Object.values(source.files)) {
    if (entry.dir) continue;
    out.file(entry.name, await entry.async('uint8array'), { date: FIXED_DATE, createFolders: false });
  }
  return out.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    platform: 'DOS',
  });
}

// ---- PDF: A4 portrait, the same grid for printing and filling in by hand ----

const A4 = [595.28, 841.89] as const;
const MARGIN = 40;
const INK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.61, 0.64, 0.69);
const SHADE = rgb(0.9, 0.91, 0.92);
/** Column widths in points; the note column takes what is left of the 515 pt between the margins. */
const COLUMNS = [36, 62, 50, 50, 56, 50] as const;

async function pdf(t: Labels, lang: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setTitle(t.sheetTitle);
  doc.setAuthor('Klokka');
  doc.setCreator('Klokka');
  doc.setProducer('Klokka');
  doc.setLanguage(lang);
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4[0], A4[1]]);
  const width = A4[0] - 2 * MARGIN;
  const right = MARGIN + width;
  const text = (s: string, x: number, y: number, size: number, font: PDFFont = regular, color = INK) =>
    page.drawText(s, { x, y, size, font, color });
  const hline = (x1: number, x2: number, y: number, color = RULE, thickness = 0.6) =>
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });

  let y = A4[1] - MARGIN - 18;
  text(t.sheetTitle, MARGIN, y, 20, bold);
  text(t.source, right - regular.widthOfTextAtSize(t.source, 8), y + 4, 8, regular, MUTED);

  y -= 34;
  const labelWidth = Math.max(...[t.business, t.employee].map((s) => bold.widthOfTextAtSize(s, 10))) + 10;
  const monthX = MARGIN + width * 0.62;
  text(t.business, MARGIN, y, 10, bold);
  hline(MARGIN + labelWidth, monthX - 16, y - 3, INK);
  text(t.month, monthX, y, 10, bold);
  hline(monthX + bold.widthOfTextAtSize(t.month, 10) + 8, right, y - 3, INK);
  y -= 24;
  text(t.employee, MARGIN, y, 10, bold);
  hline(MARGIN + labelWidth, monthX - 16, y - 3, INK);

  // The grid: header, 31 day rows, the total row.
  const xs = [MARGIN];
  for (const w of COLUMNS) xs.push((xs.at(-1) ?? MARGIN) + w);
  xs.push(right);
  const headers = [t.date, t.weekday, t.start, t.end, t.break, t.hours, t.note];
  const rowH = 16.5;
  const headH = 20;
  const top = y - 22;
  const gridBottom = top - headH - DAYS * rowH;

  page.drawRectangle({ x: MARGIN, y: top - headH, width, height: headH, color: SHADE });
  headers.forEach((h, i) => {
    const x0 = xs[i] ?? MARGIN;
    const x1 = xs[i + 1] ?? right;
    const size = 8.5;
    const x = i === 6 ? x0 + 5 : x0 + (x1 - x0 - bold.widthOfTextAtSize(h, size)) / 2;
    text(h, x, top - headH + 7, size, bold);
  });
  for (let day = 1; day <= DAYS; day++) {
    const rowTop = top - headH - (day - 1) * rowH;
    const label = String(day);
    const x1 = xs[1] ?? MARGIN;
    text(label, MARGIN + (x1 - MARGIN - regular.widthOfTextAtSize(label, 9)) / 2, rowTop - rowH + 5, 9);
  }
  for (let i = 0; i <= DAYS + 1; i++) hline(MARGIN, right, i === 0 ? top : top - headH - (i - 1) * rowH);
  for (const x of xs)
    page.drawLine({ start: { x, y: top }, end: { x, y: gridBottom }, thickness: 0.6, color: RULE });

  const hoursX0 = xs[5] ?? MARGIN;
  const hoursX1 = xs[6] ?? right;
  const totalTop = gridBottom;
  const totalH = 20;
  page.drawRectangle({
    x: hoursX0,
    y: totalTop - totalH,
    width: hoursX1 - hoursX0,
    height: totalH,
    color: SHADE,
    borderColor: RULE,
    borderWidth: 0.6,
  });
  text(t.total, hoursX0 - 8 - bold.widthOfTextAtSize(t.total, 10), totalTop - totalH + 6.5, 10, bold);

  y = totalTop - totalH - 18;
  text(t.pdfHint, MARGIN, y, 8, regular, MUTED);

  const signature = (lineY: number, left: string, rightLabel: string) => {
    const mid = MARGIN + width / 2;
    hline(MARGIN, mid - 20, lineY, INK);
    hline(mid + 20, right, lineY, INK);
    text(left, MARGIN, lineY - 12, 8, regular, MUTED);
    text(rightLabel, mid + 20, lineY - 12, 8, regular, MUTED);
  };
  signature(y - 36, t.signEmployee, t.signEmployer);
  signature(y - 72, t.signDate, t.signDate);

  return doc.save({ useObjectStreams: false });
}

// ---- write everything ----

mkdirSync(OUT_DIR, { recursive: true });
for (const [locale, copy, lang] of [
  ['sv', sv, 'sv-SE'],
  ['en', en, 'en'],
] as const) {
  const files = templateFiles[locale];
  const xlsxPath = `${OUT_DIR}${files.xlsx}`;
  const pdfPath = `${OUT_DIR}${files.pdf}`;
  writeFileSync(xlsxPath, await xlsx(copy.tool, lang));
  writeFileSync(pdfPath, await pdf(copy.tool, lang));
  execFileSync('pdftoppm', [
    '-png',
    '-r',
    '80',
    '-singlefile',
    pdfPath,
    `${OUT_DIR}${files.preview.replace(/\.png$/, '')}`,
  ]);
  console.log(`${locale}: ${files.xlsx}, ${files.pdf}, ${files.preview}`);
}

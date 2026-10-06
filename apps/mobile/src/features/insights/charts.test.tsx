import { fireEvent, screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import { renderApp } from '@/testing/render';
import { TrendLine, type TrendPoint } from './charts';

// The y-axis labels: SVG text anchored at its end, whose words sit in the TSpan's `content`.
function axisLabels(): string[] {
  const labels: string[] = [];
  const walk = (node: ReactTestRendererJSON | ReactTestRendererJSON[] | string | null) => {
    if (!node || typeof node === 'string') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const font = node.props['font'] as { textAnchor?: string } | undefined;
    if (node.type === 'RNSVGText' && font?.textAnchor === 'end') {
      const span = node.children?.[0];
      if (span && typeof span !== 'string') labels.push(String(span.props['content']));
      return;
    }
    node.children?.forEach(walk);
  };
  walk(screen.toJSON());
  return labels;
}

async function renderTrend(points: TrendPoint[]) {
  await renderApp(<TrendLine accessibilityLabel="Trend" points={points} />);
  await fireEvent(screen.getByTestId('trend-line'), 'layout', { nativeEvent: { layout: { width: 320 } } });
}

describe('TrendLine axis (CHQ-168)', () => {
  it('labels an empty trend 0 and 1 once each, without duplicate keys', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await renderTrend([
      { isoWeek: 40, hours: 0 },
      { isoWeek: 41, hours: 0 },
    ]);
    expect(axisLabels()).toEqual(['0', '1']);
    expect(error.mock.calls.flat().join(' ')).not.toContain('same key');
    error.mockRestore();
  });

  it('keeps the middle tick when it differs from the ends (positive control)', async () => {
    await renderTrend([
      { isoWeek: 40, hours: 20 },
      { isoWeek: 41, hours: 40 },
    ]);
    expect(axisLabels()).toEqual(['0', '20', '40']);
  });
});

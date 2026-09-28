import { useEffect, useState } from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '@/theme';

// The railway clock from the design direction (DIRECTION.md section 2): a plain dial, a paddle
// second hand that sweeps and waits at twelve. Runs at the real time; one state tick per second.
export function Clock({ size = 160 }: { size?: number }) {
  const theme = useTheme();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours() % 12;
  // 58.5 s sweep then a hold at twelve, approximated per second.
  const secondAngle = Math.min(seconds / 58.5, 1) * 360;
  const minuteAngle = minutes * 6;
  const hourAngle = hours * 30 + minutes * 0.5;
  const c = size / 2;
  const r = c - 4;
  const hand = (angle: number, length: number, width: number, color: string, tail = 0) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return (
      <Line
        x1={c - Math.cos(rad) * tail}
        y1={c - Math.sin(rad) * tail}
        x2={c + Math.cos(rad) * length}
        y2={c + Math.sin(rad) * length}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const rad = ((i * 6 - 90) * Math.PI) / 180;
    const major = i % 5 === 0;
    const inner = r - (major ? size * 0.12 : size * 0.06);
    return (
      <Line
        key={i}
        x1={c + Math.cos(rad) * inner}
        y1={c + Math.sin(rad) * inner}
        x2={c + Math.cos(rad) * (r - 2)}
        y2={c + Math.sin(rad) * (r - 2)}
        stroke={theme.color.text}
        strokeWidth={major ? size * 0.028 : size * 0.012}
        strokeLinecap="butt"
      />
    );
  });
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Circle cx={c} cy={c} r={r} fill={theme.color.surface} stroke={theme.color.border} strokeWidth={2} />
      {ticks}
      {hand(hourAngle, r * 0.55, size * 0.05, theme.color.text)}
      {hand(minuteAngle, r * 0.8, size * 0.04, theme.color.text)}
      {hand(secondAngle, r * 0.7, size * 0.014, theme.color.primary, r * 0.2)}
      <Circle
        cx={c + Math.cos(((secondAngle - 90) * Math.PI) / 180) * r * 0.55}
        cy={c + Math.sin(((secondAngle - 90) * Math.PI) / 180) * r * 0.55}
        r={size * 0.035}
        fill={theme.color.primary}
      />
      <Circle cx={c} cy={c} r={size * 0.02} fill={theme.color.primary} />
    </Svg>
  );
}

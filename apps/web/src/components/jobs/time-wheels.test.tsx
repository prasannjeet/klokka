// The hour and minute wheels (CHQ-156) as the keyboard and a screen reader meet them: two spinbuttons whose
// arrow keys step through the allowed values, 24 h taking the minutes to 0.
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TimeWheels } from './time-wheels';

function Harness() {
  const [time, setTime] = useState({ hours: 23, minutes: 30 });
  return (
    <TimeWheels
      hours={time.hours}
      minutes={time.minutes}
      minuteOptions={[0, 15, 30, 45]}
      onChange={(hours, minutes) => setTime({ hours, minutes })}
      hourUnit="h"
      minuteUnit="min"
      hoursLabel="Hours"
      minutesLabel="Minutes"
    />
  );
}

describe('TimeWheels', () => {
  it('steps with the arrow keys and clears the minutes at 24 h', () => {
    render(<Harness />);
    const hours = screen.getByRole('spinbutton', { name: 'Hours' });
    const minutes = screen.getByRole('spinbutton', { name: 'Minutes' });
    expect(minutes.getAttribute('aria-valuetext')).toBe('30 min');
    fireEvent.keyDown(minutes, { key: 'ArrowUp' });
    expect(minutes.getAttribute('aria-valuetext')).toBe('45 min');
    fireEvent.keyDown(hours, { key: 'ArrowUp' });
    expect(hours.getAttribute('aria-valuenow')).toBe('24');
    expect(screen.getByRole('spinbutton', { name: 'Minutes' }).getAttribute('aria-valuetext')).toBe('00 min');
    fireEvent.keyDown(hours, { key: 'Home' });
    expect(hours.getAttribute('aria-valuenow')).toBe('0');
  });
});

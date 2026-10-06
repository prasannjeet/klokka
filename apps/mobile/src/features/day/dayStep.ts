// The day page's arrows replace the route with the next or previous day (CHQ-169). The stack would play its one
// forward transition both ways, so the arrow names its direction and the day route slides in from that side. Any
// other way into a day (the week, a notification) keeps the platform's own transition.
export type DayStep = 'back' | 'forward';

export function dayStepAnimation(step: unknown): 'slide_from_left' | 'slide_from_right' | 'default' {
  if (step === 'back') return 'slide_from_left';
  if (step === 'forward') return 'slide_from_right';
  return 'default';
}

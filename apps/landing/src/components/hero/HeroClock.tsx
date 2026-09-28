/**
 * The paddle move: a Swiss railway clock at the real time. The hands are CSS animations (58.5 s sweep and a
 * 1.5 s wait for the second hand, a stepping minute hand, a linear hour hand); the inline script right after
 * the SVG runs during HTML parsing and sets negative delays from the device clock, so the first paint already
 * shows the right time. Under reduced motion the hands stand still at the load time.
 */
const CLOCK_SYNC = `(function(){var c=document.getElementById('hero-clock');if(!c)return;var n=new Date(),s=n.getSeconds()+n.getMilliseconds()/1e3,m=n.getMinutes(),h=n.getHours()%12,p=c.style;p.setProperty('--clock-s',-s+'s');p.setProperty('--clock-m',-(m*60+s)+'s');p.setProperty('--clock-h',-(h*3600+m*60+s)+'s');p.setProperty('--clock-s-deg',Math.min(s/58.5*360,360)+'deg');p.setProperty('--clock-m-deg',m*6+'deg');p.setProperty('--clock-h-deg',(h+m/60)*30+'deg')})();`;

const TICKS = Array.from({ length: 60 }, (_, i) => i);

export function HeroClock({ label }: { label: string }) {
  return (
    <div className="clock-wrap" role="img" aria-label={label}>
      <svg
        className="clock"
        id="hero-clock"
        viewBox="0 0 200 200"
        aria-hidden="true"
        suppressHydrationWarning
      >
        <circle className="face" cx="100" cy="100" r="97" />
        <g>
          {TICKS.map((i) => {
            const hour = i % 5 === 0;
            return (
              <rect
                key={i}
                className="tick"
                x={hour ? 96.5 : 98.6}
                y="9"
                width={hour ? 7 : 2.8}
                height={hour ? 24 : 9}
                transform={`rotate(${i * 6} 100 100)`}
              />
            );
          })}
        </g>
        <g className="hand hour">
          <rect x="94.5" y="44" width="11" height="70" rx="1.5" />
        </g>
        <g className="hand minute">
          <rect x="95.5" y="16" width="9" height="98" rx="1.5" />
        </g>
        <g className="hand second">
          <rect x="99" y="34" width="2" height="92" />
          <circle cx="100" cy="44" r="9.5" />
        </g>
        <circle className="pin" cx="100" cy="100" r="4" />
      </svg>
      <script dangerouslySetInnerHTML={{ __html: CLOCK_SYNC }} />
    </div>
  );
}

/*
  Klokka mockup shell: theme and mode switcher.
  Sets data-theme and data-mode on <html>. No storage of any kind (works in a sandboxed iframe).

  Initial state, in order of precedence:
    1. URL query: ?theme=signal|nightshift|clay  ?mode=auto|light|dark  ?bar=0 (hide the bar)
    2. attributes already present on <html> (a mockup may hardcode data-theme="clay")
    3. defaults: theme "signal", mode "auto" (follows prefers-color-scheme)

  Script API for mockup scripts:
    KlokkaShell.setTheme("clay"); KlokkaShell.setMode("dark"); KlokkaShell.get() -> { theme, mode }
    document.addEventListener("klokka:change", (e) => e.detail)   // { theme, mode }
*/
(function () {
  "use strict";
  var THEMES = [
    { id: "signal", label: "Signal", dot: "#FF4F00" },
    { id: "nightshift", label: "Nightshift", dot: "#FF006E" },
    { id: "clay", label: "Clay", dot: "#D4794A" }
  ];
  var MODES = ["auto", "light", "dark"];
  var ICONS = {
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
  };

  var root = document.documentElement;
  var params = new URLSearchParams(location.search);
  var state = { theme: "signal", mode: "auto" };

  function validTheme(t) { return THEMES.some(function (x) { return x.id === t; }) ? t : null; }
  function validMode(m) { return MODES.indexOf(m) >= 0 ? m : null; }

  state.theme = validTheme(params.get("theme")) || validTheme(root.getAttribute("data-theme")) || "signal";
  state.mode = validMode(params.get("mode")) || validMode(root.getAttribute("data-mode")) || "auto";

  function apply() {
    root.setAttribute("data-theme", state.theme);
    if (state.mode === "auto") root.removeAttribute("data-mode");
    else root.setAttribute("data-mode", state.mode);
    render();
    document.dispatchEvent(new CustomEvent("klokka:change", { detail: { theme: state.theme, mode: state.mode } }));
  }

  var bar, themeButtons = [], modeButtons = [], vp, collapse;

  function build() {
    bar = document.createElement("div");
    bar.className = "kk-devbar";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Design switcher: theme, colour mode, viewport");

    THEMES.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Theme " + t.label);
      b.innerHTML = '<span class="kk-dot" style="--kk-dot:' + t.dot + '"></span><span class="kk-label">' + t.label + "</span>";
      b.addEventListener("click", function () { state.theme = t.id; apply(); });
      themeButtons.push([t.id, b]);
      bar.appendChild(b);
    });

    bar.appendChild(sep());

    MODES.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Colour mode " + m);
      b.title = m === "auto" ? "Follow the device setting" : m;
      b.innerHTML = ICONS[m] + '<span class="kk-label">' + m.charAt(0).toUpperCase() + m.slice(1) + "</span>";
      b.addEventListener("click", function () { state.mode = m; apply(); });
      modeButtons.push([m, b]);
      bar.appendChild(b);
    });

    bar.appendChild(sep());

    vp = document.createElement("span");
    vp.className = "kk-vp";
    vp.setAttribute("aria-live", "off");
    bar.appendChild(vp);

    collapse = document.createElement("button");
    collapse.type = "button";
    collapse.className = "kk-collapse";
    collapse.setAttribute("aria-label", "Collapse the design switcher");
    collapse.innerHTML = ICONS.clock;
    collapse.addEventListener("click", function () {
      var c = bar.classList.toggle("is-collapsed");
      collapse.setAttribute("aria-label", (c ? "Expand" : "Collapse") + " the design switcher");
      collapse.setAttribute("aria-expanded", String(!c));
    });
    collapse.setAttribute("aria-expanded", "true");
    bar.appendChild(collapse);

    document.body.appendChild(bar);
    if (params.get("bar") === "0") bar.hidden = true;
    updateViewport();
  }

  function sep() { var s = document.createElement("span"); s.className = "kk-sep"; s.setAttribute("aria-hidden", "true"); return s; }

  function render() {
    themeButtons.forEach(function (p) { p[1].setAttribute("aria-pressed", String(p[0] === state.theme)); });
    modeButtons.forEach(function (p) { p[1].setAttribute("aria-pressed", String(p[0] === state.mode)); });
    var active = THEMES.filter(function (t) { return t.id === state.theme; })[0];
    if (collapse && active) collapse.style.color = active.dot;
  }

  var raf = 0;
  function updateViewport() {
    if (!vp) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      vp.textContent = window.innerWidth + " × " + window.innerHeight;
    });
  }
  window.addEventListener("resize", updateViewport);

  window.KlokkaShell = {
    setTheme: function (t) { if (validTheme(t)) { state.theme = t; apply(); } },
    setMode: function (m) { if (validMode(m)) { state.mode = m; apply(); } },
    get: function () { return { theme: state.theme, mode: state.mode }; },
    themes: THEMES.map(function (t) { return t.id; })
  };

  /* Apply attributes immediately so the first paint is already themed; build the bar once the body exists. */
  root.setAttribute("data-theme", state.theme);
  if (state.mode === "auto") root.removeAttribute("data-mode"); else root.setAttribute("data-mode", state.mode);

  if (document.body) { build(); render(); }
  else document.addEventListener("DOMContentLoaded", function () { build(); render(); });
})();

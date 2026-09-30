"""Swedish working days and full-time hours per month, from Lag (1989:253) om allmänna helgdagar."""
from datetime import date, timedelta

WEEKDAYS_SV = ["mån", "tis", "ons", "tor", "fre", "lör", "sön"]
MONTHS_SV = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti",
             "september", "oktober", "november", "december"]
HOURS_PER_DAY = 8  # 40 h/week full time (ATL 5 §) / 5 days


def easter(y: int) -> date:
    # Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
    a = y % 19; b = y // 100; c = y % 100; d = b // 4; e = b % 4
    f = (b + 8) // 25; g = (b - f + 1) // 3; h = (19 * a + b - d - g + 15) % 30
    i = c // 4; k = c % 4; l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31; day = (h + l - 7 * m + 114) % 31 + 1
    return date(y, month, day)


def saturday_between(y, m1, d1, m2, d2):
    d = date(y, m1, d1)
    while d <= date(y, m2, d2):
        if d.weekday() == 5:
            return d
        d += timedelta(days=1)
    raise ValueError("no saturday")


def legal_holidays(y):
    e = easter(y)
    return {
        date(y, 1, 1): "Nyårsdagen",
        date(y, 1, 6): "Trettondedag jul",
        e - timedelta(days=2): "Långfredagen",
        e: "Påskdagen",
        e + timedelta(days=1): "Annandag påsk",
        date(y, 5, 1): "Första maj",
        e + timedelta(days=39): "Kristi himmelsfärdsdag",
        e + timedelta(days=49): "Pingstdagen",
        date(y, 6, 6): "Sveriges nationaldag",
        saturday_between(y, 6, 20, 6, 26): "Midsommardagen",
        saturday_between(y, 10, 31, 11, 6): "Alla helgons dag",
        date(y, 12, 25): "Juldagen",
        date(y, 12, 26): "Annandag jul",
    }


def de_facto_off(y):
    mids = saturday_between(y, 6, 20, 6, 26) - timedelta(days=1)
    return {mids: "Midsommarafton", date(y, 12, 24): "Julafton", date(y, 12, 31): "Nyårsafton"}


for y in (2026, 2027):
    hol = legal_holidays(y)
    eves = de_facto_off(y)
    print(f"\n## {y}: helgdagar")
    for d in sorted(hol):
        print(f"{d.isoformat()} {WEEKDAYS_SV[d.weekday()]}  {hol[d]}")
    print("de facto lediga aftnar (ej allmän helgdag):")
    for d in sorted(eves):
        print(f"{d.isoformat()} {WEEKDAYS_SV[d.weekday()]}  {eves[d]}")
    print(f"\n| Månad | Vardagar mån-fre | Helgdag på vardag | Arbetsdagar (lag) | Timmar (lag) | Afton på vardag | Arbetsdagar (praxis) | Timmar (praxis) |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|")
    tot = [0] * 7
    for m in range(1, 13):
        d = date(y, m, 1); wk = hw = ew = 0
        while d.month == m:
            if d.weekday() < 5:
                wk += 1
                if d in hol:
                    hw += 1
                elif d in eves:
                    ew += 1
            d += timedelta(days=1)
        law = wk - hw; prac = law - ew
        row = [wk, hw, law, law * HOURS_PER_DAY, ew, prac, prac * HOURS_PER_DAY]
        tot = [a + b for a, b in zip(tot, row)]
        print(f"| {MONTHS_SV[m-1]} | " + " | ".join(str(x) for x in row) + " |")
    print("| **Totalt** | " + " | ".join(f"**{x}**" for x in tot) + " |")

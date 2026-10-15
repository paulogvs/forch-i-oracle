"""test-bracket.py -- FORCH.i ORACLE: knockout bracket check against the live API.

Dumps the bracket (R32 -> Final) and FAILS when the bracket is broken:

  - a required round (R32 / R16) comes back empty, or
  - the same team appears twice inside one round (the "Chequia twice" bug the
    sibling test-full-system.ts also checks for).

Exit codes:
  0 = bracket OK
  1 = bracket is broken (or the endpoint answered with a non-JSON / error status)
  2 = UNKNOWN -- the API is not reachable, so NOTHING was verified. This must
      never read as green: a check that could not run is not a passing check.

Usage:
  python scripts/test-bracket.py
  ORACLE_API_URL=http://localhost:3003 python scripts/test-bracket.py
"""

import json
import os
import sys
import urllib.error
import urllib.request

BASE_URL = os.environ.get('ORACLE_API_URL', 'http://localhost:3000').rstrip('/')
API_URL = BASE_URL + '/api/fixture'
TIMEOUT_SECONDS = 30

# (label, bracket key) for the rounds that are dumped. R32/R16 must be populated;
# QF/SF are checked only when present (the app builds them progressively).
REQUIRED_ROUNDS = [('R32', 'roundOf32'), ('R16', 'roundOf16')]
OPTIONAL_ROUNDS = [('QF', 'quarters'), ('SF', 'semis')]


def fetch_fixture():
    """POST to the fixture endpoint and return the decoded response payload."""
    req = urllib.request.Request(
        API_URL, data=b'{}', headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        return json.loads(resp.read())


def repeated_teams(matches):
    """Teams that appear more than once inside a single round."""
    seen = {}
    for m in matches:
        for side in ('homeTeam', 'awayTeam'):
            team = m.get(side)
            if team and team != 'TBD':
                seen[team] = seen.get(team, 0) + 1
    return sorted(t for t, n in seen.items() if n > 1)


def bracket_problems(bracket):
    """Return the defects found in the bracket (empty list == healthy)."""
    problems = []
    for label, key in REQUIRED_ROUNDS + OPTIONAL_ROUNDS:
        matches = [m for m in (bracket.get(key) or []) if m]
        if not matches:
            if (label, key) in REQUIRED_ROUNDS:
                problems.append(f'{label} is empty -- the endpoint produced no {key}')
            continue
        repeated = repeated_teams(matches)
        if repeated:
            problems.append(f'{label} repeats team(s): {", ".join(repeated)}')

    final = bracket.get('final') or {}
    if final.get('homeTeam') and final.get('homeTeam') == final.get('awayTeam'):
        problems.append(f'FINAL has the same team on both sides: {final["homeTeam"]}')
    return problems


def print_round(label, matches):
    print(f'=== {label} ===')
    for m in matches or []:
        if m:
            print(f"  {m.get('id', '?')}: {m.get('homeTeam', '?')} vs "
                  f"{m.get('awayTeam', '?')} -> {m.get('winner', '?')}")
    print()


def main():
    """0 = OK, 1 = broken, 2 = UNKNOWN (never reachable from a green run)."""
    try:
        data = fetch_fixture()
    except urllib.error.HTTPError as exc:
        print(f'FAIL: {API_URL} answered HTTP {exc.code}')
        return 1
    except (urllib.error.URLError, OSError) as exc:
        print(f'UNKNOWN: no API answering at {API_URL} -- nothing verified ({exc})')
        return 2
    except ValueError as exc:  # the endpoint did not honor its JSON contract
        print(f'FAIL: {API_URL} did not return JSON ({exc})')
        return 1

    bracket = data.get('bracket') or {}
    for label, key in REQUIRED_ROUNDS + OPTIONAL_ROUNDS:
        print_round(label, bracket.get(key))

    final = bracket.get('final') or {}
    print(f"FINAL: {final.get('homeTeam', '?')} vs {final.get('awayTeam', '?')} "
          f"-> {final.get('winner', '?')}")
    print()

    print('=== Top8 ===')
    for t in (data.get('top8') or [])[:8]:
        print(f"  {t.get('team', '?')}: {t.get('pct', 0):.1f}%")
    print()

    problems = bracket_problems(bracket)
    if problems:
        print(f'FAIL: bracket is broken ({len(problems)} finding(s))')
        for p in problems:
            print(f'  - {p}')
        return 1

    print('OK: required rounds are populated and no team is repeated inside a round')
    return 0


if __name__ == '__main__':
    sys.exit(main())

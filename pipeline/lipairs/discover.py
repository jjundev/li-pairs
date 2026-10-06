"""전체 ETF 목록에서 롱숏 페어 후보를 뽑아 candidates.md 로 쓴다.

이름 규칙만으로는 기초자산을 확정할 수 없으므로 결과는 사람이 검토해 pairs.yaml 에 옮긴다.
"""
import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

from .bars import http_get
from .pairs import load_pairs

NAVER_ETF = "https://finance.naver.com/api/sise/etfItemList.nhn"
NASDAQ_ETF = "https://api.nasdaq.com/api/screener/etf?download=true"

KR_RULES = [("인버스2X", -2.0), ("인버스", -1.0), ("레버리지", 2.0)]

US_ALIAS = {"TESLA": "TSLA", "SPACEX": "SPCX", "SEMICONDUCTOR": "SOX", "SEMICONDUCTORS": "SOX"}
PROSHARES = re.compile(r"^ProShares (?:Trust )?(UltraPro Short|UltraShort|UltraPro|Ultra|Short) (.+)$")
PS_MULT = {"UltraPro Short": -3.0, "UltraShort": -2.0, "UltraPro": 3.0, "Ultra": 2.0, "Short": -1.0}
BULLBEAR = re.compile(r"Daily (.+?) (Bull|Bear) (\d+(?:\.\d+)?)X\b")
LONGSHORT = re.compile(r"\b(\d+(?:\.\d+)?)X (?:Daily )?(Long|Short|Inverse) (\S+)")


def kr_classify(name: str):
    body = name.split(" ", 1)[1] if " " in name else name
    body = re.sub(r"\(.*?\)", "", body).replace(" ", "")
    for pat, mult in KR_RULES:
        if pat in body:
            key = re.sub(r"선물|단일종목", "", body.replace(pat, ""))
            return (key or "200", mult)
    return None


def _us_key(s: str) -> str:
    s = re.sub(r"\s+ETF$", "", s.strip()).upper()
    return US_ALIAS.get(s, s)


def us_classify(name: str):
    if m := PROSHARES.match(name):
        return (_us_key(m.group(2)), PS_MULT[m.group(1)])
    if m := BULLBEAR.search(name):
        n = float(m.group(3))
        return (_us_key(m.group(1)), n if m.group(2) == "Bull" else -n)
    if m := LONGSHORT.search(name):
        n = float(m.group(1))
        return (_us_key(m.group(3)), n if m.group(2) == "Long" else -n)
    return None


def group_candidates(rows):
    groups = defaultdict(list)
    for market, symbol, name in rows:
        hit = kr_classify(name) if market == "KR" else us_classify(name)
        if hit:
            key, mult = hit
            groups[(market, key)].append((symbol, name, float(mult)))
    return dict(groups)


def _yaml_leg(symbol: str, name: str, mult: float) -> str:
    m = int(mult) if mult.is_integer() else mult
    return f'    - {{symbol: "{symbol}", name: {json.dumps(name, ensure_ascii=False)}, mult: {m}}}'


def render_markdown(groups, known) -> str:
    out = ["# 롱숏 페어 후보", "", "검토 후 YAML 조각을 pairs.yaml 끝에 붙인다. 이름 규칙이 틀린 그룹은 버린다.", ""]
    for (market, key), legs in sorted(groups.items()):
        longs = [l for l in legs if l[2] > 0]
        shorts = [l for l in legs if l[2] < 0]
        if not longs or not shorts or all((market, s) in known for s, _, _ in legs):
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", key.lower()).strip("-") or longs[0][0].lower()
        out += [f"## {market} · {key}", "", "| 방향 | 종목 | 이름 | 배율 |", "|---|---|---|---|"]
        out += [f"| {'롱' if m > 0 else '숏'} | {s} | {n} | {m:+g}x |" for s, n, m in longs + shorts]
        out += ["", "```yaml", f"- id: {market.lower()}-{slug}", f"  market: {market}", f"  underlying: {key}", "  longs:"]
        out += [_yaml_leg(*l) for l in longs] + ["  shorts:"] + [_yaml_leg(*s) for s in shorts] + ["```", ""]
    return "\n".join(out)


def fetch_rows():
    kr = json.loads(http_get(NAVER_ETF).decode("euc-kr", "ignore"))["result"]["etfItemList"]
    us = json.loads(http_get(NASDAQ_ETF, headers={"Accept": "application/json"}))["data"]["data"]["rows"]
    return [("KR", x["itemcode"], x["itemname"]) for x in kr] + [("US", x["symbol"], x["companyName"]) for x in us]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="롱숏 페어 후보 추출")
    ap.add_argument("--pairs", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args(argv)
    known = {(p.market, leg.symbol) for p in load_pairs(args.pairs) for leg in p.legs()}
    Path(args.out).write_text(render_markdown(group_candidates(fetch_rows()), known), encoding="utf-8")
    print(f"→ {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

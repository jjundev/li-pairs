"""pairs.yaml → web/public/data/{pairs.json, ohlc/*.json}.

한 종목 수집이 실패하면 이전 파일을 그대로 두고 stale 로 표시한다.
"""
import argparse
import json
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

from .bars import Bar, FetchError
from .fetch_kr import fetch_kr
from .fetch_us import fetch_us
from .pairs import Leg, Pair, load_pairs

CURRENCY = {"KR": "KRW", "US": "USD"}
KST = timezone(timedelta(hours=9))
Fetcher = Callable[[str], list[Bar]]


def ohlc_name(market: str, symbol: str) -> str:
    return f"ohlc/{market}_{symbol}.json"


def _dump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def _last_date(path: Path):
    try:
        bars = json.loads(path.read_text(encoding="utf-8"))["bars"]
    except (FileNotFoundError, json.JSONDecodeError, KeyError, TypeError):
        return None
    return bars[-1][0] if bars else None


def _leg_json(market: str, leg: Leg, status: dict) -> dict:
    mult = int(leg.mult) if leg.mult.is_integer() else leg.mult
    return {"symbol": leg.symbol, "name": leg.name, "mult": mult,
            "file": ohlc_name(market, leg.symbol), **status[(market, leg.symbol)]}


def build(pairs: list[Pair], out_dir: Path, fetchers: dict[str, Fetcher], now: datetime,
          pause: float = 0.0, log=print) -> dict:
    out_dir = Path(out_dir)
    (out_dir / "ohlc").mkdir(parents=True, exist_ok=True)
    status: dict[tuple[str, str], dict] = {}
    for p in pairs:
        for leg in p.legs():
            key = (p.market, leg.symbol)
            if key in status:
                continue
            path = out_dir / ohlc_name(*key)
            try:
                bars = fetchers[p.market](leg.symbol)
                path.write_text(_dump({"symbol": leg.symbol, "market": p.market,
                                       "currency": CURRENCY[p.market], "bars": bars}), encoding="utf-8")
                status[key] = {"available": True, "stale": False, "lastDate": bars[-1][0]}
            except FetchError as e:
                log(f"[실패] {p.market} {leg.symbol}: {e}")
                prev = _last_date(path)
                status[key] = {"available": prev is not None, "stale": prev is not None, "lastDate": prev}
            if pause:
                time.sleep(pause)
    doc = {
        "generatedAt": now.isoformat(timespec="minutes"),
        "pairs": [{"id": p.id, "market": p.market, "underlying": p.underlying,
                   "longs": [_leg_json(p.market, leg, status) for leg in p.longs],
                   "shorts": [_leg_json(p.market, leg, status) for leg in p.shorts]} for p in pairs],
    }
    (out_dir / "pairs.json").write_text(_dump(doc), encoding="utf-8")
    return doc


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="롱숏 페어 시세 JSON 생성")
    ap.add_argument("--pairs", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--pause", type=float, default=0.3)
    args = ap.parse_args(argv)
    doc = build(load_pairs(args.pairs), Path(args.out), {"KR": fetch_kr, "US": fetch_us},
                datetime.now(KST), pause=args.pause)
    legs = [leg for p in doc["pairs"] for leg in p["longs"] + p["shorts"]]
    print(f"종목 {len(legs)}개 중 사용 가능 {sum(l['available'] for l in legs)}개, 갱신 실패 {sum(l['stale'] for l in legs)}개")
    if not any(leg["available"] for leg in legs):
        print("모든 종목 수집 실패", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

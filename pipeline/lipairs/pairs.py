"""pairs.yaml: 사람이 확정한 롱숏 페어 목록. 순서 = 화면 목록 순서."""
from dataclasses import dataclass
from pathlib import Path

import re

import yaml

MARKETS = {"KR", "US"}


class PairsError(ValueError):
    pass


@dataclass(frozen=True)
class Leg:
    symbol: str
    name: str
    mult: float


@dataclass(frozen=True)
class Pair:
    id: str
    market: str
    underlying: str
    longs: tuple[Leg, ...]
    shorts: tuple[Leg, ...]
    index: Leg | None = None

    def legs(self) -> tuple[Leg, ...]:
        return self.longs + self.shorts


def _leg(raw: dict, where: str) -> Leg:
    sym = raw.get("symbol")
    if not isinstance(sym, str) or not sym:
        raise PairsError(f"{where}: symbol은 따옴표로 감싼 문자열이어야 합니다 (받은 값 {sym!r})")
    mult = raw.get("mult")
    if isinstance(mult, bool) or not isinstance(mult, (int, float)) or mult == 0:
        raise PairsError(f"{where}: mult는 0이 아닌 숫자여야 합니다 (받은 값 {mult!r})")
    return Leg(sym, str(raw.get("name") or sym), float(mult))


def parse_pairs(data: object) -> list[Pair]:
    if not isinstance(data, list):
        raise PairsError("pairs.yaml 최상위는 목록이어야 합니다")
    pairs, ids, idx_files = [], set(), {}
    for i, raw in enumerate(data):
        pid = raw.get("id")
        where = f"pairs[{i}]({pid})"
        if not pid or pid in ids:
            raise PairsError(f"{where}: id 누락 또는 중복")
        ids.add(pid)
        market = raw.get("market")
        if market not in MARKETS:
            raise PairsError(f"{where}: market은 KR 또는 US (받은 값 {market!r})")
        longs = tuple(_leg(x, f"{where}.longs") for x in raw.get("longs") or [])
        shorts = tuple(_leg(x, f"{where}.shorts") for x in raw.get("shorts") or [])
        if not longs or not shorts:
            raise PairsError(f"{where}: 롱·숏 다리가 각각 하나 이상 필요합니다")
        if any(leg.mult <= 0 for leg in longs):
            raise PairsError(f"{where}: longs의 mult는 양수여야 합니다")
        if any(leg.mult >= 0 for leg in shorts):
            raise PairsError(f"{where}: shorts의 mult는 음수여야 합니다")
        syms = [leg.symbol for leg in longs + shorts]
        if len(set(syms)) != len(syms):
            raise PairsError(f"{where}: 같은 종목이 두 번 들어 있습니다")
        index = None
        if raw.get("index") is not None:
            ri = raw["index"]
            if not isinstance(ri, dict):
                raise PairsError(f"{where}.index: symbol·name을 가진 항목이어야 합니다")
            index = _leg({**ri, "mult": 1}, f"{where}.index")
            # 지수 파일 이름은 영숫자만 남기므로(^SOX → SOX) 다른 기호가 같은 파일을 덮지 않게 막는다.
            fkey = (market, re.sub(r"[^A-Za-z0-9]", "", index.symbol))
            if idx_files.setdefault(fkey, index.symbol) != index.symbol:
                raise PairsError(f"{where}.index: {index.symbol!r}와 {idx_files[fkey]!r}의 파일 이름이 같아집니다")
        pairs.append(Pair(pid, market, str(raw.get("underlying") or pid), longs, shorts, index))
    return pairs


def load_pairs(path) -> list[Pair]:
    return parse_pairs(yaml.safe_load(Path(path).read_text(encoding="utf-8")))

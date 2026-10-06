"""공통: 일봉 한 줄 = [yyyymmdd, open, high, low, close, volume]."""
import time
import urllib.error
import urllib.request

Bar = list

UA = {"User-Agent": "Mozilla/5.0"}


class FetchError(Exception):
    pass


def sig6(x: float) -> float:
    return float(f"{x:.6g}")


def http_get(url, *, headers=None, retries=3, backoff=2.0, opener=urllib.request.urlopen, sleep=time.sleep) -> bytes:
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    last = None
    for attempt in range(retries):
        try:
            with opener(req, timeout=20) as r:
                return r.read()
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last = e
            if attempt < retries - 1:
                sleep(backoff * (attempt + 1))
    raise FetchError(f"{url}: {last!r}")

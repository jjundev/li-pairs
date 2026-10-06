# li-pairs

한국·미국 레버리지/인버스 "롱숏 페어" 차트 (모바일).

- 데이터 갱신: `cd pipeline && uv run python -m lipairs.build --pairs pairs.yaml --out ../web/public/data`
- 페이지 개발: `cd web && npm run dev`
- 새 페어 후보: `cd pipeline && uv run python -m lipairs.discover --pairs pairs.yaml --out candidates.md` → 검토 후 `pairs.yaml`에 추가

"""공개 저장소의 예약 실행은 60일 동안 활동이 없으면 GitHub가 꺼 버린다. 워크플로가 스스로 다시 켜 두는지 확인."""
from pathlib import Path

import yaml

WF = Path(__file__).resolve().parents[2] / ".github/workflows/data.yml"


def test_workflow_keeps_schedule_alive():
    wf = yaml.safe_load(WF.read_text())
    assert wf["permissions"]["actions"] == "write"
    steps = [s for job in wf["jobs"].values() for s in job.get("steps", [])]
    keep = [s for s in steps if "actions/workflows/data.yml/enable" in s.get("run", "")]
    assert len(keep) == 1
    assert keep[0]["env"]["GH_TOKEN"] == "${{ github.token }}"

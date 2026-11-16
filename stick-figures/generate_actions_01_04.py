#!/usr/bin/env python3
"""Generate stick-figure frames + continuous GIFs for actions 01–04.

01 Idle  — apply ping-pong loop onto stick frames (with palm/foot polygons)
02 Walk  — continuous walk cycle for review
03 Standing Punches — jab + strong punch sequence for review
04 Standing Kicks — high kick sequence for review

02–04 are for review only; do not merge into idle assets until confirmed.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw

from stick_draw import (
    GROUND_Y,
    W,
    H,
    base_ready,
    blend_pose,
    draw_stick,
    save_gif,
    save_strip,
)

ROOT = Path(__file__).resolve().parent


def idle_pose(i: int, n: int = 8) -> dict:
    t = i / (n - 1)
    bob = math.sin(t * math.pi)
    rise = bob * 12
    knee_open = bob * 5
    p = base_ready(rise=rise, knee_open=knee_open)
    # subtle hand bob
    p["wrist_L"] = (p["wrist_L"][0] + bob, p["wrist_L"][1] - bob * 2)
    p["wrist_R"] = (p["wrist_R"][0], p["wrist_R"][1] + bob)
    p["hand_L_deg"] = -55 - bob * 4
    p["hand_R_deg"] = 10 + bob * 3
    p["foot_L_deg"] = 18
    p["foot_R_deg"] = 8
    p["shoulder_L"] = (p["shoulder_L"][0], p["shoulder_L"][1] - bob * 1.5)
    return p


def walk_pose(i: int, n: int = 12) -> dict:
    """Fighting-game style forward walk facing right; 12-frame cycle."""
    phase = (i / n) * math.tau
    # stride: left leg (viewer L = char rear/right) and right (viewer R = lead)
    stride = 34.0
    lift = 18.0
    bob = abs(math.sin(phase)) * 6

    p = base_ready(rise=4 + bob * 0.3, knee_open=2)
    # pelvis sway
    pelvis_x = 198 + math.sin(phase) * 6
    p["pelvis"] = (pelvis_x, p["pelvis"][1])
    p["mid"] = (pelvis_x + 6, p["mid"][1])
    p["neck"] = (pelvis_x + 10, p["neck"][1])
    p["head"] = (pelvis_x + 8, p["head"][1])
    sw = 86.0
    p["shoulder_L"] = (p["neck"][0] - sw / 2 - 4, p["shoulder_L"][1])
    p["shoulder_R"] = (p["neck"][0] + sw / 2 - 6, p["shoulder_R"][1])

    # Leg cycle: when sin>0 viewer-L leg forward-ish in walk (rear becomes push)
    # Classic: alternate — use cos/sin for opposite legs
    lx = math.sin(phase) * stride
    rx = math.sin(phase + math.pi) * stride
    ly = max(0.0, math.sin(phase + math.pi / 2)) * lift  # lift when swinging
    ry = max(0.0, math.sin(phase + math.pi / 2 + math.pi)) * lift

    hip_l = (p["pelvis"][0] - 31, p["pelvis"][1] + 3)
    hip_r = (p["pelvis"][0] + 35, p["pelvis"][1] + 5)
    p["hip_L"], p["hip_R"] = hip_l, hip_r

    an_l = (hip_l[0] - 8 + lx, GROUND_Y - ly)
    an_r = (hip_r[0] + 10 + rx, GROUND_Y - ry)
    # knees halfway with bend
    kn_l = ((hip_l[0] + an_l[0]) / 2 - 8, (hip_l[1] + an_l[1]) / 2 - 8)
    kn_r = ((hip_r[0] + an_r[0]) / 2 + 6, (hip_r[1] + an_r[1]) / 2 - 6)
    p["knee_L"], p["knee_R"] = kn_l, kn_r
    p["ankle_L"], p["ankle_R"] = an_l, an_r

    # arms counter-swing slightly
    p["elbow_L"] = (p["shoulder_L"][0] - 4 + rx * 0.15, p["elbow_L"][1])
    p["wrist_L"] = (p["elbow_L"][0] + 28, p["elbow_L"][1] - 36)
    p["elbow_R"] = (p["shoulder_R"][0] + 8 - lx * 0.12, p["elbow_R"][1])
    p["wrist_R"] = (p["elbow_R"][0] - 16, p["elbow_R"][1] + 4)

    p["hand_L_deg"] = -50
    p["hand_R_deg"] = 8
    p["foot_L_deg"] = 12 if ly < 2 else 25
    p["foot_R_deg"] = 5 if ry < 2 else 20
    p["foot_L_lift"] = 10 if ly > 4 else 0
    p["foot_R_lift"] = 10 if ry > 4 else 0
    if ly > 4:
        p["foot_L_len"] = 24
    if ry > 4:
        p["foot_R_len"] = 24
    return p


def punch_keyframes() -> list[dict]:
    """Standing punches: ready → jab → ready → strong prep → strong hit → recover."""
    ready = base_ready(rise=2, knee_open=1)
    ready["hand_L_deg"] = -55
    ready["hand_R_deg"] = 10
    ready["foot_L_deg"] = 15
    ready["foot_R_deg"] = 5

    jab = dict(ready)
    # extend viewer-R arm (lead punch to the right) — actually in sprites lead punch
    # extends the forward arm. Viewer-right is often the lead when facing right.
    # From band2_f01: left arm extended (character left = viewer right when 3/4)
    jab["shoulder_R"] = (jab["shoulder_R"][0] + 18, jab["shoulder_R"][1] - 4)
    jab["shoulder_L"] = (jab["shoulder_L"][0] - 6, jab["shoulder_L"][1] + 4)
    jab["elbow_R"] = (jab["shoulder_R"][0] + 70, jab["shoulder_R"][1] + 8)
    jab["wrist_R"] = (jab["elbow_R"][0] + 55, jab["elbow_R"][1] + 2)
    jab["elbow_L"] = (jab["shoulder_L"][0] - 4, jab["shoulder_L"][1] + 40)
    jab["wrist_L"] = (jab["elbow_L"][0] + 18, jab["elbow_L"][1] - 32)
    jab["pelvis"] = (jab["pelvis"][0] + 8, jab["pelvis"][1] + 2)
    jab["knee_R"] = (jab["knee_R"][0] + 10, jab["knee_R"][1] + 4)
    jab["ankle_R"] = (jab["ankle_R"][0] + 8, GROUND_Y)
    jab["hand_R_deg"] = 0  # knuckles point right
    jab["hand_R_len"] = 26
    jab["hand_L_deg"] = -70
    jab["foot_R_deg"] = 0
    jab["foot_L_deg"] = 20
    jab["foot_L_lift"] = 4
    jab["neck"] = (jab["neck"][0] + 10, jab["neck"][1])
    jab["head"] = (jab["head"][0] + 10, jab["head"][1])
    jab["mid"] = (jab["mid"][0] + 8, jab["mid"][1])

    strong_prep = dict(ready)
    strong_prep["pelvis"] = (ready["pelvis"][0] - 6, ready["pelvis"][1] + 6)
    strong_prep["elbow_L"] = (ready["shoulder_L"][0] - 14, ready["shoulder_L"][1] + 55)
    strong_prep["wrist_L"] = (strong_prep["elbow_L"][0] + 10, strong_prep["elbow_L"][1] + 8)
    strong_prep["hand_L_deg"] = 200  # chambered, knuckles back-ish
    strong_prep["elbow_R"] = (ready["shoulder_R"][0] + 8, ready["shoulder_R"][1] + 48)
    strong_prep["wrist_R"] = (strong_prep["elbow_R"][0] - 8, strong_prep["elbow_R"][1] - 10)
    strong_prep["knee_L"] = (ready["knee_L"][0] - 6, ready["knee_L"][1] + 8)
    strong_prep["foot_L_lift"] = 0

    strong_hit = dict(ready)
    # rear hand (viewer L) drives the strong cross forward-right
    strong_hit["shoulder_L"] = (ready["shoulder_L"][0] + 28, ready["shoulder_L"][1] - 8)
    strong_hit["shoulder_R"] = (ready["shoulder_R"][0] - 16, ready["shoulder_R"][1] + 6)
    strong_hit["elbow_L"] = (strong_hit["shoulder_L"][0] + 75, strong_hit["shoulder_L"][1] + 6)
    strong_hit["wrist_L"] = (strong_hit["elbow_L"][0] + 58, strong_hit["elbow_L"][1])
    strong_hit["elbow_R"] = (strong_hit["shoulder_R"][0] + 4, strong_hit["shoulder_R"][1] + 50)
    strong_hit["wrist_R"] = (strong_hit["elbow_R"][0] - 22, strong_hit["elbow_R"][1] + 10)
    strong_hit["pelvis"] = (ready["pelvis"][0] + 14, ready["pelvis"][1])
    strong_hit["hip_L"] = (strong_hit["pelvis"][0] - 28, strong_hit["pelvis"][1] + 3)
    strong_hit["hip_R"] = (strong_hit["pelvis"][0] + 38, strong_hit["pelvis"][1] + 5)
    strong_hit["knee_L"] = (strong_hit["hip_L"][0] - 10, strong_hit["hip_L"][1] + 70)
    strong_hit["ankle_L"] = (strong_hit["knee_L"][0] - 4, GROUND_Y)
    strong_hit["knee_R"] = (strong_hit["hip_R"][0] + 20, strong_hit["hip_R"][1] + 60)
    strong_hit["ankle_R"] = (strong_hit["knee_R"][0] + 18, GROUND_Y)
    strong_hit["neck"] = (ready["neck"][0] + 16, ready["neck"][1])
    strong_hit["head"] = (ready["head"][0] + 16, ready["head"][1])
    strong_hit["mid"] = (ready["mid"][0] + 12, ready["mid"][1])
    strong_hit["hand_L_deg"] = 0
    strong_hit["hand_L_len"] = 28
    strong_hit["hand_R_deg"] = 200
    strong_hit["foot_L_deg"] = 10
    strong_hit["foot_R_deg"] = 0
    strong_hit["foot_R_lift"] = 12  # rear push toe

    # Sequence with holds for readable continuous anim
    seq = [
        ready,
        blend_pose(ready, jab, 0.45),
        jab,
        jab,
        blend_pose(jab, ready, 0.5),
        ready,
        strong_prep,
        blend_pose(strong_prep, strong_hit, 0.4),
        strong_hit,
        strong_hit,
        blend_pose(strong_hit, ready, 0.55),
        ready,
    ]
    return seq


def kick_keyframes() -> list[dict]:
    """Standing high kick: chamber → extend → peak → retract → land."""
    ready = base_ready(rise=0, knee_open=0)
    ready["hand_L_deg"] = -40
    ready["hand_R_deg"] = 15
    ready["foot_L_deg"] = 15
    ready["foot_R_deg"] = 5

    chamber = dict(ready)
    # viewer-R leg chambers up (kick leg); viewer-L is plant
    chamber["pelvis"] = (190.0, 310.0)
    chamber["hip_L"] = (160.0, 314.0)
    chamber["hip_R"] = (220.0, 308.0)
    chamber["knee_L"] = (155.0, 380.0)
    chamber["ankle_L"] = (152.0, GROUND_Y)
    chamber["knee_R"] = (250.0, 250.0)
    chamber["ankle_R"] = (265.0, 290.0)
    chamber["foot_R_deg"] = -40
    chamber["foot_R_lift"] = 0
    chamber["foot_R_len"] = 22
    chamber["foot_L_deg"] = 180  # plant toes often face somewhat opposite in chamber
    # actually plant foot toes typically still forward-right; keep ~0-20
    chamber["foot_L_deg"] = 10
    chamber["elbow_L"] = (chamber["shoulder_L"][0] - 10, chamber["shoulder_L"][1] + 35)
    chamber["wrist_L"] = (chamber["elbow_L"][0] - 8, chamber["elbow_L"][1] - 28)
    chamber["hand_L_deg"] = 200
    chamber["elbow_R"] = (chamber["shoulder_R"][0] + 20, chamber["shoulder_R"][1] + 40)
    chamber["wrist_R"] = (chamber["elbow_R"][0] + 8, chamber["elbow_R"][1] - 20)
    chamber["hand_R_deg"] = -20
    chamber["neck"] = (185.0, 200.0)
    chamber["head"] = (178.0, 172.0)
    chamber["mid"] = (188.0, 255.0)
    chamber["shoulder_L"] = (150.0, 210.0)
    chamber["shoulder_R"] = (225.0, 215.0)

    extend = dict(chamber)
    extend["knee_R"] = (300.0, 230.0)
    extend["ankle_R"] = (350.0, 210.0)
    extend["foot_R_deg"] = -25
    extend["foot_R_len"] = 30
    extend["pelvis"] = (175.0, 300.0)
    extend["hip_R"] = (210.0, 285.0)
    extend["hip_L"] = (145.0, 310.0)
    extend["knee_L"] = (148.0, 375.0)
    extend["ankle_L"] = (145.0, GROUND_Y)
    extend["neck"] = (160.0, 195.0)
    extend["head"] = (150.0, 168.0)
    extend["shoulder_L"] = (130.0, 205.0)
    extend["shoulder_R"] = (210.0, 200.0)
    extend["elbow_L"] = (110.0, 230.0)
    extend["wrist_L"] = (95.0, 215.0)
    extend["hand_L_deg"] = 200
    extend["mid"] = (170.0, 250.0)

    peak = dict(extend)
    # full extension lean away
    peak["pelvis"] = (160.0, 295.0)
    peak["hip_L"] = (130.0, 310.0)
    peak["hip_R"] = (200.0, 270.0)
    peak["knee_L"] = (135.0, 370.0)
    peak["ankle_L"] = (132.0, GROUND_Y)
    peak["knee_R"] = (320.0, 200.0)
    peak["ankle_R"] = (380.0, 175.0)
    peak["foot_R_deg"] = -30  # toes toward upper-right
    peak["foot_R_len"] = 32
    peak["neck"] = (145.0, 185.0)
    peak["head"] = (132.0, 160.0)
    peak["shoulder_L"] = (115.0, 195.0)
    peak["shoulder_R"] = (195.0, 188.0)
    peak["elbow_L"] = (95.0, 215.0)
    peak["wrist_L"] = (78.0, 200.0)
    peak["hand_L_deg"] = 195
    peak["elbow_R"] = (210.0, 175.0)
    peak["wrist_R"] = (225.0, 155.0)
    peak["hand_R_deg"] = -50
    peak["mid"] = (155.0, 240.0)
    peak["foot_L_deg"] = 175  # plant foot often points leftish for side kick balance
    # For Ryu high kick facing right, plant toes often point left (away). Use ~170.
    peak["foot_L_deg"] = 170

    retract = blend_pose(peak, chamber, 0.55)
    land = blend_pose(chamber, ready, 0.7)
    land["ankle_R"] = (ready["ankle_R"][0], GROUND_Y)
    land["foot_R_lift"] = 0
    land["foot_R_deg"] = 8

    return [
        ready,
        chamber,
        extend,
        peak,
        peak,
        retract,
        chamber,
        land,
        ready,
    ]


def write_action(
    action_id: str,
    name_zh: str,
    name_en: str,
    poses: list[dict],
    *,
    pingpong: bool,
    duration: int,
    review_only: bool,
) -> Path:
    out = ROOT / f"{action_id}-{name_en.lower().replace(' ', '-')}"
    out.mkdir(parents=True, exist_ok=True)
    frames = []
    meta = []
    n = len(poses)
    for i, pose in enumerate(poses):
        label = f"動作{action_id} {name_zh} {name_en}  {i + 1}/{n}"
        img = draw_stick(pose, label)
        path = out / f"frame_{i + 1:02d}.png"
        img.save(path)
        frames.append(img)
        meta.append(
            {
                k: ([round(v[0], 1), round(v[1], 1)] if isinstance(v, tuple) else round(v, 2))
                for k, v in pose.items()
            }
        )

    save_strip(
        frames,
        out / "strip.png",
        f"動作 {action_id} — {name_zh}（{name_en}）"
        + ("｜已套用循環至火柴人" if not review_only else "｜連續動畫（檢視用，尚未套用）"),
    )
    save_gif(frames, out / "preview.gif", duration=duration, pingpong=pingpong)

    (out / "joints.json").write_text(
        json.dumps(
            {
                "action_id": action_id,
                "name_zh": name_zh,
                "name_en": name_en,
                "frame_count": n,
                "pingpong": pingpong,
                "review_only": review_only,
                "hands_feet": "polygon (tip = finger/toe direction)",
                "frames": meta,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {out} ({n} frames, gif pingpong={pingpong})")
    return out


def apply_idle_loop_note(out: Path) -> None:
    """Extra: applied_loop.gif is the same ping-pong applied onto stick frames."""
    # already written as preview.gif with pingpong=True; also write alias name
    src = out / "preview.gif"
    alias = out / "applied_loop.gif"
    alias.write_bytes(src.read_bytes())


def main() -> None:
    # 01 Idle — apply continuous loop onto stick figures
    idle_poses = [idle_pose(i, 8) for i in range(8)]
    idle_out = write_action(
        "01",
        "待機",
        "Idle",
        idle_poses,
        pingpong=True,
        duration=110,
        review_only=False,
    )
    apply_idle_loop_note(idle_out)

    # 02 Walk — review continuous animation
    walk_poses = [walk_pose(i, 12) for i in range(12)]
    write_action(
        "02",
        "行走",
        "Walk",
        walk_poses,
        pingpong=False,
        duration=90,
        review_only=True,
    )

    # 03 Standing Punches
    write_action(
        "03",
        "站立拳",
        "Standing Punches",
        punch_keyframes(),
        pingpong=False,
        duration=100,
        review_only=True,
    )

    # 04 Standing Kicks
    write_action(
        "04",
        "站立踢",
        "Standing Kicks",
        kick_keyframes(),
        pingpong=False,
        duration=110,
        review_only=True,
    )

    # index blurb
    readme = ROOT / "REVIEW_01_04.md"
    readme.write_text(
        """# 火柴人動畫檢視（01–04）

## 新增條件
- **手掌／腳板**：以多邊形表示
- **尖端方向**＝手指／腳趾朝向（圖上有短白線輔助）

## 01 待機 Idle — 已套用循環
- 目錄：`01-idle/`
- `preview.gif` / `applied_loop.gif`：由 8 幀火柴人 **ping-pong 循環**（呼吸起伏）
- 各幀已含多邊形手掌與腳板

## 02–04 — 僅供檢視（尚未套用）
確認無誤後再指示套用。

| 動作 | 目錄 | 連續動畫 |
|------|------|----------|
| 02 行走 Walk | `02-walk/` | `preview.gif` |
| 03 站立拳 Standing Punches | `03-standing-punches/` | `preview.gif` |
| 04 站立踢 Standing Kicks | `04-standing-kicks/` | `preview.gif` |

各目錄另有 `frame_XX.png`、`strip.png`、`joints.json`。
""",
        encoding="utf-8",
    )
    print("done")


if __name__ == "__main__":
    main()

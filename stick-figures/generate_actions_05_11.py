#!/usr/bin/env python3
"""Generate stick-figure continuous animations for actions 05–11 (review only).

05 Close Attacks
06 Jump
07 Jump Attacks
08 Tatsumaki
09 Crouch
10 Crouching Punches
11 Crouching Kicks / Sweep
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from stick_draw import GROUND_Y, base_ready, blend_pose, draw_stick, save_gif, save_strip

ROOT = Path(__file__).resolve().parent


def write_action(
    action_id: str,
    name_zh: str,
    name_en: str,
    poses: list[dict],
    *,
    duration: int = 100,
    pingpong: bool = False,
) -> Path:
    slug = name_en.lower().replace(" ", "-").replace("/", "-")
    out = ROOT / f"{action_id}-{slug}"
    out.mkdir(parents=True, exist_ok=True)
    frames = []
    meta = []
    n = len(poses)
    for i, pose in enumerate(poses):
        label = f"動作{action_id} {name_zh} {name_en}  {i + 1}/{n}"
        img = draw_stick(pose, label)
        img.save(out / f"frame_{i + 1:02d}.png")
        frames.append(img)
        meta.append(
            {
                k: ([round(v[0], 1), round(v[1], 1)] if isinstance(v, tuple) else round(float(v), 2))
                for k, v in pose.items()
            }
        )
    save_strip(
        frames,
        out / "strip.png",
        f"動作 {action_id} — {name_zh}（{name_en}）｜連續動畫（檢視用，尚未套用）",
    )
    save_gif(frames, out / "preview.gif", duration=duration, pingpong=pingpong)
    (out / "joints.json").write_text(
        json.dumps(
            {
                "action_id": action_id,
                "name_zh": name_zh,
                "name_en": name_en,
                "frame_count": n,
                "review_only": True,
                "hands_feet": "polygon (tip = finger/toe direction)",
                "frames": meta,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {out} ({n} frames)")
    return out


def close_attacks() -> list[dict]:
    """05: close elbow → close knee."""
    ready = base_ready(rise=2)
    elbow_prep = dict(ready)
    elbow_prep["pelvis"] = (ready["pelvis"][0] + 6, ready["pelvis"][1] + 4)
    elbow_prep["elbow_R"] = (ready["shoulder_R"][0] + 8, ready["shoulder_R"][1] + 18)
    elbow_prep["wrist_R"] = (elbow_prep["elbow_R"][0] - 6, elbow_prep["elbow_R"][1] - 28)
    elbow_prep["hand_R_deg"] = -100
    elbow_prep["elbow_L"] = (ready["shoulder_L"][0] - 10, ready["shoulder_L"][1] + 50)
    elbow_prep["wrist_L"] = (elbow_prep["elbow_L"][0] + 8, elbow_prep["elbow_L"][1] + 10)
    elbow_prep["hand_L_deg"] = 200

    elbow_hit = dict(elbow_prep)
    elbow_hit["shoulder_R"] = (ready["shoulder_R"][0] + 22, ready["shoulder_R"][1] - 6)
    elbow_hit["elbow_R"] = (elbow_hit["shoulder_R"][0] + 36, elbow_hit["shoulder_R"][1] + 4)
    elbow_hit["wrist_R"] = (elbow_hit["elbow_R"][0] + 8, elbow_hit["elbow_R"][1] - 18)
    elbow_hit["hand_R_deg"] = -20
    elbow_hit["chest_nudge"] = True
    elbow_hit["neck"] = (ready["neck"][0] + 14, ready["neck"][1])
    elbow_hit["head"] = (ready["head"][0] + 14, ready["head"][1])
    elbow_hit["mid"] = (ready["mid"][0] + 12, ready["mid"][1])
    elbow_hit["pelvis"] = (ready["pelvis"][0] + 12, ready["pelvis"][1])

    reset = base_ready(rise=1)
    knee_prep = dict(reset)
    knee_prep["knee_R"] = (reset["hip_R"][0] + 10, reset["hip_R"][1] + 20)
    knee_prep["ankle_R"] = (knee_prep["knee_R"][0] + 6, knee_prep["knee_R"][1] + 28)
    knee_prep["foot_R_deg"] = -60
    knee_prep["foot_R_lift"] = 0
    knee_prep["hand_L_deg"] = -40
    knee_prep["hand_R_deg"] = 20

    knee_hit = dict(knee_prep)
    knee_hit["pelvis"] = (reset["pelvis"][0] + 10, reset["pelvis"][1] - 4)
    knee_hit["knee_R"] = (reset["pelvis"][0] + 55, reset["pelvis"][1] - 10)
    knee_hit["ankle_R"] = (knee_hit["knee_R"][0] + 8, knee_hit["knee_R"][1] + 22)
    knee_hit["foot_R_deg"] = -20
    knee_hit["ankle_L"] = (reset["ankle_L"][0] - 4, GROUND_Y)
    knee_hit["elbow_L"] = (reset["shoulder_L"][0] - 16, reset["shoulder_L"][1] + 30)
    knee_hit["wrist_L"] = (knee_hit["elbow_L"][0] - 10, knee_hit["elbow_L"][1] - 20)

    return [
        ready,
        elbow_prep,
        elbow_hit,
        elbow_hit,
        blend_pose(elbow_hit, reset, 0.6),
        reset,
        knee_prep,
        knee_hit,
        knee_hit,
        blend_pose(knee_hit, ready, 0.55),
        ready,
    ]


def jump_cycle() -> list[dict]:
    """06: crouch → launch → apex → fall → land."""
    ready = base_ready()
    crouch = base_ready(rise=-18, knee_open=-12)
    crouch["pelvis"] = (198.0, 330.0)
    crouch["hip_L"] = (168.0, 334.0)
    crouch["hip_R"] = (232.0, 334.0)
    crouch["knee_L"] = (160.0, 380.0)
    crouch["knee_R"] = (240.0, 380.0)
    crouch["ankle_L"] = (155.0, GROUND_Y)
    crouch["ankle_R"] = (248.0, GROUND_Y)
    crouch["neck"] = (198.0, 240.0)
    crouch["head"] = (200.0, 214.0)
    crouch["mid"] = (198.0, 285.0)
    crouch["shoulder_L"] = (160.0, 250.0)
    crouch["shoulder_R"] = (236.0, 252.0)
    crouch["elbow_L"] = (150.0, 290.0)
    crouch["wrist_L"] = (158.0, 310.0)
    crouch["elbow_R"] = (246.0, 292.0)
    crouch["wrist_R"] = (238.0, 312.0)
    crouch["hand_L_deg"] = 90
    crouch["hand_R_deg"] = 90
    crouch["foot_L_deg"] = 10
    crouch["foot_R_deg"] = 5

    launch = dict(crouch)
    launch["pelvis"] = (200.0, 250.0)
    launch["hip_L"] = (175.0, 255.0)
    launch["hip_R"] = (230.0, 248.0)
    launch["knee_L"] = (170.0, 310.0)
    launch["ankle_L"] = (168.0, 360.0)
    launch["knee_R"] = (250.0, 220.0)
    launch["ankle_R"] = (255.0, 250.0)
    launch["neck"] = (205.0, 160.0)
    launch["head"] = (208.0, 132.0)
    launch["mid"] = (202.0, 205.0)
    launch["shoulder_L"] = (168.0, 170.0)
    launch["shoulder_R"] = (242.0, 168.0)
    launch["elbow_L"] = (155.0, 200.0)
    launch["wrist_L"] = (148.0, 175.0)
    launch["elbow_R"] = (255.0, 198.0)
    launch["wrist_R"] = (262.0, 172.0)
    launch["hand_L_deg"] = -90
    launch["hand_R_deg"] = -90
    launch["foot_L_deg"] = 80
    launch["foot_R_deg"] = -40
    launch["foot_L_lift"] = 8

    apex = dict(launch)
    apex["pelvis"] = (200.0, 160.0)
    apex["hip_L"] = (178.0, 168.0)
    apex["hip_R"] = (226.0, 168.0)
    apex["knee_L"] = (170.0, 210.0)
    apex["ankle_L"] = (165.0, 250.0)
    apex["knee_R"] = (235.0, 210.0)
    apex["ankle_R"] = (240.0, 250.0)
    apex["neck"] = (200.0, 70.0)
    apex["head"] = (200.0, 42.0)
    apex["mid"] = (200.0, 115.0)
    apex["shoulder_L"] = (162.0, 80.0)
    apex["shoulder_R"] = (238.0, 80.0)
    apex["elbow_L"] = (148.0, 110.0)
    apex["wrist_L"] = (140.0, 85.0)
    apex["elbow_R"] = (252.0, 110.0)
    apex["wrist_R"] = (260.0, 85.0)
    apex["foot_L_deg"] = 90
    apex["foot_R_deg"] = 90

    fall = dict(apex)
    fall["pelvis"] = (200.0, 240.0)
    fall["hip_L"] = (176.0, 248.0)
    fall["hip_R"] = (228.0, 248.0)
    fall["knee_L"] = (170.0, 300.0)
    fall["ankle_L"] = (168.0, 350.0)
    fall["knee_R"] = (234.0, 302.0)
    fall["ankle_R"] = (236.0, 352.0)
    fall["neck"] = (200.0, 145.0)
    fall["head"] = (200.0, 118.0)
    fall["mid"] = (200.0, 195.0)
    fall["shoulder_L"] = (162.0, 155.0)
    fall["shoulder_R"] = (238.0, 155.0)
    fall["elbow_L"] = (145.0, 130.0)
    fall["wrist_L"] = (138.0, 105.0)
    fall["elbow_R"] = (255.0, 130.0)
    fall["wrist_R"] = (262.0, 105.0)

    land = dict(crouch)
    land["hand_L_deg"] = 100
    land["hand_R_deg"] = 80

    return [
        ready,
        crouch,
        launch,
        apex,
        apex,
        fall,
        land,
        blend_pose(land, ready, 0.55),
        ready,
    ]


def jump_attacks() -> list[dict]:
    """07: air punch then air kick from jump apex."""
    air = jump_cycle()[3]  # apex
    punch = dict(air)
    punch["elbow_R"] = (air["shoulder_R"][0] + 55, air["shoulder_R"][1] + 8)
    punch["wrist_R"] = (punch["elbow_R"][0] + 40, punch["elbow_R"][1] + 4)
    punch["hand_R_deg"] = 0
    punch["elbow_L"] = (air["shoulder_L"][0] - 8, air["shoulder_L"][1] + 40)
    punch["wrist_L"] = (punch["elbow_L"][0] + 10, punch["elbow_L"][1] - 8)
    punch["hand_L_deg"] = 200
    punch["mid"] = (air["mid"][0] + 8, air["mid"][1])

    kick = dict(air)
    kick["pelvis"] = (190.0, 170.0)
    kick["hip_L"] = (165.0, 180.0)
    kick["hip_R"] = (215.0, 160.0)
    kick["knee_L"] = (160.0, 230.0)
    kick["ankle_L"] = (158.0, 270.0)
    kick["knee_R"] = (290.0, 150.0)
    kick["ankle_R"] = (340.0, 140.0)
    kick["foot_R_deg"] = -15
    kick["foot_R_len"] = 30
    kick["foot_L_deg"] = 100
    kick["neck"] = (175.0, 85.0)
    kick["head"] = (168.0, 58.0)
    kick["shoulder_L"] = (140.0, 95.0)
    kick["shoulder_R"] = (215.0, 90.0)
    kick["elbow_L"] = (120.0, 120.0)
    kick["wrist_L"] = (105.0, 100.0)
    kick["hand_L_deg"] = 200
    kick["elbow_R"] = (230.0, 70.0)
    kick["wrist_R"] = (245.0, 50.0)
    kick["hand_R_deg"] = -50
    kick["mid"] = (180.0, 130.0)

    return [
        air,
        blend_pose(air, punch, 0.45),
        punch,
        punch,
        blend_pose(punch, air, 0.5),
        air,
        blend_pose(air, kick, 0.4),
        kick,
        kick,
        blend_pose(kick, air, 0.55),
        air,
    ]


def tatsumaki() -> list[dict]:
    """08: spinning hurricane kick — 8 orientation steps then land."""
    ready = base_ready()
    crouch = jump_cycle()[1]
    poses = [ready, crouch]
    # spin around pelvis; extended kicking leg
    for i in range(8):
        ang = i * (math.pi / 4)
        cx, cy = 200.0, 180.0
        # torso facing rotates
        facing = math.cos(ang)
        p = base_ready()
        p["pelvis"] = (cx, cy)
        p["mid"] = (cx + facing * 6, cy - 40)
        p["neck"] = (cx + facing * 8, cy - 85)
        p["head"] = (cx + facing * 10, cy - 112)
        sw = 70
        p["shoulder_L"] = (cx - sw / 2 * math.cos(ang + 0.2), cy - 75 + 10 * math.sin(ang))
        p["shoulder_R"] = (cx + sw / 2 * math.cos(ang + 0.2), cy - 75 - 10 * math.sin(ang))
        # kick leg extended along spin tangent
        kick_ang = ang + math.pi / 2
        p["hip_L"] = (cx - 20, cy + 5)
        p["hip_R"] = (cx + 20, cy + 5)
        p["knee_R"] = (cx + math.cos(kick_ang) * 70, cy + math.sin(kick_ang) * 35)
        p["ankle_R"] = (cx + math.cos(kick_ang) * 120, cy + math.sin(kick_ang) * 55)
        p["foot_R_deg"] = math.degrees(kick_ang)
        p["foot_R_len"] = 28
        # tucked other leg
        p["knee_L"] = (cx - math.cos(kick_ang) * 25, cy + 25)
        p["ankle_L"] = (cx - math.cos(kick_ang) * 15, cy + 50)
        p["foot_L_deg"] = math.degrees(kick_ang + math.pi)
        # arms tucked
        p["elbow_L"] = (p["shoulder_L"][0] + 8, p["shoulder_L"][1] + 30)
        p["wrist_L"] = (p["elbow_L"][0] + 6, p["elbow_L"][1] + 8)
        p["elbow_R"] = (p["shoulder_R"][0] - 8, p["shoulder_R"][1] + 30)
        p["wrist_R"] = (p["elbow_R"][0] - 6, p["elbow_R"][1] + 8)
        p["hand_L_deg"] = 90
        p["hand_R_deg"] = 90
        p["face_deg"] = math.degrees(ang)
        poses.append(p)

    land = jump_cycle()[6]
    poses.extend([land, ready])
    return poses


def crouch_cycle() -> list[dict]:
    """09: stand → crouch transition → hold (ping-pong friendly)."""
    ready = base_ready()
    mid = base_ready(rise=-10, knee_open=-6)
    mid["pelvis"] = (198.0, 325.0)
    mid["hip_L"] = (170.0, 330.0)
    mid["hip_R"] = (230.0, 330.0)
    mid["knee_L"] = (155.0, 370.0)
    mid["knee_R"] = (245.0, 372.0)
    mid["ankle_L"] = (150.0, GROUND_Y)
    mid["ankle_R"] = (250.0, GROUND_Y)
    mid["neck"] = (200.0, 245.0)
    mid["head"] = (202.0, 220.0)
    mid["mid"] = (200.0, 285.0)
    mid["shoulder_L"] = (162.0, 255.0)
    mid["shoulder_R"] = (238.0, 255.0)
    mid["elbow_L"] = (155.0, 290.0)
    mid["wrist_L"] = (168.0, 275.0)
    mid["elbow_R"] = (245.0, 292.0)
    mid["wrist_R"] = (232.0, 278.0)
    mid["hand_L_deg"] = -60
    mid["hand_R_deg"] = -50
    mid["foot_L_deg"] = 15
    mid["foot_R_deg"] = 8
    mid["foot_L_lift"] = 6

    deep = dict(mid)
    deep["pelvis"] = (198.0, 350.0)
    deep["hip_L"] = (172.0, 355.0)
    deep["hip_R"] = (228.0, 355.0)
    deep["knee_L"] = (150.0, 385.0)
    deep["knee_R"] = (250.0, 388.0)
    deep["ankle_L"] = (148.0, GROUND_Y)
    deep["ankle_R"] = (252.0, GROUND_Y)
    deep["neck"] = (202.0, 275.0)
    deep["head"] = (204.0, 250.0)
    deep["mid"] = (200.0, 315.0)
    deep["shoulder_L"] = (165.0, 285.0)
    deep["shoulder_R"] = (235.0, 285.0)
    deep["elbow_L"] = (158.0, 315.0)
    deep["wrist_L"] = (172.0, 300.0)
    deep["elbow_R"] = (242.0, 318.0)
    deep["wrist_R"] = (228.0, 302.0)
    deep["foot_L_lift"] = 10
    deep["foot_R_lift"] = 0

    return [ready, mid, deep, deep, mid, ready]


def crouch_punches() -> list[dict]:
    """10: crouch jab + crouch strong."""
    crouch = crouch_cycle()[2]
    jab = dict(crouch)
    jab["shoulder_R"] = (crouch["shoulder_R"][0] + 20, crouch["shoulder_R"][1])
    jab["elbow_R"] = (jab["shoulder_R"][0] + 55, jab["shoulder_R"][1] + 10)
    jab["wrist_R"] = (jab["elbow_R"][0] + 45, jab["elbow_R"][1] + 8)
    jab["hand_R_deg"] = 5
    jab["hand_R_len"] = 24
    jab["elbow_L"] = (crouch["shoulder_L"][0] - 4, crouch["shoulder_L"][1] + 40)
    jab["wrist_L"] = (jab["elbow_L"][0] - 8, jab["elbow_L"][1] + 6)
    jab["hand_L_deg"] = 200
    jab["neck"] = (crouch["neck"][0] + 10, crouch["neck"][1])
    jab["head"] = (crouch["head"][0] + 10, crouch["head"][1])
    jab["mid"] = (crouch["mid"][0] + 8, crouch["mid"][1])

    strong = dict(crouch)
    strong["shoulder_L"] = (crouch["shoulder_L"][0] + 28, crouch["shoulder_L"][1] - 4)
    strong["elbow_L"] = (strong["shoulder_L"][0] + 60, strong["shoulder_L"][1] + 12)
    strong["wrist_L"] = (strong["elbow_L"][0] + 48, strong["elbow_L"][1] + 10)
    strong["hand_L_deg"] = 0
    strong["hand_L_len"] = 26
    strong["elbow_R"] = (crouch["shoulder_R"][0] - 6, crouch["shoulder_R"][1] + 45)
    strong["wrist_R"] = (strong["elbow_R"][0] - 16, strong["elbow_R"][1] + 8)
    strong["hand_R_deg"] = 200
    strong["pelvis"] = (crouch["pelvis"][0] + 10, crouch["pelvis"][1])
    strong["neck"] = (crouch["neck"][0] + 14, crouch["neck"][1])
    strong["head"] = (crouch["head"][0] + 14, crouch["head"][1])

    return [
        crouch,
        blend_pose(crouch, jab, 0.4),
        jab,
        jab,
        blend_pose(jab, crouch, 0.5),
        crouch,
        blend_pose(crouch, strong, 0.35),
        strong,
        strong,
        blend_pose(strong, crouch, 0.55),
        crouch,
    ]


def crouch_kicks_sweep() -> list[dict]:
    """11: crouch kick → sweep."""
    crouch = crouch_cycle()[2]
    low_kick = dict(crouch)
    low_kick["knee_R"] = (crouch["hip_R"][0] + 40, crouch["hip_R"][1] + 20)
    low_kick["ankle_R"] = (low_kick["knee_R"][0] + 45, GROUND_Y - 8)
    low_kick["foot_R_deg"] = 0
    low_kick["foot_R_len"] = 28
    low_kick["pelvis"] = (crouch["pelvis"][0] - 6, crouch["pelvis"][1])
    low_kick["hand_L_deg"] = -40
    low_kick["hand_R_deg"] = 20

    sweep_prep = dict(crouch)
    sweep_prep["pelvis"] = (180.0, 360.0)
    sweep_prep["wrist_L"] = (160.0, GROUND_Y - 6)
    sweep_prep["elbow_L"] = (165.0, 390.0)
    sweep_prep["hand_L_deg"] = 90
    sweep_prep["foot_L_lift"] = 12

    sweep = dict(sweep_prep)
    sweep["hip_R"] = (200.0, 355.0)
    sweep["knee_R"] = (280.0, 380.0)
    sweep["ankle_R"] = (360.0, GROUND_Y - 4)
    sweep["foot_R_deg"] = 0
    sweep["foot_R_len"] = 32
    sweep["neck"] = (165.0, 300.0)
    sweep["head"] = (158.0, 275.0)
    sweep["shoulder_L"] = (145.0, 320.0)
    sweep["shoulder_R"] = (200.0, 310.0)
    sweep["elbow_R"] = (210.0, 295.0)
    sweep["wrist_R"] = (225.0, 280.0)
    sweep["hand_R_deg"] = -30
    sweep["mid"] = (175.0, 340.0)
    sweep["pelvis"] = (175.0, 365.0)
    sweep["knee_L"] = (150.0, 395.0)
    sweep["ankle_L"] = (145.0, GROUND_Y)
    sweep["foot_L_deg"] = 20
    sweep["foot_L_lift"] = 14

    return [
        crouch,
        blend_pose(crouch, low_kick, 0.45),
        low_kick,
        low_kick,
        blend_pose(low_kick, crouch, 0.5),
        crouch,
        sweep_prep,
        sweep,
        sweep,
        blend_pose(sweep, crouch, 0.55),
        crouch,
    ]


def main() -> None:
    write_action("05", "近身攻擊", "Close Attacks", close_attacks(), duration=95)
    write_action("06", "跳躍", "Jump", jump_cycle(), duration=90)
    write_action("07", "跳躍攻擊", "Jump Attacks", jump_attacks(), duration=95)
    write_action("08", "旋風腳", "Tatsumaki", tatsumaki(), duration=80)
    write_action("09", "蹲下", "Crouch", crouch_cycle(), duration=110, pingpong=True)
    write_action("10", "蹲下拳", "Crouching Punches", crouch_punches(), duration=95)
    write_action("11", "蹲下踢掃堂腿", "Crouching Kicks Sweep", crouch_kicks_sweep(), duration=100)

    (ROOT / "REVIEW_05_11.md").write_text(
        """# 火柴人動畫檢視（05–11）

## 狀態
**僅供檢視，尚未套用到遊戲。** 確認無誤後再指示套用。

## 共通規格
- 白底；肩寬／跨寬橫槓；關節節點
- 多邊形手掌／腳板（尖端＝指／趾朝向）

## 目錄

| 動作 | 目錄 | 連續動畫 |
|------|------|----------|
| 05 近身攻擊 Close Attacks | `05-close-attacks/` | `preview.gif` |
| 06 跳躍 Jump | `06-jump/` | `preview.gif` |
| 07 跳躍攻擊 Jump Attacks | `07-jump-attacks/` | `preview.gif` |
| 08 旋風腳 Tatsumaki | `08-tatsumaki/` | `preview.gif` |
| 09 蹲下 Crouch | `09-crouch/` | `preview.gif`（ping-pong） |
| 10 蹲下拳 Crouching Punches | `10-crouching-punches/` | `preview.gif` |
| 11 蹲下踢／掃堂腿 | `11-crouching-kicks-sweep/` | `preview.gif` |

各目錄另有 `frame_XX.png`、`strip.png`、`joints.json`。
""",
        encoding="utf-8",
    )
    print("done 05-11")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Generate white-background stick figures for Action 01 (Idle) from SF2 CE Ryu sheet."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "01-idle"
SHEET = ROOT.parent / "assets" / "ryu-sf2ce-spritesheet.jpg"
W, H = 400, 480


def pose_for_frame(i: int, n: int = 8) -> dict[str, tuple[float, float]]:
    t = i / (n - 1)
    bob = math.sin(t * math.pi)
    rise = bob * 12
    knee_open = bob * 5

    pelvis = (198.0, 305.0 - rise * 0.4)
    hip_w = 54.0
    hip_l = (pelvis[0] - hip_w / 2 - 4, pelvis[1] + 3)
    hip_r = (pelvis[0] + hip_w / 2 + 8, pelvis[1] + 5)

    mid = (pelvis[0] + 6, pelvis[1] - 52 + rise * 0.1)
    neck = (pelvis[0] + 10, pelvis[1] - 105 + rise)
    shoulder_w = 86.0
    sh_l = (neck[0] - shoulder_w / 2 - 4, neck[1] + 10 - bob * 1.5)
    sh_r = (neck[0] + shoulder_w / 2 - 6, neck[1] + 16)
    head = (neck[0] + 8, neck[1] - 26)

    # Viewer-left arm: fist up near chin (char right / rear-high guard)
    el_l = (sh_l[0] - 6, sh_l[1] + 44 - rise * 0.15)
    wr_l = (el_l[0] + 30 + bob, el_l[1] - 38 - bob * 2)
    # Viewer-right arm: fist lower near waist (char left)
    el_r = (sh_r[0] + 10, sh_r[1] + 52)
    wr_r = (el_r[0] - 18, el_r[1] + 6 + bob)

    kn_l = (hip_l[0] - 20, hip_l[1] + 68 - knee_open)
    an_l = (kn_l[0] + 6, 422.0)
    kn_r = (hip_r[0] + 24, hip_r[1] + 64 - knee_open * 0.7)
    an_r = (kn_r[0] + 16, 422.0)

    return {
        "head": head,
        "neck": neck,
        "shoulder_L": sh_l,
        "shoulder_R": sh_r,
        "elbow_L": el_l,
        "elbow_R": el_r,
        "wrist_L": wr_l,
        "wrist_R": wr_r,
        "mid": mid,
        "hip_L": hip_l,
        "hip_R": hip_r,
        "pelvis": pelvis,
        "knee_L": kn_l,
        "knee_R": kn_r,
        "ankle_L": an_l,
        "ankle_R": an_r,
    }


def draw_stick(pose: dict, label: str) -> Image.Image:
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)

    def line(a, b, width=5):
        d.line([tuple(a), tuple(b)], fill=(20, 20, 20), width=width)

    def joint(p, r=7):
        x, y = p
        d.ellipse([x - r, y - r, x + r, y + r], fill=(20, 20, 20))

    line(pose["neck"], pose["mid"], 6)
    line(pose["mid"], pose["pelvis"], 6)
    line(pose["shoulder_L"], pose["shoulder_R"], 8)
    line(pose["hip_L"], pose["hip_R"], 7)
    sh_c = (
        (pose["shoulder_L"][0] + pose["shoulder_R"][0]) / 2,
        (pose["shoulder_L"][1] + pose["shoulder_R"][1]) / 2,
    )
    line(pose["neck"], sh_c, 5)

    for a, b in [
        ("shoulder_L", "elbow_L"),
        ("elbow_L", "wrist_L"),
        ("shoulder_R", "elbow_R"),
        ("elbow_R", "wrist_R"),
        ("hip_L", "knee_L"),
        ("knee_L", "ankle_L"),
        ("hip_R", "knee_R"),
        ("knee_R", "ankle_R"),
    ]:
        line(pose[a], pose[b], 5)

    for ank in (pose["ankle_L"], pose["ankle_R"]):
        d.line([(ank[0] - 12, ank[1]), (ank[0] + 18, ank[1])], fill=(20, 20, 20), width=5)

    hx, hy = pose["head"]
    hr = 22
    d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], outline=(20, 20, 20), width=4)
    d.ellipse([hx + 7, hy - 3, hx + 13, hy + 3], fill=(20, 20, 20))

    for key, r in [
        ("neck", 6),
        ("shoulder_L", 8),
        ("shoulder_R", 8),
        ("elbow_L", 7),
        ("elbow_R", 7),
        ("wrist_L", 9),
        ("wrist_R", 9),
        ("mid", 6),
        ("pelvis", 6),
        ("hip_L", 8),
        ("hip_R", 8),
        ("knee_L", 7),
        ("knee_R", 7),
        ("ankle_L", 6),
        ("ankle_R", 6),
    ]:
        joint(pose[key], r=r)

    d.text((12, 12), label, fill=(70, 70, 70))
    d.text((12, H - 36), "肩寬 / 跨寬 以橫槓表示；圓點=關節節點", fill=(110, 110, 110))
    d.text(
        (12, H - 20),
        "head·shoulders·elbows·wrists·spine·hips·knees·ankles",
        fill=(140, 140, 140),
    )
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    n = 8
    frames: list[Image.Image] = []
    meta = []
    for i in range(n):
        pose = pose_for_frame(i, n)
        label = f"動作01 待機 Idle  {i + 1}/{n}"
        img = draw_stick(pose, label)
        path = OUT / f"frame_{i + 1:02d}.png"
        img.save(path)
        frames.append(img)
        meta.append({k: [round(v[0], 1), round(v[1], 1)] for k, v in pose.items()})

    pad = 8
    strip = Image.new("RGB", (n * W + (n + 1) * pad, H + 48), (255, 255, 255))
    ds = ImageDraw.Draw(strip)
    ds.text(
        (pad, 12),
        "動作 01 — 待機（Idle Stance）火柴人轉換｜僅此動作，其餘待確認",
        fill=(20, 20, 20),
    )
    for i, img in enumerate(frames):
        strip.paste(img, (pad + i * (W + pad), 40))
    strip.save(OUT / "strip.png")

    frames[0].save(
        OUT / "preview.gif",
        save_all=True,
        append_images=frames[1:],
        duration=120,
        loop=0,
    )

    (OUT / "joints.json").write_text(
        json.dumps(
            {
                "action_id": 1,
                "name_en": "idle",
                "name_zh": "待機",
                "frame_count": n,
                "frames": meta,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    if SHEET.exists():
        im = Image.open(SHEET)
        arr = np.array(im)
        bg = np.array([71, 112, 104], dtype=np.int16)
        mask = np.abs(arr.astype(np.int16) - bg).sum(axis=2) > 40
        y0, y1 = 6, 103
        col_has = mask[y0 : y1 + 1, :].any(axis=0)
        fr: list[tuple[int, int]] = []
        inf = False
        sx = 0
        for x in range(mask.shape[1]):
            if col_has[x] and not inf:
                sx = x
                inf = True
            elif not col_has[x] and inf:
                if x - 1 - sx >= 10:
                    fr.append((sx, x - 1))
                inf = False
        if inf and mask.shape[1] - 1 - sx >= 10:
            fr.append((sx, mask.shape[1] - 1))

        cell_w, cell_h = 180, 260
        comp = Image.new("RGB", (8 * cell_w, 2 * cell_h + 56), (255, 255, 255))
        dc = ImageDraw.Draw(comp)
        dc.text((10, 12), "上：原圖待機幀 ｜ 下：火柴人（白底＋關節節點）", fill=(0, 0, 0))
        for i, (x0, x1) in enumerate(fr[:8]):
            spr = im.crop((x0, y0, x1 + 1, y1 + 1))
            cell = Image.new("RGB", (cell_w, cell_h), (255, 255, 255))
            sa = np.array(spr)
            m = np.abs(sa.astype(np.int16) - bg).sum(axis=2) <= 40
            sa[m] = [255, 255, 255]
            spr_w = Image.fromarray(sa)
            scale = min((cell_w - 16) / spr_w.width, (cell_h - 30) / spr_w.height)
            sw = max(1, int(spr_w.width * scale))
            sh = max(1, int(spr_w.height * scale))
            spr2 = spr_w.resize((sw, sh), Image.NEAREST)
            cell.paste(spr2, ((cell_w - sw) // 2, (cell_h - sh) // 2))
            comp.paste(cell, (i * cell_w, 40))
            st = frames[i].resize((cell_w, cell_h), Image.LANCZOS)
            comp.paste(st, (i * cell_w, 40 + cell_h))
        comp.save(OUT / "comparison.png")

    print(f"Wrote {n} frames to {OUT}")


if __name__ == "__main__":
    main()

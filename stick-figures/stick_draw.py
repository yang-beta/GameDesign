#!/usr/bin/env python3
"""Shared stick-figure drawing: joints + polygon hands/feet with direction."""

from __future__ import annotations

import math
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont

W, H = 400, 480
GROUND_Y = 422.0
INK = (20, 20, 20)
PALM_FILL = (45, 45, 45)
FOOT_FILL = (55, 55, 55)
HINT = (160, 160, 160)

_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _font(size: int = 14) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in _FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT = _font(15)
FONT_SMALL = _font(13)


def _rot(px: float, py: float, ox: float, oy: float, deg: float) -> tuple[float, float]:
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    x, y = px - ox, py - oy
    return ox + x * c - y * s, oy + x * s + y * c


def hand_poly(
    wrist: tuple[float, float],
    finger_deg: float,
    *,
    length: float = 22.0,
    width: float = 14.0,
) -> list[tuple[float, float]]:
    """Pentagon fist; tip points toward finger/knuckle direction (finger_deg)."""
    tip = (wrist[0] + length, wrist[1])
    base_l = (wrist[0] - 3, wrist[1] - width / 2)
    base_r = (wrist[0] - 3, wrist[1] + width / 2)
    knuckle_l = (wrist[0] + length * 0.55, wrist[1] - width / 2)
    knuckle_r = (wrist[0] + length * 0.55, wrist[1] + width / 2)
    pts = [base_l, knuckle_l, tip, knuckle_r, base_r]
    return [_rot(x, y, wrist[0], wrist[1], finger_deg) for x, y in pts]


def foot_poly(
    ankle: tuple[float, float],
    toe_deg: float,
    *,
    length: float = 28.0,
    heel: float = 8.0,
    width: float = 12.0,
    heel_lift: float = 0.0,
) -> list[tuple[float, float]]:
    """Wedge foot; pointed tip = toes. heel_lift raises heel (0 flat, >0 on ball)."""
    # Local: +X = toe direction before rotation
    toe = (ankle[0] + length, ankle[1])
    heel_pt = (ankle[0] - heel, ankle[1] - heel_lift)
    outer = (ankle[0] + length * 0.35, ankle[1] + width / 2)
    inner = (ankle[0] + length * 0.35, ankle[1] - width / 2)
    pts = [heel_pt, inner, toe, outer]
    return [_rot(x, y, ankle[0], ankle[1], toe_deg) for x, y in pts]


def draw_stick(
    pose: dict,
    label: str,
    *,
    size: tuple[int, int] = (W, H),
) -> Image.Image:
    """
    pose keys:
      head, neck, shoulder_L/R, elbow_L/R, wrist_L/R, mid, pelvis,
      hip_L/R, knee_L/R, ankle_L/R
      hand_L_deg, hand_R_deg  — finger/knuckle direction (deg, 0=+X right)
      foot_L_deg, foot_R_deg  — toe direction
      foot_L_lift, foot_R_lift — optional heel lift
      hand_L_len, hand_R_len, foot_L_len, foot_R_len — optional sizes
    L = viewer-left, R = viewer-right
    """
    img = Image.new("RGB", size, (255, 255, 255))
    d = ImageDraw.Draw(img)

    def line(a, b, width=5):
        d.line([tuple(a), tuple(b)], fill=INK, width=width)

    def joint(p, r=7):
        x, y = p
        d.ellipse([x - r, y - r, x + r, y + r], fill=INK)

    def poly(pts: Iterable[tuple[float, float]], fill, outline=INK):
        seq = [(float(x), float(y)) for x, y in pts]
        d.polygon(seq, fill=fill, outline=outline)
        # direction tick from centroid toward tip (first elongated hint)
        if len(seq) >= 3:
            tip = seq[2] if len(seq) >= 4 else seq[-1]
            cx = sum(p[0] for p in seq) / len(seq)
            cy = sum(p[1] for p in seq) / len(seq)
            d.line([(cx, cy), tip], fill=(240, 240, 240), width=2)

    # bones
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

    # polygon feet (draw under joints)
    fl = foot_poly(
        pose["ankle_L"],
        float(pose.get("foot_L_deg", 0)),
        length=float(pose.get("foot_L_len", 28)),
        heel_lift=float(pose.get("foot_L_lift", 0)),
    )
    fr = foot_poly(
        pose["ankle_R"],
        float(pose.get("foot_R_deg", 0)),
        length=float(pose.get("foot_R_len", 28)),
        heel_lift=float(pose.get("foot_R_lift", 0)),
    )
    poly(fl, FOOT_FILL)
    poly(fr, FOOT_FILL)

    # polygon hands
    hl = hand_poly(
        pose["wrist_L"],
        float(pose.get("hand_L_deg", 0)),
        length=float(pose.get("hand_L_len", 22)),
    )
    hr = hand_poly(
        pose["wrist_R"],
        float(pose.get("hand_R_deg", 0)),
        length=float(pose.get("hand_R_len", 22)),
    )
    poly(hl, PALM_FILL)
    poly(hr, PALM_FILL)

    # head
    hx, hy = pose["head"]
    hr_ = 22
    d.ellipse([hx - hr_, hy - hr_, hx + hr_, hy + hr_], outline=INK, width=4)
    # face direction mark (toward facing)
    face_deg = float(pose.get("face_deg", 0))
    fx = hx + 10 * math.cos(math.radians(face_deg))
    fy = hy + 10 * math.sin(math.radians(face_deg))
    d.ellipse([fx - 3, fy - 3, fx + 3, fy + 3], fill=INK)

    for key, r in [
        ("neck", 6),
        ("shoulder_L", 8),
        ("shoulder_R", 8),
        ("elbow_L", 7),
        ("elbow_R", 7),
        ("wrist_L", 5),
        ("wrist_R", 5),
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

    d.text((12, 12), label, fill=(70, 70, 70), font=FONT)
    d.text(
        (12, size[1] - 36),
        "肩寬/跨寬橫槓｜多邊形手掌·腳板（尖端=指/趾朝向）",
        fill=(110, 110, 110),
        font=FONT_SMALL,
    )
    d.text((12, size[1] - 20), "joints + palm/foot polygons", fill=HINT, font=FONT_SMALL)
    return img


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_pt(a: tuple[float, float], b: tuple[float, float], t: float) -> tuple[float, float]:
    return (lerp(a[0], b[0], t), lerp(a[1], b[1], t))


def blend_pose(a: dict, b: dict, t: float) -> dict:
    out = {}
    for k, v in a.items():
        if k not in b:
            out[k] = v
            continue
        vb = b[k]
        if isinstance(v, tuple) and len(v) == 2:
            out[k] = lerp_pt(v, vb, t)
        elif isinstance(v, (int, float)) and isinstance(vb, (int, float)):
            # angles: short arc
            da = ((vb - v + 180) % 360) - 180
            out[k] = v + da * t
        else:
            out[k] = v if t < 0.5 else vb
    return out


def save_strip(frames: list[Image.Image], path, title: str) -> None:
    n = len(frames)
    pad = 8
    fw, fh = frames[0].size
    strip = Image.new("RGB", (n * fw + (n + 1) * pad, fh + 48), (255, 255, 255))
    d = ImageDraw.Draw(strip)
    d.text((pad, 12), title, fill=(20, 20, 20), font=FONT)
    for i, img in enumerate(frames):
        strip.paste(img, (pad + i * (fw + pad), 40))
    strip.save(path)


def save_gif(frames: list[Image.Image], path, duration: int = 100, pingpong: bool = False) -> None:
    seq = list(frames)
    if pingpong and len(seq) > 2:
        seq = seq + list(reversed(seq[1:-1]))
    seq[0].save(
        path,
        save_all=True,
        append_images=seq[1:],
        duration=duration,
        loop=0,
        disposal=2,
    )


def base_ready(rise: float = 0.0, knee_open: float = 0.0) -> dict:
    """Shared combat-ready base facing right (viewer)."""
    pelvis = (198.0, 305.0 - rise * 0.4)
    hip_w = 54.0
    hip_l = (pelvis[0] - hip_w / 2 - 4, pelvis[1] + 3)
    hip_r = (pelvis[0] + hip_w / 2 + 8, pelvis[1] + 5)
    mid = (pelvis[0] + 6, pelvis[1] - 52 + rise * 0.1)
    neck = (pelvis[0] + 10, pelvis[1] - 105 + rise)
    shoulder_w = 86.0
    sh_l = (neck[0] - shoulder_w / 2 - 4, neck[1] + 10)
    sh_r = (neck[0] + shoulder_w / 2 - 6, neck[1] + 16)
    head = (neck[0] + 8, neck[1] - 26)
    el_l = (sh_l[0] - 6, sh_l[1] + 44 - rise * 0.15)
    wr_l = (el_l[0] + 30, el_l[1] - 38)
    el_r = (sh_r[0] + 10, sh_r[1] + 52)
    wr_r = (el_r[0] - 18, el_r[1] + 6)
    kn_l = (hip_l[0] - 20, hip_l[1] + 68 - knee_open)
    an_l = (kn_l[0] + 6, GROUND_Y)
    kn_r = (hip_r[0] + 24, hip_r[1] + 64 - knee_open * 0.7)
    an_r = (kn_r[0] + 16, GROUND_Y)
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
        "face_deg": 0,
        # viewer-L fist knuckles up-right; viewer-R fist knuckles right
        "hand_L_deg": -55,
        "hand_R_deg": 10,
        "foot_L_deg": 15,
        "foot_R_deg": 5,
        "foot_L_lift": 0,
        "foot_R_lift": 0,
    }

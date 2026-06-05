#!/usr/bin/env python3
"""Generate the Open Graph share card image for the website."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LOGO_PATH = ROOT / "public" / "assets" / "logo.jpeg"
OUT_PATH = ROOT / "public" / "assets" / "social-card.png"
FONT_REGULAR = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_BOLD = "/System/Library/Fonts/STHeiti Medium.ttc"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill: str, outline: str | None = None) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=2 if outline else 1)


def main() -> None:
    image = Image.new("RGB", (1200, 630), "#f5f5f7")
    draw = ImageDraw.Draw(image)

    for y in range(630):
        ratio = y / 629
        r = int(252 * (1 - ratio) + 242 * ratio)
        g = int(252 * (1 - ratio) + 246 * ratio)
        b = int(253 * (1 - ratio) + 250 * ratio)
        draw.line((0, y, 1200, y), fill=(r, g, b))

    rounded(draw, (54, 54, 1146, 576), 38, "#ffffff", "#e5e7eb")
    rounded(draw, (92, 460, 552, 532), 28, "#fff1e8", None)
    rounded(draw, (588, 460, 1048, 532), 28, "#edf5ff", None)
    draw.rounded_rectangle((92, 460, 106, 532), radius=7, fill="#f97316")
    draw.rounded_rectangle((588, 460, 602, 532), radius=7, fill="#2563eb")

    logo_size = 132
    logo = Image.open(LOGO_PATH).convert("RGB").resize((logo_size, logo_size))
    mask = Image.new("L", (logo_size, logo_size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, logo_size, logo_size), radius=28, fill=255)
    image.paste(logo, (104, 104), mask)

    title_font = font(FONT_BOLD, 76)
    subtitle_font = font(FONT_REGULAR, 34)
    small_font = font(FONT_REGULAR, 26)
    label_font = font(FONT_BOLD, 30)

    draw.text((272, 122), "威尔多芬指标", fill="#1d1d1f", font=title_font)
    draw.text((276, 224), "用纪律判断市场温度", fill="#475569", font=subtitle_font)
    draw.text((276, 288), "大盘价值 · 小盘成长", fill="#16856f", font=small_font)

    draw.text((132, 479), "威尔看大盘价值", fill="#c4510c", font=label_font)
    draw.text((628, 479), "多芬看小盘成长", fill="#1d4ed8", font=label_font)
    draw.text((94, 548), "weierduofen.cn", fill="#64748b", font=small_font)
    image.save(OUT_PATH, quality=95)
    print(f"Generated {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

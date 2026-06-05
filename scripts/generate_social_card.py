#!/usr/bin/env python3
"""Generate the Open Graph share card image for the website."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LOGO_PATH = ROOT / "public" / "assets" / "logo.jpeg"
OUT_PATH = ROOT / "public" / "assets" / "social-card.png"
FONT_REGULAR = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_BOLD = "/System/Library/Fonts/STHeiti Medium.ttc"
WIDTH = 1200
HEIGHT = 630


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def mix(start: tuple[int, int, int], end: tuple[int, int, int], amount: float) -> tuple[int, int, int]:
    return tuple(int(start[index] + (end[index] - start[index]) * amount) for index in range(3))


def add_glow(
    layer: Image.Image,
    center: tuple[int, int],
    radius: tuple[int, int],
    color: tuple[int, int, int],
    strength: float,
) -> None:
    pixels = layer.load()
    center_x, center_y = center
    radius_x, radius_y = radius

    for y in range(HEIGHT):
        for x in range(WIDTH):
            distance = math.hypot((x - center_x) / radius_x, (y - center_y) / radius_y)
            if distance >= 1:
                continue

            amount = (1 - distance) ** 1.75 * strength
            red, green, blue, alpha = pixels[x, y]
            pixels[x, y] = (
                min(255, int(red + color[0] * amount)),
                min(255, int(green + color[1] * amount)),
                min(255, int(blue + color[2] * amount)),
                min(255, int(alpha + 220 * amount)),
            )


def make_background() -> Image.Image:
    orange = (255, 92, 10)
    blue = (18, 92, 255)
    cyan = (46, 218, 255)
    warm = (255, 188, 58)
    magenta = (255, 95, 166)

    base = Image.new("RGB", (WIDTH, HEIGHT), "#111827")
    pixels = base.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            amount = (x / WIDTH * 0.82) + (y / HEIGHT * 0.18)
            color = mix(orange, blue, amount)
            center = max(0, 1 - math.hypot((x - 600) / 780, (y - 350) / 520))
            pixels[x, y] = tuple(min(255, int(value + 28 * center)) for value in color)

    base = ImageEnhance.Color(base).enhance(1.28)
    base = ImageEnhance.Brightness(base).enhance(1.08)

    light = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    add_glow(light, (210, 145), (570, 410), warm, 1.28)
    add_glow(light, (1030, 125), (510, 360), cyan, 1.18)
    add_glow(light, (620, 135), (600, 360), magenta, 0.30)
    add_glow(light, (660, 585), (790, 330), (255, 255, 255), 0.28)
    light = light.filter(ImageFilter.GaussianBlur(52))
    image = Image.alpha_composite(base.convert("RGBA"), light)

    planes = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(planes, "RGBA")
    draw.polygon([(-80, 500), (260, 360), (620, 630), (-80, 690)], fill=(255, 255, 255, 38))
    draw.polygon([(250, -40), (540, -40), (910, 630), (650, 690)], fill=(255, 255, 255, 24))
    draw.polygon([(880, -80), (1260, -80), (1260, 520), (1010, 430)], fill=(255, 255, 255, 38))
    draw.polygon([(515, 0), (840, 0), (710, 185)], fill=(255, 255, 255, 30))
    image = Image.alpha_composite(image, planes.filter(ImageFilter.GaussianBlur(18)))

    image = Image.alpha_composite(image, Image.new("RGBA", (WIDTH, HEIGHT), (255, 255, 255, 26)))

    random.seed(21)
    noise = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    noise_pixels = noise.load()
    for _ in range(48000):
        x = random.randrange(WIDTH)
        y = random.randrange(HEIGHT)
        value = random.randrange(210, 255)
        alpha = random.randrange(2, 9)
        noise_pixels[x, y] = (value, value, value, alpha)

    return Image.alpha_composite(image, noise.filter(ImageFilter.GaussianBlur(0.35)))


def add_logo(image: Image.Image) -> None:
    logo_size = 214
    logo_x, logo_y = 100, 190
    logo = Image.open(LOGO_PATH).convert("RGB").resize((logo_size, logo_size), Image.LANCZOS)
    mask = Image.new("L", (logo_size, logo_size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, logo_size, logo_size), radius=48, fill=255)

    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow, "RGBA")
    shadow_draw.rounded_rectangle(
        (logo_x, logo_y, logo_x + logo_size, logo_y + logo_size),
        radius=48,
        fill=(0, 0, 0, 112),
    )
    image.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(24)))

    shine = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shine_draw = ImageDraw.Draw(shine, "RGBA")
    shine_draw.rounded_rectangle(
        (logo_x - 8, logo_y - 8, logo_x + logo_size + 8, logo_y + logo_size + 8),
        radius=54,
        fill=(255, 255, 255, 78),
    )
    image.alpha_composite(shine.filter(ImageFilter.GaussianBlur(7)))
    image.paste(logo.convert("RGBA"), (logo_x, logo_y), mask)


def add_text(image: Image.Image) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    title_font = font(FONT_BOLD, 122)
    subtitle_font = font(FONT_REGULAR, 55)
    text_x = 370

    draw.text((text_x + 5, 191 + 5), "威尔多芬指标", font=title_font, fill=(0, 0, 0, 82))
    draw.text((text_x, 186), "威尔多芬指标", font=title_font, fill=(255, 255, 255, 254))
    draw.text((text_x + 4, 353 + 4), "用纪律判断市场温度", font=subtitle_font, fill=(0, 0, 0, 78))
    draw.text((text_x, 349), "用纪律判断市场温度", font=subtitle_font, fill=(255, 255, 255, 236))


def main() -> None:
    image = make_background()
    add_logo(image)
    add_text(image)
    image.convert("RGB").save(OUT_PATH, quality=96)
    print(f"Generated {OUT_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

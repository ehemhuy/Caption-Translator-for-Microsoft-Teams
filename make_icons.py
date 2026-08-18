"""Regenerate icons/*.png. Run: python3 make_icons.py"""
from PIL import Image, ImageDraw

S = 512  # draw big, downsample -> free antialiasing
BG, BUBBLE, SRC, DST = "#5B5FC7", "#FFFFFF", "#C7C9F0", "#FFC845"

img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle((0, 0, S, S), radius=S * 0.22, fill=BG)

# speech bubble
box = (S * 0.14, S * 0.18, S * 0.86, S * 0.68)
d.rounded_rectangle(box, radius=S * 0.08, fill=BUBBLE)
d.polygon([(S * 0.28, S * 0.66), (S * 0.28, S * 0.86), (S * 0.50, S * 0.66)], fill=BUBBLE)

# two caption lines: original (grey) + translation (amber)
for y, color, w in ((0.33, SRC, 0.58), (0.50, DST, 0.44)):
    d.rounded_rectangle(
        (S * 0.24, S * y, S * (0.24 + w), S * (y + 0.09)), radius=S * 0.045, fill=color
    )

for n in (16, 32, 48, 128, 300):  # 300 = Edge Add-ons store logo, not used by the manifest
    img.resize((n, n), Image.LANCZOS).save(f"icons/{n}.png")
print("wrote icons/{16,32,48,128,300}.png")

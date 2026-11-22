"""Compose Devpost gallery images (3:2) and covers from REAL simulator screenshots."""
import os
import random
import shutil
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SUB = '/Volumes/DATA/Working/hackathon/2026/reddit-gotd-2026/app/submission'
AV = '/System/Library/Fonts/Avenir Next.ttc'
HEAVY = lambda s: ImageFont.truetype(AV, s, index=8)
DEMI = lambda s: ImageFont.truetype(AV, s, index=2)
MED = lambda s: ImageFont.truetype(AV, s, index=5)
GOLD, INK, DIM = (255, 201, 74), (246, 234, 215), (185, 168, 204)


def bg(w, h, glow_box):
    im = Image.new('RGB', (w, h))
    top, bot = (36, 26, 61), (20, 15, 36)
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / (h - 1)
        d.line([(0, y), (w, y)], fill=tuple(round(top[k] * (1 - t) + bot[k] * t) for k in range(3)))
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(glow_box, fill=(255, 180, 90, 50))
    im = Image.alpha_composite(im.convert('RGBA'), glow.filter(ImageFilter.GaussianBlur(min(w, h) // 8)))
    d = ImageDraw.Draw(im)
    rnd = random.Random(11)
    for _ in range(int(w * h / 30000)):
        x, y, r = rnd.randrange(w), rnd.randrange(int(h * 0.75)), rnd.choice([1, 1.5, 2])
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 245, 220, rnd.randrange(60, 200)))
    return im


def phone(png, height, crop=None):
    src = Image.open(png).convert('RGB')
    if crop:
        src = src.crop(crop)
    w = round(src.width * height / src.height)
    src = src.resize((w, height), Image.LANCZOS)
    mask = Image.new('L', (w, height), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, height - 1), radius=max(24, height // 21), fill=255)
    return src, mask


def paste_phone(canvas, png, x, y, height, crop=None):
    ph, mask = phone(png, height, crop)
    sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x - 6, y + 14, x + ph.width + 6, y + height + 20), radius=height // 20, fill=(0, 0, 0, 150))
    canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(20)))
    canvas.paste(ph, (x, y), mask)
    return ph.width


def text_block(canvas, x, y, kicker, title, sub, scale=1.0):
    d = ImageDraw.Draw(canvas)
    if kicker:
        d.text((x, y), kicker.upper(), font=DEMI(int(30 * scale)), fill=GOLD)
        y += int(62 * scale)
    for line in title.split('\n'):
        d.text((x, y), line, font=HEAVY(int(74 * scale)), fill=INK)
        y += int(94 * scale)
    if sub:
        y += int(10 * scale)
        for line in sub.split('\n'):
            d.text((x, y), line, font=MED(int(36 * scale)), fill=DIM)
            y += int(52 * scale)


def gallery(name, png, kicker, title, sub, crop=None):
    W, H = 1800, 1200
    ph_h = 1080
    ph_w = round((crop[2] - crop[0] if crop else 1206) * ph_h / (crop[3] - crop[1] if crop else 2622))
    x = 150 + max(0, (500 - ph_w) // 2)
    c = bg(W, H, (x - 200, 200, x + ph_w + 200, 1200))
    paste_phone(c, png, x, (H - ph_h) // 2, ph_h, crop)
    text_block(c, 820, 360, kicker, title, sub)
    out = os.path.join(SUB, 'screenshots', name)
    c.convert('RGB').save(out, optimize=True)
    return out


def main():
    v = HERE
    shots = [
        ('01-hero.png', 'raw-01d-sparks.png', 'Two Lamps · daily puzzle', 'Both shadows match.\nThe windows light up.', 'Every block is drawn in code,\nlanterns, sparks and all.'),
        ('02-gameplay.png', 'raw-02b-midbuild.png', 'The puzzle', 'Fill each dashed\nshadow exactly.', 'Each lamp throws your build onto its wall.\nA light turns gold when a column fits.'),
        ('03-interaction.png', 'raw-03-overshoot.png', 'Instant feedback', 'Too tall? It glows\nred.', 'Tap to stack. Long-press to take one off.\nOne hint at a time, no rules screen.'),
        ('04-results.png', 'raw-04b-flawless.png', 'Solve, then chase par', 'Flawless:\npar on the first try.', 'Stars, par, and how this subreddit\ndid today.'),
        ('05-progression.png', 'raw-05c-card-after.png', 'Come back tomorrow', 'Your build, your stars,\nyour streak.', 'The feed card remembers your result.\nA new plaza appears at 00:00 UTC.'),
        ('06-reddit-integration.png', 'raw-06b-thread.png', 'Made for Reddit', 'Results land in the\ncomments, with flair.', 'One tap posts your score from your account.\nOpt-in streak flair shows the habit.'),
    ]
    os.makedirs(os.path.join(SUB, 'screenshots', 'raw'), exist_ok=True)
    for name, png, k, t, s in shots:
        gallery(name, os.path.join(v, png), k, t, s)
        shutil.copy(os.path.join(v, png), os.path.join(SUB, 'screenshots', 'raw', name.replace('.png', '-phone.png')))
    shutil.copy(os.path.join(v, 'raw-06-post.png'), os.path.join(SUB, 'screenshots', 'raw', '07-post-in-feed-phone.png'))
    shutil.copy(os.path.join(v, 'raw-tw-rocks.png'), os.path.join(SUB, 'screenshots', 'raw', '08-rock-garden-card-phone.png'))
    shutil.copy(os.path.join(v, 'raw-tw-boulders.png'), os.path.join(SUB, 'screenshots', 'raw', '09-boulder-field-card-phone.png'))

    # Cover (Devpost 3:2): three real cards side by side + title.
    W, H = 1500, 1000
    c = bg(W, H, (200, 250, 1300, 1100))
    d = ImageDraw.Draw(c)
    t = 'Two Lamps'
    d.text(((W - d.textlength(t, font=HEAVY(120))) / 2, 60), t, font=HEAVY(120), fill=INK)
    s = 'A daily shadow puzzle for Reddit'
    d.text(((W - d.textlength(s, font=MED(40))) / 2, 210), s, font=MED(40), fill=DIM)
    card = (0, 557, 1206, 2094)
    cards = ['raw-tw-rocks.png', 'raw-05c-card-after.png', 'raw-tw-boulders.png']
    hh = [560, 640, 560]
    ws = [round(1206 * h / 1537) for h in hh]
    gap = 36
    x = (W - sum(ws) - 2 * gap) // 2
    for png, h, w in zip(cards, hh, ws):
        y = 300 + (640 - h) // 2 + 20
        paste_phone(c, os.path.join(v, png), x, y, h, card)
        x += w + gap
    c.convert('RGB').save(os.path.join(SUB, 'media', 'cover.png'), optimize=True)

    # YouTube thumbnail 1280x720: lit plaza + big title.
    W, H = 1280, 720
    c = bg(W, H, (40, 80, 700, 760))
    paste_phone(c, os.path.join(v, 'raw-05c-card-after.png'), 90, 70, 600, card)
    d = ImageDraw.Draw(c)
    d.text((640, 200), 'Two', font=HEAVY(130), fill=INK)
    d.text((640, 330), 'Lamps', font=HEAVY(130), fill=GOLD)
    d.text((646, 500), 'A daily shadow puzzle', font=DEMI(40), fill=DIM)
    c.convert('RGB').save(os.path.join(SUB, 'media', 'thumbnail.png'), optimize=True)
    print('ok')


if __name__ == '__main__':
    main()

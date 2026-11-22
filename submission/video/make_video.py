"""Edit the real simulator recording into a < 60 s Devpost demo (1920x1080).

All gameplay footage comes from raw.mp4 (one continuous take on r/TwoLampsGame).
Sped-up ranges are labelled on screen. Voiceover: macOS `say` (Samantha).
"""
import json
import os
import subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = '/Volumes/DATA/Working/hackathon/2026/reddit-gotd-2026/app/submission/video'
SEG = os.path.join(HERE, 'seg')
os.makedirs(SEG, exist_ok=True)
AV = '/System/Library/Fonts/Avenir Next.ttc'
HEAVY = lambda s: ImageFont.truetype(AV, s, index=8)
DEMI = lambda s: ImageFont.truetype(AV, s, index=2)
MED = lambda s: ImageFont.truetype(AV, s, index=5)

GOLD = (255, 201, 74)
INK = (246, 234, 215)
DIM = (185, 168, 204)

PHONE_H = 980
PHONE_W = round(1206 * PHONE_H / 2622)  # 451
PHONE_X, PHONE_Y = 230, (H - PHONE_H) // 2


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def background():
    """Dusk gradient with a soft lamplight glow and a few stars, drawn in code."""
    im = Image.new('RGB', (W, H))
    top, bot = (36, 26, 61), (20, 15, 36)
    px = im.load()
    for y in range(H):
        t = y / (H - 1)
        c = tuple(round(top[k] * (1 - t) + bot[k] * t) for k in range(3))
        for x in range(W):
            px[x, y] = c
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((PHONE_X - 260, 180, PHONE_X + PHONE_W + 260, 1080), fill=(255, 180, 90, 46))
    glow = glow.filter(ImageFilter.GaussianBlur(140))
    im = Image.alpha_composite(im.convert('RGBA'), glow)
    d = ImageDraw.Draw(im)
    import random
    rnd = random.Random(7)
    for _ in range(70):
        x, y = rnd.randrange(W), rnd.randrange(int(H * 0.7))
        r = rnd.choice([1, 1, 1.5, 2])
        a = rnd.randrange(60, 200)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 245, 220, a))
    return im


def phone_mask():
    m = Image.new('L', (PHONE_W, PHONE_H), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, PHONE_W - 1, PHONE_H - 1), radius=46, fill=255)
    m.save(os.path.join(SEG, 'mask.png'))


def caption_png(name, kicker, title, sub=None, badge=None):
    """Full-frame transparent overlay: phone shadow plus right-side headline."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((PHONE_X - 6, PHONE_Y + 14, PHONE_X + PHONE_W + 6, PHONE_Y + PHONE_H + 20), radius=50, fill=(0, 0, 0, 150))
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    im = Image.alpha_composite(im, sh)
    d = ImageDraw.Draw(im)
    x = PHONE_X + PHONE_W + 140
    y = 330
    if kicker:
        d.text((x, y), kicker.upper(), font=DEMI(30), fill=GOLD, spacing=4)
        y += 62
    for line in title.split('\n'):
        d.text((x, y), line, font=HEAVY(76), fill=INK)
        y += 96
    if sub:
        y += 12
        for line in sub.split('\n'):
            d.text((x, y), line, font=MED(38), fill=DIM)
            y += 54
    if badge:
        bw = d.textlength(badge, font=DEMI(28)) + 40
        d.rounded_rectangle((x, H - 150, x + bw, H - 100), radius=25, fill=(255, 201, 74, 40), outline=GOLD, width=2)
        d.text((x + 20, H - 145), badge, font=DEMI(28), fill=GOLD)
    path = os.path.join(SEG, f'cap_{name}.png')
    im.save(path)
    return path


def clip(name, start, end, dur, cap):
    """Cut raw.mp4[start:end], retime to `dur` seconds, composite on background."""
    speed = (end - start) / dur
    out = os.path.join(SEG, f'{name}.mp4')
    run([
        'ffmpeg', '-y', '-ss', f'{start}', '-t', f'{end - start}', '-i', os.path.join(HERE, 'raw.mp4'),
        '-loop', '1', '-i', os.path.join(SEG, 'bg.png'),
        '-loop', '1', '-i', os.path.join(SEG, 'mask.png'),
        '-loop', '1', '-i', cap,
        '-filter_complex',
        f'[0:v]setpts=(PTS-STARTPTS)/{speed},fps=30,scale={PHONE_W}:{PHONE_H}:flags=lanczos,format=rgba[ph];'
        f'[2:v]format=gray,scale={PHONE_W}:{PHONE_H}[m];[ph][m]alphamerge[phm];'
        f'[1:v][3:v]overlay=0:0[bgc];[bgc][phm]overlay={PHONE_X}:{PHONE_Y}:shortest=1,format=yuv420p[v]',
        '-map', '[v]', '-t', f'{dur}', '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-an', out,
    ])
    return out


def still(name, png, crop, dur, cap):
    """A real screenshot (cropped to the game card) with a slow push-in."""
    im = Image.open(png).convert('RGB').crop(crop)
    tgt_h = 900
    im = im.resize((round(im.width * tgt_h / im.height), tgt_h), Image.LANCZOS)
    src = os.path.join(SEG, f'{name}_src.png')
    im.save(src)
    out = os.path.join(SEG, f'{name}.mp4')
    frames = int(dur * 30)
    x = PHONE_X + PHONE_W // 2 - im.width // 2
    run([
        'ffmpeg', '-y', '-loop', '1', '-i', os.path.join(SEG, 'bg.png'), '-loop', '1', '-i', src, '-loop', '1', '-i', cap,
        '-filter_complex',
        f"[1:v]format=rgba,scale=w='iw*(1+0.04*n/{frames})':h=-1:eval=frame[c];"
        f"[0:v][2:v]overlay=0:0[b];[b][c]overlay=x='{x}-(overlay_w-{im.width})/2':y='{(H - tgt_h) // 2}-(overlay_h-{tgt_h})/2',format=yuv420p[v]",
        '-map', '[v]', '-frames:v', str(frames), '-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', out,
    ])
    return out


def endcard(dur):
    im = background().convert('RGBA')
    d = ImageDraw.Draw(im)
    t = 'Two Lamps'
    tw = d.textlength(t, font=HEAVY(150))
    d.text(((W - tw) / 2, 330), t, font=HEAVY(150), fill=INK)
    s = 'A new plaza every day.'
    sw = d.textlength(s, font=MED(52))
    d.text(((W - sw) / 2, 540), s, font=MED(52), fill=DIM)
    r = 'r/TwoLampsGame  ·  built on Reddit’s Developer Platform'
    rw = d.textlength(r, font=DEMI(36))
    d.text(((W - rw) / 2, 680), r, font=DEMI(36), fill=GOLD)
    p = os.path.join(SEG, 'end.png')
    im.convert('RGB').save(p)
    out = os.path.join(SEG, 'end.mp4')
    run(['ffmpeg', '-y', '-loop', '1', '-i', p, '-t', f'{dur}', '-r', '30', '-vf', 'format=yuv420p,fade=t=in:st=0:d=0.5',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', out])
    return out


def main():
    bg = background()
    bg.convert('RGB').save(os.path.join(SEG, 'bg.png'))
    phone_mask()

    caps = {
        'hook': caption_png('hook', 'A daily puzzle for Reddit', 'Two lamps.\nTwo shadows.', 'One tiny plaza, new every day.'),
        'feed': caption_png('feed', 'Right in the feed', "Today's puzzle\nis on the card.", 'Tap Play to open it.'),
        'play': caption_png('play', 'How to play', 'Stack blocks to\nfill both shadows.', 'Gold = fits.  Red = too tall.\nLong-press removes a block.', badge='SPED UP'),
        'solve': caption_png('solve', 'Solve, then chase par', 'Windows light up.\nPar is revealed.', 'Fewest blocks wins most days.\nFridays: the most.'),
        'social': caption_png('social', 'Built for the community', 'Results live\non the post.', 'Post to comments · streak flair\nsubreddit histogram'),
        'twist': caption_png('twist', 'A new twist each weekday', 'Rock gardens.\nBoulder fields.\nFull houses.', None),
    }

    segs = [
        clip('s1a_hook', 97.5, 99.5, 2.0, caps['hook']),
        clip('s1b_hook', 526.6, 530.1, 3.5, caps['hook']),
        clip('s2_feed', 2.0, 9.5, 5.5, caps['feed']),
        clip('s3a_play', 13.8, 41.0, 9.5, caps['play']),
        clip('s3b_play', 41.0, 70.6, 4.5, caps['play']),
        clip('s4a_solve', 70.6, 76.6, 6.0, caps['solve']),
        clip('s4b_par', 104.5, 108.0, 3.5, caps['solve']),
        clip('s5a_posted', 491.0, 494.0, 3.0, caps['social']),
        clip('s5b_flair', 506.2, 509.2, 3.0, caps['social']),
        clip('s5c_thread', 583.6, 586.6, 3.0, caps['social']),
        clip('s5d_card', 603.0, 605.5, 2.5, caps['social']),
        still('s6a_rocks', os.path.join(HERE, 'raw-tw-rocks.png'), (0, 557, 1206, 2094), 2.5, caps['twist']),
        still('s6b_boulders', os.path.join(HERE, 'raw-tw-boulders.png'), (0, 557, 1206, 2094), 2.5, caps['twist']),
        still('s6c_house', os.path.join(HERE, 'raw-05c-card-after.png'), (0, 557, 1206, 2094), 2.5, caps['twist']),
        endcard(3.5),
    ]
    lst = os.path.join(SEG, 'list.txt')
    with open(lst, 'w') as f:
        for s in segs:
            f.write(f"file '{s}'\n")
    silent = os.path.join(SEG, 'silent.mp4')
    run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', silent])
    total = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', silent], capture_output=True, text=True).stdout)

    # Voiceover placement (seconds) and a soft synthesized pad under it.
    vo_at = [0.5, 5.8, 11.3, 25.3, 34.8, 46.3]
    inputs, filt = [], []
    for k, t in enumerate(vo_at, start=1):
        inputs += ['-i', os.path.join(HERE, f'vo{k}.aiff')]
        filt.append(f'[{k}:a]aresample=48000,adelay={int(t * 1000)}|{int(t * 1000)},volume=1.6[a{k}]')
    pad = (f"aevalsrc='0.035*sin(2*PI*110*t)*(0.6+0.4*sin(2*PI*0.08*t))+0.025*sin(2*PI*164.8*t)*(0.6+0.4*sin(2*PI*0.06*t+1))"
           f"+0.02*sin(2*PI*220*t)*(0.5+0.5*sin(2*PI*0.05*t+2))':s=48000:d={total}")
    filt.append(f'{pad},afade=t=in:d=1.5,afade=t=out:st={total - 2.5}:d=2.5[pad]')
    mix_in = ''.join(f'[a{k}]' for k in range(1, len(vo_at) + 1))
    filt.append(f'[pad]{mix_in}amix=inputs={len(vo_at) + 1}:normalize=0,alimiter=limit=0.9[aout]')
    out = os.path.join(OUT, 'demo.mp4')
    run(['ffmpeg', '-y', '-i', silent] + inputs + ['-filter_complex', ';'.join(filt), '-map', '0:v', '-map', '[aout]',
         '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', f'{total}', out])
    print(json.dumps({'out': out, 'duration': total, 'segments': len(segs)}))


if __name__ == '__main__':
    main()

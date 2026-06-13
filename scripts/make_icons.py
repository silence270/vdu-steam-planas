from PIL import Image
import os

SRC = "/Users/gabrieliusplunge/Desktop/photos/VDU-STEAM-Logo-Black.png"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
BG = (255, 255, 255, 255)

def find_wave_bbox(im):
    """Spalvotos bangos ribos: spalvoti (sodrūs) nepermatomi pikseliai,
    atskiriami nuo juodo teksto ir permatomo fono."""
    W, H = im.size
    px = im.load()
    minx, miny, maxx, maxy = W, H, 0, 0
    found = False
    for y in range(0, H):
        for x in range(0, W):
            r, g, b, a = px[x, y]
            if a > 40 and (max(r, g, b) - min(r, g, b)) > 35:
                found = True
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    if not found:
        raise SystemExit("Bangos nerasta")
    return (minx, miny, maxx + 1, maxy + 1)

def make_icon(wave, size, pad_frac, fname):
    canvas = Image.new("RGBA", (size, size), BG)
    box = int(size * (1 - 2 * pad_frac))
    w, h = wave.size
    scale = min(box / w, box / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    wr = wave.resize((nw, nh), Image.LANCZOS)
    ox, oy = (size - nw) // 2, (size - nh) // 2
    canvas.alpha_composite(wr, (ox, oy))
    canvas.convert("RGB").save(os.path.join(OUT, fname))
    print("wrote", fname, size)

im = Image.open(SRC).convert("RGBA")
bbox = find_wave_bbox(im)
print("bangos bbox:", bbox)
wave = im.crop(bbox)

make_icon(wave, 192, 0.16, "icon-192.png")
make_icon(wave, 512, 0.16, "icon-512.png")
make_icon(wave, 180, 0.14, "apple-touch-icon.png")

"""Render the Field Studies cover loop from the original campaign photograph."""

from math import tau
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ASSETS = Path(__file__).resolve().parents[1] / "dist" / "assets"
WIDTH, HEIGHT = 1440, 960
FPS, SECONDS = 24, 8
STEP = 16


def smoothstep(start, end, values):
    u = np.clip((values - start) / (end - start), 0, 1)
    return u * u * (3 - 2 * u)


def render():
    with Image.open(ASSETS / "field-campaign.webp") as photo:
        still = photo.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)

    columns = list(range(0, WIDTH, STEP)) + [WIDTH]
    rows = list(range(0, HEIGHT, STEP)) + [HEIGHT]
    x, y = np.meshgrid(np.array(columns) / WIDTH, np.array(rows) / HEIGHT)
    cells = [
        (x0, y0, x1, y1)
        for y0, y1 in zip(rows, rows[1:])
        for x0, x1 in zip(columns, columns[1:])
    ]

    # Trace the silhouette so distant cloud and grass movement does not cross the face.
    outline = [
        (.435,1),(.475,.884),(.518,.776),(.526,.695),(.517,.650),
        (.529,.536),(.526,.378),(.499,.336),(.497,.320),(.526,.287),
        (.549,.263),(.515,.256),(.489,.237),(.482,.188),(.479,.152),
        (.508,.141),(.537,.072),(.566,.039),(.592,.041),(.614,.065),
        (.633,.112),(.639,.171),(.650,.220),(.680,.243),(.695,.274),
        (.691,.316),(.718,.371),(.751,.431),(.769,.502),(.757,.578),
        (.742,.647),(.731,.712),(.738,.804),(.753,.868),(.774,1),
        (.630,1),(.616,.927),(.582,1),
    ]
    mask = Image.new("L", (WIDTH, HEIGHT))
    ImageDraw.Draw(mask).polygon([(u*WIDTH, v*HEIGHT) for u, v in outline], fill=255)
    mask = np.asarray(mask.filter(ImageFilter.GaussianBlur(18)), dtype=np.float32) / 255
    person = mask[np.ix_(np.minimum(rows, HEIGHT-1), np.minimum(columns, WIDTH-1))]
    grass = smoothstep(.74,.98,y) * (1-person)
    sky = (1-smoothstep(.39,.545,y)) * (1-person)
    edge_x = smoothstep(0,.065,np.minimum(x,1-x))
    edge_y = smoothstep(0,.075,np.minimum(y,1-y))

    def patch(cx, cy, rx, ry):
        return np.exp(-(((x-cx)/rx)**2 + ((y-cy)/ry)**2))

    hair = patch(.492,.171,.040,.065) + .28*patch(.649,.192,.018,.055)
    hem = patch(.533,.698,.044,.066) + .62*patch(.722,.760,.030,.081)
    sleeve = patch(.742,.479,.037,.088)
    cord = patch(.517,.426,.010,.042)

    destination = ASSETS / "field-studies.mp4"
    buffer = destination.with_suffix(".tmp.mp4")
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pixel_format", "rgb24", "-video_size", f"{WIDTH}x{HEIGHT}",
        "-framerate", str(FPS), "-i", "pipe:0", "-an", "-vf",
        "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264",
        "-preset", "medium", "-crf", "22", "-threads", "4", "-g", str(FPS*2),
        "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
        "-movflags", "+faststart", str(buffer),
    ]
    try:
        with subprocess.Popen(command, stdin=subprocess.PIPE) as encoder:
            for i in range(FPS*SECONDS):
                t = tau*i/(FPS*SECONDS)
                def wind(frequency, phase):
                    return np.sin(frequency*t+phase) - np.sin(phase)

                # A slow camera arc and separately phased gusts return to frame zero together.
                zoom = 1 + .026*(1-np.cos(t))
                dx = (8+9*person+10*grass)*np.sin(t)
                dy = (2+2*person)*np.sin(t)
                dx += sky*(14*wind(1, y*2.5)+3*wind(2,x*2))
                dx += grass*(13*wind(2, x*10-y*6)+6*wind(3, x*17+y*8))
                dy += grass*(3.0*wind(2,x*10-y*6)+1.5*wind(3,x*11))
                dx += hair*(9*wind(2,.3)+3*wind(3,y*8))
                dy += hair*3.8*wind(2,.9)
                dx += hem*6.0*wind(2,y*4)+sleeve*4.5*wind(1,.25)+cord*3.2*wind(2,.6)
                dy += hem*3.1*wind(2,.7)+sleeve*2.3*wind(2,y*4)
                sx = (.58+(x-.58)/zoom)*WIDTH + dx*edge_x
                sy = (.39+(y-.39)/zoom)*HEIGHT + dy*edge_y
                # Pillow expects the source corners in UL, LL, LR, UR order for each cell.
                corners = np.stack((sx[:-1,:-1],sy[:-1,:-1],sx[1:,:-1],sy[1:,:-1],
                                    sx[1:,1:],sy[1:,1:],sx[:-1,1:],sy[:-1,1:]), axis=-1)
                mesh = list(zip(cells, corners.reshape(-1,8).tolist()))
                frame = still.transform(still.size, Image.Transform.MESH, mesh, Image.Resampling.BICUBIC)
                encoder.stdin.write(frame.tobytes())
            encoder.stdin.close()
            if encoder.wait():
                raise RuntimeError("Film encoding failed")
        buffer.replace(destination)
    finally:
        buffer.unlink(missing_ok=True)
    print(f"{destination.name}: {FPS*SECONDS} frames, {destination.stat().st_size} bytes")


if __name__ == "__main__":
    render()

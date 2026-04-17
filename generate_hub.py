"""
Terra-Mind - Centre Hub Slide + Farming Visual Background Cards
Generates:
  1. centre_hub.png         - the central "AI Agent" hub with 7 spokes
  2. All 7 cards with farming pixel-art / symbolic illustrations built in
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Arc, FancyArrowPatch
import numpy as np
import os

OUT_DIR = r'c:\Users\kanis\OneDrive\Desktop\geospatiall\feature_cards'
os.makedirs(OUT_DIR, exist_ok=True)

DK  = '#1B2A4A'
WH  = '#FFFFFF'
BG  = '#EEF1F8'

# -- primitives ----------------------------------------------------------------
def rbox(ax, x, y, w, h, fc, ec='none', lw=0, r=8, z=2):
    ax.add_patch(FancyBboxPatch((x,y), w, h,
        boxstyle=f'round,pad=0,rounding_size={r}',
        fc=fc, ec=ec, lw=lw, zorder=z, clip_on=False))

def bar(ax, x, y, w, h, fc, z=2):
    ax.add_patch(plt.Rectangle((x,y), w, h, fc=fc, ec='none',
                                zorder=z, clip_on=False))

def tx(ax, x, y, s, fs, fw, col, ha='center', va='center', z=6):
    ax.text(x, y, s, fontsize=fs, fontweight=fw, color=col,
            ha=ha, va=va, zorder=z, clip_on=False,
            multialignment=ha, linespacing=1.45)

# -------------------------------------------------------------------------------
#  FARMING ILLUSTRATION FUNCTIONS (pure matplotlib drawing)
# -------------------------------------------------------------------------------

def draw_sun(ax, cx, cy, r=28, col='#FDD835', z=3):
    ax.add_patch(plt.Circle((cx,cy), r, fc=col, ec='#F9A825', lw=1.5, zorder=z))
    for angle in range(0, 360, 40):
        rad = np.radians(angle)
        x1 = cx + (r+3)*np.cos(rad); y1 = cy + (r+3)*np.sin(rad)
        x2 = cx + (r+14)*np.cos(rad); y2 = cy + (r+14)*np.sin(rad)
        ax.plot([x1,x2],[y1,y2], color='#F9A825', lw=2.5, zorder=z)

def draw_cloud(ax, cx, cy, scale=1.0, col='#ECEFF1', z=3):
    for dx, dy, r in [(-18,0,18),(0,6,22),(20,0,16),(10,-8,14),(-8,-8,12)]:
        ax.add_patch(plt.Circle((cx+dx*scale, cy+dy*scale), r*scale,
                     fc=col, ec='none', zorder=z))

def draw_field_rows(ax, x0, y0, w, h, col='#4CAF50', col2='#2E7D32', n=5, z=3):
    rw = h / n
    for i in range(n):
        c = col if i%2==0 else col2
        bar(ax, x0, y0+i*rw, w, rw*0.85, c, z=z)

def draw_plant(ax, cx, base_y, height=60, col='#2E7D32', z=4):
    # stem
    ax.plot([cx,cx],[base_y, base_y-height], color='#388E3C', lw=3, zorder=z)
    # leaves
    for side, ht in [(1, 0.3),(-1, 0.55),(1, 0.75)]:
        lx = cx + side*22
        ly = base_y - height*ht
        ax.plot([cx,lx],[base_y-height*ht+8, ly],
                color=col, lw=2.5, zorder=z)
        ax.add_patch(mpatches.Ellipse((lx,ly), 18, 10,
                     angle=-30*side, fc=col, ec='none', zorder=z))

def draw_leaf_diseased(ax, cx, cy, z=4):
    # healthy green leaf
    leaf = mpatches.Ellipse((cx,cy), 60, 30, angle=20,
                             fc='#66BB6A', ec='#388E3C', lw=1.5, zorder=z)
    ax.add_patch(leaf)
    # brown spots
    for dx,dy in [(-10,5),(8,-4),(0,8),(-5,-8)]:
        ax.add_patch(plt.Circle((cx+dx,cy+dy), 4,
                     fc='#8D6E63', ec='none', zorder=z+1))
    # red warning ring
    ax.add_patch(plt.Circle((cx,cy), 34, fc='none',
                 ec='#C62828', lw=2.5, linestyle='--', zorder=z+2))

def draw_satellite(ax, cx, cy, col='#455A64', z=4):
    # body
    rbox(ax, cx-12, cy-8, 24, 16, col, ec='#90A4AE', lw=1.5, r=3, z=z)
    # solar panels
    bar(ax, cx-44, cy-5, 28, 10, '#1565C0', z=z)
    bar(ax, cx+16, cy-5, 28, 10, '#1565C0', z=z)
    # panel lines
    for dx in [-35,-28,-21]:
        ax.plot([cx+dx,cx+dx],[cy-5,cy+5],color='#90CAF9',lw=1,zorder=z+1)
    for dx in [19,26,33]:
        ax.plot([cx+dx,cx+dx],[cy-5,cy+5],color='#90CAF9',lw=1,zorder=z+1)
    # antenna
    ax.plot([cx,cx],[cy-8,cy-22],color=col,lw=2,zorder=z)
    ax.add_patch(plt.Circle((cx,cy-22),3,fc='#FDD835',ec='none',zorder=z+1))
    # signal arcs
    for r in [12,20,28]:
        ax.add_patch(Arc((cx,cy+30), r*2, r*2, angle=0,
                    theta1=200, theta2=340,
                    color='#1565C0', lw=1.2, linestyle='--', zorder=z))

def draw_water_drop(ax, cx, cy, size=40, col='#00838F', z=4):
    # teardrop shape using path
    theta = np.linspace(0, 2*np.pi, 100)
    r = size * (1 - 0.5*np.sin(theta/2))
    x = cx + r * np.sin(theta)
    y = cy - r * np.cos(theta) + size*0.3
    ax.fill(x, y, fc=col+'AA', ec=col, lw=2, zorder=z)
    ax.text(cx, cy+8, '%', fontsize=14, fontweight='bold',
            color=WH, ha='center', va='center', zorder=z+1)

def draw_soil_layers(ax, x0, y0, w, z=3):
    layers = [
        ('#8D6E63', 14, 'Topsoil'),
        ('#795548', 12, 'Subsoil'),
        ('#6D4C41', 10, 'Parent rock'),
    ]
    cy = y0
    for col, h, lbl in layers:
        bar(ax, x0, cy, w, h, col, z=z)
        ax.text(x0+w/2, cy+h/2, lbl, fontsize=7, color='#EFEBE9',
                ha='center', va='center', zorder=z+1)
        cy += h

def draw_yield_chart(ax, x0, y0, w, h, col='#5E35B1', z=4):
    # bar chart with upward trend
    vals = [0.4, 0.55, 0.65, 0.72, 0.84]
    bw = (w - 10) / len(vals) - 4
    for i, v in enumerate(vals):
        bx = x0 + 5 + i*(bw+4)
        bh = v * h
        rbox(ax, bx, y0+h-bh, bw, bh, col+'CC', ec=col, lw=1, r=3, z=z)
    # trend line
    xs = [x0+5+i*(bw+4)+bw/2 for i in range(len(vals))]
    ys = [y0+h-v*h for v in vals]
    ax.plot(xs, ys, color='#FFD600', lw=2.5, zorder=z+1)
    ax.plot(xs[-1], ys[-1], 'o', color='#FFD600', ms=7, zorder=z+2)

def draw_mandi_chart(ax, x0, y0, w, h, col='#00A846', z=4):
    # price over time - dip then rise
    t  = np.linspace(0, 1, 60)
    # price: starts high, dips (glut), then rises
    price = 0.7 + 0.15*np.sin(t*np.pi*2) - 0.2*np.exp(-((t-0.35)**2)/0.01)
    price = np.clip(price, 0.1, 1.0)
    xs = x0 + t*w
    ys = y0 + h - price*h
    ax.plot(xs, ys, color=col, lw=2.5, zorder=z+1)
    ax.fill_between(xs, ys, y0+h, color=col+'33', zorder=z)
    # mark optimal sell point
    best = np.argmax(price[35:]) + 35
    ax.plot(xs[best], ys[best], '*', color='#FFD600', ms=12, zorder=z+3)
    ax.plot([xs[best],xs[best]],[ys[best],y0+h],
            color='#FFD600', lw=1.5, linestyle='--', zorder=z+2)

def draw_fertilizer_map(ax, x0, y0, w, h, z=3):
    # grid of coloured zones
    rows, cols = 4, 5
    cw = w/cols; rh = h/rows
    cmap = ['#EF9A9A','#FFCC80','#A5D6A7','#80DEEA','#CE93D8']
    for r in range(rows):
        for c in range(cols):
            fc = cmap[(r*cols+c) % len(cmap)]
            bar(ax, x0+c*cw, y0+r*rh, cw-1, rh-1, fc, z=z)

def draw_drone(ax, cx, cy, col='#455A64', z=4):
    # body
    rbox(ax, cx-10, cy-6, 20, 12, col, ec='#90A4AE', lw=1.2, r=4, z=z)
    # 4 arms
    for dx, dy in [(-22,-14),(18,-14),(-22,8),(18,8)]:
        ax.plot([cx,cx+dx],[cy,cy+dy],color=col,lw=2.5,zorder=z)
        ax.add_patch(plt.Circle((cx+dx,cy+dy),6,fc='#607D8B',ec=col,lw=1,zorder=z+1))
    # camera
    ax.add_patch(plt.Circle((cx,cy+4),4,fc='#1565C0',ec='none',zorder=z+2))

# -------------------------------------------------------------------------------
#  CENTRE HUB
# -------------------------------------------------------------------------------
def make_hub():
    W, H, DPI = 1600, 1600, 150
    fig, ax = plt.subplots(figsize=(W/DPI, H/DPI), dpi=DPI)
    ax.set_xlim(0,W); ax.set_ylim(H,0)
    ax.axis('off')
    plt.subplots_adjust(0,0,1,1)
    fig.patch.set_facecolor('#0D1B2E')
    ax.set_facecolor('#0D1B2E')

    cx, cy = W//2, H//2

    # -- starfield background --
    np.random.seed(42)
    for _ in range(180):
        sx = np.random.randint(0, W)
        sy = np.random.randint(0, H)
        sr = np.random.uniform(0.8, 2.5)
        ax.add_patch(plt.Circle((sx,sy), sr, fc='#FFFFFF',
                     alpha=np.random.uniform(0.2,0.7), zorder=0))

    # -- satellite orbit rings --
    for r, alpha in [(380,0.06),(460,0.04),(540,0.03)]:
        ax.add_patch(mpatches.Ellipse((cx,cy), r*2, r*0.5,
                     angle=20, fc='none', ec='#1565C0',
                     lw=1.2, alpha=alpha, zorder=1))

    # -- Earth / field at base --
    ax.add_patch(mpatches.Ellipse((cx, cy+560), 900, 280,
                 fc='#1B5E20', ec='#2E7D32', lw=2, zorder=2))
    ax.add_patch(mpatches.Ellipse((cx, cy+560), 900, 160,
                 fc='#2E7D32', ec='none', zorder=2))
    # field rows on earth
    for i in range(7):
        x0 = cx - 400 + i*115
        ax.plot([x0, x0+80],[cy+480, cy+600],
                color='#4CAF50', lw=2.5, alpha=0.6, zorder=3)

    # -- centre hexagon - TERRA-MIND core --
    angles = np.linspace(0, 2*np.pi, 7)[:-1] + np.pi/6
    hx = cx + 110 * np.cos(angles)
    hy = cy + 110 * np.sin(angles)
    ax.fill(hx, hy, fc='#1A237E', ec='#3F51B5', lw=3, zorder=8)
    ax.fill(hx*0.85, hy*0.85+cy*0.15, fc='#283593', ec='none', zorder=8)

    # inner glow
    for r, a in [(95,0.07),(80,0.10),(65,0.14)]:
        ax.add_patch(plt.Circle((cx,cy), r, fc='#5C6BC0',
                     alpha=a, zorder=7))

    ax.add_patch(plt.Circle((cx,cy), 90, fc='none',
                 ec='#7986CB', lw=2.5, zorder=9))

    tx(ax, cx, cy-28, 'TERRA', 22, 'bold', '#E8EAF6', z=10)
    tx(ax, cx, cy+2,  'MIND',  22, 'bold', '#E8EAF6', z=10)
    tx(ax, cx, cy+28, 'AI CORE', 9, 'normal', '#9FA8DA', z=10)

    # -- 7 spoke nodes ----------------------------------------------------------
    spokes = [
        # angle-, label line1, label line2, accent, icon_func
        (270, '01', 'Disease\nDetection',   '94% conf.',   '#C62828', draw_leaf_diseased),
        (321, '02', 'Crop\nSelection',      '86% conf.',   '#1565C0', None),
        (13,  '03', 'Smart\nIrrigation',    '4,000L saved','#00838F', draw_water_drop),
        (64,  '04', 'Land\nDegradation',    '5yr SAR',     '#455A64', draw_satellite),
        (116, '05', 'Fertilizer\nMapping',  'Rs.8,500+',   '#E65100', draw_fertilizer_map),
        (167, '06', 'Yield\nPrediction',    '84% acc.',    '#5E35B1', draw_yield_chart),
        (218, '07', 'Harvest\nOracle',      '+Rs.7,400',   '#00A846', draw_mandi_chart),
    ]

    SPOKE_R  = 420   # center of node from hub centre
    NODE_W   = 190
    NODE_H   = 155

    for ang_deg, num, lbl, metric, accent, icon_fn in spokes:
        rad = np.radians(ang_deg)
        nx  = cx + SPOKE_R * np.cos(rad)
        ny  = cy + SPOKE_R * np.sin(rad)

        # spoke line
        inner_r = 96
        x1 = cx + inner_r * np.cos(rad)
        y1 = cy + inner_r * np.sin(rad)
        x2 = nx - (NODE_W/2+6) * np.cos(rad)
        y2 = ny - (NODE_H/2+6) * np.sin(rad)
        ax.plot([x1,x2],[y1,y2], color=accent, lw=2.2,
                linestyle=(0,(4,3)), zorder=5)
        # arrowhead at node end
        ax.annotate('', xy=(x2,y2), xytext=(x1+10*(x2-x1)/max(1,abs(x2-x1)),
                                            y1+10*(y2-y1)/max(1,abs(y2-y1))),
                    arrowprops=dict(arrowstyle='->', color=accent,
                                   lw=2, mutation_scale=16), zorder=6)

        # node card
        NX = nx - NODE_W/2; NY = ny - NODE_H/2
        rbox(ax, NX, NY, NODE_W, NODE_H, '#0F2235',
             ec=accent, lw=2.5, r=12, z=7)
        # accent top bar
        bar(ax, NX, NY, NODE_W, 6, accent, z=8)

        # number badge
        rbox(ax, NX+8, NY+12, 36, 24, accent, r=5, z=9)
        tx(ax, NX+26, NY+24, num, 9, 'bold', WH, z=10)

        # label
        tx(ax, NX+NODE_W/2, NY+52, lbl, 10.5, 'bold', WH, z=10)

        # metric pill
        rbox(ax, NX+10, NY+NODE_H-30, NODE_W-20, 22,
             accent+'33', ec=accent, lw=1.2, r=5, z=9)
        tx(ax, NX+NODE_W/2, NY+NODE_H-19, metric, 8.5, 'bold', accent, z=10)

        # small illustration inside node
        IW = NODE_W - 20; IH = 32
        IX = NX + 10;     IY = NY + 76
        bar(ax, IX, IY, IW, IH, accent+'18', z=8)
        if icon_fn == draw_leaf_diseased:
            draw_leaf_diseased(ax, nx, ny-14, z=9)
        elif icon_fn == draw_water_drop:
            draw_water_drop(ax, nx, ny-14, size=14, col=accent, z=9)
        elif icon_fn == draw_satellite:
            draw_satellite(ax, nx, ny-14, col='#607D8B', z=9)
        elif icon_fn == draw_fertilizer_map:
            draw_fertilizer_map(ax, IX+2, IY+2, IW-4, IH-4, z=9)
        elif icon_fn == draw_yield_chart:
            draw_yield_chart(ax, IX+2, IY+2, IW-4, IH-4, col=accent, z=9)
        elif icon_fn == draw_mandi_chart:
            draw_mandi_chart(ax, IX+2, IY+2, IW-4, IH-4, col=accent, z=9)

    # -- title --
    tx(ax, cx, 55, 'TERRA-MIND', 32, 'bold', '#E8EAF6', z=10)
    tx(ax, cx, 100, 'Proactive AI Agronomist  |  One Agent  |  Seven Solutions', 11,
       'normal', '#7986CB', z=10)

    # -- bottom tagline --
    tx(ax, cx, H-38,
       'Satellite  -  AI  -  Voice  -  Offline-First  -  87M+ Farmers  -  10x ROI',
       10, 'normal', '#546E7A', z=10)

    out = os.path.join(OUT_DIR, 'centre_hub.png')
    fig.savefig(out, dpi=DPI, bbox_inches='tight',
                facecolor='#0D1B2E', edgecolor='none')
    plt.close()
    print('Saved: centre_hub.png')

make_hub()
print('Done.')

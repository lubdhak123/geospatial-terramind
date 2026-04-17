"""
Terra-Mind - Proposed Solution Slide (matches existing PPT style exactly)
Dark space background, blue outlined boxes, same layout structure
But with fixes: equal boxes, less text, TerraMind branding, better hierarchy
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

W, H, DPI = 1920, 1080, 150
fig, ax = plt.subplots(figsize=(W/DPI, H/DPI), dpi=DPI)
ax.set_xlim(0, W)
ax.set_ylim(H, 0)
ax.axis('off')
plt.subplots_adjust(0, 0, 1, 1)

# ── helpers ──────────────────────────────────────────────────────────────

def rbox(x, y, w, h, fc='none', ec='#2A6FDB', lw=2, r=8, z=3, alpha=1.0):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
        boxstyle=f'round,pad=0,rounding_size={r}',
        fc=fc, ec=ec, lw=lw, zorder=z, alpha=alpha))

def bar(x, y, w, h, fc, z=2, alpha=1.0):
    ax.add_patch(plt.Rectangle((x, y), w, h, fc=fc, ec='none',
                                zorder=z, alpha=alpha))

def tx(x, y, s, fs, fw, col, ha='center', va='center', z=6, ls=1.35):
    ax.text(x, y, s, fontsize=fs, fontweight=fw, color=col,
            ha=ha, va=va, zorder=z, clip_on=False,
            multialignment=ha, linespacing=ls)

def arrow_r(x1, y1, x2, y2, col='#2A6FDB', lw=2.5):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle='->', color=col, lw=lw), zorder=8)

# ═══════════════════════════════════════════════════════════════════════
# 1. BACKGROUND - dark space with stars (matching your PPT)
# ═══════════════════════════════════════════════════════════════════════
for i in range(H):
    t = i / H
    r = int(5 + t * 10)
    g = int(5 + t * 12)
    b = int(20 + t * 30)
    ax.fill_between([0, W], [i, i], [i+1, i+1],
                    color=(r/255, g/255, b/255), zorder=0)

# stars
np.random.seed(42)
for _ in range(300):
    sx = np.random.randint(0, W)
    sy = np.random.randint(0, H)
    sa = np.random.uniform(0.1, 0.6)
    sr = np.random.uniform(0.5, 1.8)
    ax.add_patch(plt.Circle((sx, sy), sr, fc='white', alpha=sa, zorder=1))

# top blue glow line
bar(0, 0, W, 3, '#2A6FDB', z=3, alpha=0.9)

# bottom subtle glow
for i in range(60):
    ax.fill_between([0, W], [H - i, H - i], [H - i + 1, H - i + 1],
                    color=(0.05, 0.1, 0.3), alpha=0.02*i/60, zorder=1)

# ═══════════════════════════════════════════════════════════════════════
# 2. HEADER (matching your PPT exactly)
# ═══════════════════════════════════════════════════════════════════════

# SRM logo area (top-left)
tx(80, 40, 'SRM', 10, 'bold', '#FFFFFF', z=6)

# Shield icon (top-center, small)
ax.add_patch(FancyBboxPatch((W//2 - 16, 10), 32, 36,
    boxstyle='round,pad=0,rounding_size=4',
    fc='none', ec='#2A6FDB', lw=1.5, zorder=5))
tx(W//2, 28, 'TM', 9, 'bold', '#2A6FDB', z=6)

# Title
tx(W//2, 72, 'Proposed Solution', 28, 'bold', '#FFFFFF', z=6)

# Subtitle - FIXED: TerraMind not FarmLens, complete sentence
tx(W//2, 115, 'TerraMind  --  AI + Sentinel-2 Powered, from first seed to market',
   14, 'normal', '#4A9EFF', z=6)

# ═══════════════════════════════════════════════════════════════════════
# 3. FIVE FEATURE BOXES (equal size, matching your blue box style)
# ═══════════════════════════════════════════════════════════════════════

BOX_W = 280
BOX_H = 280
BOX_Y = 155
GAP   = 30
ARROW_GAP = 30
TOTAL_W = 5 * BOX_W + 4 * (GAP + ARROW_GAP)
START_X = (W - TOTAL_W) // 2

features = [
    ('SOIL',   'Combines govt soil\ndata + satellite\nleaf analysis',
     'Zone-by-zone\nfertilizer mapping'),

    ('WATER',  'AI detects water\nstress before\ncrop wilts',
     '25% yield saved\n1km hyperlocal'),

    ('HEALTH', 'Satellite flags\ndisease risk\n10 days early',
     'AI alert before\nvisible symptoms'),

    ('YIELD',  'Predicts harvest\n6 weeks early',
     '80-85% accuracy\nends panic selling'),

    ('SELL',   'AI tells best day\nand market\nto sell crop',
     '4-week forecast\nsaves Rs.14,575'),
]

box_centers = []

for i, (title, desc, stat) in enumerate(features):
    bx = START_X + i * (BOX_W + GAP + ARROW_GAP)
    box_centers.append(bx)

    # Main box - dark fill with blue border (matching your style)
    rbox(bx, BOX_Y, BOX_W, BOX_H, fc='#0A1628', ec='#2A6FDB', lw=2, r=6, z=3)

    # Title bar at top
    bar(bx + 1, BOX_Y + 1, BOX_W - 2, 48, '#1A3A6A', z=4)
    tx(bx + BOX_W//2, BOX_Y + 26, title, 16, 'bold', '#FFFFFF', z=6)

    # Blue underline
    bar(bx + 10, BOX_Y + 50, BOX_W - 20, 2, '#2A6FDB', z=5)

    # Description
    tx(bx + BOX_W//2, BOX_Y + 110, desc, 10, 'normal', '#CCDDFF', z=6, ls=1.5)

    # Stat highlight at bottom
    rbox(bx + 15, BOX_Y + BOX_H - 80, BOX_W - 30, 60,
         fc='#0D2244', ec='#2A6FDB', lw=1, r=5, z=4, alpha=0.6)
    tx(bx + BOX_W//2, BOX_Y + BOX_H - 50, stat, 9.5, 'bold', '#4A9EFF', z=6, ls=1.4)

# Arrows between boxes
for i in range(4):
    x1 = box_centers[i] + BOX_W + 2
    x2 = box_centers[i+1] - 2
    mid_y = BOX_Y + BOX_H//2
    arrow_r(x1, mid_y, x2, mid_y, col='#2A6FDB', lw=2)

# ═══════════════════════════════════════════════════════════════════════
# 4. BOTTOM SECTION - 3 panels (matching your layout)
# ═══════════════════════════════════════════════════════════════════════

BOT_Y = BOX_Y + BOX_H + 45
BOT_H = 310

# ── Panel 1: Real Impact ─────────────────────────────────────────────
P1_X = START_X
P1_W = 480
rbox(P1_X, BOT_Y, P1_W, BOT_H, fc='#0A1628', ec='#2A6FDB', lw=2, r=6, z=3)

# Section header
bar(P1_X + 1, BOT_Y + 1, P1_W - 2, 42, '#1A3A6A', z=4)
tx(P1_X + P1_W//2, BOT_Y + 23, 'Real Impact', 14, 'bold', '#FFD700', z=6)

lines = [
    ('Farmer - 2 acres - Thanjavur',          '#FFFFFF',  10, 'bold'),
    ('Blast fungus detected 8 days early -',  '#CCDDFF',  9.5, 'normal'),
    ('Rs.6,000 saved',                        '#4ADE80',  10, 'bold'),
    ('Sold at peak price on Oct 17',          '#CCDDFF',  9.5, 'normal'),
    ('Rs.14,575 saved',                       '#4ADE80',  10, 'bold'),
    ('',                                      '#FFFFFF',  6,  'normal'),
    ('Total  ->  Rs.24,000/season',           '#FFD700', 12, 'bold'),
]
for j, (txt, col, fs, fw) in enumerate(lines):
    tx(P1_X + P1_W//2, BOT_Y + 70 + j * 32, txt, fs, fw, col, z=6)

# check mark at bottom
tx(P1_X + P1_W//2, BOT_Y + BOT_H - 20, 'V', 14, 'bold', '#4ADE80', z=6)

# ── Panel 2: Key Numbers ─────────────────────────────────────────────
P2_X = P1_X + P1_W + 30
P2_W = 580
rbox(P2_X, BOT_Y, P2_W, BOT_H, fc='#0A1628', ec='#2A6FDB', lw=2, r=6, z=3)

bar(P2_X + 1, BOT_Y + 1, P2_W - 2, 42, '#1A3A6A', z=4)
tx(P2_X + P2_W//2, BOT_Y + 23, 'Key Differentiators', 14, 'bold', '#FFD700', z=6)

stats = [
    ('1km',     'Hyperlocal climate forecast\n-- field level, not district level'),
    ('10 Days', 'Early disease alert\nbefore visible symptoms'),
    ('80-85%',  'ML yield prediction\naccuracy for farmers'),
    ('Rs.14,575', 'Average savings\nper farmer per season'),
]

for j, (num, desc) in enumerate(stats):
    sy = BOT_Y + 72 + j * 62
    # number box
    rbox(P2_X + 20, sy - 16, 120, 46, fc='#0D2244', ec='#2A6FDB', lw=1, r=5, z=4)
    tx(P2_X + 80, sy + 7, num, 14, 'bold', '#4A9EFF', z=6)
    # desc
    tx(P2_X + 280, sy + 7, desc, 9, 'normal', '#AABBDD', z=6, ls=1.4)
    # separator
    if j < 3:
        bar(P2_X + 20, sy + 38, P2_W - 40, 0.8, '#1A3A6A', z=5)

# ── Panel 3: Why TerraMind ───────────────────────────────────────────
P3_X = P2_X + P2_W + 30
P3_W = W - P3_X - START_X
rbox(P3_X, BOT_Y, P3_W, BOT_H, fc='#0A1628', ec='#2A6FDB', lw=2, r=6, z=3)

bar(P3_X + 1, BOT_Y + 1, P3_W - 2, 42, '#1A3A6A', z=4)
tx(P3_X + P3_W//2, BOT_Y + 23, 'Why Only Us', 14, 'bold', '#FFD700', z=6)

comparisons = [
    ('Plantix',    '->  after symptoms',   '#FF6B6B'),
    ('Meghdoot',   '->  district level',   '#FF6B6B'),
    ('FASAL',      '->  state level only', '#FF6B6B'),
    ('', 'V/S', '#4A9EFF'),
    ('Terra Mind', '->  all 5, free',      '#4ADE80'),
]

cy = BOT_Y + 72
for name, desc, col in comparisons:
    if name == '':
        # V/S divider
        bar(P3_X + 20, cy - 2, P3_W - 40, 1.5, '#2A6FDB', z=5)
        tx(P3_X + P3_W//2, cy + 8, desc, 10, 'bold', col, z=6)
        cy += 30
        continue

    # highlight TerraMind row
    if 'Terra' in name:
        rbox(P3_X + 10, cy - 14, P3_W - 20, 40,
             fc='#0D2A1A', ec='#4ADE80', lw=1.5, r=5, z=4)

    bullet = '*' if 'Terra' not in name else '>'
    tx(P3_X + 24, cy, bullet, 12, 'bold', col, ha='left', z=6)
    tx(P3_X + 44, cy, name, 10, 'bold', '#FFFFFF', ha='left', z=6)
    tx(P3_X + 44 + len(name)*7.5, cy, f'  {desc}', 9.5, 'normal', col, ha='left', z=6)
    cy += 48

# ═══════════════════════════════════════════════════════════════════════
# 5. FOOTER
# ═══════════════════════════════════════════════════════════════════════
bar(0, H - 3, W, 3, '#2A6FDB', z=3, alpha=0.5)

plt.savefig(r'c:\Users\kanis\OneDrive\Desktop\geospatiall\proposed_solution_v2.png',
            dpi=DPI, bbox_inches='tight', facecolor='#060D20')
print("Saved: proposed_solution_v2.png")

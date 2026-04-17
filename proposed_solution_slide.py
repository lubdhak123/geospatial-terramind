import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

W, H, DPI = 1600, 900, 150
fig, ax = plt.subplots(figsize=(W/DPI, H/DPI), dpi=DPI)
ax.set_xlim(0, W)
ax.set_ylim(H, 0)
ax.axis('off')
plt.subplots_adjust(0, 0, 1, 1)

# ── helpers ──────────────────────────────────────────────────────────────────

def rbox(x, y, w, h, fc, ec='none', lw=0, r=12, alpha=1.0, z=2):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
        boxstyle=f'round,pad=0,rounding_size={r}',
        fc=fc, ec=ec, lw=lw, zorder=z, alpha=alpha))

def bar(x, y, w, h, fc, z=2, alpha=1.0):
    ax.add_patch(plt.Rectangle((x, y), w, h, fc=fc, ec='none', zorder=z, alpha=alpha))

def tx(x, y, s, fs, fw, col, ha='center', va='center', z=6, ls=1.4, style='normal'):
    ax.text(x, y, s, fontsize=fs, fontweight=fw, color=col,
            ha=ha, va=va, zorder=z, clip_on=False,
            multialignment=ha, linespacing=ls, style=style)

def arrow_right(x1, y, x2, color='#4A9EFF', lw=2):
    ax.annotate('', xy=(x2, y), xytext=(x1, y),
        arrowprops=dict(arrowstyle='->', color=color, lw=lw),
        zorder=8)

# ═════════════════════════════════════════════════════════════════════════════
# 1. BACKGROUND — deep navy gradient
# ═════════════════════════════════════════════════════════════════════════════
for i in range(H):
    t = i / H
    r = int(8  + t * 12)
    g = int(12 + t * 10)
    b = int(38 + t * 22)
    ax.fill_between([0, W], [i, i], [i+1, i+1],
                    color=(r/255, g/255, b/255), zorder=0)

# subtle grid dots
np.random.seed(3)
for _ in range(180):
    gx = np.random.randint(0, W)
    gy = np.random.randint(0, H)
    ax.add_patch(plt.Circle((gx, gy), 1.2,
                 fc='#4A9EFF', alpha=np.random.uniform(0.04, 0.18), zorder=1))

# top glow bar
bar(0, 0, W, 4, '#4A9EFF', z=3, alpha=0.9)

# ═════════════════════════════════════════════════════════════════════════════
# 2. HEADER
# ═════════════════════════════════════════════════════════════════════════════
tx(W//2, 52, 'Proposed Solution', 28, 'bold', '#FFFFFF', z=6)
tx(W//2, 95,
   'TerraMind  —  AI + Sentinel-2 Powered Precision Agriculture Platform',
   14, 'normal', '#7EC8FF', z=6)

# divider line
bar(80, 118, W-160, 1.5, '#4A9EFF', z=4, alpha=0.5)

# SRM logo placeholder top-left
rbox(18, 14, 80, 32, '#FFFFFF', r=6, z=7, alpha=0.12)
tx(58, 30, 'SRM', 11, 'bold', '#FFFFFF', z=8)

# Terra-Mind top-right
rbox(W-110, 14, 92, 32, '#4A9EFF', r=6, z=7, alpha=0.18)
tx(W-64, 30, 'TerraMind', 10, 'bold', '#7EC8FF', z=8)

# ═════════════════════════════════════════════════════════════════════════════
# 3. FIVE FEATURE BOXES  (equal size, evenly spaced)
# ═════════════════════════════════════════════════════════════════════════════
features = [
    ('[S]', 'SOIL',   '#1A6B3C', '#25A85E',
     'Govt soil data +\nSentinel-2 analysis',
     'Zone-by-zone\nfertilizer mapping'),

    ('[W]', 'WATER',  '#0D4F8B', '#1A7FCC',
     'Detects water stress\nbefore crop wilts',
     '1km hyperlocal\nforecast · 25% yield saved'),

    ('[H]', 'HEALTH', '#6B1A6B', '#AA2EAA',
     'Satellite flags disease\nrisk 10 days early',
     'AI alert before\nvisible symptoms'),

    ('[Y]', 'YIELD',  '#7A4A00', '#CC7A00',
     'Predicts harvest\n6 weeks early',
     '80-85% ML accuracy\nends panic selling'),

    ('[M]', 'SELL',   '#1A4F6B', '#2E88AA',
     'Best day & market\nto sell your crop',
     '4-week price forecast\nRs.14,575 avg saved'),
]

BOX_W   = 248
BOX_H   = 260
BOX_Y   = 148
GAP     = 28
START_X = (W - (5 * BOX_W + 4 * GAP)) // 2

for i, (icon, title, dark, light, line1, line2) in enumerate(features):
    bx = START_X + i * (BOX_W + GAP)

    # box background
    rbox(bx, BOX_Y, BOX_W, BOX_H, dark, ec=light, lw=1.5, r=14, z=3)

    # top accent bar
    bar(bx, BOX_Y, BOX_W, 5, light, z=4)
    # round top corners mask
    rbox(bx, BOX_Y, BOX_W, 20, dark, r=14, z=4)
    bar(bx, BOX_Y+5, BOX_W, 15, light, z=4)
    # re-draw top bar clean
    bar(bx, BOX_Y, BOX_W, 6, light, z=5)

    # icon circle
    ax.add_patch(plt.Circle((bx + BOX_W//2, BOX_Y + 68), 36,
                 fc=light, alpha=0.18, zorder=4))
    tx(bx + BOX_W//2, BOX_Y + 68, icon, 28, 'normal', '#FFFFFF', z=6)

    # title
    tx(bx + BOX_W//2, BOX_Y + 122, title, 15, 'bold', '#FFFFFF', z=6)

    # divider
    bar(bx + 30, BOX_Y + 138, BOX_W - 60, 1, light, z=5, alpha=0.4)

    # description lines
    tx(bx + BOX_W//2, BOX_Y + 170, line1, 9.5, 'normal', '#C8E8FF',
       z=6, ls=1.5)
    tx(bx + BOX_W//2, BOX_Y + 218, line2, 9, 'normal', light,
       z=6, ls=1.5)

# arrows between boxes
for i in range(4):
    ax1 = START_X + (i+1) * (BOX_W + GAP) - GAP + 2
    ax2 = START_X + (i+1) * (BOX_W + GAP) - 4
    arrow_right(ax1, BOX_Y + BOX_H//2, ax2, color='#4A9EFF', lw=1.8)

# ═════════════════════════════════════════════════════════════════════════════
# 4. BOTTOM ROW — Real Impact  |  Key Stats  |  Why TerraMind?
# ═════════════════════════════════════════════════════════════════════════════
BOT_Y = BOX_Y + BOX_H + 38
BOT_H = 310

# ── Real Impact ──────────────────────────────────────────────────────────────
IMP_X = START_X
IMP_W = 420
rbox(IMP_X, BOT_Y, IMP_W, BOT_H, '#0A1F0A', ec='#25A85E', lw=1.5, r=14, z=3)
bar(IMP_X, BOT_Y, IMP_W, 6, '#25A85E', z=4)

tx(IMP_X + IMP_W//2, BOT_Y + 32, '>> Real Impact', 13, 'bold', '#25A85E', z=6)
bar(IMP_X + 24, BOT_Y + 50, IMP_W - 48, 1, '#25A85E', z=5, alpha=0.3)

story = [
    ('Farmer · 2 acres · Thanjavur', '#FFFFFF', 10, 'bold'),
    ('Blast fungus detected 8 days early', '#C8F0D0', 9.5, 'normal'),
    ('₹6,000 saved on crop loss', '#25A85E', 9.5, 'normal'),
    ('Sold at peak price on Oct 17', '#C8F0D0', 9.5, 'normal'),
    ('₹14,575 saved on market timing', '#25A85E', 9.5, 'normal'),
    ('', '#FFFFFF', 6, 'normal'),
    ('Total  →  ₹24,000 / season', '#FFFFFF', 11, 'bold'),
]
for j, (txt, col, fs, fw) in enumerate(story):
    tx(IMP_X + IMP_W//2, BOT_Y + 82 + j * 28, txt, fs, fw, col, z=6)

# ── Key Stats ─────────────────────────────────────────────────────────────────
STAT_X = IMP_X + IMP_W + 28
STAT_W = 456
rbox(STAT_X, BOT_Y, STAT_W, BOT_H, '#0A1828', ec='#1A7FCC', lw=1.5, r=14, z=3)
bar(STAT_X, BOT_Y, STAT_W, 6, '#1A7FCC', z=4)

tx(STAT_X + STAT_W//2, BOT_Y + 32, '## Key Statistics', 13, 'bold', '#1A7FCC', z=6)
bar(STAT_X + 24, BOT_Y + 50, STAT_W - 48, 1, '#1A7FCC', z=5, alpha=0.3)

stats = [
    ('1 km', 'Hyperlocal climate forecast\n— field level, not district'),
    ('10 Days', 'Early disease alert\nbefore visible symptoms'),
    ('80–85%', 'ML yield prediction\naccuracy for farmers'),
    ('₹14,575', 'Average savings per farmer\nper season'),
]
for j, (num, desc) in enumerate(stats):
    sy = BOT_Y + 78 + j * 60
    tx(STAT_X + 70, sy, num, 16, 'bold', '#4A9EFF', ha='center', z=6)
    tx(STAT_X + 200, sy, desc, 9, 'normal', '#A8C8E8', ha='center', z=6, ls=1.4)
    if j < 3:
        bar(STAT_X + 24, sy + 28, STAT_W - 48, 0.8, '#1A7FCC', z=5, alpha=0.15)

# ── Why TerraMind ─────────────────────────────────────────────────────────────
WHY_X = STAT_X + STAT_W + 28
WHY_W = W - WHY_X - START_X
rbox(WHY_X, BOT_Y, WHY_W, BOT_H, '#1A0A28', ec='#AA2EAA', lw=1.5, r=14, z=3)
bar(WHY_X, BOT_Y, WHY_W, 6, '#AA2EAA', z=4)

tx(WHY_X + WHY_W//2, BOT_Y + 32, '** Why TerraMind?', 13, 'bold', '#CC66CC', z=6)
bar(WHY_X + 24, BOT_Y + 50, WHY_W - 48, 1, '#AA2EAA', z=5, alpha=0.3)

comparisons = [
    ('Plantix',   'After symptoms only',    '✗', '#FF6666'),
    ('Meghdoot',  'District level only',    '✗', '#FF6666'),
    ('FASAL',     'State level only',       '✗', '#FF6666'),
    ('TerraMind', 'All 5 · Field level · Free', '✓', '#25A85E'),
]
for j, (name, desc, mark, col) in enumerate(comparisons):
    cy = BOT_Y + 82 + j * 56
    # highlight TerraMind row
    if name == 'TerraMind':
        rbox(WHY_X + 16, cy - 18, WHY_W - 32, 44,
             '#1A3A1A', ec='#25A85E', lw=1, r=8, z=4)
    tx(WHY_X + 38, cy, mark, 14, 'bold', col, ha='center', z=6)
    tx(WHY_X + 100, cy, name, 10, 'bold', '#FFFFFF', ha='center', z=6)
    tx(WHY_X + WHY_W//2 + 20, cy, desc, 8.5, 'normal', col, ha='center', z=6)

# ═════════════════════════════════════════════════════════════════════════════
# 5. FOOTER
# ═════════════════════════════════════════════════════════════════════════════
bar(0, H-32, W, 32, '#050D1A', z=5)
bar(0, H-32, W, 1.5, '#4A9EFF', z=6, alpha=0.5)
tx(W//2, H-15, 'TerraMind  ·  Agentic Precision Agriculture  ·  Powered by Sentinel-2 + AI',
   9, 'normal', '#4A6A8A', z=7)

plt.savefig(r'c:\Users\kanis\OneDrive\Desktop\geospatiall\proposed_solution_slide.png',
            dpi=DPI, bbox_inches='tight', facecolor='#080E26')
print("Saved: proposed_solution_slide.png")

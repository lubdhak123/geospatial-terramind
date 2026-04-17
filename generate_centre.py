"""
Terra-Mind - Centre Image
A glowing AI brain fused with a wheat/farm field
Dark deep-blue background, satellite beams, crop field at bottom
Clean, striking, suitable as PPT centre surrounded by 7 feature cards
1200 x 1200 px @ 150 DPI (square - fits any layout)
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Wedge
import numpy as np
import os

OUT = r'c:\Users\kanis\OneDrive\Desktop\geospatiall\feature_cards\CENTRE.png'

W, H, DPI = 1400, 1400, 150
fig, ax = plt.subplots(figsize=(W/DPI, H/DPI), dpi=DPI)
ax.set_xlim(0, W)
ax.set_ylim(H, 0)
ax.axis('off')
plt.subplots_adjust(0, 0, 1, 1)

cx, cy = W // 2, H // 2 - 40   # centre point

# =============================================================================
# 1. BACKGROUND - deep night sky gradient
# =============================================================================
for i in range(H):
    t = i / H
    r = int(10 + t * 18)
    g = int(18 + t * 10)
    b = int(45 + t * 20)
    ax.fill_between([0, W], [H - i, H - i], [H - i - 1, H - i - 1],
                    color=(r/255, g/255, b/255), zorder=0)

# stars
np.random.seed(7)
for _ in range(220):
    sx = np.random.randint(0, W)
    sy = np.random.randint(0, H)
    sa = np.random.uniform(0.15, 0.8)
    sr = np.random.uniform(0.6, 2.2)
    ax.add_patch(plt.Circle((sx, sy), sr, fc='#FFFFFF', alpha=sa, zorder=1))

# =============================================================================
# 2. EARTH FIELD - lush crop field at bottom
# =============================================================================
# soil base
ax.add_patch(plt.Rectangle((0, H - 260), W, 260, fc='#1A3A0A', zorder=2))
# field depth bands (perspective rows)
field_cols = ['#1B5E20','#2E7D32','#388E3C','#43A047','#4CAF50']
band_heights = [100, 65, 45, 30, 20]
by = H - 260
for fc2, bh in zip(field_cols, band_heights):
    ax.add_patch(plt.Rectangle((0, by), W, bh, fc=fc2, zorder=3))
    by += bh
# perspective crop rows (converge toward horizon)
horizon_y = H - 260
for col_i in range(18):
    t = col_i / 17.0
    base_x = 60 + col_i * (W - 120) / 17
    # each row from bottom to horizon
    for row_i in range(7):
        rt = row_i / 6.0
        row_y_bot = H - 10 - row_i * 36
        row_y_top = H - 36 - row_i * 36
        spread = (1 - rt) * 18 + 2
        row_x = base_x + (base_x - cx) * rt * 0.25
        # stalk
        ax.plot([row_x, row_x], [row_y_bot, row_y_top],
                color='#66BB6A', lw=max(0.8, 2.2 * (1 - rt * 0.7)),
                alpha=0.7, zorder=4)
        # wheat grain head
        ax.add_patch(mpatches.Ellipse(
            (row_x, row_y_top - 8),
            spread * 0.7, spread * 1.4,
            fc='#FDD835', ec='#F9A825',
            lw=0.5, alpha=0.65, zorder=5))
# horizon glow
for gw2, ga, gc in [(W, 0.18, '#4CAF50'), (W, 0.10, '#81C784')]:
    ax.add_patch(plt.Rectangle((0, horizon_y - 8), gw2, 16,
                 fc=gc, alpha=ga, zorder=4))

# =============================================================================
# 3. SATELLITE ORBIT RINGS
# =============================================================================
for radius, alpha in [(310, 0.10), (390, 0.07), (470, 0.05)]:
    ring = mpatches.Ellipse((cx, cy), radius * 2, radius * 0.55,
                             angle=15, fc='none', ec='#1565C0',
                             lw=1.2, alpha=alpha, zorder=2, linestyle='--')
    ax.add_patch(ring)

# satellite on top orbit
sat_angle = np.radians(-35)
sat_r = 390
sat_x = cx + sat_r * np.cos(sat_angle)
sat_y = cy + sat_r * 0.275 * np.sin(sat_angle)
# satellite body
ax.add_patch(FancyBboxPatch((sat_x - 14, sat_y - 8), 28, 16,
             boxstyle='round,pad=0,rounding_size=3',
             fc='#546E7A', ec='#90A4AE', lw=1.5, zorder=5))
# solar panels
ax.add_patch(plt.Rectangle((sat_x - 50, sat_y - 5), 32, 10,
             fc='#1565C0', ec='#42A5F5', lw=0.8, zorder=5))
ax.add_patch(plt.Rectangle((sat_x + 18, sat_y - 5), 32, 10,
             fc='#1565C0', ec='#42A5F5', lw=0.8, zorder=5))
# signal beam from satellite to centre
ax.plot([sat_x, cx], [sat_y, cy - 90],
        color='#42A5F5', lw=1.5, linestyle=':', alpha=0.7, zorder=4)

# =============================================================================
# 4. OUTER GLOW RINGS around core
# =============================================================================
glow_colors = ['#0D1B6E', '#1A237E', '#283593', '#303F9F', '#3949AB']
glow_radii  = [210, 180, 150, 120, 96]
glow_alphas = [0.12, 0.18, 0.24, 0.30, 0.38]
for r, a, fc in zip(glow_radii, glow_alphas, glow_colors):
    ax.add_patch(plt.Circle((cx, cy), r, fc=fc, alpha=a, zorder=5))

# pulse rings
for pr, pa in [(220, 0.22), (240, 0.12), (258, 0.07)]:
    ax.add_patch(plt.Circle((cx, cy), pr, fc='none',
                 ec='#5C6BC0', lw=1.5, alpha=pa, zorder=6))

# =============================================================================
# 5. HEXAGON CORE  (much larger)
# =============================================================================
n = 6
hex_r = 112
angles_h = np.linspace(np.pi / 6, np.pi / 6 + 2 * np.pi, n + 1)[:-1]
hx = cx + hex_r * np.cos(angles_h)
hy = cy + hex_r * np.sin(angles_h)
ax.fill(hx, hy, fc='#1A237E', ec='#7986CB', lw=3.5, zorder=7)

# inner hex gradient layers
for hr2, hfc in [(98, '#283593'), (82, '#303F9F'), (66, '#3949AB')]:
    hx2 = cx + hr2 * np.cos(angles_h)
    hy2 = cy + hr2 * np.sin(angles_h)
    ax.fill(hx2, hy2, fc=hfc, ec='none', zorder=8)

# =============================================================================
# 6. CIRCUIT / NEURAL LINES radiating from core
# =============================================================================
np.random.seed(3)
for angle_deg in range(0, 360, 22):
    rad = np.radians(angle_deg)
    r1 = hex_r + 6
    r2 = hex_r + np.random.randint(55, 115)
    x1 = cx + r1 * np.cos(rad); y1 = cy + r1 * np.sin(rad)
    x2 = cx + r2 * np.cos(rad); y2 = cy + r2 * np.sin(rad)
    ax.plot([x1, x2], [y1, y2], color='#5C6BC0', lw=1.4,
            alpha=0.5, zorder=6)
    ax.add_patch(plt.Circle((x2, y2), 3.5, fc='#7986CB',
                 alpha=0.65, zorder=7))

# 7 main spoke beams - one per feature, bold coloured
spoke_angles = np.linspace(0, 360, 8)[:-1]
spoke_cols   = ['#C62828','#1565C0','#00838F','#455A64',
                 '#E65100','#5E35B1','#00A846']
for ang, col in zip(spoke_angles, spoke_cols):
    rad = np.radians(ang)
    x1 = cx + (hex_r + 10) * np.cos(rad)
    y1 = cy + (hex_r + 10) * np.sin(rad)
    x2 = cx + 295 * np.cos(rad)
    y2 = cy + 295 * np.sin(rad)
    ax.plot([x1, x2], [y1, y2], color=col, lw=3.0,
            alpha=0.55, linestyle='--', zorder=5)
    ax.add_patch(plt.Circle((x2, y2), 7, fc=col, alpha=0.8, zorder=6))

# =============================================================================
# 7. INNER ICON - large wheat + AI circuit fused
# =============================================================================
stalk_x, stalk_y = cx, cy + 36
# main stalk
ax.plot([stalk_x, stalk_x], [stalk_y, stalk_y - 72],
        color='#C8E6C9', lw=4.5, zorder=9)
# side branches
for side, ht in [(1, 0.28), (-1, 0.48), (1, 0.66)]:
    lx = stalk_x + side * 24
    ly = stalk_y - 72 * ht
    ax.plot([stalk_x, lx], [ly + 10, ly],
            color='#A5D6A7', lw=2.8, zorder=9)
    ax.add_patch(mpatches.Ellipse((lx, ly), 20, 10,
                 angle=-28 * side, fc='#81C784', ec='none', zorder=9))
# wheat grain head (7 grains)
for i in range(7):
    gy = stalk_y - 76 - i * 11
    sz = 12 - i * 0.8
    ax.add_patch(mpatches.Ellipse((stalk_x, gy), sz * 0.75, sz,
                 fc='#FDD835', ec='#F9A825', lw=0.8, zorder=10))

# AI circuit grid behind wheat (subtle)
for gi in range(-3, 4):
    for gj in range(-3, 4):
        gx2 = stalk_x + gi * 14
        gy3 = cy - 8 + gj * 14
        if abs(gi) + abs(gj) <= 4:
            ax.add_patch(plt.Rectangle((gx2 - 4, gy3 - 4), 8, 8,
                         fc='none', ec='#7986CB', lw=0.7,
                         alpha=0.35, zorder=8))

# =============================================================================
# 8. CENTRE TEXT  (larger, bolder)
# =============================================================================
ax.text(cx, cy - 68, 'TERRA-MIND',
        fontsize=26, fontweight='bold', color='#E8EAF6',
        ha='center', va='center', zorder=11,
        fontfamily='sans-serif')
ax.text(cx, cy - 40, 'AI AGENT CORE',
        fontsize=12, fontweight='normal', color='#9FA8DA',
        ha='center', va='center', zorder=11)

# =============================================================================
# 9. FLOATING DATA TAGS (4 corners - satellite data feeds)
# =============================================================================
tags = [
    (cx - 310, cy - 220, '#1565C0', 'Sentinel-2\nNDVI  NDRE  SWIR'),
    (cx + 200, cy - 240, '#00838F', 'SAR Moisture\nSoil  Irrigation'),
    (cx - 330, cy + 140, '#E65100', 'Agmarknet\nMandi Prices'),
    (cx + 210, cy + 150, '#2E7D32', 'SoilGrids\npH  N  P  K'),
]
for tx2, ty2, col, lbl in tags:
    ax.add_patch(FancyBboxPatch((tx2 - 62, ty2 - 22), 124, 46,
                 boxstyle='round,pad=0,rounding_size=6',
                 fc=col + '22', ec=col, lw=1.5, zorder=6))
    ax.text(tx2, ty2 + 2, lbl, fontsize=7.5, color='#E8EAF6',
            ha='center', va='center', zorder=7,
            multialignment='center', linespacing=1.4)
    # dashed line to centre
    ax.plot([tx2, cx], [ty2 + 2, cy],
            color=col, lw=1.0, linestyle=':', alpha=0.35, zorder=4)

# =============================================================================
# 10. TOP TITLE + BOTTOM TAGLINE
# =============================================================================
ax.text(cx, 45, 'TERRA-MIND',
        fontsize=38, fontweight='bold', color='#E8EAF6',
        ha='center', va='center', zorder=11)
ax.text(cx, 90, 'Proactive AI Agronomist  |  One Agent  |  Seven Solutions',
        fontsize=12, color='#7986CB',
        ha='center', va='center', zorder=11)

# bottom bar
ax.add_patch(plt.Rectangle((0, H - 52), W, 52,
             fc='#0D1422', ec='none', zorder=10))
ax.text(cx, H - 26,
        'Satellite  *  AI  *  Voice  *  Offline-First  *  87M+ Farmers  *  10x ROI',
        fontsize=9.5, color='#546E7A',
        ha='center', va='center', zorder=11)

# =============================================================================
# SAVE
# =============================================================================
fig.savefig(OUT, dpi=DPI, bbox_inches='tight',
            facecolor='#0A1228', edgecolor='none')
plt.close()
print('Saved:', OUT)

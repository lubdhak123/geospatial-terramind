"""
Terra-Mind - Farmer with Phone Centre Image
Matches the dark blue/purple space background from the PPT
Farmer silhouette holding glowing phone, crop field around them,
holographic AI data elements floating - matches the 'Key Features' slide
1000 x 1100 px @ 150 DPI (portrait - suits centre of slide)
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np
import os

OUT = r'c:\Users\kanis\OneDrive\Desktop\geospatiall\feature_cards\farmer_centre.png'

W, H, DPI = 1000, 980, 150
fig, ax = plt.subplots(figsize=(W/DPI, H/DPI), dpi=DPI)
ax.set_xlim(0, W)
ax.set_ylim(H, 0)
ax.axis('off')
plt.subplots_adjust(0, 0, 1, 1)
fig.patch.set_facecolor('none')   # transparent bg to blend with PPT
ax.set_facecolor('none')

cx = W // 2

np.random.seed(42)

# =============================================================================
# 1. SUBTLE GLOW BEHIND FARMER (matches PPT dark bg)
# =============================================================================
# large soft radial glow - blue, like the PPT corner lights
for r, a, col in [
    (320, 0.08, '#1565C0'),
    (260, 0.11, '#1A237E'),
    (200, 0.15, '#283593'),
    (140, 0.20, '#3949AB'),
    (90,  0.28, '#3F51B5'),
]:
    ax.add_patch(plt.Circle((cx, 520), r, fc=col, alpha=a, zorder=1))

# =============================================================================
# 3. FARMER SILHOUETTE  (drawn with shapes)
# =============================================================================
F_CX = cx          # farmer centre x
F_BY = 900         # farmer bottom y

# -- legs --
# left leg
leg_pts_l = np.array([
    [F_CX - 38, F_BY],
    [F_CX - 28, F_BY],
    [F_CX - 22, F_BY - 130],
    [F_CX - 42, F_BY - 130],
])
ax.fill(leg_pts_l[:,0], leg_pts_l[:,1], fc='#1A3A5C', ec='none', zorder=5)

# right leg
leg_pts_r = np.array([
    [F_CX + 14, F_BY],
    [F_CX + 28, F_BY],
    [F_CX + 30, F_BY - 130],
    [F_CX + 8,  F_BY - 130],
])
ax.fill(leg_pts_r[:,0], leg_pts_r[:,1], fc='#1A3A5C', ec='none', zorder=5)

# -- torso --
torso = np.array([
    [F_CX - 52, F_BY - 130],
    [F_CX + 44, F_BY - 130],
    [F_CX + 38, F_BY - 300],
    [F_CX - 46, F_BY - 300],
])
ax.fill(torso[:,0], torso[:,1], fc='#1E4976', ec='none', zorder=5)

# torso highlight (lighter shirt centre)
torso_hi = np.array([
    [F_CX - 22, F_BY - 140],
    [F_CX + 18, F_BY - 140],
    [F_CX + 14, F_BY - 290],
    [F_CX - 18, F_BY - 290],
])
ax.fill(torso_hi[:,0], torso_hi[:,1], fc='#2166A8', alpha=0.5, ec='none', zorder=6)

# -- LEFT arm (bent inward, supporting phone from left) --
arm_l = np.array([
    [F_CX - 46, F_BY - 295],
    [F_CX - 62, F_BY - 295],
    [F_CX - 78, F_BY - 195],
    [F_CX - 62, F_BY - 195],
])
ax.fill(arm_l[:,0], arm_l[:,1], fc='#1A3A5C', ec='none', zorder=5)
arm_l2 = np.array([
    [F_CX - 78, F_BY - 195],
    [F_CX - 62, F_BY - 195],
    [F_CX - 32, F_BY - 220],
    [F_CX - 48, F_BY - 220],
])
ax.fill(arm_l2[:,0], arm_l2[:,1], fc='#1E4976', ec='none', zorder=5)

# -- RIGHT arm (bent, holding phone from right) --
arm_r = np.array([
    [F_CX + 38, F_BY - 295],
    [F_CX + 54, F_BY - 295],
    [F_CX + 72, F_BY - 195],
    [F_CX + 56, F_BY - 195],
])
ax.fill(arm_r[:,0], arm_r[:,1], fc='#1A3A5C', ec='none', zorder=5)
arm_r2 = np.array([
    [F_CX + 72, F_BY - 195],
    [F_CX + 56, F_BY - 195],
    [F_CX + 36, F_BY - 220],
    [F_CX + 52, F_BY - 220],
])
ax.fill(arm_r2[:,0], arm_r2[:,1], fc='#1E4976', ec='none', zorder=5)

# -- HEAD --
head_cx, head_cy = F_CX - 4, F_BY - 430
# neck
ax.add_patch(plt.Rectangle((head_cx - 12, F_BY - 318), 24, 28,
             fc='#C68642', ec='none', zorder=6))
# head shape
ax.add_patch(mpatches.Ellipse((head_cx, head_cy), 80, 90,
             fc='#C68642', ec='none', zorder=6))
# turban / hat (farmer)
turban_pts = np.array([
    [head_cx - 44, head_cy - 20],
    [head_cx + 44, head_cy - 20],
    [head_cx + 50, head_cy - 42],
    [head_cx,      head_cy - 56],
    [head_cx - 50, head_cy - 42],
])
ax.fill(turban_pts[:,0], turban_pts[:,1], fc='#FF8F00', ec='none', zorder=7)
# turban band
ax.add_patch(plt.Rectangle((head_cx - 44, head_cy - 28), 88, 10,
             fc='#E65100', ec='none', zorder=8))
# face details
# eyes
ax.add_patch(plt.Circle((head_cx - 15, head_cy - 5), 5, fc='#1A1A1A', zorder=8))
ax.add_patch(plt.Circle((head_cx + 14, head_cy - 5), 5, fc='#1A1A1A', zorder=8))
# eye whites
ax.add_patch(plt.Circle((head_cx - 15, head_cy - 5), 7, fc='#FFFFFF',
             zorder=7))
ax.add_patch(plt.Circle((head_cx + 14, head_cy - 5), 7, fc='#FFFFFF',
             zorder=7))
ax.add_patch(plt.Circle((head_cx - 15, head_cy - 5), 5, fc='#2D1B00', zorder=8))
ax.add_patch(plt.Circle((head_cx + 14, head_cy - 5), 5, fc='#2D1B00', zorder=8))
# smile
theta_smile = np.linspace(np.pi * 0.1, np.pi * 0.9, 30)
sx = head_cx + 18 * np.cos(theta_smile)
sy = head_cy + 22 + 8 * np.sin(theta_smile)
ax.plot(sx, sy, color='#5D2E00', lw=2, zorder=8)
# moustache
ax.add_patch(mpatches.Ellipse((head_cx, head_cy + 10), 28, 8,
             fc='#3E1F00', ec='none', zorder=8))

# =============================================================================
# 4. PHONE  (glowing screen in farmer's hands — held lower, not over face)
# =============================================================================
PH_CX = F_CX + 2
PH_CY = F_BY - 245
PH_W, PH_H = 68, 118

# phone body
ax.add_patch(FancyBboxPatch((PH_CX - PH_W//2, PH_CY - PH_H//2),
             PH_W, PH_H,
             boxstyle='round,pad=0,rounding_size=8',
             fc='#0D1117', ec='#42A5F5', lw=2.5, zorder=10))

# screen glow
for r, a in [(55, 0.12), (44, 0.18), (34, 0.25)]:
    ax.add_patch(plt.Circle((PH_CX, PH_CY - 4), r,
                 fc='#00BCD4', alpha=a, zorder=9))

# screen content
ax.add_patch(FancyBboxPatch((PH_CX - 26, PH_CY - PH_H//2 + 8),
             52, PH_H - 20,
             boxstyle='round,pad=0,rounding_size=4',
             fc='#0A1628', ec='none', zorder=11))

# TERRA-MIND label on screen
ax.text(PH_CX, PH_CY - 30, 'TERRA',
        fontsize=6.5, fontweight='bold', color='#42A5F5',
        ha='center', va='center', zorder=12)
ax.text(PH_CX, PH_CY - 18, 'MIND',
        fontsize=6.5, fontweight='bold', color='#42A5F5',
        ha='center', va='center', zorder=12)

# mini chart on screen
chart_x = np.linspace(PH_CX - 20, PH_CX + 20, 12)
chart_y = PH_CY + np.array([8, 4, 2, 6, 0, -6, -4, -10, -14, -10, -16, -20])
ax.plot(chart_x, chart_y, color='#00E676', lw=1.5, zorder=12)
ax.plot(chart_x[-1], chart_y[-1], 'o', color='#FFD600', ms=4, zorder=13)

# alert dot top screen
ax.add_patch(plt.Circle((PH_CX + 20, PH_CY - PH_H//2 + 14), 5,
             fc='#F44336', ec='none', zorder=12))

# phone screen glow casting light on face
ax.add_patch(plt.Circle((PH_CX, PH_CY - 4), 70,
             fc='#1565C0', alpha=0.06, zorder=9))

# =============================================================================
# 5. HOLOGRAPHIC DATA ELEMENTS — 7 tags, evenly distributed
#    Layout:  top-centre = 01
#             left  col  = 02, 04, 06   (top→bottom)
#             right col  = 03, 05, 07   (top→bottom)
# =============================================================================
TW, TH = 190, 66          # tag width / height
# farmer body anchor point (chest level) for connector lines
FA_X = F_CX
FA_Y = F_BY - 320

holo_items = [
    # num,  x,          y,    accent,     title,               metric
    ('01', cx,          170,  '#C62828',  'Disease Detection', '94% Conf.'),
    ('02', cx - 310,    310,  '#1565C0',  'Crop Selection',    '86% Conf.'),
    ('03', cx + 310,    310,  '#00838F',  'Irrigation',        '4,000L Saved'),
    ('04', cx - 310,    510,  '#455A64',  'Land Degradation',  '5-Yr SAR'),
    ('05', cx + 310,    510,  '#E65100',  'Fertilizer Map',    'Rs.8,500+'),
    ('06', cx - 310,    710,  '#5E35B1',  'Yield Prediction',  '84% Acc.'),
    ('07', cx + 310,    710,  '#00A846',  'Harvest Oracle',    '+Rs.7,400'),
]

for num, hx, hy, hcol, hl1, hl2 in holo_items:
    # --- tag card ---
    ax.add_patch(FancyBboxPatch(
        (hx - TW//2, hy - TH//2), TW, TH,
        boxstyle='round,pad=0,rounding_size=8',
        fc='#0A1628', ec=hcol, lw=2.2, zorder=7))
    # top accent bar
    ax.add_patch(plt.Rectangle(
        (hx - TW//2, hy - TH//2), TW, 5,
        fc=hcol, zorder=8))
    # number badge
    ax.add_patch(FancyBboxPatch(
        (hx - TW//2 + 7, hy - TH//2 + 10), 26, 20,
        boxstyle='round,pad=0,rounding_size=4',
        fc=hcol, zorder=9))
    ax.text(hx - TW//2 + 20, hy - TH//2 + 20, num,
            fontsize=7.5, fontweight='bold', color='#FFFFFF',
            ha='center', va='center', zorder=10)
    # title text
    ax.text(hx + 6, hy - 10, hl1,
            fontsize=9.5, fontweight='bold', color='#FFFFFF',
            ha='center', va='center', zorder=9)
    # metric
    ax.text(hx, hy + 16, hl2,
            fontsize=9, fontweight='bold', color=hcol,
            ha='center', va='center', zorder=9)

    # --- connector line: tag edge → farmer body ---
    # determine which side the tag is on
    if hx < cx:          # left tags → line from right edge of tag to farmer left
        lx1 = hx + TW//2
        lx2 = FA_X - 55
    elif hx > cx:        # right tags → line from left edge to farmer right
        lx1 = hx - TW//2
        lx2 = FA_X + 55
    else:                # top centre tag → line from bottom to farmer head top
        lx1 = hx
        lx2 = FA_X
    ly1 = hy
    ly2 = min(FA_Y, hy + 60) if hx == cx else FA_Y

    ax.plot([lx1, lx2], [ly1, ly2],
            color=hcol, lw=1.4, linestyle='--', alpha=0.55, zorder=6)
    # dot at farmer end
    ax.add_patch(plt.Circle((lx2, ly2), 4, fc=hcol, alpha=0.8, zorder=7))

# (satellite and bottom text removed)

# =============================================================================
# SAVE with transparent background
# =============================================================================
fig.savefig(OUT, dpi=DPI, bbox_inches='tight',
            transparent=True, edgecolor='none')
plt.close()
print('Saved:', OUT)

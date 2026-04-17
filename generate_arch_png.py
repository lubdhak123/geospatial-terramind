"""
Terra-Mind — Architecture PNG  v6  (final clean: no overlap, correct arrows, readable text)
3200 x 1960 @ 150 DPI  →  widescreen presentation quality
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon
import numpy as np

# ─── CANVAS ───────────────────────────────────────────────────────────────────
W, H, DPI = 3200, 1960, 150
fig, ax = plt.subplots(figsize=(W/DPI, H/DPI), dpi=DPI)
ax.set_xlim(0, W); ax.set_ylim(H, 0)
ax.axis('off')
fig.patch.set_facecolor('#FFFFFF')
ax.set_facecolor('#EAEDF3')
plt.subplots_adjust(0, 0, 1, 1)

# ─── PALETTE ──────────────────────────────────────────────────────────────────
TC  = '#00838F'; TL = '#E0F7FA'; TD = '#006064'
RC  = '#C62828'; RL = '#FFEBEE'
GC  = '#2E7D32'; GL = '#E8F5E9'; GD = '#1B5E20'
PC  = '#5E35B1'; PL = '#EDE7F6'
OC  = '#E65100'; OL = '#FFF3E0'
BC  = '#1565C0'; BL = '#E3F2FD'
DK  = '#1B2A4A'
EM  = '#00A846'
GO  = '#F57F17'
WH  = '#FFFFFF'

# ─── HELPERS ──────────────────────────────────────────────────────────────────
def box(x, y, w, h, fc=WH, ec='#888', txt='', tc='#333',
        fs=8, fw='normal', lw=1.2, alpha=1.0, z=2, rad=0.08):
    r = max(5, min(w, h) * rad)
    ax.add_patch(FancyBboxPatch((x, y), w, h,
        boxstyle=f'round,pad=0,rounding_size={r}',
        fc=fc, ec=ec, lw=lw, alpha=alpha, zorder=z, clip_on=False))
    if txt:
        ax.text(x+w/2, y+h/2, txt, ha='center', va='center',
                fontsize=fs, fontweight=fw, color=tc,
                multialignment='center', linespacing=1.35,
                zorder=z+1, clip_on=False)

def grp_titled(x, y, w, h, th, fc, ec, title, tc,
               fs=9.5, fw='bold', lw=2.2, alpha=0.35, z=1):
    """Group with a solid colour title bar at the top."""
    r = max(8, min(w, h)*0.025)
    # background
    ax.add_patch(FancyBboxPatch((x, y), w, h,
        boxstyle=f'round,pad=0,rounding_size={r}',
        fc=fc, ec=ec, lw=lw, alpha=alpha, zorder=z, clip_on=False))
    # title bar (solid, no alpha)
    ax.add_patch(FancyBboxPatch((x, y), w, th,
        boxstyle=f'round,pad=0,rounding_size={r}',
        fc=ec, ec=ec, lw=0, alpha=1.0, zorder=z+1, clip_on=False))
    # cover bottom corners of title bar so it looks flat at bottom
    ax.add_patch(plt.Rectangle((x, y+th//2), w, th-th//2,
        fc=ec, ec='none', zorder=z+1))
    if title:
        ax.text(x+w/2, y+th/2, title, ha='center', va='center',
                fontsize=fs, fontweight=fw, color=WH,
                zorder=z+2, clip_on=False)

def diam(cx, cy, w, h, fc=WH, ec='#888', txt='',
         tc='#fff', fs=10, fw='bold', lw=2, z=5):
    pts = np.array([[cx, cy-h/2], [cx+w/2, cy], [cx, cy+h/2], [cx-w/2, cy]])
    ax.add_patch(Polygon(pts, closed=True, fc=fc, ec=ec, lw=lw, zorder=z))
    if txt:
        ax.text(cx, cy, txt, ha='center', va='center',
                fontsize=fs, fontweight=fw, color=tc,
                multialignment='center', linespacing=1.35, zorder=z+1)

def arr(pts, col='#555', lw=1.5, lbl='', z=6, dashed=False):
    xs, ys = zip(*pts)
    ls = (0, (5, 3)) if dashed else 'solid'
    for i in range(len(pts)-2):
        ax.plot([xs[i], xs[i+1]], [ys[i], ys[i+1]],
                color=col, lw=lw, linestyle=ls,
                solid_capstyle='round', solid_joinstyle='round', zorder=z)
    ax.annotate('', xy=pts[-1], xytext=pts[-2],
                arrowprops=dict(
                    arrowstyle='->,head_width=0.32,head_length=0.28',
                    color=col, lw=lw, linestyle=ls,
                    shrinkA=0, shrinkB=2), zorder=z)
    if lbl:
        i = max(0, len(pts)//2-1)
        mx = (xs[i]+xs[i+1])/2; my = (ys[i]+ys[i+1])/2
        ax.text(mx, my, lbl, ha='center', va='center', fontsize=7.5,
                fontweight='bold', color=col,
                bbox=dict(boxstyle='round,pad=0.18', fc='white',
                          ec='none', alpha=0.95), zorder=z+2)

# ─── LAYOUT CONSTANTS ─────────────────────────────────────────────────────────
LM   = 14
PH   = 40           # pill height for incoming/outgoing rows
GTH  = 30           # group title bar height

# Rows
TY   = 10           # title bar top
IY   = 66           # incoming row top

DCY  = 210          # diamond center y
DDW, DDH = 230, 136

GY   = 372          # group rows top
GH   = 346          # group height  (title bar + node rows)
GW   = 730          # group width
GG   = 16           # gap between groups

GXOFFSET = (W - (4*GW + 3*GG)) // 2   # centers 4 groups in W
GXS  = [GXOFFSET + i*(GW+GG) for i in range(4)]

DCX  = (GXS[0] + GXS[3] + GW) // 2

NW   = GW - 26
HNW  = (GW - 32) // 2
NH   = 44
NY0  = GY + GTH + 16
NYGAP= 60

RY   = GY + GH + 22
RH   = 136
ACY  = RY + RH + 20
ACH  = 252
OUTY = ACY + ACH + 18
FBY  = OUTY + PH + 20
FBH  = 130
IMY  = FBY + FBH + 20
IMH  = 104
FTY  = IMY + IMH + 16

gcols = [BC, RC, GC, OC]

# ─── 1. TITLE BAR ─────────────────────────────────────────────────────────────
box(LM, TY, W-28, 50, fc=DK, ec=DK, lw=0, rad=0.02,
    txt='TERRA-MIND  —  Proactive AI Agronomist  |  Explainable AI  |  '
        'Geospatial Intelligence  |  Offline-First  |  7 Problems Solved',
    tc=WH, fs=12.5, fw='bold')

# ─── 2. INCOMING ROW ──────────────────────────────────────────────────────────
IW = 300; IG = 12
ILX = (W - (7*IW + 6*IG)) // 2

box(ILX-122, IY, 112, PH, fc=TC, ec=TC, txt='Incoming', tc=WH,
    fs=10, fw='bold', lw=0, rad=0.35)
ax.annotate('', xy=(ILX, IY+PH/2), xytext=(ILX-10, IY+PH/2),
            arrowprops=dict(arrowstyle='->', color=TC, lw=1.6), zorder=7)

inp_labels = ['Field Polygon\nGPS + Map Draw',
              'Voice Query\nHindi / Tamil / Marathi',
              'Camera Image\nLeaf + Field Photo',
              'Satellite Pull\nSentinel-1 + Sentinel-2',
              'SoilGrids API\npH · N · P · K',
              'Weather\nOpen-Meteo 5-Day',
              'Mandi Prices\nAgmarknet API']
for i, t in enumerate(inp_labels):
    box(ILX + i*(IW+IG), IY, IW, PH, fc=WH, ec=TC, txt=t, tc=TD, fs=8, lw=1.4)

# Collector bar → diamond
COLL_Y = IY + PH + 16
for i in range(7):
    cx = ILX + i*(IW+IG) + IW/2
    ax.plot([cx, cx], [IY+PH, COLL_Y], color=TC, lw=1.1, zorder=5)
ax.plot([ILX+IW/2, ILX+6*(IW+IG)+IW/2], [COLL_Y, COLL_Y],
        color=TC, lw=2.0, zorder=5)
arr([(DCX, COLL_Y), (DCX, DCY-DDH/2-2)], col=TC, lw=2.0)

# ─── 3. DIAMOND ───────────────────────────────────────────────────────────────
diam(DCX, DCY, DDW, DDH, fc=PC, ec='#7B1FA2',
     txt='TERRA-MIND\nClassifier / Router\nLangChain + CrewAI',
     tc=WH, fs=10.5, fw='bold', lw=2.8)

# Offline badge
OFL_W = 170; OFL_H = 90
OFL_X = LM; OFL_Y = DCY - OFL_H//2
box(OFL_X, OFL_Y, OFL_W, OFL_H, fc='#ECEFF1', ec='#607D8B',
    txt='OFFLINE MODE\nLlama-3 · YOLOv11\n2G Fallback OK',
    tc='#37474F', fs=8.5, lw=1.8)
arr([(OFL_X+OFL_W, OFL_Y+OFL_H/2), (DCX-DDW/2-2, DCY)],
    col='#90A4AE', lw=1.5, dashed=True)

# ─── 4. SPLITTER BUS: diamond → groups ───────────────────────────────────────
SPLIT_Y = DCY + DDH/2 + 24
ax.plot([DCX, DCX], [DCY+DDH/2, SPLIT_Y], color='#555', lw=2.0, zorder=5)
ax.plot([GXS[0]+GW/2, GXS[3]+GW/2], [SPLIT_Y, SPLIT_Y],
        color='#777', lw=2.4, zorder=5)
for gx, gc in zip(GXS, gcols):
    arr([(gx+GW/2, SPLIT_Y), (gx+GW/2, GY)], col=gc, lw=2.0)

# ─── 5a. GROUP A: Spectral + Soil Analysis ───────────────────────────────────
grp_titled(GXS[0], GY, GW, GH, GTH, BL, BC,
           'Spectral + Soil Analysis', WH)
ga = ['NDVI · NDRE · NDWI · SWIR  —  Satellite Pipeline',
      'SAR Time-Series  —  5-Year Degradation Benchmark',
      'Soil Analysis  —  pH · N · P · K · Texture Map',
      'Fertilizer Mapper  —  NDRE Zone-by-Zone Dosage']
for i, t in enumerate(ga):
    box(GXS[0]+13, NY0+i*NYGAP, NW, NH, fc=WH, ec=BC, txt=t,
        tc=BC, fs=8, lw=1.1)
for i in range(3):
    arr([(GXS[0]+13+NW/2, NY0+i*NYGAP+NH),
         (GXS[0]+13+NW/2, NY0+(i+1)*NYGAP)], col=BC, lw=1.2)

# ─── 5b. GROUP B: Disease + Crop Intelligence ────────────────────────────────
grp_titled(GXS[1], GY, GW, GH, GTH, RL, RC,
           'Disease + Crop Intelligence', WH)
GBX = GXS[1]

# Left column
lc_nodes = ['Disease Detection\nYOLOv11 + VLM Vision',
            'Crop Advisor\nRAG + ICAR Manuals',
            'Voice Processor\nWhisper STT + gTTS']
for i, t in enumerate(lc_nodes):
    box(GBX+13, NY0+i*NYGAP, HNW, NH, fc=WH, ec=RC, txt=t,
        tc=RC, fs=7.8, lw=1.1)
for i in range(2):
    arr([(GBX+13+HNW/2, NY0+i*NYGAP+NH),
         (GBX+13+HNW/2, NY0+(i+1)*NYGAP)], col=RC, lw=1.2)

# Right column: decision diamond + outcome boxes
# Ensure everything stays within GBX ... GBX+GW
RCX   = GBX + 13 + HNW + 10
RCW   = GW - 26 - HNW - 10       # ≈ 349
RCCX  = RCX + RCW/2
DBDY_B = NY0 + 24

diam(RCCX, DBDY_B, RCW*0.78, 58, fc=RL, ec=RC,
     txt='Disease?', tc=RC, fs=9, fw='bold', lw=1.8)

box(RCX, NY0+NYGAP+8, RCW, NH, fc='#FFCDD2', ec=RC,
    txt='ALERT  —  Treat within 48h', tc=RC, fs=8, fw='bold', lw=1.5)
box(RCX, NY0+2*NYGAP+8, RCW, NH, fc='#C8E6C9', ec=GC,
    txt='Monitor  —  Continue', tc=GC, fs=8, lw=1.4)

# Disease node → diamond top
arr([(GBX+13+HNW, NY0+NH/2), (RCX, NY0+NH/2),
     (RCCX, NY0+NH/2), (RCCX, DBDY_B-29)], col=RC, lw=1.2)
# YES: diamond bottom → alert box
arr([(RCCX, DBDY_B+29), (RCCX, NY0+NYGAP+8)], col=RC, lw=1.4, lbl='Yes')
# NO: diamond right → track down inside group → monitor box left
NO_TRACK = GBX + GW - 14          # right track, inside group
arr([(RCCX + RCW*0.78/2, DBDY_B),
     (NO_TRACK, DBDY_B),
     (NO_TRACK, NY0+2*NYGAP+8+NH/2),
     (RCX+RCW, NY0+2*NYGAP+8+NH/2)],
    col=GC, lw=1.3, lbl='No')

# ─── 5c. GROUP C: Climate + Irrigation ───────────────────────────────────────
grp_titled(GXS[2], GY, GW, GH, GTH, GL, GC,
           'Climate + Irrigation', WH)
GCX = GXS[2]

gc_nodes = ['Climate Forecaster\nHyperlocal 5-Day',
            'Irrigation Scheduler\nSAR Moisture + Rain',
            'Temporal Analyzer\nSAR 5-Year Trends']
for i, t in enumerate(gc_nodes):
    box(GCX+13, NY0+i*NYGAP, HNW, NH, fc=WH, ec=GC, txt=t,
        tc=GC, fs=7.8, lw=1.1)
for i in range(2):
    arr([(GCX+13+HNW/2, NY0+i*NYGAP+NH),
         (GCX+13+HNW/2, NY0+(i+1)*NYGAP)], col=GC, lw=1.2)

GRCX  = GCX + 13 + HNW + 10
GRCW  = GW - 26 - HNW - 10
GRCCX = GRCX + GRCW/2
DBDY_C = NY0 + 24

diam(GRCCX, DBDY_C, GRCW*0.78, 58, fc=GL, ec=GC,
     txt='Irrigate?', tc=GC, fs=9, fw='bold', lw=1.8)
box(GRCX, NY0+NYGAP+8, GRCW, NH, fc='#B2EBF2', ec=TC,
    txt='Skip — Rain at 3pm\nSave 4,000L', tc=TD, fs=8, fw='bold', lw=1.5)
box(GRCX, NY0+2*NYGAP+8, GRCW, NH, fc='#C8E6C9', ec=GC,
    txt='Irrigate Now\nSchedule Drip', tc=GC, fs=8, lw=1.4)

# Climate node → diamond top
arr([(GCX+13+HNW, NY0+NH/2), (GRCX, NY0+NH/2),
     (GRCCX, NY0+NH/2), (GRCCX, DBDY_C-29)], col=GC, lw=1.2)
# NO RAIN arrow
arr([(GRCCX, DBDY_C+29), (GRCCX, NY0+NYGAP+8)], col=TC, lw=1.4, lbl='No Rain')
# YES: route inside group
NO_TRACK_C = GCX + GW - 14
arr([(GRCCX + GRCW*0.78/2, DBDY_C),
     (NO_TRACK_C, DBDY_C),
     (NO_TRACK_C, NY0+2*NYGAP+8+NH/2),
     (GRCX+GRCW, NY0+2*NYGAP+8+NH/2)],
    col=GC, lw=1.3, lbl='Yes')

# ─── 5d. GROUP D: Yield + Market Analytics ───────────────────────────────────
grp_titled(GXS[3], GY, GW, GH, GTH, OL, OC,
           'Yield + Market Analytics', WH)
GDX = GXS[3]
gd_nodes = ['Yield Predictor  —  XGBoost ML  —  84% Accuracy',
            'Mandi Price Engine  —  3yr Agmarknet History',
            'Crop Calendar  —  Seasonal Planning',
            'Risk Assessment  —  Drought + Flood + Pest']
for i, t in enumerate(gd_nodes):
    box(GDX+13, NY0+i*NYGAP, NW, NH, fc=WH, ec=OC, txt=t,
        tc=OC, fs=8, lw=1.1)
for i in range(3):
    arr([(GDX+13+NW/2, NY0+i*NYGAP+NH),
         (GDX+13+NW/2, NY0+(i+1)*NYGAP)], col=OC, lw=1.2)

# ─── 6. AI REASONING LAYER ────────────────────────────────────────────────────
ax.add_patch(FancyBboxPatch((LM, RY), W-28, RH,
    boxstyle='round,pad=0,rounding_size=10',
    fc=PL, ec=PC, lw=2.8, alpha=0.5, zorder=1, clip_on=False))
# title bar
ax.add_patch(plt.Rectangle((LM, RY), W-28, 28,
    fc=PC, ec='none', zorder=2))
ax.text(LM + (W-28)/2, RY+14,
        'AI Reasoning Layer  —  Explainable AI  (Why did the AI decide this?)',
        ha='center', va='center', fontsize=10, fontweight='bold',
        color=WH, zorder=3)

rsn = [
    ('#EF9A9A', RC,
     'Evidence: YOLOv11 94%\nHumidity 78%  ·  3-day rain',
     '#FFCDD2', RC,
     'TREAT BLIGHT\nCopper fungicide\nConf: 94%'),
    ('#A5D6A7', GC,
     'Evidence: Soil N 12mg/kg\npH 6.2  ·  Rain forecast low',
     '#C8E6C9', GC,
     'PLANT CHICKPEAS\nNitrogen-fixing crop\nConf: 86%'),
    ('#80DEEA', TC,
     'Evidence: SAR moisture 68%\nRain alert at 3pm today',
     '#B2EBF2', TC,
     'SKIP IRRIGATION\nSave 4,000L water\nConf: 89%'),
    ('#FFE082', GO,
     'Evidence: 50km supply +34%\nMandi price dropping',
     '#B9F6CA', EM,
     'DELAY HARVEST 9 days\nPrice +22%  +Rs.7,400\nConf: 78%'),
]
REW = 340; RDW = 272; RNH = 96; RNY = RY + 34
PAIR_W   = REW + 12 + RDW
PAIR_GAP = max(10, (W - 28 - 40 - 4*PAIR_W) // 3)
RNX0 = LM + 22
for i, (ef, ec_, et, df, dc_, dt) in enumerate(rsn):
    ex_ = RNX0 + i*(PAIR_W + PAIR_GAP)
    dx_ = ex_ + REW + 12
    box(ex_, RNY, REW, RNH, fc=ef, ec=ec_, txt=et, tc=ec_, fs=8, lw=1.4)
    box(dx_, RNY, RDW, RNH, fc=df, ec=dc_, txt=dt, tc=dc_, fs=8, fw='bold', lw=1.8)
    arr([(ex_+REW, RNY+RNH/2), (dx_, RNY+RNH/2)], col=ec_, lw=1.6)

# Groups → Reasoning
for gx, gc in zip(GXS, gcols):
    arr([(gx+GW/2, GY+GH), (gx+GW/2, RY)], col=gc, lw=1.5)

# ─── 7. DECISIONS + HARVEST ORACLE ───────────────────────────────────────────
SPLIT_X = LM + int((W-28) * 0.52)
DEW = SPLIT_X - LM - 8
HOX = SPLIT_X + 8
HOW = W - HOX - LM

# Actionable Decisions panel
ax.add_patch(FancyBboxPatch((LM, ACY), DEW, ACH,
    boxstyle='round,pad=0,rounding_size=10',
    fc=PL, ec=PC, lw=2.8, alpha=0.45, zorder=1, clip_on=False))
ax.add_patch(plt.Rectangle((LM, ACY), DEW, 30,
    fc=PC, ec='none', zorder=2))
ax.text(LM+DEW/2, ACY+15,
        'Actionable Decisions  —  Delivered to Farmer',
        ha='center', va='center', fontsize=10, fontweight='bold',
        color=WH, zorder=3)

dec = [
    ('#FFCDD2', RC,  'DISEASE ALERT\nLeaf blight Zone C\nTreat 48h  Conf: 94%'),
    ('#B2EBF2', TC,  'IRRIGATION SKIP\nRain at 3pm today\nSAR 68%  Conf: 89%'),
    ('#C8E6C9', GC,  'CROP ADVISORY\nPlant chickpeas\npH 6.2  Conf: 86%'),
    ('#D1C4E9', PC,  'YIELD FORECAST\n3.2T/acre  +18%\nXGBoost  Conf: 84%'),
    ('#B9F6CA', EM,  '★ HARVEST TIMING\nDelay 9 days  +22%\nConf: 78%'),
    ('#FFF9C4', GO,  'RISK ALERT\nDrought HIGH\nDrip  -40%  Conf: 82%'),
]
DNW  = (DEW - 36) // 3 - 8
DNH  = 96
DNXG = DNW + 12
DNX0 = LM + 16
DRY  = ACY + 40
for i, (f, e, t) in enumerate(dec):
    c = i % 3; r = i // 3
    box(DNX0 + c*DNXG, DRY + r*(DNH+12), DNW, DNH,
        fc=f, ec=e, txt=t, tc=e, fs=8, fw='bold', lw=1.6)

arr([(LM+DEW/2, RY+RH), (LM+DEW/2, ACY)], col=PC, lw=2.4, lbl='Execute')

# Harvest Oracle panel
ax.add_patch(FancyBboxPatch((HOX, ACY), HOW, ACH,
    boxstyle='round,pad=0,rounding_size=10',
    fc='#E8F5E9', ec=EM, lw=3.8, alpha=1.0, zorder=1, clip_on=False))
box(HOX, ACY, HOW, 38, fc=EM, ec=EM, lw=0, rad=0.02,
    txt='★ HARVEST INTELLIGENCE ENGINE  —  Market + Satellite Fusion  |  AWE Innovation',
    tc=WH, fs=10, fw='bold')
ax.text(HOX+16, ACY+58,
        'Conf: 78%   ·   Satellite-native   ·   50km farm clustering   ·   '
        'Real-time Agmarknet fusion   ·   No Competitor Has This',
        ha='left', va='center', fontsize=8.5, fontweight='bold',
        color=GD, zorder=8)

HSW  = (HOW - 28) // 4 - 12
HSH  = 160
HSY  = ACY + 78
steps = [
    ('#DCEDC8', GC,
     '(1) Farm Clustering\n\nNDVI scan all farms\nin 50km radius\nGroup by growth stage'),
    ('#C8E6C9', GC,
     '(2) Supply Detection\n\nAggregate harvest dates\nDetect mandi glut\nFlag crash risk'),
    ('#B9F6CA', EM,
     '(3) Price Window\n\n3yr Agmarknet model\nSeasonal cycle + trends\nPredict low-demand'),
    ('#69F0AE', EM,
     '(4) OPTIMAL SELL\n\nExact week to sell\n+Rs.7,400 per acre\nvs average farmer'),
]
for i, (f, e, t) in enumerate(steps):
    bx = HOX + 12 + i*(HSW+12)
    box(bx, HSY, HSW, HSH, fc=f, ec=e, txt=t, tc=GD,
        fs=8, fw='bold' if i == 3 else 'normal',
        lw=2.8 if i == 3 else 1.4, z=3)
    if i < 3:
        arr([(bx+HSW, HSY+HSH/2),
             (HOX+12+(i+1)*(HSW+12), HSY+HSH/2)], col=EM, lw=2.4)

arr([(HOX+HOW/2, RY+RH), (HOX+HOW/2, ACY)], col=EM, lw=1.8)

# ─── 8. OUTGOING ROW ──────────────────────────────────────────────────────────
OW = 300; OG = 12
OLX = (W - (7*OW + 6*OG)) // 2

box(OLX-122, OUTY, 112, PH, fc=TC, ec=TC, txt='Outgoing', tc=WH,
    fs=10, fw='bold', lw=0, rad=0.35)
ax.annotate('', xy=(OLX, OUTY+PH/2), xytext=(OLX-10, OUTY+PH/2),
            arrowprops=dict(arrowstyle='->', color=TC, lw=1.6), zorder=7)

out_labels = ['Dashboard\nFarm Health Score',
              'Push Alert\nDisease Treatment',
              'Mobile App\nCrop Advisory',
              'SMS / WhatsApp\nIrrigation Schedule',
              'Map Overlay\nFertilizer Plan',
              'PDF Report\nYield Forecast',
              'Voice Response\nHinglish Output']
for i, t in enumerate(out_labels):
    box(OLX + i*(OW+OG), OUTY, OW, PH, fc=WH, ec=TC, txt=t, tc=TD, fs=8, lw=1.4)

DEC_CX  = LM + DEW//2
OUT_MID = OLX + 3*(OW+OG) + OW/2
arr([(DEC_CX, ACY+ACH),
     (DEC_CX, OUTY+PH+8),
     (OUT_MID, OUTY+PH+8),
     (OUT_MID, OUTY+PH)], col=TC, lw=1.8, lbl='Deliver')

# ─── 9. FEEDBACK LOOP ─────────────────────────────────────────────────────────
ax.add_patch(FancyBboxPatch((LM, FBY), W-28, FBH,
    boxstyle='round,pad=0,rounding_size=10',
    fc=OL, ec=OC, lw=2.5, alpha=0.45, zorder=1, clip_on=False))
ax.add_patch(plt.Rectangle((LM, FBY), W-28, 28,
    fc=OC, ec='none', zorder=2))
ax.text(LM+(W-28)/2, FBY+14,
        'Feedback Loop  —  System Learns from Every Season',
        ha='center', va='center', fontsize=10, fontweight='bold',
        color=WH, zorder=3)

fb = [('#FFE0B2', OC, 'Actual Yield\nRecorded'),
      ('#FFCC80', OC, 'Actual Price\nat Mandi'),
      ('#FFB74D', OC, 'Prediction Gap\nCalculated'),
      ('#FF9800', OC, 'Model Weights\nCorrected'),
      ('#FFE082', GO, 'Better\nPredictions')]
FBW2 = (W-60)//5 - 14
FBH2 = 78
FBXG = (W-60)//5 + 2
FBX0 = LM + 20
FBY0 = FBY + 38
for i, (f, e, t) in enumerate(fb):
    box(FBX0+i*FBXG, FBY0, FBW2, FBH2, fc=f, ec=e, txt=t,
        tc=e, fs=9, lw=1.4)
for i in range(4):
    arr([(FBX0+i*FBXG+FBW2, FBY0+FBH2/2),
         (FBX0+(i+1)*FBXG, FBY0+FBH2/2)], col=OC, lw=1.4)

# Return dashed: last FB → right track → up → diamond
LFX = FBX0 + 4*FBXG + FBW2
LFY = FBY0 + FBH2/2
RTX = W - LM - 26
ax.plot([LFX, RTX], [LFY, LFY], color=OC, lw=1.5, linestyle=(0,(5,3)), zorder=5)
ax.plot([RTX, RTX], [LFY, DCY], color=OC, lw=1.5, linestyle=(0,(5,3)), zorder=5)
ax.annotate('', xy=(DCX+DDW/2+2, DCY), xytext=(RTX, DCY),
    arrowprops=dict(arrowstyle='->,head_width=0.28,head_length=0.24',
                    color=OC, lw=1.5, shrinkA=0, shrinkB=3), zorder=6)
ax.text(RTX-10, (DCY+LFY)//2, 'Model\nRetraining',
        ha='right', va='center', fontsize=8, color=OC, fontweight='bold',
        bbox=dict(boxstyle='round,pad=0.25', fc='white', ec=OC,
                  alpha=0.92, lw=0.9), zorder=8)

arr([(OUT_MID, OUTY+PH), (OUT_MID, FBY)], col=OC, lw=1.4, lbl='Season Data')

# ─── 10. IMPACT STRIP ─────────────────────────────────────────────────────────
ax.add_patch(FancyBboxPatch((LM, IMY), W-28, IMH,
    boxstyle='round,pad=0,rounding_size=10',
    fc=GL, ec=GC, lw=2.2, alpha=0.45, zorder=1, clip_on=False))
ax.add_patch(plt.Rectangle((LM, IMY), W-28, 28,
    fc=GC, ec='none', zorder=2))
ax.text(LM+(W-28)/2, IMY+14,
        'Impact  —  Per Farmer Per Season',
        ha='center', va='center', fontsize=10, fontweight='bold',
        color=WH, zorder=3)

imp = [('#C8E6C9', GC, 'Rs.12,000+\nWater Saved'),
       ('#DCEDC8', GC, 'Rs.8,500+\nFertilizer Saved'),
       ('#B9F6CA', EM, 'Rs.7,400+\nHarvest Profit'),
       ('#BBDEFB', BC, '30% Fewer\nCrop Losses'),
       ('#FFF9C4', GO, 'Rs.28,000+\nTotal / Farmer'),
       ('#B2DFDB', TC, '10x ROI\nvs Traditional'),
       ('#F8BBD0', RC, '87M+\nFarmers Served')]
IMW  = (W-60)//7 - 10
IMXG = (W-60)//7
IMX0 = LM + 20
for i, (f, e, t) in enumerate(imp):
    box(IMX0+i*IMXG, IMY+36, IMW, 56, fc=f, ec=e, txt=t, tc=e,
        fs=9.5, fw='bold', lw=1.6)

# ─── 11. FOOTER ───────────────────────────────────────────────────────────────
box(LM, FTY, W-28, 52, fc=DK, ec=DK, lw=0, rad=0.02,
    txt='7 PROBLEMS SOLVED:   (1) Disease Detection   (2) Wrong Crop Selection   '
        '(3) Water Waste   (4) Land Degradation   (5) Fertilizer Waste   '
        '(6) Yield Uncertainty   (7) ★ Harvest Oracle',
    tc=WH, fs=10.5, fw='bold')

# ─── SAVE ─────────────────────────────────────────────────────────────────────
OUT = 'c:/Users/kanis/OneDrive/Desktop/geospatiall/terra_mind_arch.png'
fig.savefig(OUT, dpi=DPI, bbox_inches='tight',
            facecolor=fig.get_facecolor(), edgecolor='none')
plt.close()
print(f'Saved  {OUT}  ({W}x{H} @ {DPI}dpi)')

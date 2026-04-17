import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import matplotlib.patheffects as pe
import numpy as np

fig, ax = plt.subplots(figsize=(30, 17))
ax.set_xlim(0, 30)
ax.set_ylim(0, 17)
ax.axis('off')
fig.patch.set_facecolor('#f5f7fa')
ax.set_facecolor('#f5f7fa')

# ── Helpers ──────────────────────────────────────────────────────────────────

def box(x, y, w, h, color, border_color=None, alpha=1.0, radius=0.15, lw=1.2):
    if border_color is None:
        border_color = color
    b = FancyBboxPatch((x, y), w, h,
        boxstyle=f"round,pad=0.02,rounding_size={radius}",
        facecolor=color, edgecolor=border_color, linewidth=lw, alpha=alpha, zorder=3)
    b.set_path_effects([pe.withSimplePatchShadow(offset=(0.05, -0.05),
        shadow_rgbFace='#bbbbbb', alpha=0.25)])
    ax.add_patch(b)

def label(x, y, text, size=7, color='#222222', bold=False, ha='center', va='center'):
    weight = 'bold' if bold else 'normal'
    ax.text(x, y, text, fontsize=size, color=color, ha=ha, va=va,
            fontweight=weight, zorder=5, fontfamily='sans-serif')

def arrow(x1, y1, x2, y2, color='#555555', lw=1.5, style='->', rad=0.0):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle=style, color=color, lw=lw,
                        connectionstyle=f'arc3,rad={rad}'),
        zorder=2)

def flow_box(x, y, w, h, bg, title, subtitle='', title_color='white', sub_color='#d0d0d0'):
    box(x, y, w, h, bg, border_color='#888888', lw=0.8)
    if subtitle:
        label(x + w/2, y + h*0.65, title, size=7.0, color=title_color, bold=True)
        label(x + w/2, y + h*0.28, subtitle, size=5.5, color=sub_color)
    else:
        label(x + w/2, y + h/2, title, size=7.0, color=title_color, bold=True)

def section_bg(x, y, w, h, color, alpha=0.12):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
        boxstyle="round,pad=0.05,rounding_size=0.3",
        facecolor=color, edgecolor=color, linewidth=1.5, alpha=alpha, zorder=0))

# ══════════════════════════════════════════════════════════════════════════════
#  HEADER BAR — Dark gradient
# ══════════════════════════════════════════════════════════════════════════════

ax.add_patch(plt.Rectangle((0, 15.5), 30, 1.5, facecolor='#0a2540', zorder=1))
ax.add_patch(plt.Rectangle((0, 15.5), 30, 0.03, facecolor='#1a8cff', zorder=2))  # accent line
label(15, 16.45, 'ARCHITECTURAL WORKFLOW DIAGRAM', size=18, color='white', bold=True)
label(15, 16.0, 'TERRA-MIND   |   Agentic Precision Agriculture Intelligence System', size=10, color='#6eb5ff')

# ══════════════════════════════════════════════════════════════════════════════
#  LEFT PANEL — COMPONENTS
# ══════════════════════════════════════════════════════════════════════════════

ax.add_patch(plt.Rectangle((0.2, 0.2), 5.3, 15.1, facecolor='#dce8f5',
             edgecolor='#0a2540', linewidth=1.8, zorder=1))
ax.add_patch(plt.Rectangle((0.2, 14.4), 5.3, 0.9, facecolor='#0a2540', zorder=2))
label(2.85, 14.85, 'Components', size=12, color='white', bold=True)

components = [
    ("Multi-source Input",          "(Field Polygon, Voice, Camera, GPS)"),
    ("Satellite Ingestion Engine",  "(Sentinel-1, Sentinel-2, PySTAC)"),
    ("Spectral Index Engine",       "(NDVI, NDRE, NDWI, SWIR Band Math)"),
    ("Disease Detection Module",    "(YOLOv11, VLM Claude Vision)"),
    ("Spatial-AI Agent Core",       "(LangChain, CrewAI, Tool Calling)"),
    ("RAG Knowledge Base",          "(ICAR Manuals, Govt Advisories)"),
    ("Mandi Price Intelligence",    "(Agmarknet API, Price Forecasting)"),
    ("Harvest Timing Optimizer",    "(Supply Prediction, Storage Routing)"),
    ("Yield Prediction ML",         "(XGBoost, 80%+ Accuracy)"),
    ("Precision Fertilizer Mapper", "(NDRE Zone-by-Zone Dosage)"),
    ("Irrigation Scheduler",        "(SAR Moisture + Rainfall Forecast)"),
    ("Temporal Change Detection",   "(SAR Time-Series, 5-Year Trends)"),
    ("Offline / Edge Mode",         "(Ollama, Llama-3-8B, YOLOv11)"),
    ("Multilingual Voice I/O",      "(Whisper STT, gTTS, Hindi/Tamil)"),
    ("Farm Health Score Engine",    "(Composite Index 0-100)"),
    ("Economic Impact Calculator",  "(Savings per Decision in INR)"),
]

for i, (title, sub) in enumerate(components):
    cy = 13.7 - i * 0.82
    ax.plot(0.55, cy, 's', color='#0a2540', markersize=5, zorder=4)
    label(0.85, cy + 0.02, title, size=6.5, color='#0a2540', ha='left', bold=True)
    label(0.85, cy - 0.25, sub, size=5.2, color='#555555', ha='left')

# ══════════════════════════════════════════════════════════════════════════════
#  SECTION BACKGROUNDS
# ══════════════════════════════════════════════════════════════════════════════

section_bg(5.7, 0.2, 3.2, 15.1, '#1565c0', alpha=0.08)
section_bg(9.2, 0.2, 10.4, 15.1, '#4a148c', alpha=0.06)
section_bg(19.9, 0.2, 3.2, 15.1, '#e65100', alpha=0.07)
section_bg(23.4, 0.2, 6.4, 15.1, '#1b5e20', alpha=0.07)

# Section headers
for sx, sw, title in [(5.7, 3.2, 'Incoming'), (9.2, 10.4, 'Processing Pipeline'),
                       (19.9, 3.2, 'Scoring'), (23.4, 6.4, 'Outgoing')]:
    ax.add_patch(plt.Rectangle((sx, 14.4), sw, 0.9, facecolor='#0a2540', zorder=2))
    label(sx + sw/2, 14.85, title, size=11, color='white', bold=True)

# ══════════════════════════════════════════════════════════════════════════════
#  INCOMING INPUTS (7 items, evenly spaced)
# ══════════════════════════════════════════════════════════════════════════════

inc_data = [
    (5.85, 12.7, '#1565c0', 'Field Polygon',    'GPS / Map Draw'),
    (5.85, 11.1, '#0277bd', 'Voice Query',       'Hindi / Regional'),
    (5.85,  9.5, '#00796b', 'Camera Image',      'Leaf / Field Photo'),
    (5.85,  7.9, '#2e7d32', 'Satellite Pull',    'Sentinel-1 & 2'),
    (5.85,  6.3, '#5d4037', 'Soil Request',       'SoilGrids API'),
    (5.85,  4.7, '#e65100', 'Weather Fetch',     'Open-Meteo API'),
    (5.85,  3.1, '#00695c', 'Mandi Query',       'Agmarknet API'),
]

for x, y, clr, title, sub in inc_data:
    flow_box(x, y, 2.7, 1.15, clr, title, sub)

# ══════════════════════════════════════════════════════════════════════════════
#  CENTRAL AGENT CORE
# ══════════════════════════════════════════════════════════════════════════════

box(9.5, 6.8, 3.0, 2.8, '#4a148c', border_color='#7b1fa2', radius=0.35, lw=2.5)
label(11.0, 9.05, 'SPATIAL-AI', size=12, color='#e1bee7', bold=True)
label(11.0, 8.55, 'AGENT CORE', size=12, color='#e1bee7', bold=True)
label(11.0, 8.0, '- - - - - - - - - - - - -', size=6, color='#9c27b0')
label(11.0, 7.55, 'LangChain  |  CrewAI', size=7, color='#ce93d8', bold=True)
label(11.0, 7.15, 'Autonomous Tool Calling', size=6, color='#ba68c8')

# Arrows: Incoming → Agent Core
for x, y, *_ in inc_data:
    arrow(x + 2.7, y + 0.58, 9.5, 8.2, color='#3949ab', lw=1.3)

# ══════════════════════════════════════════════════════════════════════════════
#  PROCESSING NODES (3 columns x 4 rows)
# ══════════════════════════════════════════════════════════════════════════════

bw, bh = 2.3, 1.55  # box width, height

proc_nodes = [
    # Row 1 — Top
    (13.0, 13.0, '#1b5e20', 'Satellite\nPipeline',    'NDVI  NDRE\nNDWI  SWIR'),
    (15.5, 13.0, '#b71c1c', 'Disease\nDetection',     'YOLOv11 +\nVLM Vision'),
    (18.0, 13.0, '#e65100', 'RAG\nEngine',            'ICAR + Govt\nManuals'),
    # Row 2
    (13.0, 10.6, '#1565c0', 'Soil\nAnalysis',          'pH  N  P  K\nTexture Map'),
    (15.5, 10.6, '#00838f', 'Climate\nForecaster',     'Hyperlocal\n5-Day Forecast'),
    (18.0, 10.6, '#4e342e', 'Voice\nProcessor',        'Whisper STT\ngTTS Hinglish'),
    # Row 3
    (13.0,  8.2, '#2e7d32', 'Crop\nAdvisor',           'Optimal Crop\nSelection Model'),
    (15.5,  8.2, '#00695c', 'Irrigation\nScheduler',   'SAR Moisture\n+ Rain Forecast'),
    (18.0,  8.2, '#e65100', 'Fertilizer\nMapper',      'NDRE Precision\nZone Dosage'),
    # Row 4 — Bottom
    (13.0,  5.8, '#1565c0', 'Yield\nPredictor',        'XGBoost ML\n80%+ Accuracy'),
    (15.5,  5.8, '#00695c', 'Harvest\nOracle',         'Mandi Supply\nTiming Optimizer'),
    (18.0,  5.8, '#37474f', 'Temporal\nAnalyzer',      'SAR Time-Series\n5-Year Trends'),
]

for px, py, clr, title, sub in proc_nodes:
    flow_box(px, py, bw, bh, clr, title, sub)

# Arrows: Agent Core → Processing Nodes
for px, py, *_ in proc_nodes:
    arrow(12.5, 8.2, px, py + bh/2, color='#7b1fa2', lw=1.1)

# ══════════════════════════════════════════════════════════════════════════════
#  SCORING & VERIFICATION (4 tall boxes)
# ══════════════════════════════════════════════════════════════════════════════

scoring = [
    (20.15, 13.0, '#1b5e20', 'Farm Health\nScoring',     '0-100\nComposite'),
    (20.15, 10.6, '#b71c1c', 'Risk\nAssessment',        'Drought  Flood\nPest  Disease'),
    (20.15,  8.2, '#4a148c', 'AI Validation\n& Reasoning','Cross-Verify\nAll Data'),
    (20.15,  5.8, '#e65100', 'Economic\nImpact Calc',    'Savings\nper Decision'),
]

for sx, sy, clr, title, sub in scoring:
    flow_box(sx, sy, 2.5, bh, clr, title, sub)

# Arrows: Processing → Scoring (row by row)
rows = [proc_nodes[0:3], proc_nodes[3:6], proc_nodes[6:9], proc_nodes[9:12]]
for i, row in enumerate(rows):
    sx, sy = scoring[i][0], scoring[i][1]
    for px, py, *_ in row:
        arrow(px + bw, py + bh/2, sx, sy + bh/2, color='#555555', lw=1.0)

# ══════════════════════════════════════════════════════════════════════════════
#  OUTGOING — Two columns (Output + Delivery Channel)
# ══════════════════════════════════════════════════════════════════════════════

out_data = [
    (23.6, 13.5, '#1b5e20', 'Farm Health\nScore (0-100)'),
    (23.6, 12.2, '#b71c1c', 'Disease Alert\n+ Treatment Plan'),
    (23.6, 10.9, '#1565c0', 'Crop\nRecommendation'),
    (23.6,  9.6, '#0277bd', 'Irrigation\nSchedule'),
    (23.6,  8.3, '#e65100', 'Fertilizer\nPrecision Map'),
    (23.6,  7.0, '#2e7d32', 'Yield\nPrediction'),
    (23.6,  5.7, '#00695c', 'Harvest Timing\n+ Price Advisory'),
    (23.6,  4.4, '#4e342e', 'Voice Response\n(Hinglish)'),
    (23.6,  3.1, '#37474f', 'Temporal\nDegradation Map'),
    (23.6,  1.8, '#4a148c', 'Offline\nFull Report'),
]

delivery = [
    (26.2, 13.5, '#0a2540', 'Dashboard'),
    (26.2, 12.2, '#8b0000', 'Push Alert'),
    (26.2, 10.9, '#0a2540', 'Mobile App'),
    (26.2,  9.6, '#0a2540', 'SMS /\nWhatsApp'),
    (26.2,  8.3, '#0a2540', 'Map Overlay'),
    (26.2,  7.0, '#0a2540', 'Report PDF'),
    (26.2,  5.7, '#0a2540', 'Market\nAdvisory'),
    (26.2,  4.4, '#3e2723', 'Voice Output'),
    (26.2,  3.1, '#263238', 'Analytics\nPortal'),
    (26.2,  1.8, '#311b92', 'Offline Cache'),
]

for ox, oy, clr, title in out_data:
    flow_box(ox, oy, 2.2, 0.95, clr, title)
for dx, dy, clr, title in delivery:
    flow_box(dx, dy, 2.2, 0.95, clr, title)

# Arrows: Scoring → Outputs
for sx, sy, *_ in scoring:
    for ox, oy, *_ in out_data:
        if abs((sy + bh/2) - (oy + 0.475)) < 4.5:
            arrow(sx + 2.5, sy + bh/2, 23.6, oy + 0.475, color='#e65100', lw=0.7)
            break  # one arrow per scoring box to nearest output group

# Simplified scoring → output arrows
arrow(22.65, 13.75, 23.6, 13.97, color='#1b5e20', lw=1.2)
arrow(22.65, 13.75, 23.6, 12.67, color='#1b5e20', lw=0.9)
arrow(22.65, 11.37, 23.6, 11.37, color='#b71c1c', lw=1.2)
arrow(22.65, 11.37, 23.6, 10.07, color='#b71c1c', lw=0.9)
arrow(22.65,  8.97, 23.6,  8.77, color='#4a148c', lw=1.2)
arrow(22.65,  8.97, 23.6,  7.47, color='#4a148c', lw=0.9)
arrow(22.65,  8.97, 23.6,  6.17, color='#4a148c', lw=0.9)
arrow(22.65,  6.57, 23.6,  4.87, color='#e65100', lw=1.2)
arrow(22.65,  6.57, 23.6,  3.57, color='#e65100', lw=0.9)
arrow(22.65,  6.57, 23.6,  2.27, color='#e65100', lw=0.9)

# Arrows: Output → Delivery
for i in range(len(out_data)):
    ox, oy = out_data[i][0], out_data[i][1]
    dx, dy = delivery[i][0], delivery[i][1]
    arrow(ox + 2.2, oy + 0.475, dx, dy + 0.475, color='#333333', lw=1.0)

# ══════════════════════════════════════════════════════════════════════════════
#  OFFLINE MODE INDICATOR (bottom bar)
# ══════════════════════════════════════════════════════════════════════════════

box(9.5, 3.5, 11.2, 1.5, '#263238', border_color='#37474f', radius=0.25, lw=1.5)
label(15.1, 4.6, 'OFFLINE / EDGE MODE', size=9, color='#80cbc4', bold=True)
label(15.1, 4.15, 'Ollama + Llama-3-8B  |  YOLOv11 Local Inference  |  Pre-cached Tiles', size=7, color='#b0bec5')
label(15.1, 3.75, 'Full functionality without internet  -  Field-ready deployment', size=6, color='#78909c')

# Arrow from Agent Core to Offline
arrow(11.0, 6.8, 11.0, 5.0, color='#4db6ac', lw=1.5)

# ══════════════════════════════════════════════════════════════════════════════
#  DATA FLOW LABELS on arrows
# ══════════════════════════════════════════════════════════════════════════════

# Small labels on the flow path
ax.text(8.6, 10.5, 'Data\nIngestion', fontsize=5.5, color='#3949ab', ha='center',
        fontweight='bold', zorder=5, style='italic')
ax.text(12.0, 11.5, 'Tool\nCalling', fontsize=5.5, color='#7b1fa2', ha='center',
        fontweight='bold', zorder=5, style='italic')
ax.text(20.0, 14.2, 'Validated\nResults', fontsize=5.5, color='#e65100', ha='center',
        fontweight='bold', zorder=5, style='italic')
ax.text(23.0, 14.2, 'Actionable\nInsights', fontsize=5.5, color='#1b5e20', ha='center',
        fontweight='bold', zorder=5, style='italic')

# ══════════════════════════════════════════════════════════════════════════════
#  BOTTOM LEGEND BAR
# ══════════════════════════════════════════════════════════════════════════════

ax.add_patch(plt.Rectangle((0.2, 0.2), 29.6, 0.7, facecolor='#e0e7ef',
             edgecolor='#0a2540', linewidth=1.0, zorder=3))

legend_items = [
    ('#1b5e20', 'Vegetation / Satellite'),
    ('#b71c1c', 'Disease / Anomaly'),
    ('#1565c0', 'Input / Soil / Crop'),
    ('#4a148c', 'AI Agent / Offline'),
    ('#00695c', 'Market / Irrigation'),
    ('#e65100', 'RAG / Fertilizer'),
    ('#37474f', 'Temporal / Edge'),
    ('#4e342e', 'Voice / Language'),
    ('#0a2540', 'Delivery Channel'),
]

for i, (clr, lbl) in enumerate(legend_items):
    lx = 0.6 + i * 3.25
    ax.add_patch(plt.Rectangle((lx, 0.4), 0.5, 0.3,
                 facecolor=clr, edgecolor='#444', linewidth=0.5, zorder=4))
    label(lx + 0.65, 0.55, lbl, size=6, color='#222222', ha='left')

# ══════════════════════════════════════════════════════════════════════════════
#  SAVE
# ══════════════════════════════════════════════════════════════════════════════

plt.tight_layout(pad=0.2)
plt.savefig('terra_mind_architecture.png', dpi=200, bbox_inches='tight',
            facecolor='#f5f7fa', edgecolor='none')
print("Saved: terra_mind_architecture.png")
plt.show()

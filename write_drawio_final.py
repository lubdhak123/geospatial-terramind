"""
Terra-Mind — Reference-style Architecture
Exactly matching the reference image style:
  - White background, light gray page
  - "Incoming" + "Outgoing" teal header bars at top
  - Small icon/tool boxes in the header strips
  - Central diamond Classifier/Router
  - Grouped swim-lane containers (light fill, colored border)
  - Small compact nodes inside groups (white fill, colored border)
  - Clean orthogonal arrows with Yes/No labels
  - Left-side badge ("Terra-Mind AI / Agent Core")
  - All text small and clean
"""

lines = []

# ── HELPERS ───────────────────────────────────────────────────────────────────

def node(id_, x, y, w, h, fill, stroke, val,
         fc="#333333", fs=10, bold=False, sw=1, arc=6):
    """Small compact node — white/light fill, colored border."""
    fb = "1" if bold else "0"
    lines.append(
        f'<mxCell id="{id_}" parent="1" vertex="1" '
        f'style="rounded=1;fillColor={fill};strokeColor={stroke};strokeWidth={sw};'
        f'fontColor={fc};fontSize={fs};fontStyle={fb};arcSize={arc};'
        f'align=center;verticalAlign=middle;whiteSpace=wrap;html=1;" '
        f'value="{val}">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
        f'</mxCell>'
    )

def group(id_, x, y, w, h, fill, stroke, title,
          fc="#333333", fs=11, bold=True, sw=2, arc=8):
    """Swim-lane group container — light fill, colored border, title top-left."""
    fb = "1" if bold else "0"
    lines.append(
        f'<mxCell id="{id_}" parent="1" vertex="1" '
        f'style="rounded=1;fillColor={fill};strokeColor={stroke};strokeWidth={sw};'
        f'fontColor={fc};fontSize={fs};fontStyle={fb};arcSize={arc};'
        f'align=left;verticalAlign=top;spacingLeft=8;spacingTop=4;whiteSpace=wrap;html=1;" '
        f'value="{title}">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
        f'</mxCell>'
    )

def diamond(id_, x, y, w, h, fill, stroke, val,
            fc="#ffffff", fs=11, bold=True, sw=2):
    fb = "1" if bold else "0"
    lines.append(
        f'<mxCell id="{id_}" parent="1" vertex="1" '
        f'style="shape=rhombus;fillColor={fill};strokeColor={stroke};strokeWidth={sw};'
        f'fontColor={fc};fontSize={fs};fontStyle={fb};'
        f'align=center;verticalAlign=middle;whiteSpace=wrap;html=1;" '
        f'value="{val}">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
        f'</mxCell>'
    )

def hdr(id_, x, y, w, h, fill, stroke, val,
        fc="#ffffff", fs=11, bold=True, sw=1, arc=4):
    """Header bar node."""
    fb = "1" if bold else "0"
    lines.append(
        f'<mxCell id="{id_}" parent="1" vertex="1" '
        f'style="rounded=1;fillColor={fill};strokeColor={stroke};strokeWidth={sw};'
        f'fontColor={fc};fontSize={fs};fontStyle={fb};arcSize={arc};'
        f'align=center;verticalAlign=middle;whiteSpace=wrap;html=1;" '
        f'value="{val}">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
        f'</mxCell>'
    )

def txt(id_, x, y, w, h, val, fc="#555555", fs=9, bold=False, align="center"):
    fb = "1" if bold else "0"
    lines.append(
        f'<mxCell id="{id_}" parent="1" vertex="1" '
        f'style="text;html=1;strokeColor=none;fillColor=none;'
        f'fontColor={fc};fontSize={fs};fontStyle={fb};align={align};verticalAlign=middle;" '
        f'value="{val}">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
        f'</mxCell>'
    )

def arrow(id_, src, tgt, color="#555555", lbl="", sw=1, dashed=False,
          ex=0.5, ey=1, nx=0.5, ny=0, pts=None):
    dash = "dashed=1;dashPattern=6 3;" if dashed else ""
    geo = ""
    if pts:
        ps = "".join(f'<mxPoint x="{px}" y="{py}" as="point"/>' for px,py in pts)
        geo = f'<Array as="points">{ps}</Array>'
    lbl_style = 'fontColor=#333333;fontSize=9;fontStyle=1;labelBackgroundColor=#ffffff;' if lbl else ''
    lines.append(
        f'<mxCell id="{id_}" parent="1" edge="1" source="{src}" target="{tgt}" '
        f'style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;'
        f'strokeColor={color};strokeWidth={sw};{dash}{lbl_style}'
        f'exitX={ex};exitY={ey};exitDx=0;exitDy=0;'
        f'entryX={nx};entryY={ny};entryDx=0;entryDy=0;'
        f'endArrow=block;endFill=1;endSize=6;" '
        f'value="{lbl}">'
        f'<mxGeometry relative="1" as="geometry">{geo}</mxGeometry>'
        f'</mxCell>'
    )

# ── DOCUMENT ──────────────────────────────────────────────────────────────────
lines.append('<mxfile host="app.diagrams.net">')
lines.append('<diagram name="Terra-Mind" id="tm-v9">')
lines.append(
    '<mxGraphModel dx="1422" dy="762" grid="0" gridSize="10" guides="1" '
    'tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" '
    'pageWidth="1654" pageHeight="1169" background="#FFFFFF" math="0" shadow="0">'
)
lines.append('<root>')
lines.append('<mxCell id="0"/>')
lines.append('<mxCell id="1" parent="0"/>')

# ══════════════════════════════════════════════════════════════════════════════
#  LAYOUT   (A4-landscape-ish:  1550 x 1080)
# ══════════════════════════════════════════════════════════════════════════════
#  Margins
ML = 30      # left
MT = 30      # top
CW = 1500    # canvas width
CX = ML + CW // 2  # 780

# Row Y positions
INC_Y  = MT          # Incoming header row   y=30
INC_H  = 30
OUT_Y  = MT          # Outgoing header row   (same row, right half)
CLS_Y  = 100         # Classifier diamond
GRP_Y  = 230         # Groups row 1 start
GRP2_Y = 500         # Groups row 2 start
DEC_Y  = 760         # Decisions row
FB_Y   = 920         # Feedback row
IMP_Y  = 1020        # Impact footer

# Colours matching reference
TEAL        = "#00838F"
TEAL_LIGHT  = "#E0F7FA"
TEAL_DARK   = "#006064"
RED         = "#C62828"
RED_LIGHT   = "#FFEBEE"
GREEN       = "#2E7D32"
GREEN_LIGHT = "#E8F5E9"
PURPLE      = "#5E35B1"
PURPLE_LIGHT= "#EDE7F6"
ORANGE      = "#E65100"
ORANGE_LIGHT= "#FFF3E0"
BLUE        = "#1565C0"
BLUE_LIGHT  = "#E3F2FD"
GREY        = "#546E7A"
GREY_LIGHT  = "#ECEFF1"
GOLD        = "#F57F17"
GOLD_LIGHT  = "#FFF8E1"

WHITE = "#FFFFFF"
NODE_BORDER = 1

# ══════════════════════════════════════════════════════════════════════════════
#  TOP STRIP: "Incoming" label + tool icons  /  "Outgoing" label + icons
# ══════════════════════════════════════════════════════════════════════════════
# --- Incoming label ---
hdr("inc_lbl", ML, INC_Y, 90, INC_H, TEAL, TEAL_DARK, "Incoming",
    fc=WHITE, fs=11, bold=True, sw=1, arc=4)
txt("inc_arr", ML + 90, INC_Y + 8, 20, 14, "→", fc=TEAL_DARK, fs=13, bold=True)

# --- 7 incoming data-source boxes ---
inc_items = [
    ("ic1", "Field Polygon&#xa;GPS"),
    ("ic2", "Voice Query&#xa;Hindi/Tamil"),
    ("ic3", "Camera&#xa;Leaf Photo"),
    ("ic4", "Sentinel-1/2&#xa;Satellite"),
    ("ic5", "SoilGrids&#xa;pH N P K"),
    ("ic6", "Weather&#xa;Open-Meteo"),
    ("ic7", "Mandi Prices&#xa;Agmarknet"),
]
IW, IH = 116, INC_H
IX0 = ML + 116
IXGAP = (CW // 2 - 130) // 7
for i, (nid, val) in enumerate(inc_items):
    node(nid, IX0 + i * (IW + 6), INC_Y, IW, IH, WHITE, TEAL, val,
         fc=TEAL_DARK, fs=9, sw=NODE_BORDER)

# --- Outgoing label (right side) ---
OUT_X = ML + CW - 90
hdr("out_lbl", OUT_X, INC_Y, 90, INC_H, TEAL, TEAL_DARK, "Outgoing",
    fc=WHITE, fs=11, bold=True, sw=1, arc=4)
txt("out_arr", OUT_X - 20, INC_Y + 8, 20, 14, "→", fc=TEAL_DARK, fs=13, bold=True)

# --- 7 outgoing delivery boxes ---
out_items = [
    ("oc1", "Dashboard&#xa;Farm Health"),
    ("oc2", "Push Alert&#xa;Disease"),
    ("oc3", "Mobile App&#xa;Crop Advice"),
    ("oc4", "SMS/WhatsApp&#xa;Irrigation"),
    ("oc5", "Map Overlay&#xa;Fertilizer"),
    ("oc6", "PDF Report&#xa;Yield"),
    ("oc7", "Voice&#xa;Hinglish"),
]
OX_END = OUT_X - 6
OX0    = OX_END - 7 * (IW + 6) + 6
for i, (nid, val) in enumerate(out_items):
    node(nid, OX0 + i * (IW + 6), INC_Y, IW, IH, WHITE, TEAL, val,
         fc=TEAL_DARK, fs=9, sw=NODE_BORDER)

# ══════════════════════════════════════════════════════════════════════════════
#  LEFT BADGE: Terra-Mind Agent Core
# ══════════════════════════════════════════════════════════════════════════════
group("badge", ML, 80, 130, 320, PURPLE_LIGHT, PURPLE,
      "Terra-Mind&#xa;AI Agent Core",
      fc=PURPLE, fs=11, bold=True, sw=2, arc=8)

badge_items = [
    ("bd1","LangChain&#xa;CrewAI"),
    ("bd2","YOLOv11&#xa;Vision"),
    ("bd3","RAG&#xa;ICAR DB"),
    ("bd4","XGBoost&#xa;ML"),
    ("bd5","Whisper&#xa;STT"),
    ("bd6","Llama-3&#xa;Offline"),
]
BW, BH = 110, 34
BX = ML + 10
BY0 = 100
BYGAP = 42
for i, (nid, val) in enumerate(badge_items):
    node(nid, BX, BY0 + i * BYGAP, BW, BH, WHITE, PURPLE, val,
         fc=PURPLE, fs=9, sw=NODE_BORDER)

# ══════════════════════════════════════════════════════════════════════════════
#  CENTRAL CLASSIFIER DIAMOND
# ══════════════════════════════════════════════════════════════════════════════
DW, DH = 160, 110
DX = CX - DW // 2    # 700
DY = CLS_Y           # 100
D_CX = CX
D_CY = DY + DH // 2  # 155

diamond("cls", DX, DY, DW, DH, TEAL, TEAL_DARK,
        "TERRA-MIND&#xa;Classifier&#xa;/ Router",
        fc=WHITE, fs=10, bold=True, sw=2)

# Arrows: incoming boxes → classifier
for i, (nid, _) in enumerate(inc_items):
    arrow(f"aic{i}", nid, "cls", color=TEAL, sw=1,
          ex=0.5, ey=1, nx=0.5, ny=0)

# ══════════════════════════════════════════════════════════════════════════════
#  GROUP ROW 1: 4 groups across (y=230)
# ══════════════════════════════════════════════════════════════════════════════
G1W = 330   # group width
G1H = 230   # group height
G1Y = GRP_Y
G1GAP = (CW - 4 * G1W) // 3   # gap between groups
G1_XS = [ML + i * (G1W + G1GAP) for i in range(4)]

# -- GROUP A: Spectral + Soil Analysis --
group("ga", G1_XS[0], G1Y, G1W, G1H, BLUE_LIGHT, BLUE,
      "Spectral + Soil Analysis", fc=BLUE, fs=10, bold=True)

ga_nodes = [
    ("ga1","NDVI · NDRE · NDWI · SWIR","Satellite Pipeline"),
    ("ga2","SAR Time-Series&#xa;5-Year Benchmark",""),
    ("ga3","Soil: pH · N · P · K · Texture",""),
    ("ga4","Fertilizer Mapper&#xa;NDRE Zone-by-Zone",""),
]
GNW, GNH = G1W - 24, 36
GNX = G1_XS[0] + 12
GNY0 = G1Y + 28
GNYG = 44
for i, (nid, val, _) in enumerate(ga_nodes):
    node(nid, GNX, GNY0 + i * GNYG, GNW, GNH, WHITE, BLUE, val,
         fc=BLUE, fs=9, sw=NODE_BORDER)
for i in range(3):
    arrow(f"ega{i}", f"ga{i+1}", f"ga{i+2}", color=BLUE, sw=1,
          ex=0.5, ey=1, nx=0.5, ny=0)

# -- GROUP B: Disease + Crop Intelligence --
group("gb", G1_XS[1], G1Y, G1W, G1H, RED_LIGHT, RED,
      "Disease + Crop Intelligence", fc=RED, fs=10, bold=True)

# Left column nodes
gb_L = [
    ("gb1","Disease Detection&#xa;YOLOv11 + VLM"),
    ("gb2","Crop Advisor&#xa;RAG + ICAR"),
    ("gb3","Voice Processor&#xa;Whisper + gTTS"),
]
HCW = (G1W - 30) // 2
GBX_L = G1_XS[1] + 10
GBX_R = G1_XS[1] + 10 + HCW + 8
GBY0 = G1Y + 28
for i, (nid, val) in enumerate(gb_L):
    node(nid, GBX_L, GBY0 + i * 60, HCW, 50, WHITE, RED, val,
         fc=RED, fs=9, sw=NODE_BORDER)

# Right side: disease decision diamond + result
diamond("gb_dec", GBX_R + HCW//2 - 44, G1Y + 28, 88, 60,
        RED_LIGHT, RED, "Disease?", fc=RED, fs=9, bold=True, sw=1)
node("gb_yes", GBX_R + HCW//2 - 44, G1Y + 100, 88, 36, "#FFCDD2", RED,
     "ALERT&#xa;Treat 48h", fc=RED, fs=9, sw=NODE_BORDER)
node("gb_no",  GBX_R + HCW//2 - 44, G1Y + 148, 88, 36, "#C8E6C9", GREEN,
     "Monitor&#xa;Continue", fc=GREEN, fs=9, sw=NODE_BORDER)

arrow("egb1d", "gb1", "gb_dec", color=RED, sw=1, ex=1, ey=0.5, nx=0, ny=0.5)
arrow("egb_y", "gb_dec", "gb_yes", RED,   sw=1, ex=0.5, ey=1,   nx=0.5, ny=0, lbl="Yes")
arrow("egb_n", "gb_dec", "gb_no",  GREEN, sw=1, ex=1,   ey=0.5, nx=1,   ny=0, lbl="No")
for i in range(2):
    arrow(f"egb{i}", f"gb{i+1}", f"gb{i+2}", RED, sw=1,
          ex=0.5, ey=1, nx=0.5, ny=0)

# -- GROUP C: Climate + Irrigation --
group("gc", G1_XS[2], G1Y, G1W, G1H, GREEN_LIGHT, GREEN,
      "Climate + Irrigation", fc=GREEN, fs=10, bold=True)

GCX_L = G1_XS[2] + 10
GCX_R = G1_XS[2] + 10 + HCW + 8

node("gc1", GCX_L, G1Y + 28,  HCW, 50, WHITE, GREEN,
     "Climate Forecaster&#xa;Hyperlocal 5-Day", fc=GREEN, fs=9, sw=NODE_BORDER)
node("gc2", GCX_L, G1Y + 88,  HCW, 50, WHITE, GREEN,
     "Irrigation Scheduler&#xa;SAR Moisture + Rain", fc=GREEN, fs=9, sw=NODE_BORDER)
node("gc3", GCX_L, G1Y + 148, HCW, 50, WHITE, GREEN,
     "Temporal Analyzer&#xa;SAR 5yr Trends", fc=GREEN, fs=9, sw=NODE_BORDER)

diamond("gc_dec", GCX_R + HCW//2 - 44, G1Y + 28, 88, 60,
        GREEN_LIGHT, GREEN, "Irrigate?", fc=GREEN, fs=9, bold=True, sw=1)
node("gc_no",  GCX_R + HCW//2 - 44, G1Y + 100, 88, 36, "#B2EBF2", GREEN,
     "Skip — Rain&#xa;Save 4000L", fc="#006064", fs=9, sw=NODE_BORDER)
node("gc_yes", GCX_R + HCW//2 - 44, G1Y + 148, 88, 36, "#C8E6C9", GREEN,
     "Irrigate Now&#xa;Schedule Drip", fc=GREEN, fs=9, sw=NODE_BORDER)

arrow("egc1d", "gc1", "gc_dec", GREEN, sw=1, ex=1, ey=0.5, nx=0, ny=0.5)
arrow("egc_n", "gc_dec", "gc_no",  GREEN, sw=1, lbl="No, Rain",
      ex=0.5, ey=1, nx=0.5, ny=0)
arrow("egc_y", "gc_dec", "gc_yes", GREEN, sw=1, lbl="Yes",
      ex=1, ey=0.5, nx=1, ny=0)
for i in range(2):
    arrow(f"egc{i}", f"gc{i+1}", f"gc{i+2}", GREEN, sw=1,
          ex=0.5, ey=1, nx=0.5, ny=0)

# -- GROUP D: Yield + Market --
group("gd", G1_XS[3], G1Y, G1W, G1H, ORANGE_LIGHT, ORANGE,
      "Yield + Market Analytics", fc=ORANGE, fs=10, bold=True)

GDX = G1_XS[3] + 10
GDW = G1W - 20
node("gd1", GDX, G1Y + 28,  GDW, 36, WHITE, ORANGE,
     "Yield Predictor  XGBoost ML  84% Acc", fc=ORANGE, fs=9, sw=NODE_BORDER)
node("gd2", GDX, G1Y + 74,  GDW, 36, WHITE, ORANGE,
     "Mandi Price Engine  3yr Agmarknet", fc=ORANGE, fs=9, sw=NODE_BORDER)
node("gd3", GDX, G1Y + 120, GDW, 36, WHITE, GOLD,
     "Crop Calendar  Seasonal Planning", fc=GOLD, fs=9, sw=NODE_BORDER)
node("gd4", GDX, G1Y + 166, GDW, 36, WHITE, ORANGE,
     "Risk Assessment  Drought+Flood+Pest", fc=ORANGE, fs=9, sw=NODE_BORDER)
for i in range(3):
    arrow(f"egd{i}", f"gd{i+1}", f"gd{i+2}", ORANGE, sw=1,
          ex=0.5, ey=1, nx=0.5, ny=0)

# Classifier → each group
arrow("ecls_ga", "cls", "ga", TEAL, sw=2, ex=0,   ey=0.5, nx=0.5, ny=0,
      pts=[(G1_XS[0] + G1W//2, D_CY)], lbl="Spectral")
arrow("ecls_gb", "cls", "gb", RED,  sw=2, ex=0.25, ey=1,   nx=0.5, ny=0,
      lbl="Disease")
arrow("ecls_gc", "cls", "gc", GREEN,sw=2, ex=0.75, ey=1,   nx=0.5, ny=0,
      lbl="Climate")
arrow("ecls_gd", "cls", "gd", ORANGE,sw=2,ex=1,   ey=0.5, nx=0.5, ny=0,
      pts=[(G1_XS[3] + G1W//2, D_CY)], lbl="Market")

# ══════════════════════════════════════════════════════════════════════════════
#  EXPLAINABLE AI REASONING LAYER  (y=GRP2_Y = 500)
# ══════════════════════════════════════════════════════════════════════════════
group("rsn_grp", ML, GRP2_Y, CW, 130, "#EDE7F6", PURPLE,
      "AI Reasoning Layer  -  Explainable AI  (Why did the AI decide this?)",
      fc=PURPLE, fs=11, bold=True, sw=2)

rsn_cards = [
    ("rc1", "#EF9A9A", "#B71C1C",
     "Evidence: YOLOv11 94%&#xa;Humidity 78% · 3-day rain"),
    ("rc2", "#A5D6A7", "#1B5E20",
     "Evidence: Soil N 12mg/kg&#xa;pH 6.2 · Rain forecast low"),
    ("rc3", "#80DEEA", "#006064",
     "Evidence: SAR moisture 68%&#xa;Rain alert 3pm today"),
    ("rc4", "#FFE082", "#F57F17",
     "Evidence: 50km supply +34%&#xa;Mandi price dropping"),
]
rsn_decs = [
    ("rd1", "#FFCDD2", "#B71C1C",
     "TREAT BLIGHT&#xa;Copper fungicide&#xa;Conf: 94%"),
    ("rd2", "#C8E6C9", "#1B5E20",
     "PLANT CHICKPEAS&#xa;Nitrogen-fixing&#xa;Conf: 86%"),
    ("rd3", "#B2EBF2", "#006064",
     "SKIP IRRIGATION&#xa;Save 4,000L water&#xa;Conf: 89%"),
    ("rd4", "#B9F6CA", "#1B5E20",
     "DELAY HARVEST 9d&#xa;Price +22% +7400&#xa;Conf: 78%"),
]
RSN_W  = (CW - 8 * 8) // 8   # each card ~180px
RSN_EW = RSN_W + 20
RSN_DW = RSN_W
RSN_H  = 88
RSNX0  = ML + 10
RSNY   = GRP2_Y + 28
RSNXG  = RSN_EW + RSN_DW + 16

for i in range(4):
    ex_ = RSNX0 + i * RSNXG
    dx_ = ex_ + RSN_EW + 8
    ef, efc = rsn_cards[i][1], rsn_cards[i][2]
    df, dfc = rsn_decs[i][1],  rsn_decs[i][2]
    node(f"rc{i}", ex_, RSNY, RSN_EW, RSN_H, ef, efc,
         rsn_cards[i][3], fc=efc, fs=9, sw=NODE_BORDER)
    node(f"rd{i}", dx_, RSNY, RSN_DW, RSN_H, df, dfc,
         rsn_decs[i][3], fc=dfc, fs=9, sw=NODE_BORDER, bold=True)
    arrow(f"erc{i}", f"rc{i}", f"rd{i}", efc, sw=1,
          ex=1, ey=0.5, nx=0, ny=0.5, lbl="")

# Groups → Reasoning
arrow("ega_rsn", "ga", "rsn_grp", BLUE,   sw=1, ex=0.5, ey=1, nx=0.25, ny=0)
arrow("egb_rsn", "gb", "rsn_grp", RED,    sw=1, ex=0.5, ey=1, nx=0.40, ny=0)
arrow("egc_rsn", "gc", "rsn_grp", GREEN,  sw=1, ex=0.5, ey=1, nx=0.60, ny=0)
arrow("egd_rsn", "gd", "rsn_grp", ORANGE, sw=1, ex=0.5, ey=1, nx=0.75, ny=0)

# ══════════════════════════════════════════════════════════════════════════════
#  HARVEST ORACLE HERO  (below reasoning, y~660, right half)
# ══════════════════════════════════════════════════════════════════════════════
HO_X = ML + CW // 2 + 10
HO_Y = GRP2_Y + 148
HO_W = CW // 2 - 10
HO_H = 200

group("ho_grp", HO_X, HO_Y, HO_W, HO_H, "#E8F5E9", "#00C853",
      "* HARVEST INTELLIGENCE ENGINE  -  AWE Innovation",
      fc="#1B5E20", fs=11, bold=True, sw=3)

ho_steps = [
    ("hh1","#DCEDC8","#2E7D32","(1) Farm Clustering&#xa;NDVI 50km scan"),
    ("hh2","#C8E6C9","#2E7D32","(2) Supply Detection&#xa;Glut window"),
    ("hh3","#B9F6CA","#00C853","(3) Price Window&#xa;3yr model"),
    ("hh4","#69F0AE","#00BFA5","(4) SELL WEEK&#xa;+7,400 profit"),
]
HOW_ = (HO_W - 40) // 4 - 6
HOH_ = 120
HOX0  = HO_X + 14
HOYY  = HO_Y + 30
HOXG  = HOW_ + 10
for i, (nid, fill, stroke, val) in enumerate(ho_steps):
    node(nid, HOX0 + i * HOXG, HOYY, HOW_, HOH_, fill, stroke, val,
         fc=stroke, fs=9, sw=NODE_BORDER, bold=True)
for i in range(3):
    arrow(f"eho{i}", f"hh{i+1}", f"hh{i+2}", "#00C853", sw=2,
          ex=1, ey=0.5, nx=0, ny=0.5)

# Confidence label
txt("ho_conf", HO_X + 10, HO_Y + 160, 300, 18,
    "Confidence: 78%  ·  Satellite-native  ·  No competitor has this",
    fc="#1B5E20", fs=9, bold=True, align="left")

# ══════════════════════════════════════════════════════════════════════════════
#  DECISIONS PANEL  (left half at same Y as HO)
# ══════════════════════════════════════════════════════════════════════════════
DC_X = ML
DC_Y2 = GRP2_Y + 148
DC_W  = CW // 2 - 10
DC_H  = 200

group("dec_grp", DC_X, DC_Y2, DC_W, DC_H, "#F3E5F5", PURPLE,
      "Actionable Decisions  -  Delivered to Farmer", fc=PURPLE, fs=11, bold=True, sw=2)

decisions = [
    ("dc1","#FFCDD2","#C62828",
     "DISEASE ALERT&#xa;Leaf blight Zone C&#xa;Treat within 48h&#xa;Conf: 94%"),
    ("dc2","#B2EBF2","#00838F",
     "IRRIGATION&#xa;Skip tomorrow&#xa;SAR 68% Rain 3pm&#xa;Conf: 89%"),
    ("dc3","#C8E6C9","#2E7D32",
     "CROP ADVISORY&#xa;Plant chickpeas&#xa;pH 6.2 Low N&#xa;Conf: 86%"),
    ("dc4","#D1C4E9","#5E35B1",
     "YIELD FORECAST&#xa;3.2 T/acre +18%&#xa;XGBoost 84%&#xa;Conf: 84%"),
    ("dc5","#B9F6CA","#00C853",
     "* HARVEST TIMING&#xa;Delay 9 days&#xa;Price +22% +7400&#xa;Conf: 78%"),
    ("dc6","#FFF9C4","#F57F17",
     "RISK ALERT&#xa;Drought HIGH&#xa;Drip -40% water&#xa;Conf: 82%"),
]
DCW_ = (DC_W - 30) // 3 - 4
DCH_ = 80
DCX0  = DC_X + 10
DCXG  = DCW_ + 8
DCC_Y1 = DC_Y2 + 26
DCC_Y2 = DC_Y2 + 26 + DCH_ + 10
for i, (nid, fill, stroke, val) in enumerate(decisions):
    row_ = i // 3
    col_ = i %  3
    node(nid, DCX0 + col_ * DCXG, DCC_Y1 + row_ * (DCH_ + 10),
         DCW_, DCH_, fill, stroke, val, fc=stroke, fs=8, sw=NODE_BORDER)

# Reasoning → Decisions
arrow("ersn_dec", "rsn_grp", "dec_grp", PURPLE, sw=2,
      ex=0.25, ey=1, nx=0.5, ny=0, lbl="Execute")
arrow("eho_dc5", "ho_grp", "dc5", "#00C853", sw=2,
      ex=0, ey=0.5, nx=1, ny=0.5, lbl="Optimal Timing")

# ══════════════════════════════════════════════════════════════════════════════
#  FEEDBACK LOOP  (y=DEC_Y)
# ══════════════════════════════════════════════════════════════════════════════
group("fb_grp", ML, DEC_Y, CW, 120, "#FFF3E0", ORANGE,
      "Feedback Loop  -  System Learns from Every Season",
      fc=ORANGE, fs=11, bold=True, sw=2)

fb_items = [
    ("fb1","#FFE0B2","#E65100","Actual Yield&#xa;Recorded"),
    ("fb2","#FFCC80","#EF6C00","Actual Price&#xa;at Mandi"),
    ("fb3","#FFB74D","#E65100","Prediction Gap&#xa;Calculated"),
    ("fb4","#FF9800","#E65100","Model Weights&#xa;Corrected"),
    ("fb5","#FFE082","#F9A825","Better&#xa;Predictions"),
]
FBW_ = (CW - 50) // 5 - 8
FBH_ = 64
FBX0  = ML + 14
FBXG  = FBW_ + 12
FBY_  = DEC_Y + 34
for i, (nid, fill, stroke, val) in enumerate(fb_items):
    node(nid, FBX0 + i * FBXG, FBY_, FBW_, FBH_, fill, stroke, val,
         fc=stroke, fs=9, sw=NODE_BORDER)
for i in range(4):
    arrow(f"efb{i}", f"fb{i+1}", f"fb{i+2}", ORANGE, sw=1,
          ex=1, ey=0.5, nx=0, ny=0.5)

# Return arrow: fb5 → classifier (loops back)
FB5_CY = FBY_ + FBH_ // 2
RT_X   = ML + CW + 24
arrow("efb_ret", "fb5", "cls", ORANGE, sw=1, dashed=True,
      ex=1, ey=0.5, nx=1, ny=0.5,
      pts=[(RT_X, FB5_CY), (RT_X, D_CY)], lbl="Retraining")

# Decisions → Feedback
arrow("edec_fb", "dec_grp", "fb_grp", ORANGE, sw=1,
      ex=0.5, ey=1, nx=0.5, ny=0, lbl="Season Results")

# Decisions → Outgoing
for i, (nid, _) in enumerate(out_items):
    arrow(f"eoc{i}", "dec_grp", nid, TEAL, sw=1,
          ex=0.5, ey=0, nx=0.5, ny=1)

# ══════════════════════════════════════════════════════════════════════════════
#  IMPACT STRIP  (y=IMP_Y = 1020)
# ══════════════════════════════════════════════════════════════════════════════
group("imp_grp", ML, IMP_Y, CW, 80, GREEN_LIGHT, GREEN,
      "Impact  -  Per Farmer Per Season", fc=GREEN, fs=11, bold=True, sw=2)

impact = [
    ("im1","#C8E6C9","#2E7D32","12,000+&#xa;Water Saved"),
    ("im2","#DCEDC8","#558B2F","8,500+&#xa;Fertilizer"),
    ("im3","#B9F6CA","#00C853","7,400+&#xa;Harvest Profit"),
    ("im4","#BBDEFB","#1565C0","30% fewer&#xa;Crop Losses"),
    ("im5","#FFF9C4","#F9A825","28,000+&#xa;Total/Farmer"),
    ("im6","#B2DFDB","#00695C","10x ROI&#xa;vs Traditional"),
    ("im7","#F8BBD0","#C2185B","87M+&#xa;Farmers"),
]
IMW_ = (CW - 50) // 7 - 6
IMH_ = 48
IMX0  = ML + 14
IMXG  = IMW_ + 8
IMY_  = IMP_Y + 24
for i, (nid, fill, stroke, val) in enumerate(impact):
    node(nid, IMX0 + i * IMXG, IMY_, IMW_, IMH_, fill, stroke, val,
         fc=stroke, fs=9, sw=NODE_BORDER)

# ══════════════════════════════════════════════════════════════════════════════
#  FOOTER: 7 Problems Solved
# ══════════════════════════════════════════════════════════════════════════════
FTR_Y = IMP_Y + 90
node("footer", ML, FTR_Y, CW, 34, "#1B2A4A", "#0D47A1",
     "7 PROBLEMS SOLVED:   (1) Disease Detection   (2) Wrong Crop   (3) Water Waste   "
     "(4) Land Degradation   (5) Fertilizer Waste   (6) Yield Uncertainty   (7) * Harvest Oracle",
     fc="#FFFFFF", fs=10, sw=0, arc=4, bold=False)

# ── CLOSE ─────────────────────────────────────────────────────────────────────
lines.append('</root>')
lines.append('</mxGraphModel>')
lines.append('</diagram>')
lines.append('</mxfile>')

xml = "\n".join(lines)
out = "c:/Users/kanis/OneDrive/Desktop/geospatiall/terra_mind_architecture.drawio"
with open(out, "w", encoding="utf-8") as f:
    f.write(xml)

import xml.etree.ElementTree as ET
ET.parse(out)
print(f"Written {len(xml):,} bytes | {xml.count('mxCell id='):,} cells | XML valid")

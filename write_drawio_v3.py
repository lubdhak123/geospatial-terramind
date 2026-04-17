"""
Terra-Mind — V3  HACKATHON FINAL
Design principles:
- Compact boxes, large readable font
- Thick labeled arrows between every section
- High-contrast dark theme
- Every section tells a story
- 16:9 ratio (3840 x 2160 / 2 = 1920 x 1080 scaled up)
"""

parts = []

# ── helpers ──────────────────────────────────────────────────────────────────
def box(cid, x, y, w, h, fill, stroke, label, fc="#fff", fs=12, bold=True, sw=2, arc=12):
    fb = "1" if bold else "0"
    return (
        f'        <mxCell id="{cid}" parent="1" '
        f'style="rounded=1;fillColor={fill};strokeColor={stroke};strokeWidth={sw};'
        f'fontColor={fc};fontSize={fs};fontStyle={fb};arcSize={arc};shadow=1;'
        f'align=center;verticalAlign=middle;whiteSpace=wrap;" '
        f'value="{label}" vertex="1">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" /></mxCell>\n'
    )

def lbl(cid, x, y, w, h, label, fc="#fff", fs=12, bold=False, align="left"):
    fb = "1" if bold else "0"
    return (
        f'        <mxCell id="{cid}" parent="1" '
        f'style="text;html=1;strokeColor=none;fillColor=none;'
        f'fontColor={fc};fontSize={fs};fontStyle={fb};align={align};'
        f'verticalAlign=middle;whiteSpace=wrap;" '
        f'value="{label}" vertex="1">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" /></mxCell>\n'
    )

def arr_down(eid, src, tgt, color, sw=4, label=""):
    return (
        f'        <mxCell id="{eid}" parent="1" '
        f'style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;'
        f'strokeColor={color};strokeWidth={sw};'
        f'exitX=0.5;exitY=1;exitDx=0;exitDy=0;'
        f'entryX=0.5;entryY=0;entryDx=0;entryDy=0;'
        f'fontColor={color};fontSize=12;fontStyle=1;'
        f'endArrow=block;endFill=1;" '
        f'value="{label}" edge="1" source="{src}" target="{tgt}">'
        f'<mxGeometry relative="1" as="geometry" /></mxCell>\n'
    )

def arr_right(eid, src, tgt, color, sw=3, label=""):
    return (
        f'        <mxCell id="{eid}" parent="1" '
        f'style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;'
        f'strokeColor={color};strokeWidth={sw};'
        f'exitX=1;exitY=0.5;exitDx=0;exitDy=0;'
        f'entryX=0;entryY=0.5;entryDx=0;entryDy=0;'
        f'fontColor={color};fontSize=11;fontStyle=1;'
        f'endArrow=block;endFill=1;" '
        f'value="{label}" edge="1" source="{src}" target="{tgt}">'
        f'<mxGeometry relative="1" as="geometry" /></mxCell>\n'
    )

# Canvas: wide 16:9
CW = 3840
CH = 1700

parts += [
    '<mxfile host="app.diagrams.net">\n',
    '  <diagram name="Terra-Mind-Final" id="tmf">\n',
    f'    <mxGraphModel dx="1920" dy="1080" grid="0" gridSize="10" guides="1" '
    f'tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" '
    f'pageWidth="{CW}" pageHeight="{CH}" background="#0d0d1a" math="0" shadow="1">\n',
    '      <root>\n',
    '        <mxCell id="0" />\n',
    '        <mxCell id="1" parent="0" />\n',
]

# ══════════════════════════════════════════════════════════════════════════════
# HEADER
# ══════════════════════════════════════════════════════════════════════════════
parts.append(box("hdr", 0, 0, CW, 64, "#0a2540", "#00b4d8",
    "TERRA-MIND  —  AGENTIC AI AGRONOMIST  |  Geospatial Intelligence  |  7 Problems Solved  |  Offline-First",
    fc="#FFFFFF", fs=22, sw=0, arc=0))
parts.append(box("hdr_line", 0, 62, CW, 4, "#00b4d8", "#00b4d8", "", sw=0, arc=0))

# ══════════════════════════════════════════════════════════════════════════════
# ROW 1 — DATA SOURCES  y=80
# ══════════════════════════════════════════════════════════════════════════════
R1Y = 80
R1H = 72
parts.append(box("bg1", 0, R1Y-4, CW, R1H+10, "#050e1a", "#1565c0",
                 "", sw=2, arc=0, bold=False))
parts.append(lbl("l1", 8, R1Y, 160, 30, "① DATA IN", fc="#64b5f6", fs=13, bold=True))

data = [
    ("d1","#0d47a1","#42a5f5","Field GPS\nPolygon"),
    ("d2","#006064","#4dd0e1","Voice\nHindi/Tamil"),
    ("d3","#004d40","#26a69a","Crop Photo\nCamera/UAV"),
    ("d4","#1a237e","#5c6bc0","Sentinel-1+2\nSAR Satellite"),
    ("d5","#3e2723","#a1887f","SoilGrids\npH·N·P·K"),
    ("d6","#bf360c","#ff7043","Open-Meteo\n5-Day Forecast"),
    ("d7","#00695c","#26a69a","Agmarknet\nMandi Prices"),
]
DW,DH = 470,R1H
DX0 = 180
DXG = 510
for i,(nid,f,s,t) in enumerate(data):
    parts.append(box(nid, DX0+i*DXG, R1Y, DW, DH, f, s, t, fs=12))

# ══════════════════════════════════════════════════════════════════════════════
# FUNNEL BAR  y=168
# ══════════════════════════════════════════════════════════════════════════════
FY = 170
parts.append(box("funnel", 0, FY, CW, 36, "#0d1b2e", "#1565c0",
    "ALL DATA AUTOMATICALLY INGESTED BY AGENT  —  No manual input required",
    fc="#64b5f6", fs=13, sw=1, arc=0))

# Arrows: data → funnel
for i,(nid,_,s,_) in enumerate(data):
    parts.append(arr_down(f"ef{i}", nid, "funnel", s, sw=2))

# ══════════════════════════════════════════════════════════════════════════════
# ROW 2 — AI ENGINE  y=222
# ══════════════════════════════════════════════════════════════════════════════
R2Y = 222
R2H = 200

parts.append(lbl("l2", 8, R2Y+80, 160, 40, "② AI\nENGINE", fc="#ce93d8", fs=13, bold=True))

# Hero block
parts.append(box("hero_glow", 168, R2Y-6, 1620, R2H+12,
    "#1a0a2e","#ce93d8","",sw=3,arc=10,bold=False))
parts.append(box("hero", 174, R2Y, 1608, R2H,
    "#2d0a5e","#ce93d8",
    "🧠  TERRA-MIND  AI  ENGINE",
    fc="#e1bee7", fs=26, sw=3, arc=10))

# Sub-text inside hero
parts.append(lbl("hs1", 180, R2Y+46, 1596, 24,
    "LangChain + CrewAI  ·  Autonomous Tool Calling  ·  Multi-Agent Reasoning  ·  YOLOv11 Disease Detection",
    fc="#ce93d8", fs=13, bold=False, align="center"))
parts.append(lbl("hs2", 180, R2Y+74, 1596, 24,
    "NDVI · NDRE · NDWI · SWIR  ·  RAG Engine (ICAR)  ·  XGBoost Yield ML  ·  SAR Soil Moisture",
    fc="#b39ddb", fs=12, bold=False, align="center"))
parts.append(lbl("hs3", 180, R2Y+102, 1596, 24,
    "Whisper STT  ·  gTTS Voice Out  ·  Hindi / Tamil / Marathi  ·  Offline: Llama-3-8B + Ollama",
    fc="#9575cd", fs=12, bold=False, align="center"))
parts.append(lbl("hs4", 180, R2Y+130, 1596, 24,
    "Sentinel-1 SAR Change Detection  ·  5-Year Temporal Analysis  ·  Farm Health Score 0–100",
    fc="#9575cd", fs=12, bold=False, align="center"))
parts.append(lbl("hs5", 180, R2Y+158, 1596, 24,
    "PAST (5yr history)  →  PRESENT (live satellite)  →  FUTURE (ML forecast)",
    fc="#7986cb", fs=12, bold=True, align="center"))

# Time axis block
parts.append(box("time_blk", 1810, R2Y, 740, R2H,
    "#0d2137","#42a5f5",
    "⏱  TIME INTELLIGENCE",
    fc="#90caf9", fs=16, sw=2, arc=10))
parts.append(lbl("ti1", 1820, R2Y+46, 720, 22,
    "Past  →  Present  →  Future", fc="#64b5f6", fs=13, bold=True, align="center"))
parts.append(lbl("ti2", 1820, R2Y+72, 720, 44,
    "5yr SAR trends  ·  Live NDVI\nSeasonal patterns  ·  Yield forecast",
    fc="#4fc3f7", fs=12, align="center"))
parts.append(lbl("ti3", 1820, R2Y+122, 720, 44,
    "Temporal Analyzer\nSAR Change Detection",
    fc="#4fc3f7", fs=12, align="center"))

# Offline block
parts.append(box("ofl", 2570, R2Y, 560, 90,
    "#1c2a35","#4db6ac",
    "OFFLINE / EDGE MODE\nLlama-3-8B · YOLOv11 Local",
    fc="#80cbc4", fs=12, sw=2, arc=10))
parts.append(box("ofl2", 2570, R2Y+100, 560, 90,
    "#0a1929","#4db6ac",
    "Pre-cached Satellite Tiles\nWorks at 2G / No Internet",
    fc="#80cbc4", fs=11, sw=1, arc=10))

# Risk block
parts.append(box("risk", 3150, R2Y, 670, 90,
    "#1a0a00","#ff6f00",
    "RISK ENGINE",
    fc="#ffcc02", fs=16, sw=2, arc=10))
parts.append(lbl("risk2", 3155, R2Y+95, 660, 100,
    "Drought  ·  Flood  ·  Pest\nFrost  ·  Health Score 0–100",
    fc="#ffb300", fs=12, align="center"))

# Arrow: funnel → hero
parts.append(arr_down("e_f_hero", "funnel", "hero", "#ce93d8", sw=5,
    label="Agent Dispatches Tasks"))

# ══════════════════════════════════════════════════════════════════════════════
# ROW 3 — HARVEST ORACLE  y=448
# ══════════════════════════════════════════════════════════════════════════════
R3Y = 448
R3H = 150

parts.append(lbl("l3", 8, R3Y+50, 160, 50, "③ HARVEST\nORACLE ★", fc="#00e676", fs=13, bold=True))

parts.append(box("ho_bg", 168, R3Y-8, 3654, R3H+16,
    "#001a0a","#00e676","",sw=3,arc=8,bold=False))
parts.append(lbl("ho_lbl", 180, R3Y-4, 600, 22,
    "★  AWE FEATURE  —  HARVEST ORACLE  (No competitor has this)",
    fc="#00e676", fs=14, bold=True, align="left"))

ho = [
    ("ho1","#003300","#00c853","#69f0ae",
     "NDVI Trajectory Scan\nYour farm growth curve\nvs district baseline"),
    ("ho2","#001a00","#00e676","#b9f6ca",
     "District Supply Intel\nScan ALL farms in 50km\nPredict mandi glut date"),
    ("ho3","#004d20","#69f0ae","#ccff90",
     "Agmarknet Price Forecast\n3-year mandi history\nPrice cycle model"),
    ("ho4","#1b5e20","#76ff03","#f4ff81",
     "Optimal Sell Window\nExact week to sell\nProfit: +₹7,400"),
]
HOW = 860
HOX0 = 176
HOXG = 908
HOH = R3H
for i,(nid,f,s,fc_,t) in enumerate(ho):
    parts.append(box(nid, HOX0+i*HOXG, R3Y, HOW, HOH, f, s, t, fc=fc_, fs=12))

# Arrows between HO blocks
for i in range(3):
    parts.append(arr_right(f"eho{i}", f"ho{i+1}", f"ho{i+2}", "#00e676", sw=3))

# Arrow: hero → harvest oracle
parts.append(arr_down("e_hero_ho", "hero", "ho_bg", "#00e676", sw=5,
    label="Analyse + Predict"))

# ══════════════════════════════════════════════════════════════════════════════
# ROW 4 — DECISION OUTPUT  y=630
# ══════════════════════════════════════════════════════════════════════════════
R4Y = 630
R4H = 148

parts.append(lbl("l4", 8, R4Y+50, 160, 50, "④ DECISION\nOUTPUT", fc="#a5d6a7", fs=13, bold=True))

parts.append(box("dec_bg", 168, R4Y-8, 3654, R4H+16,
    "#0a1510","#4caf50","",sw=2,arc=8,bold=False))
parts.append(lbl("dec_lbl", 180, R4Y-4, 500, 22,
    "ACTIONABLE DECISIONS — Delivered to Farmer Instantly",
    fc="#a5d6a7", fs=13, bold=True, align="left"))

dec = [
    ("dc1","#0d3b20","#4caf50","#a5d6a7",
     "DISEASE ALERT\nLeaf blight — Zone C\nApply treatment in 48h"),
    ("dc2","#0a2540","#0288d1","#81d4fa",
     "IRRIGATION\nSkip tomorrow\nSAR moisture 68%\nRain at 3pm"),
    ("dc3","#2e1a00","#ff9800","#ffcc80",
     "CROP ADVISORY\nPlant chickpeas\nSoil pH 6.2 · Low N"),
    ("dc4","#1a0030","#ce93d8","#e1bee7",
     "YIELD FORECAST\n3.2 T/acre · +18%\nXGBoost: 84% conf."),
    ("dc5","#003020","#00e676","#b9f6ca",
     "HARVEST TIMING ★\nDelay 9 days\nPrice +22% · +₹7,400"),
    ("dc6","#1a0a00","#ff6f00","#ffcc02",
     "RISK ALERT\nDrought: HIGH\nActivate drip · Save 40%"),
]
DCW = 590
DCX0 = 176
DCXG = 610
DCH = R4H
for i,(nid,f,s,fc_,t) in enumerate(dec):
    parts.append(box(nid, DCX0+i*DCXG, R4Y, DCW, DCH, f, s, t, fc=fc_, fs=11))

# Arrow: harvest oracle → decisions
parts.append(arr_down("e_ho_dec", "ho_bg", "dec_bg", "#4caf50", sw=5,
    label="Generate Decisions"))

# ══════════════════════════════════════════════════════════════════════════════
# ROW 5 — ECONOMIC IMPACT  y=806
# ══════════════════════════════════════════════════════════════════════════════
R5Y = 806
R5H = 100

parts.append(lbl("l5", 8, R5Y+30, 160, 40, "⑤ ECONOMIC\nIMPACT", fc="#ffd600", fs=13, bold=True))

parts.append(box("eco_bg", 168, R5Y-8, 3654, R5H+16,
    "#0a0f00","#ffd600","",sw=2,arc=8,bold=False))
parts.append(lbl("eco_lbl", 180, R5Y-4, 600, 22,
    "ECONOMIC IMPACT  ·  PER FARMER  ·  PER SEASON",
    fc="#ffd600", fs=13, bold=True, align="left"))

eco = [
    ("ec1","#1a1200","#ffd600","#fff176","₹ 12,000+\nsaved on water\nper season"),
    ("ec2","#1a0800","#ff9800","#ffcc80","₹ 8,500+\nfertilizer savings\nprecision dosing"),
    ("ec3","#0a1a0a","#69f0ae","#b9f6ca","₹ 7,400+\nextra profit\nharvest timing"),
    ("ec4","#0a0a1a","#42a5f5","#90caf9","30% fewer\ncrop losses\nearly detection"),
    ("ec5","#1a0a00","#ff6f00","#ffcc02","₹ 28,000+\ntotal impact\nper farmer/yr"),
    ("ec6","#001a0a","#00e676","#b9f6ca","10x ROI\nvs traditional\nfarming advice"),
]
ECW = 590
ECX0 = 176
ECXG = 610
ECH = R5H
for i,(nid,f,s,fc_,t) in enumerate(eco):
    parts.append(box(nid, ECX0+i*ECXG, R5Y, ECW, ECH, f, s, t, fc=fc_, fs=12))

# Arrow: decisions → economic
parts.append(arr_down("e_dec_eco", "dec_bg", "eco_bg", "#ffd600", sw=5,
    label="Measurable Impact"))

# ══════════════════════════════════════════════════════════════════════════════
# ROW 6 — DELIVERY CHANNELS  y=930
# ══════════════════════════════════════════════════════════════════════════════
R6Y = 930
R6H = 56

parts.append(lbl("l6", 8, R6Y+10, 160, 40, "⑥ DELIVERY", fc="#90e0ef", fs=13, bold=True))

parts.append(box("del_bg", 168, R6Y-8, 3654, R6H+16,
    "#060d1a","#0d3b66","",sw=2,arc=8,bold=False))
parts.append(lbl("del_lbl", 180, R6Y-4, 500, 20,
    "HOW THE FARMER RECEIVES DECISIONS",
    fc="#90e0ef", fs=13, bold=True, align="left"))

delivery = [
    ("dv1","#0288d1","Farm Health\nDashboard"),
    ("dv2","#ef5350","Disease Alert\nPush Notification"),
    ("dv3","#66bb6a","Crop Advisory\nMobile App"),
    ("dv4","#4dd0e1","Irrigation\nSMS + WhatsApp"),
    ("dv5","#ff7043","Fertilizer\nZone Map"),
    ("dv6","#ce93d8","Voice Response\nHinglish"),
    ("dv7","#26a69a","Harvest Timing\nAdvisory"),
    ("dv8","#ffd600","Yield Report\nPDF"),
    ("dv9","#4db6ac","Offline Report\nLocal Cache"),
]
DVW = 390
DVX0 = 176
DVXG = 406
DVH = R6H
for i,(nid,col,t) in enumerate(delivery):
    parts.append(box(nid, DVX0+i*DVXG, R6Y, DVW, DVH,
        "#0a1929", col, t, fc=col, fs=11, sw=2, arc=10))

# Arrow: eco → delivery
parts.append(arr_down("e_eco_del", "eco_bg", "del_bg", "#0288d1", sw=4,
    label="Farmer Receives"))

# ══════════════════════════════════════════════════════════════════════════════
# ROW 7 — 7 PROBLEMS FOOTER  y=1012
# ══════════════════════════════════════════════════════════════════════════════
R7Y = 1012
parts.append(box("footer", 0, R7Y, CW, 84, "#060d1a", "#263238",
    "", sw=1, arc=0, bold=False))
parts.append(lbl("fl", 10, R7Y+4, 300, 24,
    "7 PROBLEMS SOLVED:", fc="#90e0ef", fs=14, bold=True))

problems = [
    ("p1","#ef5350","① Disease\nDetection"),
    ("p2","#66bb6a","② Wrong\nCrop"),
    ("p3","#4dd0e1","③ Water\nWaste"),
    ("p4","#a1887f","④ Land\nDegradation"),
    ("p5","#ff7043","⑤ Fertilizer\nWaste"),
    ("p6","#5c6bc0","⑥ Yield\nUncertainty"),
    ("p7","#00e676","⑦ ★ Harvest\nTiming"),
]
PW = 516
PX0 = 10
PXG = 536
for i,(nid,col,t) in enumerate(problems):
    parts.append(box(nid, PX0+i*PXG, R7Y+8, PW, 68,
        "#0a1929", col, t, fc=col, fs=13, sw=2, arc=10))

# ══════════════════════════════════════════════════════════════════════════════
# CLOSE
# ══════════════════════════════════════════════════════════════════════════════
parts += [
    '      </root>\n',
    '    </mxGraphModel>\n',
    '  </diagram>\n',
    '</mxfile>\n',
]

xml = ''.join(parts)
out = 'c:/Users/kanis/OneDrive/Desktop/geospatiall/terra_mind_architecture.drawio'
with open(out, 'w', encoding='utf-8') as f:
    f.write(xml)

import xml.etree.ElementTree as ET
ET.parse(out)
print(f"Written {len(xml):,} bytes  |  {xml.count('mxCell id='):,} cells  |  XML valid")

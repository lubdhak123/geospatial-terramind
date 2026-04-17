"""
Terra-Mind Architecture Diagram — V2
Layout: Top-to-bottom, judge-optimized
Philosophy: DATA → INTELLIGENCE → DECISION → IMPACT
"""

parts = []

def rect(cid, x, y, w, h, fill, stroke, label, fc="#fff", fs=13, bold=True, sw=2, arc=15):
    fb = "1" if bold else "0"
    return (
        f'        <mxCell id="{cid}" parent="1" '
        f'style="rounded=1;fillColor={fill};strokeColor={stroke};strokeWidth={sw};'
        f'fontColor={fc};fontSize={fs};fontStyle={fb};arcSize={arc};shadow=1;'
        f'align=center;verticalAlign=middle;" '
        f'value="{label}" vertex="1">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />'
        f'</mxCell>\n'
    )

def text(cid, x, y, w, h, label, fc="#fff", fs=13, bold=False, align="center"):
    fb = "1" if bold else "0"
    return (
        f'        <mxCell id="{cid}" parent="1" '
        f'style="text;html=1;strokeColor=none;fillColor=none;'
        f'fontColor={fc};fontSize={fs};fontStyle={fb};align={align};" '
        f'value="{label}" vertex="1">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />'
        f'</mxCell>\n'
    )

def arrow(eid, src, tgt, color, dashed=False, sw=2, label="", ex=1, ey=0.5, nx=0, ny=0.5):
    dash = "dashed=1;" if dashed else ""
    lbl = label
    return (
        f'        <mxCell id="{eid}" parent="1" '
        f'style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;'
        f'strokeColor={color};strokeWidth={sw};{dash}'
        f'exitX={ex};exitY={ey};exitDx=0;exitDy=0;'
        f'entryX={nx};entryY={ny};entryDx=0;entryDy=0;'
        f'fontColor={color};fontSize=11;fontStyle=1;" '
        f'value="{lbl}" edge="1" source="{src}" target="{tgt}">'
        f'<mxGeometry relative="1" as="geometry" />'
        f'</mxCell>\n'
    )

def arrow_down(eid, src, tgt, color, sw=3, label=""):
    return (
        f'        <mxCell id="{eid}" parent="1" '
        f'style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;'
        f'strokeColor={color};strokeWidth={sw};'
        f'exitX=0.5;exitY=1;exitDx=0;exitDy=0;'
        f'entryX=0.5;entryY=0;entryDx=0;entryDy=0;'
        f'fontColor={color};fontSize=12;fontStyle=1;" '
        f'value="{label}" edge="1" source="{src}" target="{tgt}">'
        f'<mxGeometry relative="1" as="geometry" />'
        f'</mxCell>\n'
    )

# ── CANVAS ────────────────────────────────────────────────────────────────────
W = 3600
H = 1600

parts.append('<mxfile host="app.diagrams.net">\n')
parts.append('  <diagram name="Terra-Mind-V2" id="terra-mind-v2">\n')
parts.append(f'    <mxGraphModel dx="1600" dy="900" grid="0" gridSize="10" guides="1" '
             f'tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" '
             f'pageWidth="{W}" pageHeight="{H}" background="#0d0d1a" math="0" shadow="1">\n')
parts.append('      <root>\n')
parts.append('        <mxCell id="0" />\n')
parts.append('        <mxCell id="1" parent="0" />\n')

# ════════════════════════════════════════════════════════════════════════════
# HEADER
# ════════════════════════════════════════════════════════════════════════════
parts.append(rect("hdr", 0, 0, W, 80, "#0a2540", "#00b4d8",
                  "TERRA-MIND  —  AGENTIC AI AGRONOMIST",
                  fc="#FFFFFF", fs=30, sw=0, arc=0))
parts.append(text("hdr_sub", 0, 52, W, 28,
                  "Geospatial Intelligence  |  Autonomous Decision Engine  |  7 Problems Solved  |  Offline-First",
                  fc="#90e0ef", fs=14, align="center"))
# Accent line
parts.append(rect("hdr_line", 0, 78, W, 4, "#00b4d8", "#00b4d8", "", sw=0, arc=0))

# ════════════════════════════════════════════════════════════════════════════
# ROW LABELS (left side axis)
# ════════════════════════════════════════════════════════════════════════════
row_labels = [
    (120,  "#64b5f6", "① DATA IN"),
    (340,  "#ce93d8", "② INTELLIGENCE"),
    (620,  "#80cbc4", "③ HARVEST\n   ORACLE"),
    (870,  "#a5d6a7", "④ DECISION"),
    (1100, "#ffcc80", "⑤ IMPACT"),
]
for y, col, lbl in row_labels:
    parts.append(text(f"rl_{y}", 10, y, 90, 60, lbl, fc=col, fs=12, bold=True, align="center"))

# ════════════════════════════════════════════════════════════════════════════
# SECTION 1 — DATA IN (y=100)
# ════════════════════════════════════════════════════════════════════════════
# Section background
parts.append(rect("bg_data", 110, 100, 3380, 140, "#0a1929", "#1565c0",
                  "", sw=2, arc=5, bold=False))
parts.append(text("lbl_data", 120, 105, 400, 24,
                  "DATA SOURCES", fc="#64b5f6", fs=13, bold=True, align="left"))

data_nodes = [
    ("d1", "#0d47a1", "#42a5f5",  "Field GPS\nPolygon"),
    ("d2", "#006064", "#4dd0e1",  "Voice Input\nHindi / Tamil"),
    ("d3", "#004d40", "#26a69a",  "Crop Photo\nCamera / UAV"),
    ("d4", "#1a237e", "#5c6bc0",  "Sentinel-1+2\nSatellite SAR"),
    ("d5", "#3e2723", "#a1887f",  "SoilGrids\npH · N · P · K"),
    ("d6", "#bf360c", "#ff7043",  "Open-Meteo\n5-Day Forecast"),
    ("d7", "#00695c", "#26a69a",  "Agmarknet\nMandi Prices"),
]
DW, DH = 430, 90
DY = 118
DX_START = 130
DX_GAP = 460
for i, (nid, fill, stroke, lbl) in enumerate(data_nodes):
    parts.append(rect(nid, DX_START + i*DX_GAP, DY, DW, DH,
                      fill, stroke, lbl, fs=12))

# ════════════════════════════════════════════════════════════════════════════
# SECTION 2 — TERRA-MIND AI ENGINE HERO BLOCK (y=280)
# ════════════════════════════════════════════════════════════════════════════
# Outer glow ring
parts.append(rect("hero_glow", 105, 278, 2000, 244,
                  "#1a0a2e", "#ce93d8", "", sw=3, arc=8, bold=False))

# Hero block left — main engine
parts.append(rect("hero_main", 115, 288, 900, 224,
                  "#4a148c", "#ce93d8",
                  "🧠  TERRA-MIND  AI  ENGINE",
                  fc="#e1bee7", fs=22, sw=3, arc=12))

# Sub-labels inside hero
parts.append(text("h1", 125, 330, 880, 28,
                  "LangChain + CrewAI  |  Autonomous Tool Calling  |  Multi-Agent Reasoning",
                  fc="#ce93d8", fs=12, align="center"))
parts.append(text("h2", 125, 360, 880, 28,
                  "NDVI · NDRE · NDWI · SWIR  Spectral Analysis  |  YOLOv11 Disease Detection",
                  fc="#b39ddb", fs=12, align="center"))
parts.append(text("h3", 125, 390, 880, 28,
                  "RAG Engine (ICAR Manuals)  |  XGBoost Yield ML  |  SAR Soil Moisture",
                  fc="#b39ddb", fs=12, align="center"))
parts.append(text("h4", 125, 420, 880, 28,
                  "Whisper STT + gTTS  |  Offline: Llama-3-8B + Ollama  |  Works at 2G",
                  fc="#9575cd", fs=11, align="center"))
parts.append(text("h5", 125, 450, 880, 28,
                  "Hindi  ·  Tamil  ·  Marathi  ·  Voice In  ·  Voice Out",
                  fc="#9575cd", fs=11, align="center"))

# Hero block right — time intelligence
parts.append(rect("hero_time", 1030, 288, 1060, 224,
                  "#0d2137", "#42a5f5",
                  "⏱  TIME  INTELLIGENCE  AXIS",
                  fc="#90caf9", fs=17, sw=2, arc=12))
parts.append(text("ti1", 1040, 338, 1040, 28,
                  "PAST  (5yr SAR time-series)  →  PRESENT  (live satellite)  →  FUTURE  (forecast)",
                  fc="#64b5f6", fs=13, align="center"))
parts.append(text("ti2", 1040, 372, 1040, 50,
                  "Historical yield trends  ·  Soil degradation over time  ·  Seasonal NDVI patterns",
                  fc="#4fc3f7", fs=12, align="center"))
parts.append(text("ti3", 1040, 422, 1040, 50,
                  "Temporal Analyzer: SAR Change Detection  |  5-year benchmark baseline",
                  fc="#4fc3f7", fs=12, align="center"))

# Offline badge
parts.append(rect("offline", 2130, 288, 400, 80,
                  "#1c2a35", "#4db6ac",
                  "OFFLINE / EDGE&#xa;Llama-3-8B · YOLOv11",
                  fc="#80cbc4", fs=12, sw=2, arc=15))
parts.append(rect("offline2", 2130, 382, 400, 70,
                  "#0a1929", "#4db6ac",
                  "Pre-cached Tiles&#xa;Works: 2G / No Internet",
                  fc="#80cbc4", fs=11, sw=1, arc=15))

# Risk engine
parts.append(rect("risk", 2560, 288, 1020, 80,
                  "#1a0a00", "#ff6f00",
                  "RISK ASSESSMENT ENGINE",
                  fc="#ffcc02", fs=15, sw=2, arc=10))
parts.append(text("risk2", 2570, 372, 1000, 80,
                  "Drought Risk  ·  Flood Probability  ·  Pest Outbreak  ·  Frost Warning  ·  Farm Health Score 0–100",
                  fc="#ffb300", fs=12, align="center"))

# ════════════════════════════════════════════════════════════════════════════
# SECTION 3 — HARVEST ORACLE ★ AWE FEATURE (y=560)
# ════════════════════════════════════════════════════════════════════════════
# Big highlighted background
parts.append(rect("ho_bg", 110, 555, 3380, 230,
                  "#001a0a", "#00e676", "", sw=3, arc=8, bold=False))
parts.append(text("ho_badge", 120, 560, 400, 30,
                  "★  AWE FEATURE  —  HARVEST ORACLE", fc="#00e676", fs=15, bold=True, align="left"))

# Four sub-blocks
HO_Y = 600
HO_H = 170
ho_blocks = [
    ("ho1", "#003300", "#00c853", "NDVI Trajectory\nScan&#xa;&#xa;Your farm growth curve\nvs seasonal baseline",          "#69f0ae"),
    ("ho2", "#001a00", "#00e676", "District Supply\nIntelligence&#xa;&#xa;Scan ALL farms in 50km\nPredict mandi glut date", "#b9f6ca"),
    ("ho3", "#004d20", "#69f0ae", "Agmarknet Price\nForecast&#xa;&#xa;3-year mandi history\nPrice cycle prediction",       "#ccff90"),
    ("ho4", "#1b5e20", "#76ff03", "Optimal Sell\nWindow&#xa;&#xa;Exact week to sell\nfor maximum price (₹)",               "#f4ff81"),
]
HO_W = 800
HO_GAP = 855
for i, (nid, fill, stroke, lbl, fc) in enumerate(ho_blocks):
    parts.append(rect(nid, 120 + i*HO_GAP, HO_Y, HO_W, HO_H,
                      fill, stroke, lbl, fc=fc, fs=12, sw=2, arc=12))

# Arrows between harvest oracle blocks
for i in range(3):
    src = f"ho{i+1}"
    tgt = f"ho{i+2}"
    parts.append(arrow(f"e_ho{i+1}_{i+2}", src, tgt, "#00e676", sw=3,
                       label="→", ex=1, ey=0.5, nx=0, ny=0.5))

# ════════════════════════════════════════════════════════════════════════════
# SECTION 4 — DECISION OUTPUT (y=830)
# ════════════════════════════════════════════════════════════════════════════
parts.append(rect("bg_dec", 110, 820, 3380, 190,
                  "#0a1510", "#4caf50", "", sw=2, arc=5, bold=False))
parts.append(text("lbl_dec", 120, 826, 500, 28,
                  "DECISION OUTPUT", fc="#a5d6a7", fs=14, bold=True, align="left"))

dec_nodes = [
    ("dec1", "#0d3b20", "#4caf50",  "DISEASE ALERT&#xa;&#xa;Leaf blight detected&#xa;Zone C — apply treatment&#xa;within 48 hours",          "#a5d6a7"),
    ("dec2", "#0a2540", "#0288d1",  "IRRIGATION&#xa;&#xa;Skip irrigation tomorrow&#xa;SAR moisture = 68%&#xa;Rain expected at 3pm",           "#81d4fa"),
    ("dec3", "#2e1a00", "#ff9800",  "CROP ADVISORY&#xa;&#xa;Plant chickpeas&#xa;instead of wheat&#xa;Soil pH 6.2 · Low N",                    "#ffcc80"),
    ("dec4", "#1a0030", "#ce93d8",  "YIELD FORECAST&#xa;&#xa;Expected: 3.2 T/acre&#xa;+18% vs last season&#xa;XGBoost confidence: 84%",       "#e1bee7"),
    ("dec5", "#003020", "#00e676",  "HARVEST TIMING&#xa;&#xa;Delay by 9 days&#xa;Mandi price rises +22%&#xa;Expected profit: +₹7,400",        "#b9f6ca"),
    ("dec6", "#1a0a00", "#ff6f00",  "RISK ALERT&#xa;&#xa;Drought risk: HIGH&#xa;Activate drip irrigation&#xa;Reserve 40% water",              "#ffcc02"),
]
DEC_W = 520
DEC_H = 160
DEC_Y = 845
DEC_GAP = 560
for i, (nid, fill, stroke, lbl, fc) in enumerate(dec_nodes):
    parts.append(rect(nid, 120 + i*DEC_GAP, DEC_Y, DEC_W, DEC_H,
                      fill, stroke, lbl, fc=fc, fs=11, sw=2, arc=12))

# ════════════════════════════════════════════════════════════════════════════
# SECTION 5 — ECONOMIC IMPACT (y=1060)
# ════════════════════════════════════════════════════════════════════════════
parts.append(rect("bg_eco", 110, 1035, 3380, 130,
                  "#0a0f00", "#ffd600", "", sw=2, arc=5, bold=False))
parts.append(text("lbl_eco", 120, 1040, 500, 28,
                  "ECONOMIC IMPACT  ·  PER FARMER  ·  PER SEASON",
                  fc="#ffd600", fs=14, bold=True, align="left"))

eco_stats = [
    ("eco1", "#1a1200", "#ffd600",  "₹ 12,000+&#xa;saved on water&#xa;per season",         "#fff176"),
    ("eco2", "#1a0800", "#ff9800",  "₹ 8,500+&#xa;saved on fertilizer&#xa;precision dosing","#ffcc80"),
    ("eco3", "#0a1a0a", "#69f0ae",  "₹ 7,400+&#xa;extra profit&#xa;harvest timing",         "#b9f6ca"),
    ("eco4", "#0a0a1a", "#42a5f5",  "30%&#xa;fewer crop losses&#xa;early disease catch",     "#90caf9"),
    ("eco5", "#1a0a00", "#ff6f00",  "₹ 28,000+&#xa;total impact&#xa;per farmer/year",       "#ffcc02"),
    ("eco6", "#001a0a", "#00e676",  "10x ROI&#xa;vs traditional&#xa;farming advice",         "#b9f6ca"),
]
ECO_W = 520
ECO_H = 100
ECO_Y = 1060
ECO_GAP = 560
for i, (nid, fill, stroke, lbl, fc) in enumerate(eco_stats):
    parts.append(rect(nid, 120 + i*ECO_GAP, ECO_Y, ECO_W, ECO_H,
                      fill, stroke, lbl, fc=fc, fs=12, sw=2, arc=12))

# ════════════════════════════════════════════════════════════════════════════
# FLOW ARROWS (vertical, between sections)
# ════════════════════════════════════════════════════════════════════════════

# Data → Hero Engine (7 arrows converging into hero_main)
# Use a funnel: all data nodes point down to a collector point, then one big arrow to hero
parts.append(rect("funnel", 110, 225, 3380, 50,
                  "#0d1b2e", "#1565c0", "ALL DATA INGESTED — AGENT PULLS AUTOMATICALLY",
                  fc="#64b5f6", fs=13, sw=1, arc=5, bold=True))

for i, (nid, _, _, _) in enumerate(data_nodes):
    parts.append(arrow_down(f"e_d{i+1}_f", nid, "funnel", "#1565c0", sw=2))

parts.append(arrow_down("e_funnel_hero", "funnel", "hero_main", "#ce93d8", sw=4,
                         label=""))

# Hero → Harvest Oracle
parts.append(arrow_down("e_hero_ho", "hero_main", "ho_bg",
                         "#00e676", sw=4, label=""))
# Time intelligence also feeds harvest oracle
parts.append(arrow_down("e_time_ho", "hero_time", "ho_bg",
                         "#42a5f5", sw=2, label=""))
# Risk feeds decisions
parts.append(arrow_down("e_risk_dec", "risk", "bg_dec",
                         "#ff6f00", sw=2, label=""))

# Harvest Oracle → Decisions
parts.append(arrow_down("e_ho_dec", "ho_bg", "bg_dec",
                         "#00e676", sw=4, label=""))

# Decisions → Economic Impact
parts.append(arrow_down("e_dec_eco", "bg_dec", "bg_eco",
                         "#ffd600", sw=4, label=""))

# ════════════════════════════════════════════════════════════════════════════
# SECTION 6 — DELIVERY CHANNELS (full width row, y=1195)
# ════════════════════════════════════════════════════════════════════════════
DEL_Y = 1200
delivery = [
    ("del0", "#0288d1",  "Farm Health Dashboard"),
    ("del1", "#ef5350",  "Disease Alert"),
    ("del2", "#66bb6a",  "Crop Advisory"),
    ("del3", "#4dd0e1",  "Irrigation SMS"),
    ("del4", "#ff7043",  "Fertilizer Map"),
    ("del5", "#ce93d8",  "Voice Response"),
    ("del6", "#26a69a",  "Harvest Advisory"),
    ("del7", "#ffd600",  "Yield Report PDF"),
    ("del8", "#4db6ac",  "Offline Cache"),
]
DEL_W2 = 360
DEL_H2 = 70
DEL_GAP2 = 390
parts.append(rect("del_bg", 110, 1185, 3380, 100,
                  "#060d1a", "#0d3b66", "", sw=2, arc=5, bold=False))
parts.append(text("del_title", 120, 1188, 500, 24,
                  "DELIVERY CHANNELS", fc="#90e0ef", fs=13, bold=True, align="left"))
for i, (nid, col, lbl) in enumerate(delivery):
    parts.append(rect(nid, 120 + i*DEL_GAP2, DEL_Y, DEL_W2, DEL_H2,
                      "#0a1929", col, lbl, fc=col, fs=12, sw=2, arc=10))

# ════════════════════════════════════════════════════════════════════════════
# BOTTOM — 7 PROBLEMS FOOTER
# ════════════════════════════════════════════════════════════════════════════
parts.append(rect("footer_bg", 0, 1310, W, 110,
                  "#060d1a", "#263238", "", sw=1, arc=0, bold=False))
parts.append(text("footer_title", 20, 1315, 400, 28,
                  "7 PROBLEMS SOLVED:", fc="#90e0ef", fs=14, bold=True, align="left"))

problems = [
    ("#ef5350", "① Disease"),
    ("#66bb6a", "② Wrong Crop"),
    ("#4dd0e1", "③ Water Waste"),
    ("#a1887f", "④ Land Degradation"),
    ("#ff7043", "⑤ Fertilizer Waste"),
    ("#5c6bc0", "⑥ Yield Uncertainty"),
    ("#00e676", "⑦ ★ Harvest Timing"),
]
for i, (col, lbl) in enumerate(problems):
    parts.append(rect(f"prob{i}", 20 + i*510, 1345, 490, 60,
                      "#0a1929", col, lbl, fc=col, fs=13, sw=2, arc=10))

parts.append('      </root>\n')
parts.append('    </mxGraphModel>\n')
parts.append('  </diagram>\n')
parts.append('</mxfile>\n')

xml = ''.join(parts)
with open('c:/Users/kanis/OneDrive/Desktop/geospatiall/terra_mind_architecture.drawio', 'w', encoding='utf-8') as f:
    f.write(xml)

print(f"Written: {len(xml):,} bytes")
print(f"Total mxCell tags: {xml.count('mxCell id=')}")

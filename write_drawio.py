def node(nid, x, y, w, h, fill, stroke, txt, fc="#fff"):
    return (
        f'        <mxCell id="{nid}" parent="1" '
        f'style="rounded=1;fillColor={fill};strokeColor={stroke};strokeWidth=2;'
        f'fontColor={fc};fontSize=13;fontStyle=1;arcSize=15;shadow=1;'
        f'align=center;verticalAlign=middle;" '
        f'value="{txt}" vertex="1">'
        f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry" />'
        f'</mxCell>\n'
    )

def edge(eid, src, tgt, color, dashed=False, ex=1, ey=0.5, nx=0, ny=0.5, sw=2):
    dash = "dashed=1;" if dashed else ""
    return (
        f'        <mxCell id="{eid}" parent="1" '
        f'style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;'
        f'strokeColor={color};strokeWidth={sw};{dash}'
        f'exitX={ex};exitY={ey};exitDx=0;exitDy=0;'
        f'entryX={nx};entryY={ny};entryDx=0;entryDy=0;" '
        f'value="" edge="1" source="{src}" target="{tgt}">'
        f'<mxGeometry relative="1" as="geometry" />'
        f'</mxCell>\n'
    )

def edge_via(eid, src, tgt, color, points, dashed=False, sw=2):
    """Edge with explicit waypoints to avoid overlapping."""
    dash = "dashed=1;" if dashed else ""
    pts = "".join(f'<mxPoint x="{x}" y="{y}" as="point"/>' for x, y in points)
    return (
        f'        <mxCell id="{eid}" parent="1" '
        f'style="edgeStyle=orthogonalEdgeStyle;curved=1;rounded=1;'
        f'strokeColor={color};strokeWidth={sw};{dash}" '
        f'value="" edge="1" source="{src}" target="{tgt}">'
        f'<mxGeometry relative="1" as="geometry">'
        f'<Array as="points">{pts}</Array>'
        f'</mxGeometry>'
        f'</mxCell>\n'
    )

# Layout constants
Y0  = 185   # first node top
NH  = 66    # node height
GAP = 90    # vertical pitch between nodes
# Column heights: 7 incoming rows = 7*90+66 = 696, round up to 720
# Processing has 6 rows = 6*90+66 = 606, round to 640
# Column backgrounds start at y=155
BG_TOP = 155
ING_H  = 760   # 7 rows
CORE_H = 760
PROC_H = 680   # 6 rows
SCORE_H= 460   # 4 rows
DEL_H  = 560   # 5 rows (max delivery col)

parts = []
parts.append('<mxfile host="app.diagrams.net">\n')
parts.append('  <diagram name="Terra-Mind" id="terra-mind-v4">\n')
parts.append('    <mxGraphModel dx="2400" dy="1200" grid="0" gridSize="10" guides="1" '
             'tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" '
             'pageWidth="4800" pageHeight="2000" background="#0d0d1a" math="0" shadow="1">\n')
parts.append('      <root>\n')
parts.append('        <mxCell id="0" />\n')
parts.append('        <mxCell id="1" parent="0" />\n')

# ── HEADER ──────────────────────────────────────────────────────────────────
parts.append('        <mxCell id="hdr_bg" parent="1" style="rounded=0;fillColor=#0d3b66;strokeColor=none;" value="" vertex="1"><mxGeometry x="0" y="0" width="4800" height="90" as="geometry" /></mxCell>\n')
parts.append('        <mxCell id="hdr_line" parent="1" style="rounded=0;fillColor=#00b4d8;strokeColor=none;" value="" vertex="1"><mxGeometry x="0" y="87" width="4800" height="5" as="geometry" /></mxCell>\n')
parts.append('        <mxCell id="hdr_title" parent="1" style="text;html=1;align=center;fontColor=#FFFFFF;fontSize=34;fontStyle=1;strokeColor=none;fillColor=none;" value="TERRA-MIND — SPATIAL AI AGRONOMIST" vertex="1"><mxGeometry x="1000" y="8" width="2800" height="50" as="geometry" /></mxCell>\n')
parts.append('        <mxCell id="hdr_sub" parent="1" style="text;html=1;align=center;fontColor=#90e0ef;fontSize=16;strokeColor=none;fillColor=none;" value="Agentic Precision Agriculture Intelligence System — Architecture Overview" vertex="1"><mxGeometry x="1000" y="56" width="2800" height="28" as="geometry" /></mxCell>\n')

# ── COLUMN HEADERS ───────────────────────────────────────────────────────────
def col_hdr(cid, x, w, fill, fc, label):
    return (f'        <mxCell id="{cid}" parent="1" '
            f'style="rounded=1;fillColor={fill};strokeColor=none;fontColor={fc};'
            f'fontSize=15;fontStyle=1;arcSize=10;" '
            f'value="{label}" vertex="1">'
            f'<mxGeometry x="{x}" y="105" width="{w}" height="40" as="geometry" />'
            f'</mxCell>\n')

parts.append(col_hdr("sh_ing",   60,   360,  "#1565c0", "#fff",    "INCOMING"))
parts.append(col_hdr("sh_core",  480,  240,  "#4a148c", "#e1bee7", "AGENT CORE"))
parts.append(col_hdr("sh_proc",  780,  1860, "#1b5e20", "#fff",    "PROCESSING PIPELINE"))
parts.append(col_hdr("sh_score", 2700, 300,  "#37474f", "#fff",    "SCORING"))
parts.append(col_hdr("sh_del",   3060, 1680, "#0d3b66", "#fff",    "DELIVERY"))

# ── COLUMN BACKGROUNDS ───────────────────────────────────────────────────────
def col_bg(cid, x, w, h, fill, stroke):
    return (f'        <mxCell id="{cid}" parent="1" '
            f'style="rounded=1;fillColor={fill};strokeColor={stroke};strokeWidth=2;arcSize=3;" '
            f'value="" vertex="1">'
            f'<mxGeometry x="{x}" y="{BG_TOP}" width="{w}" height="{h}" as="geometry" />'
            f'</mxCell>\n')

parts.append(col_bg("bg_ing",   60,   360,  ING_H,  "#0a1929", "#1565c0"))
parts.append(col_bg("bg_core",  480,  240,  CORE_H, "#12002a", "#7B1FA2"))
parts.append(col_bg("bg_proc",  780,  1860, PROC_H, "#0a1f0a", "#1b5e20"))
parts.append(col_bg("bg_score", 2700, 300,  SCORE_H,"#0a0f14", "#37474f"))
parts.append(col_bg("bg_del",   3060, 1680, DEL_H,  "#060d1a", "#0d3b66"))

# ── INCOMING NODES ───────────────────────────────────────────────────────────
ING = [
    ("IN1", "#0d47a1", "#42a5f5", "Field Polygon\nGPS + Map Draw"),
    ("IN2", "#006064", "#4dd0e1", "Voice Query\nHindi + Tamil + Marathi"),
    ("IN3", "#004d40", "#26a69a", "Camera Image\nLeaf + Field Photo"),
    ("IN4", "#1a237e", "#5c6bc0", "Satellite Pull\nSentinel-1 + Sentinel-2"),
    ("IN5", "#3e2723", "#a1887f", "Soil Request\nSoilGrids API"),
    ("IN6", "#e65100", "#ff9800", "Weather Fetch\nOpen-Meteo 5-Day"),
    ("IN7", "#00695c", "#26a69a", "Mandi Query\nAgmarknet API"),
]
for i, (nid, fill, stroke, lbl) in enumerate(ING):
    txt = lbl.replace("\n", "&#xa;")
    parts.append(node(nid, 80, Y0 + i*GAP, 320, NH, fill, stroke, txt))

# ── AGENT CORE (diamond) ─────────────────────────────────────────────────────
parts.append(
    '        <mxCell id="AC" parent="1" '
    'style="rhombus;fillColor=#4a148c;strokeColor=#ce93d8;strokeWidth=3;'
    'fontColor=#e1bee7;fontSize=15;fontStyle=1;shadow=1;'
    'align=center;verticalAlign=middle;" '
    'value="Spatial-AI&#xa;Agent Core&#xa;LangChain&#xa;+ CrewAI" vertex="1">'
    '<mxGeometry x="488" y="310" width="224" height="310" as="geometry" />'
    '</mxCell>\n'
)

# ── PROCESSING NODES ─────────────────────────────────────────────────────────
# 3 sub-columns at x=800, 1200, 1600; each 360px wide
PROC = [
    # (id, fill, stroke, label, font_color)
    # col 0  x=800
    [("P1",  "#1b5e20", "#66bb6a", "Satellite Pipeline\nNDVI - NDRE - NDWI - SWIR", "#fff"),
     ("P2",  "#b71c1c", "#ef5350", "Disease Detection\nYOLOv11 + VLM Vision",        "#fff"),
     ("P3",  "#bf360c", "#ff7043", "RAG Engine\nICAR + Govt Manuals",                "#fff"),
     ("P4",  "#4e342e", "#a1887f", "Soil Analysis\npH - N - P - K - Texture",        "#fff"),
     ("P5",  "#006064", "#4dd0e1", "Climate Forecaster\nHyperlocal 5-Day",           "#fff"),
     ("P6",  "#37474f", "#90a4ae", "Voice Processor\nWhisper STT + gTTS",            "#fff"),
    ],
    # col 1  x=1200
    [("P7",  "#1b5e20", "#66bb6a", "Crop Advisor\nOptimal Crop Selection",           "#fff"),
     ("P8",  "#004d40", "#26a69a", "Irrigation Scheduler\nSAR Moisture + Rain",      "#fff"),
     ("P9",  "#bf360c", "#ff7043", "Fertilizer Mapper\nNDRE Zone-by-Zone",           "#fff"),
     ("P10", "#1a237e", "#5c6bc0", "Yield Predictor\nXGBoost ML 80pct Acc",          "#fff"),
     ("P11", "#004d40", "#26a69a", "Harvest Oracle\nMandi Supply + Timing",          "#fff"),
     ("P12", "#37474f", "#90a4ae", "Temporal Analyzer\nSAR Time-Series 5yr",         "#fff"),
    ],
    # col 2  x=1600
    [("P13", "#4a148c", "#ce93d8", "Farm Health Engine\nComposite 0-100 Index",      "#e1bee7"),
     ("P14", "#b71c1c", "#ef5350", "Risk Assessment\nDrought - Flood - Pest",         "#fff"),
     ("P15", "#006064", "#4dd0e1", "AI Cross-Validator\nMulti-source Verify",         "#fff"),
     ("P16", "#00695c", "#26a69a", "Economic Impact\nSavings / Decision INR",         "#fff"),
    ],
]
Px = [800, 1220, 1640]
for ci, col in enumerate(PROC):
    for ri, (nid, fill, stroke, lbl, fc) in enumerate(col):
        txt = lbl.replace("\n", "&#xa;")
        parts.append(node(nid, Px[ci], Y0 + ri*GAP, 380, NH, fill, stroke, txt, fc))

# ── SCORING NODES ────────────────────────────────────────────────────────────
SCORE = [
    ("S1", "#1b5e20", "#66bb6a", "Farm Health Score\n0-100 Composite",        "#fff"),
    ("S2", "#b71c1c", "#ef5350", "Risk Assessment\nDrought + Flood + Pest",    "#fff"),
    ("S3", "#4a148c", "#ce93d8", "AI Validation\nCross-Verify All Data",       "#e1bee7"),
    ("S4", "#00695c", "#26a69a", "Economic Impact\nSavings / Decision INR",    "#fff"),
]
for i, (nid, fill, stroke, lbl, fc) in enumerate(SCORE):
    txt = lbl.replace("\n", "&#xa;")
    parts.append(node(nid, 2715, Y0 + i*GAP, 270, NH, fill, stroke, txt, fc))

# ── DELIVERY NODES ───────────────────────────────────────────────────────────
DEL = [
    # col 0  x=3080
    [("O1",  "#0d2137", "#0288d1", "Farm Health Report\nDashboard",               "#fff"),
     ("O2",  "#7f0000", "#ef9a9a", "Disease Alert\nPush Notification",             "#fff"),
     ("O3",  "#1b5e20", "#66bb6a", "Crop Recommendation\nMobile App",              "#fff"),
     ("O4",  "#006064", "#4dd0e1", "Irrigation Schedule\nSMS + WhatsApp",          "#fff"),
     ("O5",  "#bf360c", "#ff7043", "Fertilizer Map\nMap Overlay",                  "#fff"),
    ],
    # col 1  x=3460
    [("O6",  "#1a237e", "#5c6bc0", "Yield Prediction\nReport PDF",                "#fff"),
     ("O7",  "#004d40", "#26a69a", "Harvest Timing\nMarket Advisory",              "#fff"),
     ("O8",  "#006064", "#4dd0e1", "Voice Response\nHinglish Output",              "#fff"),
     ("O9",  "#37474f", "#90a4ae", "Temporal Report\nAnalytics Portal",            "#fff"),
     ("O10", "#1c2a35", "#4db6ac", "Offline Report\nLocal Cache",                  "#80cbc4"),
    ],
    # col 2  x=3840
    [("O11", "#4a148c", "#ce93d8", "Multilingual Alerts\nHindi - Tamil - Marathi", "#e1bee7"),
     ("O12", "#0d3b66", "#42a5f5", "Satellite Map View\nNDVI Overlay",             "#fff"),
     ("O13", "#1b5e20", "#66bb6a", "Economic Summary\nSavings Report INR",         "#fff"),
    ],
]
Dx = [3085, 3465, 3845]
for ci, col in enumerate(DEL):
    for ri, (nid, fill, stroke, lbl, fc) in enumerate(col):
        txt = lbl.replace("\n", "&#xa;")
        parts.append(node(nid, Dx[ci], Y0 + ri*GAP, 340, NH, fill, stroke, txt, fc))

# ── OFFLINE BAR ──────────────────────────────────────────────────────────────
parts.append(
    '        <mxCell id="OFL" parent="1" '
    'style="rounded=1;fillColor=#1c2a35;strokeColor=#4db6ac;strokeWidth=3;'
    'fontColor=#80cbc4;fontSize=14;fontStyle=1;arcSize=10;shadow=1;'
    'align=center;verticalAlign=middle;" '
    'value="OFFLINE / EDGE MODE   |   Llama-3-8B via Ollama   |   YOLOv11 Local   |   Pre-cached Satellite Tiles   |   Works at 2G or No Internet" vertex="1">'
    '<mxGeometry x="480" y="1030" width="2560" height="64" as="geometry" />'
    '</mxCell>\n'
)

# ── LEGEND ───────────────────────────────────────────────────────────────────
parts.append(
    '        <mxCell id="leg_bg" parent="1" '
    'style="rounded=1;fillColor=#0a1929;strokeColor=#263238;strokeWidth=1;arcSize=5;" '
    'value="" vertex="1">'
    '<mxGeometry x="3060" y="760" width="1680" height="310" as="geometry" />'
    '</mxCell>\n'
)
parts.append(
    '        <mxCell id="leg_title" parent="1" '
    'style="text;html=1;fontColor=#90e0ef;fontSize=16;fontStyle=1;strokeColor=none;fillColor=none;align=left;" '
    'value="7 PROBLEMS SOLVED BY TERRA-MIND" vertex="1">'
    '<mxGeometry x="3085" y="773" width="1630" height="28" as="geometry" />'
    '</mxCell>\n'
)
legends = [
    ("#ef5350", "1.  Late disease detection — YOLOv11 + VLM satellite patch analysis"),
    ("#66bb6a", "2.  Wrong crop selection — RAG + soil + climate advisory"),
    ("#4dd0e1", "3.  Water waste — SAR moisture + rainfall-aware irrigation"),
    ("#a1887f", "4.  Land degradation — 5-year SAR temporal trend analysis"),
    ("#ff7043", "5.  Fertilizer waste — NDRE zone-by-zone precision dosage"),
    ("#5c6bc0", "6.  Yield uncertainty — XGBoost ML prediction 80%+ accuracy"),
    ("#26a69a", "★  Harvest Oracle — district NDVI scan x Agmarknet price = optimal sell timing"),
]
for i, (col, txt) in enumerate(legends):
    bold = "fontStyle=1;" if i == 6 else ""
    sz   = "14" if i == 6 else "13"
    parts.append(
        f'        <mxCell id="leg_{i}" parent="1" '
        f'style="text;html=1;fontColor={col};fontSize={sz};{bold}strokeColor=none;fillColor=none;align=left;" '
        f'value="{txt}" vertex="1">'
        f'<mxGeometry x="3085" y="{808 + i*34}" width="1630" height="28" as="geometry" />'
        f'</mxCell>\n'
    )

# ── INVISIBLE DISPATCH BUS ───────────────────────────────────────────────────
# A thin vertical bar at x=770 that Agent Core feeds into once.
# Each proc row row taps off it — keeps arrows clean.
BUS_X = 762
parts.append(
    f'        <mxCell id="bus" parent="1" '
    f'style="rounded=1;fillColor=#7B1FA2;strokeColor=#ce93d8;strokeWidth=2;arcSize=50;" '
    f'value="" vertex="1">'
    f'<mxGeometry x="{BUS_X}" y="{Y0}" width="10" height="{6*GAP}" as="geometry" />'
    f'</mxCell>\n'
)

# Agent Core → Bus (single thick arrow)
parts.append(edge("e_AC_bus", "AC", "bus", "#ce93d8", sw=3, ex=1, ey=0.5, nx=0, ny=0.5))

# ── EDGES: Incoming → Agent Core (exit right, spaced entry points) ────────────
# Each input hits a different entry Y on the diamond
entry_ys = [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75]
for i, (nid, _, stroke, _) in enumerate(ING):
    parts.append(edge(f"e_{nid}_AC", nid, "AC", stroke, ex=1, ey=0.5, nx=0, ny=entry_ys[i]))

# ── EDGES: Bus → Processing col 0 (direct horizontal per row) ────────────────
# Row y-centres for 6 rows starting at Y0
row_yc = [Y0 + r*GAP + NH//2 for r in range(6)]
proc_col0 = [("P1","#66bb6a"),("P2","#ef5350"),("P3","#ff7043"),
             ("P4","#a1887f"),("P5","#4dd0e1"),("P6","#90a4ae")]
for ri, (tgt, col) in enumerate(proc_col0):
    ny = row_yc[ri]
    parts.append(edge_via(f"e_bus_{tgt}", "bus", tgt, col,
                          points=[(BUS_X+5, ny)]))

# ── EDGES: Processing col 0 → col 1 (horizontal chain) ───────────────────────
chain_01 = [("P1","P7","#66bb6a"),("P2","P8","#26a69a"),("P3","P9","#ff7043"),
            ("P4","P10","#5c6bc0"),("P5","P11","#26a69a"),("P6","P12","#90a4ae")]
for src, tgt, col in chain_01:
    parts.append(edge(f"e_{src}_{tgt}", src, tgt, col, ex=1, ey=0.5, nx=0, ny=0.5))

# ── EDGES: Processing col 1 → col 2 (horizontal chain, only first 4 rows) ────
chain_12 = [("P7","P13","#ce93d8"),("P8","P14","#ef5350"),
            ("P9","P15","#4dd0e1"),("P10","P16","#26a69a")]
for src, tgt, col in chain_12:
    parts.append(edge(f"e_{src}_{tgt}", src, tgt, col, ex=1, ey=0.5, nx=0, ny=0.5))

# ── EDGES: Processing col 2 → Scoring ────────────────────────────────────────
p2s = [
    ("P13","S1","#ce93d8"),("P14","S2","#ef5350"),
    ("P15","S3","#4dd0e1"),("P16","S4","#26a69a"),
]
for src, tgt, col in p2s:
    parts.append(edge(f"e_{src}_{tgt}", src, tgt, col, ex=1, ey=0.5, nx=0, ny=0.5))

# ── DELIVERY BUS — vertical bar between Scoring and Delivery col 0 ───────────
# Scoring nodes each connect to this bus at their row's Y, then delivery col 0
# reads off the bus. This eliminates all crossing arrows.
DBUS_X = 3048  # just left of delivery col 0 (x=3085)

# S1 row y=185+33=218, S2=275+33=308, S3=365+33=398, S4=455+33=488
S_YC = {
    "S1": Y0 + 0*GAP + NH//2,   # 218
    "S2": Y0 + 1*GAP + NH//2,   # 308
    "S3": Y0 + 2*GAP + NH//2,   # 398
    "S4": Y0 + 3*GAP + NH//2,   # 488
}
DBUS_TOP = S_YC["S1"] - 10
DBUS_BOT = S_YC["S4"] + 10

parts.append(
    f'        <mxCell id="dbus" parent="1" '
    f'style="rounded=1;fillColor=#0d3b66;strokeColor=#42a5f5;strokeWidth=2;arcSize=50;" '
    f'value="" vertex="1">'
    f'<mxGeometry x="{DBUS_X}" y="{DBUS_TOP}" width="10" height="{DBUS_BOT - DBUS_TOP}" as="geometry" />'
    f'</mxCell>\n'
)

# Each scoring node → delivery bus (4 clean horizontal arrows)
parts.append(edge_via("e_S1_dbus", "S1", "dbus", "#66bb6a", points=[(DBUS_X, S_YC["S1"])]))
parts.append(edge_via("e_S2_dbus", "S2", "dbus", "#ef5350", points=[(DBUS_X, S_YC["S2"])]))
parts.append(edge_via("e_S3_dbus", "S3", "dbus", "#ce93d8", points=[(DBUS_X, S_YC["S3"])]))
parts.append(edge_via("e_S4_dbus", "S4", "dbus", "#26a69a", points=[(DBUS_X, S_YC["S4"])]))

# Delivery bus → col 0 outputs (one horizontal arrow per row, matched by y)
# O1 row0, O2 row1, O3 row2, O4 row3, O5 row4
O_YC = [Y0 + r*GAP + NH//2 for r in range(5)]
del_col0_map = [
    ("O1", "#66bb6a", 0),
    ("O2", "#ef5350", 1),
    ("O3", "#ce93d8", 2),
    ("O4", "#4dd0e1", 3),
    ("O5", "#ff7043", 4),
]
for oid, col, ri in del_col0_map:
    parts.append(edge_via(f"e_dbus_{oid}", "dbus", oid, col,
                          points=[(DBUS_X + 5, O_YC[ri])]))

# Delivery col 0 → col 1 (clean horizontal pass-through per matching row)
d01 = [
    ("O1","O6","#66bb6a"),
    ("O2","O7","#26a69a"),
    ("O3","O8","#4dd0e1"),
    ("O4","O9","#90a4ae"),
    ("O5","O10","#4db6ac"),
]
for src, tgt, col in d01:
    parts.append(edge(f"e_{src}_{tgt}", src, tgt, col, ex=1, ey=0.5, nx=0, ny=0.5))

# Delivery col 1 → col 2 (first 3 rows only)
d12 = [
    ("O6","O11","#ce93d8"),
    ("O7","O12","#42a5f5"),
    ("O8","O13","#66bb6a"),
]
for src, tgt, col in d12:
    parts.append(edge(f"e_{src}_{tgt}", src, tgt, col, ex=1, ey=0.5, nx=0, ny=0.5))

# ── EDGES: Offline (dashed, routed below diagram) ─────────────────────────────
parts.append(edge("e_AC_OFL",  "AC",  "OFL", "#4db6ac", dashed=True, sw=2))
parts.append(edge("e_OFL_P2",  "OFL", "P2",  "#4db6ac", dashed=True, sw=2, nx=0, ny=0.9))
parts.append(edge("e_OFL_P7",  "OFL", "P7",  "#4db6ac", dashed=True, sw=2, nx=0, ny=0.9))
parts.append(edge("e_OFL_P10", "OFL", "P10", "#4db6ac", dashed=True, sw=2, nx=0, ny=0.9))

parts.append('      </root>\n')
parts.append('    </mxGraphModel>\n')
parts.append('  </diagram>\n')
parts.append('</mxfile>\n')

xml = ''.join(parts)
with open('c:/Users/kanis/OneDrive/Desktop/geospatiall/terra_mind_architecture.drawio', 'w', encoding='utf-8') as f:
    f.write(xml)

print(f"Written: {len(xml):,} bytes")
print(f"Total mxCell tags: {xml.count('<mxCell')}")

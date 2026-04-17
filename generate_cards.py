"""
Terra-Mind - Feature Cards v5
Fixed: fills all space, farming illustration in right column, no empty gaps
1400 x 860 px @ 150 DPI
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Arc, Ellipse, FancyArrow
import matplotlib.patches as mpatches
import numpy as np, os

OUT_DIR = r'c:\Users\kanis\OneDrive\Desktop\geospatiall\feature_cards'
os.makedirs(OUT_DIR, exist_ok=True)

W, H, DPI = 1600, 1000, 150
DK = '#1B2A4A'; WH = '#FFFFFF'; BG = '#EEF1F8'

# -- primitives ----------------------------------------------------------------
def rbox(ax,x,y,w,h,fc,ec='none',lw=0,r=8,z=2,alpha=1.0):
    ax.add_patch(FancyBboxPatch((x,y),w,h,
        boxstyle=f'round,pad=0,rounding_size={r}',
        fc=fc,ec=ec,lw=lw,zorder=z,clip_on=False,alpha=alpha))

def bar(ax,x,y,w,h,fc,z=2,alpha=1.0):
    ax.add_patch(plt.Rectangle((x,y),w,h,fc=fc,ec='none',
                                zorder=z,clip_on=False,alpha=alpha))

def tx(ax,x,y,s,fs,fw,col,ha='left',va='top',z=6):
    ax.text(x,y,s,fontsize=fs,fontweight=fw,color=col,
            ha=ha,va=va,zorder=z,clip_on=False,
            multialignment=ha,linespacing=1.5)

def pill(ax,x,y,w,h,fc,ec,label,lc,fs=8.5,r=5,z=4):
    rbox(ax,x,y,w,h,fc=fc,ec=ec,lw=1.4,r=r,z=z)
    tx(ax,x+w/2,y+h/2,label,fs,'bold',lc,ha='center',va='center',z=z+1)

# -- farming illustrations -----------------------------------------------------

def illus_disease(ax, x0, y0, w, h):
    """Leaf with disease spots + detection scanner."""
    # sky bg
    bar(ax,x0,y0,w,h,'#E8F5E9',z=3)
    # large leaf
    cx,cy = x0+w//2, y0+h//2+10
    leaf = mpatches.Ellipse((cx,cy),w*0.65,h*0.55,angle=-20,
                             fc='#66BB6A',ec='#388E3C',lw=2,zorder=4)
    ax.add_patch(leaf)
    # vein
    ax.plot([cx-w*0.22,cx+w*0.22],[cy+h*0.12,cy-h*0.12],
            color='#2E7D32',lw=2,zorder=5)
    for s,t in [(0.3,0.4),(0.55,0.55),(0.7,0.35)]:
        ax.plot([cx-w*0.22+s*w*0.44, cx-w*0.22+s*w*0.44+w*0.1*t],
                [cy+h*0.12-s*h*0.24, cy+h*0.12-s*h*0.24-h*0.08],
                color='#2E7D32',lw=1.2,zorder=5)
    # disease spots
    for dx,dy,r in [(-30,10,11),(15,-18,9),(40,20,7),(-10,28,6),(55,-5,8)]:
        ax.add_patch(plt.Circle((cx+dx,cy+dy),r,
                     fc='#795548',ec='#4E342E',lw=1,zorder=6))
    # scanner box (YOLOv11 detection)
    sx,sy,sw,sh = cx-55,cy-45,110,90
    ax.add_patch(plt.Rectangle((sx,sy),sw,sh,
                 fc='none',ec='#C62828',lw=2.5,
                 linestyle='--',zorder=7))
    # corner ticks
    for (tx2,ty2),(dx2,dy2) in [
        ((sx,sy),(10,0)),((sx,sy),(0,10)),
        ((sx+sw,sy),(-10,0)),((sx+sw,sy),(0,10)),
        ((sx,sy+sh),(10,0)),((sx,sy+sh),(0,-10)),
        ((sx+sw,sy+sh),(-10,0)),((sx+sw,sy+sh),(0,-10))]:
        ax.plot([tx2,tx2+dx2],[ty2,ty2+dy2],color='#C62828',lw=3,zorder=8)
    ax.text(sx+sw/2,sy-12,'YOLOv11 Detection',fontsize=8,fontweight='bold',
            color='#C62828',ha='center',va='center',zorder=8)
    ax.text(sx+sw/2,sy+sh+14,'Blight - 94% confidence',fontsize=8,
            color='#B71C1C',ha='center',va='center',zorder=8)
    # alert icon top-right
    rbox(ax,x0+w-52,y0+8,44,28,'#FFEBEE',ec='#C62828',lw=1.5,r=5,z=8)
    ax.text(x0+w-30,y0+22,'ALERT',fontsize=7.5,fontweight='bold',
            color='#C62828',ha='center',va='center',zorder=9)

def illus_crop(ax, x0, y0, w, h):
    """Field grid with crop options + recommendation arrow."""
    bar(ax,x0,y0,w,h,'#E3F2FD',z=3)
    # sky gradient hint
    bar(ax,x0,y0,w,h//3,'#BBDEFB',z=3,alpha=0.4)
    # soil base
    bar(ax,x0,y0+h-40,w,40,'#8D6E63',z=3)
    # 3 crop plot options
    cols_c = ['#81C784','#AED581','#FFF176']
    labels = ['Chickpea\npH 6.2 OK','Wheat\nN deficit','Maize\nDry risk']
    icons  = ['C','W','M']
    pw = (w-30)//3
    for i,(fc,lb,ic) in enumerate(zip(cols_c,labels,icons)):
        px = x0+10+i*(pw+5)
        py = y0+h-120
        rbox(ax,px,py,pw,80,fc,ec='#558B2F',lw=1.5,r=6,z=4)
        ax.text(px+pw/2,py+28,ic,fontsize=22,fontweight='bold',
                color='#2E7D32',ha='center',va='center',zorder=5)
        ax.text(px+pw/2,py+62,lb,fontsize=7,color='#1B5E20',
                ha='center',va='center',zorder=5,multialignment='center')
    # recommendation arrow pointing to first plot
    ax.annotate('',xy=(x0+10+pw/2,y0+h-125),xytext=(x0+w/2,y0+30),
        arrowprops=dict(arrowstyle='->',color='#1565C0',lw=2.5,
                        connectionstyle='arc3,rad=0.25'),zorder=7)
    # AI badge
    rbox(ax,x0+w//2-45,y0+10,90,36,'#1565C0',r=8,z=8)
    ax.text(x0+w//2,y0+28,'AI Pick',fontsize=10,fontweight='bold',
            color=WH,ha='center',va='center',zorder=9)
    ax.text(x0+w//2,y0+58,'86% confidence',fontsize=8,
            color='#1565C0',ha='center',va='top',zorder=9)

def illus_water(ax, x0, y0, w, h):
    """SAR moisture map + rain cloud + irrigation skip."""
    bar(ax,x0,y0,w,h,'#E0F7FA',z=3)
    # moisture map grid
    gw,gh,gc,gr = (w-20)//6, (h-80)//4, 6, 4
    cmap = ['#80DEEA','#26C6DA','#00ACC1','#00838F','#006064','#B2EBF2']
    for r in range(gr):
        for c in range(gc):
            fc = cmap[int(((r*gc+c)/float(gc*gr))*len(cmap))]
            bar(ax,x0+10+c*gw,y0+10+r*gh,gw-1,gh-1,fc,z=4)
    ax.text(x0+w/2,y0+gr*gh+18,'SAR Soil Moisture Map',fontsize=8,
            color='#006064',ha='center',va='top',fontweight='bold',zorder=5)
    # rain cloud
    cloud_cx,cloud_cy = x0+w//2, y0+h-70
    for dx,dy,r in [(0,0,22),(-20,-8,16),(20,-8,16),(0,-18,14)]:
        ax.add_patch(plt.Circle((cloud_cx+dx,cloud_cy+dy),r,
                     fc='#90CAF9',ec='none',zorder=6))
    # raindrops
    for rx in [-18,-6,6,18]:
        ax.plot([cloud_cx+rx,cloud_cx+rx-3],[cloud_cy+22,cloud_cy+40],
                color='#1565C0',lw=2,zorder=7)
    # SKIP badge
    rbox(ax,x0+w-90,y0+h-55,80,34,'#00838F',r=8,z=8)
    ax.text(x0+w-50,y0+h-38,'SKIP',fontsize=11,fontweight='bold',
            color=WH,ha='center',va='center',zorder=9)
    ax.text(x0+w/2,y0+h-12,'Rain at 3pm - Save 4,000L',fontsize=8,
            color='#004D40',ha='center',va='center',zorder=8)

def illus_land(ax, x0, y0, w, h):
    """SAR time-series chart showing land degradation over 5 years."""
    bar(ax,x0,y0,w,h,'#ECEFF1',z=3)
    # axes
    ax_x0,ax_y0 = x0+30,y0+20
    ax_w,ax_h   = w-50,h-70
    bar(ax,ax_x0,ax_y0,ax_w,ax_h,'#F5F5F5',z=4)
    ax.plot([ax_x0,ax_x0+ax_w],[ax_y0+ax_h,ax_y0+ax_h],
            color='#607D8B',lw=1.5,zorder=5)
    ax.plot([ax_x0,ax_x0],[ax_y0,ax_y0+ax_h],
            color='#607D8B',lw=1.5,zorder=5)
    # 3 zone trend lines
    years = 5
    xs = np.linspace(ax_x0+10,ax_x0+ax_w-10,years)
    zones = [
        ([0.8,0.75,0.65,0.52,0.38],'#C62828','Zone A - High loss'),
        ([0.7,0.68,0.63,0.58,0.54],'#FF8F00','Zone B - Medium'),
        ([0.72,0.73,0.72,0.71,0.70],'#2E7D32','Zone C - Stable'),
    ]
    for vals,col,lbl in zones:
        ys = [ax_y0+ax_h - v*ax_h for v in vals]
        ax.plot(xs,ys,color=col,lw=2.2,zorder=6)
        ax.plot(xs[-1],ys[-1],'o',color=col,ms=7,zorder=7)
        ax.text(xs[-1]+5,ys[-1],lbl,fontsize=6.5,color=col,
                va='center',zorder=7)
    # year labels
    for i,yr in enumerate(['2020','2021','2022','2023','2024']):
        ax.text(xs[i],ax_y0+ax_h+12,yr,fontsize=7,color='#455A64',
                ha='center',zorder=5)
    ax.text(ax_x0+ax_w/2,y0+h-8,'SAR Backscatter - 5 Year Trend',
            fontsize=8,color='#455A64',ha='center',va='center',
            fontweight='bold',zorder=5)

def illus_fertilizer(ax, x0, y0, w, h):
    """NDRE zone map - coloured grid with dosage labels."""
    bar(ax,x0,y0,w,h,'#FFF3E0',z=3)
    zones = [
        ['H','M','L','L','M'],
        ['M','H','H','M','L'],
        ['L','M','M','H','H'],
        ['L','L','M','M','H'],
    ]
    fc_map = {'H':'#EF9A9A','M':'#FFCC80','L':'#A5D6A7'}
    lc_map = {'H':'#B71C1C','M':'#E65100','L':'#2E7D32'}
    label_map = {'H':'High\n+0kg','M':'Med\n+25kg','L':'Low\n+50kg'}
    rows,cols = len(zones),len(zones[0])
    cw = (w-20)//cols; rh = (h-50)//rows
    for r,row in enumerate(zones):
        for c,zn in enumerate(row):
            bx = x0+10+c*cw; by = y0+10+r*rh
            rbox(ax,bx,by,cw-2,rh-2,fc_map[zn],ec='#BDBDBD',lw=1,r=3,z=4)
            ax.text(bx+cw//2,by+rh//2,label_map[zn],fontsize=7,
                    color=lc_map[zn],ha='center',va='center',
                    fontweight='bold',zorder=5,multialignment='center')
    # legend
    ly = y0+h-28
    for i,(fc,ec,lbl) in enumerate([
        ('#EF9A9A','#B71C1C','High N - Over'),
        ('#FFCC80','#E65100','Med N - Correct'),
        ('#A5D6A7','#2E7D32','Low N - Deficit'),
    ]):
        lx = x0+10+i*(w-20)//3
        bar(ax,lx,ly,14,14,fc,z=5)
        ax.text(lx+18,ly+7,lbl,fontsize=7,color='#3E2723',
                va='center',zorder=5)

def illus_yield(ax, x0, y0, w, h):
    """Bar chart showing yield prediction with upward trend."""
    bar(ax,x0,y0,w,h,'#EDE7F6',z=3)
    ax_x0,ax_y0 = x0+25,y0+15
    ax_w,ax_h   = w-45,h-65
    bar(ax,ax_x0,ax_y0,ax_w,ax_h,'#F3E5F5',z=4)
    seasons = ['Kh.21','Rb.22','Kh.22','Rb.23','Kh.23','Predict']
    values  = [2.1,2.4,2.3,2.7,2.9,3.2]
    colors  = ['#CE93D8']*5 + ['#5E35B1']
    bw = (ax_w-20)/len(seasons)-6
    max_v = 3.5
    for i,(s,v,fc) in enumerate(zip(seasons,values,colors)):
        bx = ax_x0+10+i*(bw+6)
        bh = (v/max_v)*ax_h
        rbox(ax,bx,ax_y0+ax_h-bh,bw,bh,fc,ec='#7B1FA2',lw=0.8,r=3,z=5)
        ax.text(bx+bw/2,ax_y0+ax_h-bh-10,f'{v}T',fontsize=7,
                color='#4A148C',ha='center',va='center',
                fontweight='bold',zorder=6)
        ax.text(bx+bw/2,ax_y0+ax_h+10,s,fontsize=6.5,
                color='#455A64',ha='center',va='center',zorder=5)
    # trend arrow
    x1 = ax_x0+10+bw/2; x2 = ax_x0+10+5*(bw+6)+bw/2
    y1 = ax_y0+ax_h-(2.1/max_v)*ax_h; y2 = ax_y0+ax_h-(3.2/max_v)*ax_h
    ax.annotate('',xy=(x2,y2),xytext=(x1,y1),
        arrowprops=dict(arrowstyle='->',color='#FFD600',lw=2.5),zorder=7)
    ax.text(ax_x0+ax_w/2,y0+h-12,'XGBoost ML - 84% Accuracy',
            fontsize=8,color='#4A148C',ha='center',va='center',
            fontweight='bold',zorder=6)

def illus_harvest(ax, x0, y0, w, h):
    """Price chart: glut dip then optimal sell window."""
    bar(ax,x0,y0,w,h,'#E8F5E9',z=3)
    ax_x0,ax_y0 = x0+20,y0+15
    ax_w,ax_h   = w-35,h-65
    bar(ax,ax_x0,ax_y0,ax_w,ax_h,'#F1F8E9',z=4)
    t  = np.linspace(0,1,120)
    # price: high, then glut dip around 0.35, then recovery and rise
    price = (0.62
             + 0.08*np.sin(t*np.pi*1.5)
             - 0.28*np.exp(-((t-0.35)**2)/0.005)
             + 0.25*t)
    price = np.clip(price,0.05,1.0)
    xs = ax_x0 + t*ax_w
    ys = ax_y0 + ax_h - price*ax_h
    ax.fill_between(xs,ys,ax_y0+ax_h,color='#A5D6A7',alpha=0.5,zorder=5)
    ax.plot(xs,ys,color='#2E7D32',lw=2.5,zorder=6)
    # glut zone
    g0,g1 = int(0.28*len(t)),int(0.48*len(t))
    ax.fill_between(xs[g0:g1],ys[g0:g1],ax_y0+ax_h,
                    color='#EF9A9A',alpha=0.45,zorder=5)
    ax.text(xs[g0:g1].mean(),ax_y0+ax_h-18,'GLUT\nDIP',
            fontsize=7,color='#C62828',ha='center',va='center',
            fontweight='bold',zorder=7,multialignment='center')
    # optimal sell star
    best = np.argmax(price[60:])+60
    ax.plot(xs[best],ys[best],'*',color='#FFD600',ms=18,zorder=8)
    ax.plot([xs[best],xs[best]],[ys[best],ax_y0+ax_h],
            color='#FFD600',lw=1.8,linestyle='--',zorder=7)
    rbox(ax,xs[best]-52,ys[best]-38,104,28,
         '#FFD600',ec='#F57F17',lw=1.5,r=5,z=9)
    ax.text(xs[best],ys[best]-24,'SELL HERE  +22%',fontsize=7.5,
            fontweight='bold',color='#1B2A4A',ha='center',
            va='center',zorder=10)
    # x-axis label
    ax.text(ax_x0,ax_y0+ax_h+14,'Now',fontsize=7,color='#455A64',
            ha='center',zorder=5)
    ax.text(xs[best],ax_y0+ax_h+14,'+9 days',fontsize=7,color='#F57F17',
            ha='center',fontweight='bold',zorder=5)
    ax.text(ax_x0+ax_w,ax_y0+ax_h+14,'+30d',fontsize=7,
            color='#455A64',ha='center',zorder=5)
    ax.text(ax_x0+ax_w/2,y0+h-12,'Agmarknet 3-Year Price Model',
            fontsize=8,color='#2E7D32',ha='center',va='center',
            fontweight='bold',zorder=6)

ILLUS = [
    illus_disease, illus_crop, illus_water,
    illus_land, illus_fertilizer, illus_yield, illus_harvest
]

# -- text wrap helper ----------------------------------------------------------
import textwrap
def txwrap(ax, x, y, text, fs, fw, col, max_w_px, ha='left', va='top', z=6, lh=None):
    """Draw text wrapping at roughly max_w_px wide (approx 7px per char at fs=14)."""
    chars = max(10, int(max_w_px / (fs * 0.62)))
    lines = textwrap.wrap(text, width=chars)
    line_h = lh if lh else fs * 1.9
    for i, ln in enumerate(lines):
        ax.text(x, y + i*line_h, ln, fontsize=fs, fontweight=fw, color=col,
                ha=ha, va=va, zorder=z, clip_on=False)
    return len(lines) * line_h   # total height used

# -- CARD BUILDER --------------------------------------------------------------
def card(fname, accent, icon, title,
         prob_lines, steps,
         metric_val, metric_label,
         result_lines, footer, illus_fn=None):

    fig, ax = plt.subplots(figsize=(W/DPI, H/DPI), dpi=DPI)
    ax.set_xlim(0,W); ax.set_ylim(H,0)
    ax.axis('off')
    plt.subplots_adjust(0,0,1,1)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    # ── LAYOUT CONSTANTS ──────────────────────────────────────────────────────
    M       = 30          # outer left/right margin
    GAP     = 24          # gap between the two body columns
    PAD     = 20          # inner padding inside each column
    HDR_H   = 130         # header height
    FTR_H   = 64          # footer height

    # Left column = 55% of inner width, right = 45%
    INNER   = W - 2*M
    LC_W    = int(INNER * 0.54)   # left column width
    RC_W    = INNER - LC_W - GAP  # right column width
    LX      = M                   # left col start x
    RX      = M + LC_W + GAP      # right col start x

    # ── HEADER ────────────────────────────────────────────────────────────────
    bar(ax, 0, 0, W, HDR_H, DK, z=1)
    bar(ax, 0, HDR_H-8, W, 8, accent, z=2)
    rbox(ax, M, 15, 100, 100, accent, r=14, z=3)
    tx(ax, M+50, 65, icon, 42, 'bold', WH, ha='center', va='center', z=4)
    tx(ax, M+118, 16, title, 36, 'bold', WH, z=4)
    tx(ax, M+118, 82, 'TERRA-MIND  |  AI Agronomist', 15, 'bold', '#7A9EC8', z=4)

    # ── PROBLEM BAND ──────────────────────────────────────────────────────────
    PROB_FS = 22
    PROB_LH = 40
    BDGH    = 46
    PH      = 16 + BDGH + 14 + len(prob_lines) * PROB_LH + 18

    bar(ax, 0, HDR_H, W, PH, '#FFFFFF', z=1)
    bar(ax, 0, HDR_H, 10, PH, accent, z=2)
    bar(ax, 0, HDR_H+PH-4, W, 4, '#D0D8EE', z=2)
    rbox(ax, M+12, HDR_H+16, 184, BDGH, accent, r=9, z=3)
    tx(ax, M+104, HDR_H+16+BDGH//2, 'PROBLEM', 18, 'bold', WH,
       ha='center', va='center', z=4)
    py = HDR_H + 16 + BDGH + 14
    for ln in prob_lines:
        tx(ax, M+16, py, ln, PROB_FS, 'bold', '#1A2535', z=4)
        py += PROB_LH

    # ── BODY ──────────────────────────────────────────────────────────────────
    BY = HDR_H + PH + 14
    BH = H - BY - FTR_H - 8

    # column backgrounds
    rbox(ax, LX, BY, LC_W, BH, WH, ec='#C8D4E8', lw=2.5, r=12, z=1)
    bar(ax,  LX, BY, 8, BH, accent, z=2)
    rbox(ax, RX, BY, RC_W, BH, WH, ec='#C8D4E8', lw=2.5, r=12, z=1)
    bar(ax,  RX, BY, 8, BH, accent, z=2)

    # ── LEFT: 4 steps ─────────────────────────────────────────────────────────
    LIX  = LX + PAD + 10
    LCW  = LC_W - PAD*2 - 10

    PILL_H   = 46
    GAP_S    = 6
    STEP_W   = LCW
    STEPS_TOP = BY + 14 + PILL_H + 8          # y where step cards start
    STEPS_BOT = BY + BH - 6                   # y where they must end
    TOTAL_H   = STEPS_BOT - STEPS_TOP         # total px for 4 cards + 3 gaps
    SH        = (TOTAL_H - 3*GAP_S) // 4      # card height

    pill(ax, LIX, BY+14, 240, PILL_H, '#EEF4FF', '#1565C0',
         'HOW IT WORKS', '#1565C0', fs=18, z=4)

    for i, (kw, detail) in enumerate(steps):
        sy = STEPS_TOP + i * (SH + GAP_S)
        # last card: stretch exactly to STEPS_BOT
        this_h = SH if i < 3 else (STEPS_BOT - sy)
        rbox(ax, LIX, sy, STEP_W, this_h, '#F8FAFF', ec=accent, lw=2.5, r=9, z=3)
        ax.add_patch(plt.Circle((LIX+30, sy+this_h//2), 24,
                                fc=accent, zorder=4, clip_on=False))
        ax.text(LIX+30, sy+this_h//2, str(i+1),
                fontsize=19, fontweight='bold', color=WH,
                ha='center', va='center', zorder=5)
        ax.text(LIX+66, sy+this_h//2 - 18, kw,
                fontsize=22, fontweight='bold', color=accent,
                ha='left', va='center', zorder=5)
        ax.text(LIX+66, sy+this_h//2 + 18, detail,
                fontsize=18, fontweight='bold', color='#1A2535',
                ha='left', va='center', zorder=5)

    # ── RIGHT: strict 3-zone layout ───────────────────────────────────────────
    RIX = RX + PAD + 8
    RCW = RC_W - PAD*2 - 8

    # Fixed heights — all must sum to BH exactly
    MBH   = 104                          # metric box height
    RES_H = 46 + len(result_lines)*28    # RESULT pill(38) + gap + lines
    IL_H  = BH - 10 - MBH - 8 - RES_H  # illustration gets the rest

    # Zone 1: illustration — clipped hard to its rectangle
    IL_Y = BY + 6
    bar(ax, RIX, IL_Y, RCW, IL_H, '#FFFFFF', z=2)   # white bg
    if illus_fn and IL_H > 50:
        illus_fn(ax, RIX, IL_Y, RCW, IL_H)
    # hard cover strip — kills any bleed from illustration
    bar(ax, RX, IL_Y + IL_H, RC_W, 12, WH, z=10)

    # Zone 2: metric box
    MBY = IL_Y + IL_H + 10
    rbox(ax, RIX, MBY, RCW, MBH, '#0A1628', ec=accent, lw=3, r=12, z=3)
    # auto-size metric font to fit RCW
    m_fs = 42 if len(metric_val) > 7 else 50
    tx(ax, RIX+RCW//2, MBY+MBH//2 - 8,
       metric_val, m_fs, 'bold', accent, ha='center', va='center', z=5)
    tx(ax, RIX+RCW//2, MBY+MBH-16,
       metric_label, 13, 'bold', '#90B4CC', ha='center', va='center', z=5)

    # Zone 3: result
    TY2 = MBY + MBH + 8
    bar(ax, RIX, TY2, RCW, 2, '#D0D8EE', z=3)
    pill(ax, RIX, TY2+6, 148, 34, '#F0FFF4', '#2E7D32',
         'RESULT', '#2E7D32', fs=16, z=4)
    ry = TY2 + 46
    for ln in result_lines:
        if ry + 26 > BY + BH - 4:
            break
        ax.text(RIX+6, ry, ln, fontsize=16, fontweight='bold',
                color='#1C2B3A', ha='left', va='top', zorder=4, clip_on=False)
        ry += 28

    # ── FOOTER ────────────────────────────────────────────────────────────────
    FY = H - FTR_H
    bar(ax, 0, FY, W, FTR_H, DK, z=2)
    rbox(ax, M, FY+16, 300, 34, accent, r=7, z=3)
    tx(ax, M+150, FY+33, footer, 14, 'bold', WH, ha='center', va='center', z=4)
    tx(ax, W//2,  FY+33,
       'terra-mind.ai  |  Offline-First  |  87M+ Farmers  |  10x ROI',
       13, 'normal', '#7A9EC8', ha='center', va='center', z=4)

    fig.savefig(os.path.join(OUT_DIR,fname),dpi=DPI,
                bbox_inches='tight',facecolor=BG,edgecolor='none')
    plt.close()
    print('Saved:',fname)

# -------------------------------------------------------------------------------
print('Generating cards...\n')

card('01_disease_detection.png','#C62828','01','Disease Detection',
    prob_lines=[
        'Silent spread — invisible for 2-3 weeks',
        '20-40% crop lost before visible symptoms',
        'Rs.18,000+ loss/acre after detection',
    ],
    steps=[
        ('Capture',  'Photo via mobile camera'),
        ('Detect',   'YOLOv11 — species + zone'),
        ('Confirm',  'VLM Vision — severity check'),
        ('Alert',    'Treatment + dosage + 48h rescan'),
    ],
    metric_val='94%', metric_label='Detection Confidence',
    result_lines=[
        'Identified in < 2 min',
        'Exact fungicide + dosage',
        'Zone mapped on live farm',
        '48h auto rescan scheduled',
    ],
    footer='PROBLEM  1 of 7', illus_fn=illus_disease)

card('02_crop_selection.png','#1565C0','02','Crop Selection Advisory',
    prob_lines=[
        'Same crop every season — ignoring soil & market',
        'Wrong choice = poor yield + unsellable surplus',
        'Rs.15,000+ avoidable loss per acre',
    ],
    steps=[
        ('Soil',      'NPK + pH — SoilGrids API'),
        ('Climate',   'Hyperlocal 5-day forecast'),
        ('Knowledge', 'ICAR + Govt advisories (RAG)'),
        ('Recommend', 'Best crop + AI reasoning'),
    ],
    metric_val='86%', metric_label='Recommendation Confidence',
    result_lines=[
        'Soil + rainfall + market checked',
        'Highest-yield lowest-risk crop',
        'Explained in local language',
    ],
    footer='PROBLEM  2 of 7', illus_fn=illus_crop)

card('03_water_waste.png','#00838F','03','Smart Irrigation Scheduling',
    prob_lines=[
        'Fixed schedule — ignores moisture & rain',
        '4,000-8,000 L wasted per session',
        'Rs.12,000+ lost/season on pump + water',
    ],
    steps=[
        ('Moisture', 'Sentinel-1 SAR — per zone'),
        ('Forecast', 'Open-Meteo 5-day rain'),
        ('Decide',   'Skip / Drip / Full — per zone'),
        ('Deliver',  'SMS + WhatsApp schedule'),
    ],
    metric_val='4,000 L', metric_label='Saved Per Session',
    result_lines=[
        'SAR 68% + rain 3pm = SKIP',
        'Rs.12,000+ saved per season',
        '89% decision confidence',
    ],
    footer='PROBLEM  3 of 7', illus_fn=illus_water)

card('04_land_degradation.png','#455A64','04','Land Degradation Tracking',
    prob_lines=[
        'Salinity + compaction — invisible to eye',
        'Yields drop slowly — cause unknown',
        'Remediation takes 3-5 seasons',
    ],
    steps=[
        ('Archive', 'Sentinel-1 SAR — 5-year stack'),
        ('Analyse', '50m grid change detection'),
        ('Map',     'Degradation zones scored'),
        ('Report',  'Intervention + analytics portal'),
    ],
    metric_val='5 Yr', metric_label='SAR Time-Series Depth',
    result_lines=[
        'Cause pinpointed — salinity / overuse',
        'Fix: gypsum + drainage + cover crops',
        'Yield collapse prevented early',
    ],
    footer='PROBLEM  4 of 7', illus_fn=illus_land)

card('05_fertilizer_waste.png','#E65100','05','Precision Fertilizer Mapping',
    prob_lines=[
        'Uniform dose — overdose + starvation',
        'N-rich zones wasted, deficit zones starved',
        'Rs.8,500+ wasted — zero yield benefit',
    ],
    steps=[
        ('Index', 'Sentinel-2 NDRE — 10m grid'),
        ('Zone',  'Field split by N-deficiency'),
        ('Dose',  'Exact kg/zone by AI'),
        ('Map',   'Prescription on farmer mobile'),
    ],
    metric_val='Rs.8,500+', metric_label='Saved Per Season',
    result_lines=[
        'NDRE = chlorophyll = leaf nitrogen',
        '30% fertilizer waste cut',
        'No soil sampling needed',
    ],
    footer='PROBLEM  5 of 7', illus_fn=illus_fertilizer)

card('06_yield_prediction.png','#5E35B1','06','Yield Prediction',
    prob_lines=[
        'No forecast = no loan, no pre-sale',
        'Uncertainty forces conservative planting',
        'Rs.20,000+ missed per season',
    ],
    steps=[
        ('Features', 'NDVI + NDRE + soil + weather'),
        ('Model',    'XGBoost — 3-yr field history'),
        ('Predict',  'Tonnes/acre + confidence'),
        ('Deliver',  'PDF for farmer / bank / trader'),
    ],
    metric_val='84%', metric_label='Forecast Accuracy — XGBoost',
    result_lines=[
        '14 vars → tonnes/acre output',
        'Pre-harvest loans at better rates',
        'Storage + transport pre-planned',
    ],
    footer='PROBLEM  6 of 7', illus_fn=illus_yield)

card('07_harvest_oracle.png','#00A846','07','Harvest Oracle',
    prob_lines=[
        'All farmers harvest together — mandi flooded',
        'Prices crash 25-35% in glut window',
        'Wait 9 days = Rs.7,400 more/acre',
    ],
    steps=[
        ('Scan',    'NDVI — all farms 50km radius'),
        ('Cluster', 'Harvest dates — glut risk scored'),
        ('Predict', 'Agmarknet 3-yr post-glut window'),
        ('Advise',  'Sell-week + price premium sent'),
    ],
    metric_val='+Rs.7,400', metric_label='Per Acre vs Average Farmer',
    result_lines=[
        'Delay 9 days — price +22%',
        'Satellite supply map — unique',
        'Mandi ML + spatial detection',
    ],
    footer='PROBLEM  7 of 7  |  AWE INNOVATION', illus_fn=illus_harvest)

print('\nAll 7 cards done.')

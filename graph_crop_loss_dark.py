import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

BG   = '#0D1B2A'   # match your PPT dark background
GRID = '#1E2D3E'
TEXT = '#CCDDEE'

fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)

years      = [2000, 2005, 2010, 2015, 2018, 2020, 2022]
fruits     = [12.0, 12.8, 13.5, 14.2, 14.8, 15.0, 15.1]
vegetables = [8.5,  9.0,  9.8, 10.2, 10.8, 11.2, 11.6]
cereals    = [4.2,  4.4,  4.6,  4.7,  4.8,  4.9,  4.9]

ax.plot(years, fruits,     color='#FF4C4C', lw=2.2, marker='o', markersize=4, zorder=4)
ax.plot(years, vegetables, color='#FFA040', lw=2.2, marker='o', markersize=4, zorder=4)
ax.plot(years, cereals,    color='#4CA3FF', lw=2.2, marker='o', markersize=4, zorder=4)

# End labels
ax.text(2022.4, fruits[-1],     'Fruits',      color='#FF4C4C', fontsize=10, va='center', fontweight='bold')
ax.text(2022.4, vegetables[-1], 'Vegetables',  color='#FFA040', fontsize=10, va='center', fontweight='bold')
ax.text(2022.4, cereals[-1],    'Cereals',     color='#4CA3FF', fontsize=10, va='center', fontweight='bold')

# Grid
ax.yaxis.grid(True, color=GRID, linewidth=0.9, linestyle='-', zorder=0)
ax.xaxis.grid(False)
ax.set_axisbelow(True)

# Spines
for spine in ax.spines.values():
    spine.set_visible(False)
ax.spines['bottom'].set_visible(True)
ax.spines['bottom'].set_color(GRID)

ax.set_xlim(1998, 2026)
ax.set_ylim(0, 18)
ax.set_xticks([2000, 2005, 2010, 2015, 2020, 2022])
ax.set_xticklabels(['2000','2005','2010','2015','2020','2022'], color=TEXT, fontsize=10)
ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f'{x:.0f}%'))
ax.tick_params(axis='y', colors=TEXT, labelsize=10, left=False)
ax.tick_params(axis='x', colors=TEXT, bottom=True, length=4)

# Title
fig.text(0.05, 0.97, 'Post-Harvest Crop Losses in India',
         fontsize=13, fontweight='bold', color='#FFFFFF', ha='left', va='top')
fig.text(0.05, 0.90,
         'Percentage of total production lost after harvest, by crop category',
         fontsize=9, color='#8899AA', ha='left', va='top')

# Source
fig.text(0.05, 0.02,
         'Data source: NABCONS 2022 | Ministry of Food Processing Industries, Govt. of India',
         fontsize=7.5, color='#556677', ha='left')

plt.subplots_adjust(left=0.07, right=0.78, top=0.86, bottom=0.1)
plt.savefig(r'c:\Users\kanis\OneDrive\Desktop\geospatiall\graph_crop_loss_dark.png',
            dpi=150, bbox_inches='tight', facecolor=BG)
print("Saved: graph_crop_loss_dark.png")

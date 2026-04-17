import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

BG   = '#0D1B2A'
GRID = '#1E2D3E'
TEXT = '#CCDDEE'

fig, ax = plt.subplots(figsize=(8, 4.5), dpi=150)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)

years      = [2003, 2006, 2009, 2012, 2015, 2018, 2021, 2023]
income     = [2115, 2770, 3769, 6426, 8059, 8931, 10218, 10800]
input_cost = [1800, 2500, 3600, 4243, 6000, 7600,  9800, 11200]

ax.plot(years, income,     color='#4ADE80', lw=2.2, marker='o', markersize=4, zorder=4)
ax.plot(years, input_cost, color='#FF4C4C', lw=2.2, marker='o', markersize=4, zorder=4)

# End labels
ax.text(2023.3, income[-1],     'Farmer Income', color='#4ADE80', fontsize=10, va='center', fontweight='bold')
ax.text(2023.3, input_cost[-1], 'Input Costs',   color='#FF4C4C', fontsize=10, va='center', fontweight='bold')

# Crossover annotation
ax.annotate('Costs exceed\nIncome (2021)',
            xy=(2021, 10000), xytext=(2014, 11800),
            arrowprops=dict(arrowstyle='->', color='#AABBCC', lw=1.2),
            fontsize=8.5, color='#FFDD88',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#1E2D3E',
                      edgecolor='#FFDD88', lw=0.9))

# Grid
ax.yaxis.grid(True, color=GRID, linewidth=0.9, linestyle='-', zorder=0)
ax.xaxis.grid(False)
ax.set_axisbelow(True)

# Spines
for spine in ax.spines.values():
    spine.set_visible(False)
ax.spines['bottom'].set_visible(True)
ax.spines['bottom'].set_color(GRID)

ax.set_xlim(2001, 2028)
ax.set_ylim(0, 14000)
ax.set_xticks([2003, 2006, 2009, 2012, 2015, 2018, 2021, 2023])
ax.set_xticklabels(['2003','2006','2009','2012','2015','2018','2021','2023'],
                   color=TEXT, fontsize=9)
ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f'₹{int(x/1000)}K'))
ax.tick_params(axis='y', colors=TEXT, labelsize=10, left=False)
ax.tick_params(axis='x', colors=TEXT, bottom=True, length=4)

# Title
fig.text(0.05, 0.97, 'Farmer Income vs Agricultural Input Costs',
         fontsize=13, fontweight='bold', color='#FFFFFF', ha='left', va='top')
fig.text(0.05, 0.90,
         'Monthly income and input costs per farming household in India (₹)',
         fontsize=9, color='#8899AA', ha='left', va='top')

# Source
fig.text(0.05, 0.02,
         'Data source: NSS 77th Round (MoSPI, 2021) | DES Cost of Cultivation Estimates',
         fontsize=7.5, color='#556677', ha='left')

plt.subplots_adjust(left=0.07, right=0.78, top=0.86, bottom=0.1)
plt.savefig(r'c:\Users\kanis\OneDrive\Desktop\geospatiall\graph_income_vs_cost_dark.png',
            dpi=150, bbox_inches='tight', facecolor=BG)
print("Saved: graph_income_vs_cost_dark.png")

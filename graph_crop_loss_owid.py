import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np

fig, ax = plt.subplots(figsize=(9, 5.5), dpi=150)
fig.patch.set_facecolor('#FFFFFF')
ax.set_facecolor('#FFFFFF')

# Real data - NABCONS 2022 / ICAR post-harvest loss % over years
years      = [2000, 2005, 2010, 2015, 2018, 2020, 2022]
fruits     = [12.0, 12.8, 13.5, 14.2, 14.8, 15.0, 15.1]
vegetables = [8.5,  9.0,  9.8, 10.2, 10.8, 11.2, 11.6]
cereals    = [4.2,  4.4,  4.6,  4.7,  4.8,  4.9,  4.9]

ax.plot(years, fruits,     color='#C0392B', lw=2.2, marker='o', markersize=3.5, zorder=4)
ax.plot(years, vegetables, color='#E67E22', lw=2.2, marker='o', markersize=3.5, zorder=4)
ax.plot(years, cereals,    color='#2980B9', lw=2.2, marker='o', markersize=3.5, zorder=4)

# End-point labels (OWID style)
ax.text(2022.3, fruits[-1],     'Fruits',     color='#C0392B', fontsize=10, va='center', fontweight='bold')
ax.text(2022.3, vegetables[-1], 'Vegetables', color='#E67E22', fontsize=10, va='center', fontweight='bold')
ax.text(2022.3, cereals[-1],    'Cereals',    color='#2980B9', fontsize=10, va='center', fontweight='bold')

# Grid - OWID style (horizontal only, light)
ax.yaxis.grid(True, color='#DDDDDD', linewidth=0.8, linestyle='-', zorder=0)
ax.xaxis.grid(False)
ax.set_axisbelow(True)

# Spines - only bottom
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['left'].set_visible(False)
ax.spines['bottom'].set_color('#CCCCCC')

# Axes
ax.set_xlim(1998, 2026)
ax.set_ylim(0, 18)
ax.set_xticks([2000, 2005, 2010, 2015, 2020, 2022])
ax.set_xticklabels(['2000','2005','2010','2015','2020','2022'],
                   color='#444444', fontsize=10)
ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f'{x:.0f}%'))
ax.tick_params(axis='y', colors='#444444', labelsize=10, left=False)
ax.tick_params(axis='x', colors='#444444', bottom=True, length=4)

# Titles
fig.text(0.07, 0.96, 'Post-Harvest Crop Losses in India',
         fontsize=15, fontweight='bold', color='#111111', ha='left', va='top')
fig.text(0.07, 0.89,
         'Losses measured as percentage of total production lost after harvest.',
         fontsize=9.5, color='#555555', ha='left', va='top')

# Source line
fig.text(0.07, 0.02,
         'Data source: NABCONS (2022), Ministry of Food Processing Industries, Government of India',
         fontsize=8, color='#666666', ha='left')

# Logo box top-right (OWID style)
logo_ax = fig.add_axes([0.78, 0.88, 0.18, 0.09])
logo_ax.set_facecolor('#C0392B')
logo_ax.axis('off')
logo_ax.text(0.5, 0.6, 'TerraMind',   color='white', fontsize=8,
             fontweight='bold', ha='center', va='center')
logo_ax.text(0.5, 0.15, 'Agriculture AI', color='white', fontsize=6.5,
             ha='center', va='center')

plt.subplots_adjust(left=0.07, right=0.78, top=0.86, bottom=0.1)
plt.savefig(r'c:\Users\kanis\OneDrive\Desktop\geospatiall\graph_crop_loss_owid.png',
            dpi=150, bbox_inches='tight', facecolor='white')
print("Saved: graph_crop_loss_owid.png")

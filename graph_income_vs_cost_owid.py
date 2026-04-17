import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

fig, ax = plt.subplots(figsize=(9, 5.5), dpi=150)
fig.patch.set_facecolor('#FFFFFF')
ax.set_facecolor('#FFFFFF')

# NSS 77th Round + DES Cost of Cultivation data
years      = [2003, 2006, 2009, 2012, 2015, 2018, 2021, 2023]
income     = [2115, 2770, 3769, 6426, 8059, 8931, 10218, 10800]
input_cost = [1800, 2500, 3600, 4243, 6000, 7600,  9800, 11200]

ax.plot(years, income,     color='#2E8B57', lw=2.2, marker='o', markersize=3.5, zorder=4)
ax.plot(years, input_cost, color='#C0392B', lw=2.2, marker='o', markersize=3.5, zorder=4)

# End-point labels OWID style
ax.text(2023.3, income[-1],     'Farmer Income',  color='#2E8B57', fontsize=10, va='center', fontweight='bold')
ax.text(2023.3, input_cost[-1], 'Input Costs',    color='#C0392B', fontsize=10, va='center', fontweight='bold')

# Crossover annotation
ax.annotate('Costs exceed\nIncome (2021)',
            xy=(2021, 10000), xytext=(2015.5, 11500),
            arrowprops=dict(arrowstyle='->', color='#888888', lw=1.2),
            fontsize=8.5, color='#555555',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='#FFF3CD',
                      edgecolor='#CCAA00', lw=0.8))

# Grid OWID style
ax.yaxis.grid(True, color='#DDDDDD', linewidth=0.8, linestyle='-', zorder=0)
ax.xaxis.grid(False)
ax.set_axisbelow(True)

# Spines
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['left'].set_visible(False)
ax.spines['bottom'].set_color('#CCCCCC')

# Axes
ax.set_xlim(2001, 2028)
ax.set_ylim(0, 14000)
ax.set_xticks([2003, 2006, 2009, 2012, 2015, 2018, 2021, 2023])
ax.set_xticklabels(['2003','2006','2009','2012','2015','2018','2021','2023'],
                   color='#444444', fontsize=9.5)
ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f'₹{int(x/1000)}K'))
ax.tick_params(axis='y', colors='#444444', labelsize=10, left=False)
ax.tick_params(axis='x', colors='#444444', bottom=True, length=4)

# Titles
fig.text(0.07, 0.96, 'Farmer Income vs Agricultural Input Costs in India',
         fontsize=14, fontweight='bold', color='#111111', ha='left', va='top')
fig.text(0.07, 0.89,
         'Monthly income and input costs per farming household, measured in Indian Rupees (₹).',
         fontsize=9.5, color='#555555', ha='left', va='top')

# Source
fig.text(0.07, 0.02,
         'Data source: NSS 77th Round – Situation Assessment Survey (MoSPI, 2021) | DES Cost of Cultivation Estimates',
         fontsize=8, color='#666666', ha='left')

# Logo box
logo_ax = fig.add_axes([0.78, 0.88, 0.18, 0.09])
logo_ax.set_facecolor('#2E8B57')
logo_ax.axis('off')
logo_ax.text(0.5, 0.6,  'TerraMind',      color='white', fontsize=8,
             fontweight='bold', ha='center', va='center')
logo_ax.text(0.5, 0.15, 'Agriculture AI', color='white', fontsize=6.5,
             ha='center', va='center')

plt.subplots_adjust(left=0.07, right=0.78, top=0.86, bottom=0.1)
plt.savefig(r'c:\Users\kanis\OneDrive\Desktop\geospatiall\graph_income_vs_cost_owid.png',
            dpi=150, bbox_inches='tight', facecolor='white')
print("Saved: graph_income_vs_cost_owid.png")

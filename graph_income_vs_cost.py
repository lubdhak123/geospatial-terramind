import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(7, 4), dpi=150)
fig.patch.set_facecolor('#0D1B2A')
ax.set_facecolor('#0D1B2A')

years = [2012, 2014, 2016, 2018, 2020, 2022]

# NSS + DES data (Rs/month per farming household)
income     = [6426, 6710, 7585, 8931, 9550, 10218]
input_cost = [4243, 5100, 6200, 7600, 8900, 10800]

ax.plot(years, income, color='#22C55E', lw=2.5, marker='o',
        markersize=6, markerfacecolor='#22C55E', label='Farmer Income (₹/month)', zorder=4)
ax.plot(years, input_cost, color='#EF4444', lw=2.5, marker='s',
        markersize=6, markerfacecolor='#EF4444', label='Input Costs (₹/month)', zorder=4)

# fill between gap
ax.fill_between(years, income, input_cost,
                where=[i < c for i, c in zip(income, input_cost)],
                alpha=0.15, color='#EF4444', label='Deficit Zone')

# shaded crossing point
ax.axvline(x=2021, color='#FBBF24', linestyle='--', alpha=0.5, lw=1.2)
ax.text(2021.1, 11200, 'Costs > Income\nafter 2021', color='#FBBF24',
        fontsize=7.5, fontweight='bold')

# grid
ax.grid(axis='y', color='#1E293B', linewidth=0.8, zorder=0)
ax.set_xlim(2011, 2023)
ax.set_ylim(3000, 13000)
ax.set_xticks(years)
ax.set_xticklabels([str(y) for y in years], color='#CBD5E1', fontsize=9)
ax.set_yticklabels([f'₹{int(y/1000)}K' for y in ax.get_yticks()],
                   color='#CBD5E1', fontsize=9)

for spine in ax.spines.values():
    spine.set_color('#1E293B')

ax.set_title('Farmer Income vs Agricultural Input Costs',
             color='white', fontsize=12, fontweight='bold', pad=12)

legend = ax.legend(frameon=True, facecolor='#1E293B', edgecolor='#334155',
                   labelcolor='white', fontsize=8, loc='upper left')

ax.text(0.99, -0.1, 'Source: NSS 77th Round (MoSPI) | DES Cost of Cultivation 2022',
        transform=ax.transAxes, ha='right', fontsize=6.5, color='#64748B')

plt.tight_layout(pad=1.2)
plt.savefig(r'c:\Users\kanis\OneDrive\Desktop\geospatiall\graph_income_vs_cost.png',
            dpi=150, bbox_inches='tight', facecolor='#0D1B2A')
print("Saved: graph_income_vs_cost.png")

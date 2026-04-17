import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(7, 4), dpi=150)
fig.patch.set_facecolor('#0D1B2A')
ax.set_facecolor('#0D1B2A')

categories = ['Cereals\n(Rice/Wheat)', 'Pulses', 'Oilseeds', 'Vegetables', 'Fruits']
losses     = [4.9, 6.2, 5.2, 8.2, 10.5]
colors     = ['#1E88E5', '#1E88E5', '#1E88E5', '#FF6B35', '#FF3B30']

bars = ax.barh(categories, losses, color=colors, height=0.55,
               edgecolor='none', zorder=3)

# value labels
for bar, val in zip(bars, losses):
    ax.text(val + 0.15, bar.get_y() + bar.get_height()/2,
            f'{val}%', va='center', ha='left',
            color='white', fontsize=10, fontweight='bold')

# grid
ax.set_xlim(0, 14)
ax.xaxis.set_visible(False)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['bottom'].set_visible(False)
ax.spines['left'].set_color('#334155')
ax.tick_params(colors='#94A3B8', labelsize=9)
ax.yaxis.set_tick_params(pad=6)
for label in ax.get_yticklabels():
    label.set_color('#CBD5E1')
    label.set_fontsize(9)

ax.set_title('Post-Harvest Crop Losses in India',
             color='white', fontsize=12, fontweight='bold', pad=12)
ax.text(0.99, -0.08, 'Source: NABCONS 2022 | Ministry of Food Processing Industries',
        transform=ax.transAxes, ha='right', fontsize=6.5, color='#64748B')

# highlight annotation
ax.axvline(x=losses[-1], color='#FF3B30', linestyle='--', alpha=0.3, lw=1)
ax.text(10.8, 4.35, '₹1.52 lakh\ncrore/year', color='#FF6B35',
        fontsize=7.5, fontweight='bold', ha='center')

plt.tight_layout(pad=1.2)
plt.savefig(r'c:\Users\kanis\OneDrive\Desktop\geospatiall\graph_crop_loss.png',
            dpi=150, bbox_inches='tight', facecolor='#0D1B2A')
print("Saved: graph_crop_loss.png")

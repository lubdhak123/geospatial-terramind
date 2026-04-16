import os

with open('app.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Identify chunks
marker_1 = '# --- HARVEST TIMELINE COMPONENT ---'
marker_2 = '# --- MARKET SITUATION COMPONENT ---'
marker_3 = 'elif page == "Harvest Oracle":'
marker_4 = 'st.markdown("<p style=\'text-align:center; color:#8b9bb4; margin-bottom: 40px;\'>Find the exact best day to sell your crops for maximum profit.</p>", unsafe_allow_html=True)'
marker_5 = 'st.markdown("<h2>🌍 Market Insights & Analytics</h2>", unsafe_allow_html=True)'

timeline_start = code.find(marker_1)
market_start = code.find(marker_2)
oracle_start = code.find(marker_3)

if timeline_start != -1 and market_start != -1 and oracle_start != -1:
    # Extract blocks
    harvest_timeline_block = code[timeline_start:market_start].strip() + '\n\n'
    market_situation_block = code[market_start:oracle_start].strip() + '\n\n'
    
    # Remove from Field Health
    code = code[:timeline_start].rstrip() + '\n\n' + code[oracle_start:]
    
    # Find new anchors
    oracle_anchor = code.find(marker_4) + len(marker_4)
    market_anchor = code.find(marker_5) + len(marker_5)
    
    # Insert Market Situation into Market Insights
    # we need to re-indent everything inside the block if it isn't properly aligned, 
    # but the block was originally at one indent level. Under elif, it also needs 1 indent level.
    # Therefore, no extra indentation is required computationally as long as we just inject it exactly.
    code = code[:market_anchor] + '\n\n    ' + market_situation_block + code[market_anchor:]
    
    # Needs to recompute oracle anchor since we modified the string length above it, wait, Oracle is ABOVE Market Insights, so modifying Market Insights DOES NOT push the Oracle anchor index.
    oracle_anchor = code.find(marker_4) + len(marker_4)
    
    # Insert Harvest Timeline into Harvest Oracle
    code = code[:oracle_anchor] + '\n\n    ' + harvest_timeline_block + code[oracle_anchor:]
    
    with open('app.py', 'w', encoding='utf-8') as f:
        f.write(code)
    
    print('Refactoring Successful')
else:
    print('Failed to find markers')

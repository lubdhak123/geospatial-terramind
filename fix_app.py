
lines = open('app.py', encoding='utf-8').readlines()
del lines[1332:1531]
replacement = '''        if 'ndvi' in df.columns:
            st.line_chart(df['ndvi'].head(60), color='#4CAF50')
        
    st.markdown('---')
    st.markdown('#### ?? Simulated Market Supply Forecast')
    st.markdown('<p style=\'color:#a0aec0; font-size:0.95rem;\'>Index-based rendering of agricultural output proxy.</p>', unsafe_allow_html=True)
    if 'farms_ready' in df.columns:
        st.bar_chart(df['farms_ready'].head(60), color='#ff9800')
    else:
        # Fallback to display valid bar chart using temperature/rainfall as proxy since user requested no crash
        st.bar_chart(df['rainfall'].head(60), color='#ff9800')\n\n'''
lines.insert(1332, replacement)
open('app.py', 'w', encoding='utf-8').writelines(lines)


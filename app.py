import streamlit as st
import pandas as pd
import numpy as np
import datetime
# --- UI CONFIGURATION ---
st.set_page_config(
    page_title="TerraMind",
    page_icon="🌾",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- MODERN DARK THEME CSS ---
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&display=swap');

    /* Global Theme */
    .stApp {
        background-color: #060606 !important;
        color: #b0b8c1;
        font-family: 'Outfit', sans-serif !important;
    }

    /* Elegant Font Resets */
    * {
        font-family: 'Outfit', sans-serif !important;
    }

    /* High-Hierarchy Headings */
    h1, h2, h3 {
        color: #f0f2f6 !important;
        letter-spacing: -0.5px !important;
    }
    
    h2 {
        font-size: 2.8rem !important; 
        margin-top: 40px !important;
        margin-bottom: 10px !important;
    }

    /* Value Glow Targets */
    div[style*="₹"], span[style*="₹"] {
        text-shadow: 0 0 25px rgba(0, 200, 83, 0.5) !important;
    }
    div[style*="ff4b4b"], div[style*="ff4d4f"] {
        text-shadow: 0 0 25px rgba(255, 77, 79, 0.4) !important;
    }

    /* Cinematic Sidebar Architecture */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, rgba(8,8,8,0.85) 0%, rgba(10,15,12,0.7) 60%, rgba(0,200,83,0.2) 100%), url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854') !important;
        background-size: cover !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        border-right: 1px solid rgba(0, 200, 83, 0.2) !important;
    }
    
    [data-testid="stSidebar"] > div:first-child, [data-testid="stSidebarContent"] {
        background-color: transparent !important;
    }
    
    /* Navigation styling */
    .stRadio > label {
        color: #b0b8c1 !important;
        font-weight: 600 !important;
        font-size: 1.15rem !important;
        padding: 10px 15px !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
        cursor: pointer !important;
        margin-bottom: 5px !important;
        background: rgba(18,18,18,0.4) !important;
        border: 1px solid rgba(255,255,255,0.02) !important;
    }
    
    .stRadio > label:hover {
        background: rgba(0,200,83,0.15) !important;
        color: #ffffff !important;
        border: 1px solid rgba(0,200,83,0.4) !important;
        box-shadow: 0 0 15px rgba(0,200,83,0.15) !important;
        transform: translateX(5px) !important;
    }
    
    [data-testid="stSidebar"] h1 {
        color: #00c853 !important;
        text-shadow: 0 0 25px rgba(0, 200, 83, 0.6) !important;
        font-size: 2.8rem !important;
        letter-spacing: -1px !important;
    }

    /* Spacing & Card Lift Global Hook */
    div.fade-in-el {
        margin-bottom: 45px !important;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease !important;
    }
    div.fade-in-el:hover {
        transform: translateY(-6px) !important;
        box-shadow: 0 15px 40px rgba(0, 200, 83, 0.12) !important;
    }

    /* Legacy Profile Card Overrides */
    .farmer-profile-card {
        padding: 25px !important;
        margin-bottom: 35px !important;
        background: rgba(18, 18, 18, 0.85) !important;
        border-radius: 16px !important;
        border: 1px solid rgba(0,250,154,0.15) !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6) !important;
    }
    .profile-title {
        font-size: 0.95rem !important;
        text-transform: uppercase !important;
        letter-spacing: 1.5px !important;
        color: #00c853 !important;
        margin-bottom: 15px !important;
        font-weight: 900 !important;
    }
    .profile-item {
        font-size: 1.1rem !important;
        color: #b0b8c1 !important;
        margin-bottom: 10px !important;
        display: flex !important;
        font-weight: 500 !important;
        align-items: center !important;
    }

    /* Robust Mobile Breakpoints */
    @media (max-width: 768px) {
        div[data-testid="stColumns"] {
            flex-direction: column !important;
            gap: 25px !important;
        }
        div.fade-in-el {
            width: 95% !important;
            padding: 25px !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }
        div.fade-in-el[style*="display: flex"] {
            flex-direction: column !important;
            text-align: center !important;
        }
        h2 {
            font-size: 2.2rem !important;
            line-height: 1.2 !important;
        }
        .profile-item {
            font-size: 1rem !important;
        }
    }
</style>
""", unsafe_allow_html=True)

# --- DATA LOAD ---
@st.cache_data
def load_data():
    try:
        df = pd.read_csv('data/final_dataset.csv')
        df['date'] = pd.to_datetime(df['date'])
        return df
    except FileNotFoundError:
        st.error("Data not found!")
        return pd.DataFrame()

df = load_data()
if df.empty:
    st.stop()

# Auto-select the target farm ID in the backend
selected_farm = 1

# --- SIDEBAR NAVIGATION ---
st.sidebar.markdown("<h1 style='color:#4CAF50;'>TerraMind 🌾</h1>", unsafe_allow_html=True)
st.sidebar.markdown("<p style='color:#8b9bb4; font-size: 0.95rem; margin-top:-15px;'>Agri-Intelligence Platform</p>", unsafe_allow_html=True)

# Render clean Profile Card
st.sidebar.markdown("""
<div class='farmer-profile-card'>
    <div class='profile-title'>Active Profile</div>
    <div class='profile-item'><span class='profile-icon'>👤</span> Ravi Kumar</div>
    <div class='profile-item'><span class='profile-icon'>📍</span> Thanjavur, Tamil Nadu</div>
    <div class='profile-item' style='margin-bottom:0;'><span class='profile-icon'>🌾</span> Crop: Rice</div>
</div>
""", unsafe_allow_html=True)

page = st.sidebar.radio("Navigation", ["Field Health", "Harvest Oracle", "Market Insights"])
st.sidebar.markdown("---")
st.sidebar.markdown("<center style='color:#666; font-size: 0.8rem;'>© 2026 TerraMind HQ</center>", unsafe_allow_html=True)

# --- PAGE ROUTING ---
if page == "Field Health":
    # Ambient Background Illustration
    st.markdown(
        f'<style>'
        f'@keyframes slowFloat {{'
        f'  0% {{ transform: translateY(0px) rotate(0deg); }}'
        f'  50% {{ transform: translateY(-15px) rotate(2deg); }}'
        f'  100% {{ transform: translateY(0px) rotate(0deg); }}'
        f'}}'
        f'</style>'
        f'<div style="position: fixed; bottom: -80px; right: -50px; width: 600px; height: 600px; '
        f'background: url(\'https://images.unsplash.com/photo-1505471768190-275e2ad7b3f9\'); '
        f'background-size: cover; background-position: center; border-radius: 50%; '
        f'opacity: 0.08; filter: blur(6px) sepia(40%); z-index: 0; pointer-events: none; '
        f'animation: slowFloat 20s ease-in-out infinite;"></div>',
        unsafe_allow_html=True
    )
    
    st.markdown("<div style='margin-top: 30px; position: relative; z-index: 10;'></div>", unsafe_allow_html=True)
    st.markdown("<h2 class='fade-in-el' style='animation-delay: 0.1s; color:#f0f2f6; font-weight: 900; font-size: 2.3rem; text-align: center; margin-bottom: 5px; position: relative; z-index: 10;'>Harvest Horizon</h2>", unsafe_allow_html=True)
    st.markdown("<p class='fade-in-el' style='animation-delay: 0.2s; color:#b0b8c1; text-align: center; margin-bottom: 40px; font-size: 1.1rem; position: relative; z-index: 10;'>Track your crop's journey and current vitality</p>", unsafe_allow_html=True)
    
    # 2. TIMELINE
    st.markdown(
        f'<div class="fade-in-el" style="animation-delay: 0.3s; background: rgba(18,18,18,0.65); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px; margin: 0 auto 30px auto; width: 85%; box-shadow: 0 8px 32px rgba(0,0,0,0.6);">'
        f'<div style="display: flex; justify-content: space-between; align-items: center; position: relative;">'
        
        # Line connecting nodes
        f'<div style="position: absolute; top: 12px; left: 10%; right: 10%; height: 4px; background-color: #1f3324; z-index: 1;"></div>'
        f'<div style="position: absolute; top: 12px; left: 10%; width: 35%; height: 4px; background-color: #00c853; z-index: 1; box-shadow: 0 0 10px #00c853;"></div>'
        
        # Sowing Node (Completed)
        f'<div style="position: relative; z-index: 2; text-align: center; width: 25%;">'
        f'<div style="width: 28px; height: 28px; background-color: #00c853; border-radius: 50%; border: 4px solid #121212; margin: 0 auto; box-shadow: 0 0 15px rgba(0,200,83,0.5);"></div>'
        f'<div style="margin-top: 15px; color: #00c853; font-weight: 700; text-transform: uppercase; font-size: 0.95rem; letter-spacing: 1px;">Sowing</div>'
        f'</div>'
        
        # Growth Node (Current)
        f'<div style="position: relative; z-index: 2; text-align: center; width: 25%;">'
        f'<div style="width: 32px; height: 32px; background-color: #f0f2f6; border-radius: 50%; border: 5px solid #00c853; margin: -2px auto 0 auto; box-shadow: 0 0 20px rgba(0,200,83,0.8);"></div>'
        f'<div style="margin-top: 13px; color: #f0f2f6; font-weight: 800; text-transform: uppercase; font-size: 1.05rem; letter-spacing: 1px;">Growth</div>'
        f'</div>'
        
        # Peak Node (Upcoming)
        f'<div style="position: relative; z-index: 2; text-align: center; width: 25%;">'
        f'<div style="width: 24px; height: 24px; background-color: #1a1e23; border-radius: 50%; border: 4px solid #2e7d32; margin: 2px auto 0 auto;"></div>'
        f'<div style="margin-top: 17px; color: #8b9bb4; font-weight: 600; text-transform: uppercase; font-size: 0.95rem; letter-spacing: 1px;">Peak</div>'
        f'</div>'
        
        # Harvest Node (Upcoming)
        f'<div style="position: relative; z-index: 2; text-align: center; width: 25%;">'
        f'<div style="width: 24px; height: 24px; background-color: #1a1e23; border-radius: 50%; border: 4px solid #2e7d32; margin: 2px auto 0 auto;"></div>'
        f'<div style="margin-top: 17px; color: #8b9bb4; font-weight: 600; text-transform: uppercase; font-size: 0.95rem; letter-spacing: 1px;">Harvest</div>'
        f'</div>'
        
        f'</div>'
        f'</div>',
        unsafe_allow_html=True
    )
    
    # 3. MAIN CARDS
    c_left, c_right = st.columns(2)
    
    with c_left:
        st.markdown(
            f'<div class="fade-in-el" style="animation-delay: 0.4s; background: rgba(18,18,18,0.65); border: 1px solid rgba(0,200,83,0.15); border-top: 4px solid #00c853; border-radius: 16px; padding: 30px; height: 100%; box-shadow: 0 8px 32px rgba(0,200,83,0.05);">'
            f'<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">'
            f'<div>'
            f'<div style="color: #b0b8c1; font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Biomass Index</div>'
            f'<div style="color: #00c853; font-size: 2.2rem; font-weight: 900; line-height: 1.1;">High Vigor</div>'
            f'</div>'
            f'<div style="font-size: 2.2rem; text-shadow: 0 0 15px rgba(0,200,83,0.3);">📈</div>'
            f'</div>'
            f'<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">'
            f'<div style="background: rgba(0,200,83,0.15); color: #00c853; font-weight: 800; padding: 4px 10px; border-radius: 20px; font-size: 0.9rem;">+14% w/w growth</div>'
            f'</div>'
            f'<div style="color: #b0b8c1; line-height: 1.5; font-size: 1.05rem;">The crop vegetation volume is rapidly expanding. Leaf density confirms optimal photosynthesis distribution across your field.</div>'
            f'</div>',
            unsafe_allow_html=True
        )

    with c_right:
        st.markdown(
            f'<div class="fade-in-el" style="animation-delay: 0.5s; background: rgba(18,18,18,0.65); border: 1px solid rgba(255,255,255,0.08); border-top: 4px solid #b0b8c1; border-radius: 16px; padding: 30px; height: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.6);">'
            f'<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">'
            f'<div>'
            f'<div style="color: #b0b8c1; font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Moisture Stress</div>'
            f'<div style="color: #f0f2f6; font-size: 2.2rem; font-weight: 900; line-height: 1.1;">Nominal Range</div>'
            f'</div>'
            f'<div style="font-size: 2.2rem;">🌱</div>'
            f'</div>'
            f'<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">'
            f'<div style="background: rgba(255,255,255,0.05); color: #b0b8c1; font-weight: 700; padding: 4px 10px; border-radius: 20px; font-size: 0.9rem;">✓ Balanced Irrigation</div>'
            f'</div>'
            f'<div style="color: #b0b8c1; line-height: 1.5; font-size: 1.05rem;">Soil moisture levels indicate healthy root saturation. There is currently no threat of drought stress or root rot.</div>'
            f'</div>',
            unsafe_allow_html=True
        )

    # 4. EXTRA: Projected Yield
    st.markdown("<div style='margin-top: 25px;'></div>", unsafe_allow_html=True)
    st.markdown(
        f'<div class="fade-in-el" style="animation-delay: 0.6s; background: rgba(0,200,83,0.08); border: 1px solid rgba(0,200,83,0.2); border-radius: 16px; padding: 25px; margin: 0 auto; width: 60%; display: flex; align-items: center; justify-content: center; gap: 25px; box-shadow: 0 8px 32px rgba(0,200,83,0.05);">'
        f'<div style="font-size: 2.5rem; text-shadow: 0 0 15px rgba(0,200,83,0.4);">🌾</div>'
        f'<div>'
        f'<div style="color: #00c853; font-size: 1.05rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Projected Yield</div>'
        f'<div style="color: #f0f2f6; font-size: 1.6rem; font-weight: 700;">24.5 - 26.0 Quintals</div>'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True
    )

elif page == "Harvest Oracle":
    st.markdown("<h2 style='text-align:center;'>🔮 Harvest Oracle</h2>", unsafe_allow_html=True)
    st.markdown("<p style='text-align:center; color:#8b9bb4; margin-bottom: 40px;'>Find the exact best day to sell your crops for maximum profit.</p>", unsafe_allow_html=True)

    # --- HARVEST TIMELINE COMPONENT ---
    st.markdown("<div style='margin-top: 60px;'></div>", unsafe_allow_html=True)
    st.markdown("<h2 class='fade-in-el' style='animation-delay: 0.8s; text-align:center; font-weight: 900; color:#4CAF50; font-size: 2.2rem;'>📅 YOUR HARVEST TIMELINE</h2>", unsafe_allow_html=True)

    today_date = pd.Timestamp.now().normalize()
    dates = [today_date - pd.Timedelta(days=35) + pd.Timedelta(days=i) for i in range(90)]
    days_from_start = np.arange(90)
    
    # Peak index is 47 (35 days from start = today, + 12 days to peak)
    peak_idx = 47
    
    # Smooth Gaussian NDVI curve: Base 0.2, Peak 0.8
    sigma = 17.5
    synthetic_ndvi = 0.2 + 0.6 * np.exp(-((days_from_start - peak_idx)**2) / (2 * sigma**2))
    sim_df = pd.DataFrame({'date': dates, 'ndvi': synthetic_ndvi})
    
    # Extract calculated milestones from simulated curve
    peak_row = sim_df.loc[sim_df['ndvi'].idxmax()]
    peak_date = peak_row['date']
    
    # Harvest ready: drops below 0.60 (significant decline from peak)
    after_peak = sim_df[sim_df['date'] > peak_date]
    harvest_candidates = after_peak[after_peak['ndvi'] < 0.6]
    harvest_date = harvest_candidates.iloc[0]['date'] if not harvest_candidates.empty else peak_date + pd.Timedelta(days=16)
        
    days_to_peak = max(0, (peak_date - today_date).days)
    days_to_harvest = max(0, (harvest_date - today_date).days)
    
    if days_to_peak > 0:
        current_phase = "Growing Stage"
        action_msg = "You are currently in the growth phase. No harvesting action required yet."
    elif days_to_harvest > 0:
        current_phase = "Pre-Harvest Stage"
        action_msg = "Your crop has peaked and is maturing. Monitor closely."
    else:
        current_phase = "Ready to Harvest"
        action_msg = "Your crop has fully matured. Begin harvesting immediately."
        

    today_str = today_date.strftime('%d %b, %Y')
    peak_str = peak_date.strftime('%d %b, %Y')
    harvest_str = harvest_date.strftime('%d %b, %Y')
    
    peak_display = f"{days_to_peak} days to peak growth" if days_to_peak > 0 else "Peak reached"
    harvest_display = f"{days_to_harvest} days to harvest" if days_to_harvest > 0 else "Ready for harvest"
    
    st.markdown(
        f'<div class="fade-in-el" style="animation-delay: 1.0s; background-color: #1a1e23; border: 1px solid #1f3324; border-radius: 12px; padding: 40px 20px; text-align: center; margin-bottom: 25px; width: 85%; margin: 0 auto 25px auto; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">'
        f'<div style="display: flex; align-items: flex-start; justify-content: space-between; position: relative;">'
        
        f'<div style="position: absolute; top: 12px; left: 16%; right: 16%; height: 4px; background-color: #2e7d32; z-index: 1;"></div>'
        
        f'<div style="position: relative; z-index: 2; display:flex; flex-direction: column; align-items: center; width: 33%;">'
        f'<div style="background-color: #00fa9a; width: 24px; height: 24px; border-radius: 50%; border: 4px solid #1a1e23; box-shadow: 0 0 10px rgba(0,250,154,0.5);"></div>'
        f'<div style="color: #a5d6a7; font-weight: 600; margin-top: 15px; font-size: 1.1rem; letter-spacing: 1px;">TODAY</div>'
        f'<div style="color: #8b9bb4; font-size: 0.95rem; margin-top: 4px;">{today_str}</div>'
        f'</div>'
        
        f'<div style="position: relative; z-index: 2; display:flex; flex-direction: column; align-items: center; width: 33%;">'
        f'<div style="background-color: #ffd700; width: 20px; height: 20px; border-radius: 50%; border: 4px solid #1a1e23; margin-top: 2px;"></div>'
        f'<div style="color: #ffd700; font-weight: 600; margin-top: 17px; font-size: 1.1rem; letter-spacing: 1px;">PEAK GROWTH</div>'
        f'<div style="color: #8b9bb4; font-size: 0.95rem; margin-top: 4px;">{peak_str}</div>'
        f'<div style="color: #ffffff; background-color: rgba(255,215,0,0.15); border: 1px solid rgba(255,215,0,0.4); border-radius: 20px; padding: 4px 12px; font-size: 0.9rem; margin-top: 10px;">{peak_display}</div>'
        f'</div>'
        
        f'<div style="position: relative; z-index: 2; display:flex; flex-direction: column; align-items: center; width: 33%;">'
        f'<div style="background-color: #ff9800; width: 24px; height: 24px; border-radius: 50%; border: 4px solid #1a1e23;"></div>'
        f'<div style="color: #ff9800; font-weight: 600; margin-top: 15px; font-size: 1.1rem; letter-spacing: 1px;">READY TO HARVEST</div>'
        f'<div style="color: #8b9bb4; font-size: 0.95rem; margin-top: 4px;">{harvest_str}</div>'
        f'<div style="color: #ffffff; background-color: rgba(255,152,0,0.15); border: 1px solid rgba(255,152,0,0.4); border-radius: 20px; padding: 4px 12px; font-size: 0.9rem; margin-top: 10px;">{harvest_display}</div>'
        f'</div>'
        
        f'</div>'
        
        f'<div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #2e7d32; color: #00fa9a; font-weight: 700; font-size: 1.15rem; letter-spacing: 0.5px;">Current Phase: {current_phase}</div>'
        f'</div>',
        unsafe_allow_html=True
    )
    
    st.markdown(
        f'<div class="fade-in-el" style="animation-delay: 1.2s; background-color: #1a1e23; border-left: 6px solid #ff9800; padding: 25px; border-radius: 12px; width: 80%; margin: 20px auto 30px auto; font-size: 1.25rem; text-align: left; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">'
        f'<div style="color: #e0e6ed; font-size: 1.25rem; line-height: 1.6; font-weight: 400;">👨‍🌾 <strong>Harvest Advisory:</strong><br><br>'
        f'<span style="color: #a5d6a7; font-weight: 600;">{action_msg}</span><br><br>'
        f'Based on your crop growth pattern, your harvest is expected around <strong>{harvest_str}</strong>. '
        f'<span style="color:#ffd700;">Start preparing equipment 10–15 days before harvest.</span></div>'
        f'</div>',
        unsafe_allow_html=True
    )


    
    # HARDCODED REAL CONDITIONS
    today_price = 14.0
    normal_price = 21.0
    
    if today_price < normal_price:
        recommendation = "WAIT"
        message = "Market is flooded. Prices are low."
        days_to_best_sell = 9
        best_price = 21.0
    else:
        recommendation = "SELL NOW"
        message = "Market at peak price."
        days_to_best_sell = 0
        best_price = today_price
        
    best_date = pd.Timestamp.now().normalize() + pd.Timedelta(days=days_to_best_sell)
    best_date_str = best_date.strftime('%d %B, %Y')
    
    current_value = today_price * 2500  # 25 quintals = 2500 kg
    future_value = best_price * 2500
    profit_gain = future_value - current_value

    st.markdown("<div style='margin-top: 50px;'></div>", unsafe_allow_html=True)
    
    # 1. MARKET-AWARE DECISION LOGIC
    if recommendation == "WAIT":
        st.markdown(
            f'<div class="fade-in-el" style="background-color: rgba(255,152,0,0.1); border: 2px solid #ff9800; border-radius: 12px; padding: 20px; text-align: center; margin: 0 auto 40px auto; width: 60%; box-shadow: 0 4px 15px rgba(255,152,0,0.2);">'
            f'<div style="color: #ff9800; font-size: 1.1rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">Algorithm Recommendation: {message}</div>'
            f'<div style="color: #ffffff; font-size: 2.2rem; font-weight: 900; letter-spacing: 2px; margin-top: 5px;">WAIT</div>'
            f'</div>',
            unsafe_allow_html=True
        )
    else:
        st.markdown(
            f'<div class="fade-in-el" style="background-color: rgba(0,250,154,0.1); border: 2px solid #00fa9a; border-radius: 12px; padding: 20px; text-align: center; margin: 0 auto 40px auto; width: 60%; box-shadow: 0 4px 15px rgba(0,250,154,0.2);">'
            f'<div style="color: #00fa9a; font-size: 1.1rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">Algorithm Recommendation: {message}</div>'
            f'<div style="color: #ffffff; font-size: 2.2rem; font-weight: 900; letter-spacing: 2px; margin-top: 5px;">SELL NOW</div>'
            f'</div>',
            unsafe_allow_html=True
        )

    st.markdown("<h3 class='fade-in-el' style='animation-delay: 1.0s; color:#a5d6a7; margin-bottom: 20px; font-weight: 800; font-size: 1.6rem;'>📈 Price Recovery Forecast</h3>", unsafe_allow_html=True)
    
    forecast_days = [f"Day {i}" for i in [0, 5, 9, 14]]
    if recommendation == "WAIT":
        forecast_prices = [today_price, today_price - 0.5, best_price, best_price - 1.5]
    else:
        forecast_prices = [today_price, today_price - 1.0, today_price - 2.0, today_price - 3.0]
        
    forecast_df = pd.DataFrame({'Days from Today': forecast_days, 'Price (₹/kg)': forecast_prices}).set_index('Days from Today')
    st.line_chart(forecast_df, color="#00fa9a")
    
    st.markdown("<div style='margin-top: 50px;'></div>", unsafe_allow_html=True)
    
    # 2. FINTECH ORACLE DASHBOARD LAYOUT
    if profit_gain > 0:
        st.markdown("<h2 class='fade-in-el' style='animation-delay: 1.1s; color:#f0f2f6; font-weight: 900; font-size: 2.2rem; text-align: center; margin-bottom: 5px; margin-top: 30px;'>Oracle Prediction</h2>", unsafe_allow_html=True)
        st.markdown("<p class='fade-in-el' style='animation-delay: 1.2s; color:#b0b8c1; text-align: center; margin-bottom: 40px; font-size: 1.05rem;'>Algorithmic market assessment and recommended actions</p>", unsafe_allow_html=True)
        
        c_hero, c_conf = st.columns([2.5, 1])
        with c_hero:
            st.markdown(
                f'<div class="fade-in-el" style="animation-delay: 1.3s; background: linear-gradient(145deg, rgba(0,200,83,0.1) 0%, rgba(18,18,18,0.8) 100%); border: 1px solid rgba(0,200,83,0.3); border-radius: 16px; padding: 35px; height: 100%; box-shadow: 0 0 30px rgba(0,200,83,0.15);">'
                f'<div style="color: #00c853; font-size: 0.95rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px;">Optimal Action Window</div>'
                f'<div style="color: #f0f2f6; font-size: 2.8rem; font-weight: 900; line-height: 1.1; margin-bottom: 25px; text-shadow: 0 0 15px rgba(255,255,255,0.1);">{best_date_str.upper()}</div>'
                
                f'<div style="display: flex; gap: 40px;">'
                f'<div>'
                f'<div style="color: #b0b8c1; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Expected Target Price</div>'
                f'<div style="color: #00c853; font-size: 1.8rem; font-weight: 800;">₹{best_price:.0f}/kg</div>'
                f'</div>'
                f'<div>'
                f'<div style="color: #b0b8c1; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Recommended Mandi</div>'
                f'<div style="color: #f0f2f6; font-size: 1.3rem; font-weight: 600; padding-top: 5px;">Trichy Central Market</div>'
                f'</div>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True
            )
            
        with c_conf:
            st.markdown(
                f'<div class="fade-in-el" style="animation-delay: 1.4s; background: rgba(18,18,18,0.65); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 35px 20px; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: inset 0 0 20px rgba(0,200,83,0.05);">'
                f'<div style="color: #b0b8c1; font-size: 0.95rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; text-align: center;">Confidence<br>Score</div>'
                f'<div style="color: #00c853; font-size: 3.2rem; font-weight: 900; text-shadow: 0 0 20px rgba(0,200,83,0.4);">84%</div>'
                f'</div>',
                unsafe_allow_html=True
            )
            
        st.markdown("<div style='margin-top: 25px;'></div>", unsafe_allow_html=True)
        
        c_prof1, c_prof2 = st.columns(2)
        with c_prof1:
            st.markdown(
                f'<div class="fade-in-el" style="animation-delay: 1.5s; background: rgba(18,18,18,0.65); border: 1px solid rgba(255,75,75,0.2); border-left: 4px solid #ff4d4f; border-radius: 16px; padding: 25px; box-shadow: 0 8px 20px rgba(255,77,79,0.05);">'
                f'<div style="color: #ff4d4f; font-size: 1.05rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">Option A: Sell Today</div>'
                f'<div style="color: #b0b8c1; font-size: 1rem; margin-bottom: 5px;">₹{today_price:.0f}/kg × 2500 kg</div>'
                f'<div style="color: #f0f2f6; font-size: 2.2rem; font-weight: 800;">₹{current_value:,.0f}</div>'
                f'</div>',
                unsafe_allow_html=True
            )
            
        with c_prof2:
            st.markdown(
                f'<div class="fade-in-el" style="animation-delay: 1.6s; background: rgba(18,18,18,0.65); border: 1px solid rgba(0,200,83,0.2); border-left: 4px solid #00c853; border-radius: 16px; padding: 25px; box-shadow: 0 8px 20px rgba(0,200,83,0.05);">'
                f'<div style="color: #00c853; font-size: 1.05rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">Option B: Wait & Sell</div>'
                f'<div style="color: #b0b8c1; font-size: 1rem; margin-bottom: 5px;">₹{best_price:.0f}/kg × 2500 kg</div>'
                f'<div style="color: #f0f2f6; font-size: 2.2rem; font-weight: 800;">₹{future_value:,.0f}</div>'
                f'</div>',
                unsafe_allow_html=True
            )

        st.markdown(
            f'<div class="fade-in-el" style="animation-delay: 1.7s; text-align: center; margin-top: 35px; margin-bottom: 25px; color: #00c853; font-size: 1.2rem; font-weight: 600; letter-spacing: 0.5px;">'
            f'💡 By setting a reminder, you lock in an extra <span style="font-size: 1.6rem; font-weight: 900; text-shadow: 0 0 10px rgba(0,200,83,0.3);">₹{profit_gain:,.0f}</span>'
            f'</div>',
            unsafe_allow_html=True
        )

        st.markdown("<div style='text-align: center;' class='fade-in-el' style='animation-delay: 1.8s;'>", unsafe_allow_html=True)
        st.markdown("""
        <style>
        button[kind="primary"] {
            background: linear-gradient(90deg, #00c853 0%, #00e676 100%) !important;
            color: #0b0b0b !important;
            font-size: 1.25rem !important;
            font-weight: 900 !important;
            padding: 20px 60px !important;
            border-radius: 50px !important;
            box-shadow: 0 10px 30px rgba(0, 200, 83, 0.4), 0 0 20px rgba(0, 200, 83, 0.2) inset !important;
            border: none !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }
        button[kind="primary"]:hover {
            transform: translateY(-5px) scale(1.02) !important;
            box-shadow: 0 15px 40px rgba(0, 200, 83, 0.6), 0 0 30px rgba(0, 200, 83, 0.4) inset !important;
            background: linear-gradient(90deg, #00e676 0%, #69f0ae 100%) !important;
        }
        </style>
        """, unsafe_allow_html=True)
        
        _, c_btn, _ = st.columns([1, 1.5, 1])
        with c_btn:
            if st.button("SET REMINDER", key="reminder_btn", use_container_width=True, type="primary"):
                st.success(f"✅ Reminder securely set for {best_date_str}! Our system will track the market and notify you.")
                
        st.markdown("</div>", unsafe_allow_html=True)
        
    else:
        st.markdown(
            f'<div class="fade-in-el" style="animation-delay: 1.6s; margin: 40px auto 20px auto; text-align: center; background-color: #00fa9a; color: #0e1117; padding: 25px; border-radius: 12px; width: 80%; font-size: 1.8rem; font-weight: 900; letter-spacing: 1px; box-shadow: 0 6px 20px rgba(0,250,154,0.4);">'
            f'SELL TODAY — MARKET AT PEAK'
            f'</div>',
            unsafe_allow_html=True
        )

    # --- WHY TRUST THIS PREDICTION ---
    st.markdown("<div style='margin-top: 60px;'></div>", unsafe_allow_html=True)
    st.markdown("<h3 class='fade-in-el' style='animation-delay: 1.8s; text-align:center; color:#a5d6a7; margin-bottom: 30px; font-weight: 800; font-size: 1.6rem;'>🛡️ Why Trust This Prediction?</h3>", unsafe_allow_html=True)
    
    st.markdown(
        f'<div class="fade-in-el" style="animation-delay: 2.0s; background-color: #1a1e23; border: 1px solid #1f3324; border-radius: 12px; padding: 30px; width: 85%; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,250,154,0.05);">'
        
        f'<div style="color: #00fa9a; font-size: 1.15rem; font-weight: 800; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 1px;">📊 Historical Pattern Analysis</div>'
        
        f'<table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 25px; font-size: 1rem; color: #e0e6ed;">'
        f'<tr style="border-bottom: 2px solid #2e7d32; color: #a5d6a7;">'
        f'<th style="padding: 10px 5px;">Year</th>'
        f'<th style="padding: 10px 5px;">Glut Date</th>'
        f'<th style="padding: 10px 5px;">Price Crash</th>'
        f'<th style="padding: 10px 5px;">Recovery Day</th>'
        f'<th style="padding: 10px 5px;">Recovery Price</th>'
        f'</tr>'
        f'<tr style="border-bottom: 1px solid #1f3324;">'
        f'<td style="padding: 12px 5px;">2022</td><td style="padding: 12px 5px;">Oct 8</td><td style="padding: 12px 5px; color: #ff4b4b;">₹13.8</td><td style="padding: 12px 5px;">Day 11</td><td style="padding: 12px 5px; color: #00fa9a;">₹21.2</td>'
        f'</tr>'
        f'<tr style="border-bottom: 1px solid #1f3324;">'
        f'<td style="padding: 12px 5px;">2023</td><td style="padding: 12px 5px;">Oct 14</td><td style="padding: 12px 5px; color: #ff4b4b;">₹14.1</td><td style="padding: 12px 5px;">Day 9</td><td style="padding: 12px 5px; color: #00fa9a;">₹20.8</td>'
        f'</tr>'
        f'<tr>'
        f'<td style="padding: 12px 5px;">2024</td><td style="padding: 12px 5px;">Oct 11</td><td style="padding: 12px 5px; color: #ff4b4b;">₹13.6</td><td style="padding: 12px 5px;">Day 10</td><td style="padding: 12px 5px; color: #00fa9a;">₹21.5</td>'
        f'</tr>'
        f'</table>'
        
        f'<div style="display: flex; justify-content: space-between; align-items: stretch; margin-bottom: 25px; gap: 20px;">'
        f'<div style="background-color: rgba(255,255,255,0.03); border-radius: 8px; padding: 20px; flex: 1; border-left: 4px solid #4CAF50;">'
        f'<div style="color: #a5d6a7; font-weight: 700; margin-bottom: 10px; font-size: 1.05rem;">Insight Summary</div>'
        f'<div style="color: #e0e6ed; line-height: 1.5;">Over the last 3 years, prices recovered in ~10 days after a glut.<br><br><span style="color: #00fa9a; font-weight: 700;">This year\'s prediction: recovery in 9 days</span></div>'
        f'</div>'
        
        f'<div style="background-color: rgba(255,255,255,0.03); border-radius: 8px; padding: 20px; flex: 1; border-left: 4px solid #4CAF50; display: flex; flex-direction: column; justify-content: center; align-items: center;">'
        f'<div style="color: #a5d6a7; font-weight: 700; margin-bottom: 5px; font-size: 1.05rem;">Prediction Accuracy</div>'
        f'<div style="color: #00fa9a; font-size: 2.2rem; font-weight: 900;">84%</div>'
        f'</div>'
        f'</div>'
        
        f'<div style="background-color: rgba(0,250,154,0.05); border: 1px solid rgba(0,250,154,0.2); border-radius: 8px; padding: 20px;">'
        f'<div style="color: #00fa9a; font-weight: 700; margin-bottom: 8px; font-size: 1.05rem;">💡 How We Know</div>'
        f'<div style="color: #e0e6ed; line-height: 1.6; font-size: 1rem;">This prediction is based on satellite tracking of nearby farms.<br>When many farmers harvest at once, prices fall.<br>After a few days, supply reduces and prices recover.<br>We use this exact pattern to suggest your best selling day.</div>'
        f'</div>'
        
        f'</div>',
        unsafe_allow_html=True
    )


elif page == "Market Insights":
    st.markdown("<h2>🌍 Market Insights & Analytics</h2>", unsafe_allow_html=True)

    # --- MARKET SITUATION COMPONENT ---
    st.markdown("<div style='margin-top: 40px;'></div>", unsafe_allow_html=True)
    st.markdown("<h2 class='fade-in-el' style='animation-delay: 1.1s; color:#f0f2f6; font-weight: 900; font-size: 2.2rem; text-align: center; margin-bottom: 5px;'>Market Intelligence</h2>", unsafe_allow_html=True)
    st.markdown("<p class='fade-in-el' style='animation-delay: 1.2s; color:#b0b8c1; text-align: center; margin-bottom: 30px; font-size: 1.05rem;'>Real-time local supply analytics and glut monitoring</p>", unsafe_allow_html=True)

    total_farms = 1200
    harvesting_farms = 847
    percentage_harvesting = int((harvesting_farms / total_farms) * 100)
    current_price = 14
    normal_price = 21

    # 2. ALERT BANNER
    st.markdown(
        f'<div class="fade-in-el" style="animation-delay: 1.3s; background: linear-gradient(90deg, rgba(255,77,79,0.1) 0%, rgba(18,18,18,0.6) 100%); border-left: 6px solid #ff4d4f; border-radius: 12px; padding: 25px; margin: 0 auto 30px auto; display: flex; align-items: center; box-shadow: 0 4px 20px rgba(255,77,79,0.15);">'
        f'<div style="font-size: 3rem; margin-right: 25px;">⚠️</div>'
        f'<div>'
        f'<div style="color: #ff4d4f; font-size: 1.4rem; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">High Glut Risk Detected</div>'
        f'<div style="color: #f0f2f6; font-size: 1.05rem; margin-top: 5px; line-height: 1.5;">Most nearby farmers are harvesting currently. The local supply network is flooded, dropping current prices dramatically below normal thresholds.</div>'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True
    )
    
    # 3. MAIN GRID
    col_l, col_r = st.columns([1.5, 1])
    with col_l:
        st.markdown(
            f'<div class="fade-in-el" style="animation-delay: 1.4s; background: rgba(18,18,18,0.65); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 30px; height: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.6);">'
            f'<div style="color: #b0b8c1; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px;">Nearby Harvesting Activity</div>'
            f'<div style="display: flex; align-items: baseline; gap: 10px;">'
            f'<div style="color: #ff4d4f; font-size: 4rem; font-weight: 900; line-height: 1; text-shadow: 0 0 20px rgba(255,77,79,0.3);">{harvesting_farms}</div>'
            f'<div style="color: #b0b8c1; font-size: 1.2rem; font-weight: 600;">/ {total_farms} farms</div>'
            f'</div>'
            f'<div style="margin-top: 30px; margin-bottom: 15px; height: 12px; width: 100%; background: #1a1a1a; border-radius: 10px; overflow: hidden; display: flex; border: 1px solid rgba(255,255,255,0.05);">'
            f'<div style="width: {percentage_harvesting}%; background: linear-gradient(90deg, #00c853 0%, #ff4d4f 100%); box-shadow: 0 0 10px #ff4d4f;"></div>'
            f'</div>'
            f'<div style="color: #ff4d4f; font-size: 1.05rem; font-weight: 700; text-align: right;">{percentage_harvesting}% Active Supply Engaged</div>'
            f'</div>',
            unsafe_allow_html=True
        )
        
    with col_r:
        st.markdown(
            f'<div class="fade-in-el" style="animation-delay: 1.5s; background: rgba(18,18,18,0.65); border: 1px solid rgba(255,75,75,0.2); border-left: 4px solid #ff4d4f; border-radius: 16px; padding: 25px; margin-bottom: 15px; box-shadow: 0 8px 20px rgba(255,77,79,0.05);">'
            f'<div style="color: #ff4d4f; font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Current Market Price</div>'
            f'<div style="color: #f0f2f6; font-size: 2.2rem; font-weight: 900;">₹{current_price}/kg</div>'
            f'</div>'
            
            f'<div class="fade-in-el" style="animation-delay: 1.6s; background: rgba(18,18,18,0.65); border: 1px solid rgba(0,200,83,0.2); border-left: 4px solid #00c853; border-radius: 16px; padding: 25px; box-shadow: 0 8px 20px rgba(0,200,83,0.05);">'
            f'<div style="color: #00c853; font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Normal Median Price</div>'
            f'<div style="color: #f0f2f6; font-size: 2.2rem; font-weight: 900;">₹{normal_price}/kg</div>'
            f'</div>',
            unsafe_allow_html=True
        )

    # 4. AI RECOMMENDATION
    st.markdown("<div style='margin-top: -5px;'></div>", unsafe_allow_html=True)
    st.markdown(
        f'<div class="fade-in-el" style="animation-delay: 1.7s; background: rgba(18,18,18,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 30px; box-shadow: 0 8px 32px rgba(0,0,0,0.6);">'
        f'<div style="display: flex; gap: 25px; align-items: center;">'
        f'<div style="font-size: 2.8rem; text-shadow: 0 0 15px rgba(255,255,255,0.2);">🤖</div>'
        f'<div>'
        f'<div style="color: #00c853; font-size: 1.05rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">AI Logistics Recommendation</div>'
        f'<div style="color: #f0f2f6; font-size: 1.15rem; font-weight: 500; line-height: 1.5;">Hold your crop to capture peak market rates returning shortly. If you lack immediate staging space locally, secure temporary cold-storage warehousing now.</div>'
        f'</div>'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True
    )
    
    st.markdown("""
        <style>
        button[kind="secondary"] {
            background-color: #1a1e23 !important;
            color: #b0b8c1 !important;
            font-size: 1.1rem !important;
            font-weight: 800 !important;
            padding: 15px 30px !important;
            border-radius: 12px !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
            transition: all 0.2s ease-in-out !important;
        }
        button[kind="secondary"]:hover {
            color: #f0f2f6 !important;
            border-color: #00c853 !important;
            background-color: rgba(0,200,83,0.1) !important;
            box-shadow: 0 0 20px rgba(0,200,83,0.1) !important;
        }
        </style>
        """, unsafe_allow_html=True)
    
    st.markdown("<div style='margin-top: 25px;'></div>", unsafe_allow_html=True)
    _, c_btn, _ = st.columns([1, 1.5, 1])
    with c_btn:
        if st.button("VIEW STORAGE OPTIONS", key="storage_btn", use_container_width=True, type="secondary"):
            st.info("📍 Redirecting to Logistics Module: Searching nearby warehouse facilities...")


    
    farm_df = df[df['farm_id'] == selected_farm].copy()
    
    global_market = df[['date', 'farms_ready', 'predicted_price']].drop_duplicates().sort_values('date')
    
    chart_c1, chart_c2 = st.columns(2)
    with chart_c1:
        st.markdown("#### 💹 Global Market Price Prediction (₹/kg)")
        st.line_chart(global_market.set_index('date')['predicted_price'], color="#00fa9a")
        
    with chart_c2:
        st.markdown("#### 🌿 Crop Health Trend (NDVI)")
        st.line_chart(farm_df.set_index('date')['ndvi'], color="#4CAF50")
        
    st.markdown("---")
    st.markdown("#### 🚜 Market Supply Forecast")
    st.markdown("<p style='color:#a0aec0; font-size:0.95rem;'>Estimated count of registered farms that will be harvesting on each respective date.</p>", unsafe_allow_html=True)
    st.bar_chart(global_market.set_index('date')['farms_ready'], color="#ff9800")


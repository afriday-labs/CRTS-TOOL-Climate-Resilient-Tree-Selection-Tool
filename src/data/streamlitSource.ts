export const STREAMLIT_APP_CODE = `"""
SylvaClime — Climate-Resilient Tree Selection & Mapping Tool
=============================================================
A single-file interactive Streamlit + Pandas web application for landscape
architects and urban foresters to evaluate 52+ tree species against future
hardiness zones, summer heat extremes, drought stress, MAT (4°–20°C) risk
matrices, and live GBIF individual tree occurrence records (api.gbif.org).

Dependencies:
    pip install streamlit pandas altair

Run locally:
    streamlit run app.py
"""

import json
import urllib.parse
import urllib.request
import altair as alt
import pandas as pd
import streamlit as st

# ---------------------------------------------------------------------------
# 1. PAGE CONFIGURATION
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="SylvaClime | Climate Risk & Tree Selection",
    page_icon="🌳",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# 2. EMBEDDED 52-SPECIES BOTANICAL & CLIMATIC DATASET
# ---------------------------------------------------------------------------
@st.cache_data
def load_tree_database() -> pd.DataFrame:
    """Return an embedded DataFrame of 52 tree species, hardiness, native range, MAT niches, and GBIF record counts."""
    records = [
        # UK & European Broadleaves
        {"Species Name": "Quercus robur", "Common Name": "English / Pedunculate Oak", "Native Region": "Europe & Western Asia (inc. UK)", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H7", "Drought Tolerance": "Med", "Max Temp (°C)": 35, "Min Winter (°C)": -32, "Soil Preference": "Clay-tolerant", "Foliage": "Deciduous", "Records": 1719118, "MAT (°C)": 9.6, "MAT Min": 4, "MAT Opt Min": 7, "MAT Opt Max": 12, "MAT Max": 15, "Lat": 52.10, "Lon": 1.50},
        {"Species Name": "Quercus petraea", "Common Name": "Sessile Oak", "Native Region": "Europe & Anatolia (inc. UK)", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H7", "Drought Tolerance": "Med", "Max Temp (°C)": 36, "Min Winter (°C)": -30, "Soil Preference": "Acidic / Loamy", "Foliage": "Deciduous", "Records": 412500, "MAT (°C)": 9.3, "MAT Min": 4, "MAT Opt Min": 7, "MAT Opt Max": 12, "MAT Max": 15, "Lat": 53.20, "Lon": -3.50},
        {"Species Name": "Quercus cerris", "Common Name": "Turkey Oak", "Native Region": "Southern & Central Europe, Anatolia", "USDA Min": 5, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 40, "Min Winter (°C)": -24, "Soil Preference": "Chalk / Alkaline", "Foliage": "Deciduous", "Records": 38600, "MAT (°C)": 12.1, "MAT Min": 7, "MAT Opt Min": 9, "MAT Opt Max": 15, "MAT Max": 18, "Lat": 43.80, "Lon": 16.40},
        {"Species Name": "Fagus sylvatica", "Common Name": "European Beech", "Native Region": "Central & Western Europe (inc. UK)", "USDA Min": 5, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Low", "Max Temp (°C)": 31, "Min Winter (°C)": -27, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 684200, "MAT (°C)": 9.1, "MAT Min": 5, "MAT Opt Min": 7, "MAT Opt Max": 11, "MAT Max": 14, "Lat": 51.30, "Lon": 10.40},
        {"Species Name": "Betula pendula", "Common Name": "Silver Birch", "Native Region": "Europe to Siberia (inc. UK)", "USDA Min": 3, "USDA Max": 7, "UK Hardiness": "H7", "Drought Tolerance": "Low", "Max Temp (°C)": 30, "Min Winter (°C)": -38, "Soil Preference": "Acidic / Loamy", "Foliage": "Deciduous", "Records": 924100, "MAT (°C)": 7.4, "MAT Min": 3, "MAT Opt Min": 5, "MAT Opt Max": 10, "MAT Max": 13, "Lat": 59.30, "Lon": 18.10},
        {"Species Name": "Betula pubescens", "Common Name": "Downy Birch", "Native Region": "Northern Europe & Siberia (inc. UK)", "USDA Min": 2, "USDA Max": 7, "UK Hardiness": "H7", "Drought Tolerance": "Low", "Max Temp (°C)": 29, "Min Winter (°C)": -42, "Soil Preference": "Moist / Alluvial", "Foliage": "Deciduous", "Records": 512000, "MAT (°C)": 6.4, "MAT Min": 2, "MAT Opt Min": 4, "MAT Opt Max": 9, "MAT Max": 12, "Lat": 61.50, "Lon": 15.20},
        {"Species Name": "Betula utilis", "Common Name": "Himalayan Birch", "Native Region": "Western Himalayas & SW China", "USDA Min": 5, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 34, "Min Winter (°C)": -26, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 8940, "MAT (°C)": 10.2, "MAT Min": 5, "MAT Opt Min": 7, "MAT Opt Max": 13, "MAT Max": 16, "Lat": 30.80, "Lon": 79.10},
        {"Species Name": "Sorbus aucuparia", "Common Name": "Rowan / Mountain Ash", "Native Region": "Europe & Northern Asia (inc. UK)", "USDA Min": 3, "USDA Max": 7, "UK Hardiness": "H7", "Drought Tolerance": "Low", "Max Temp (°C)": 29, "Min Winter (°C)": -38, "Soil Preference": "Acidic / Loamy", "Foliage": "Deciduous", "Records": 845300, "MAT (°C)": 6.9, "MAT Min": 2, "MAT Opt Min": 4, "MAT Opt Max": 9, "MAT Max": 12, "Lat": 57.10, "Lon": -4.20},
        {"Species Name": "Sorbus aria", "Common Name": "Common Whitebeam", "Native Region": "Western & Central Europe (inc. UK)", "USDA Min": 5, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 37, "Min Winter (°C)": -26, "Soil Preference": "Chalk / Alkaline", "Foliage": "Deciduous", "Records": 44600, "MAT (°C)": 10.8, "MAT Min": 6, "MAT Opt Min": 8, "MAT Opt Max": 13, "MAT Max": 16, "Lat": 48.20, "Lon": 5.40},
        {"Species Name": "Sorbus intermedia", "Common Name": "Swedish Whitebeam", "Native Region": "Southern Scandinavia & Baltic", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H7", "Drought Tolerance": "Med", "Max Temp (°C)": 35, "Min Winter (°C)": -32, "Soil Preference": "Clay-tolerant", "Foliage": "Deciduous", "Records": 38900, "MAT (°C)": 9.2, "MAT Min": 4, "MAT Opt Min": 7, "MAT Opt Max": 12, "MAT Max": 15, "Lat": 57.70, "Lon": 14.20},
        {"Species Name": "Sorbus torminalis", "Common Name": "Wild Service Tree", "Native Region": "Europe, NW Africa & Anatolia (inc. S. UK)", "USDA Min": 5, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 38, "Min Winter (°C)": -24, "Soil Preference": "Clay-tolerant", "Foliage": "Deciduous", "Records": 28700, "MAT (°C)": 11.4, "MAT Min": 6, "MAT Opt Min": 9, "MAT Opt Max": 14, "MAT Max": 17, "Lat": 47.50, "Lon": 3.90},
        {"Species Name": "Acer campestre", "Common Name": "Field Maple", "Native Region": "Europe & Western Asia (inc. UK)", "USDA Min": 5, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 36, "Min Winter (°C)": -27, "Soil Preference": "Chalk / Alkaline", "Foliage": "Deciduous", "Records": 342600, "MAT (°C)": 10.4, "MAT Min": 5, "MAT Opt Min": 8, "MAT Opt Max": 13, "MAT Max": 16, "Lat": 50.10, "Lon": 8.60},
        {"Species Name": "Acer platanoides", "Common Name": "Norway Maple", "Native Region": "Continental Europe & Western Asia", "USDA Min": 3, "USDA Max": 8, "UK Hardiness": "H7", "Drought Tolerance": "Med", "Max Temp (°C)": 36, "Min Winter (°C)": -36, "Soil Preference": "Clay-tolerant", "Foliage": "Deciduous", "Records": 498000, "MAT (°C)": 8.9, "MAT Min": 3, "MAT Opt Min": 6, "MAT Opt Max": 12, "MAT Max": 15, "Lat": 54.40, "Lon": 18.60},
        {"Species Name": "Acer pseudoplatanus", "Common Name": "Sycamore", "Native Region": "Central, Southern & Western Europe", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 35, "Min Winter (°C)": -29, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 615000, "MAT (°C)": 9.5, "MAT Min": 4, "MAT Opt Min": 7, "MAT Opt Max": 12, "MAT Max": 15, "Lat": 47.30, "Lon": 11.40},
        {"Species Name": "Acer monspessulanum", "Common Name": "Montpellier Maple", "Native Region": "Mediterranean Basin & SW Germany", "USDA Min": 6, "USDA Max": 9, "UK Hardiness": "H5", "Drought Tolerance": "High", "Max Temp (°C)": 41, "Min Winter (°C)": -20, "Soil Preference": "Chalk / Alkaline", "Foliage": "Deciduous", "Records": 18400, "MAT (°C)": 13.2, "MAT Min": 8, "MAT Opt Min": 10, "MAT Opt Max": 16, "MAT Max": 19, "Lat": 43.60, "Lon": 3.90},
        {"Species Name": "Tilia cordata", "Common Name": "Small-Leaved Lime", "Native Region": "Europe & Western Asia (inc. UK)", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 35, "Min Winter (°C)": -32, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 262500, "MAT (°C)": 8.8, "MAT Min": 4, "MAT Opt Min": 7, "MAT Opt Max": 11, "MAT Max": 14, "Lat": 52.20, "Lon": 14.10},
        {"Species Name": "Tilia tomentosa", "Common Name": "Silver Lime", "Native Region": "SE Europe & Western Asia", "USDA Min": 5, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 40, "Min Winter (°C)": -26, "Soil Preference": "Chalk / Alkaline", "Foliage": "Deciduous", "Records": 12340, "MAT (°C)": 12.2, "MAT Min": 7, "MAT Opt Min": 10, "MAT Opt Max": 15, "MAT Max": 18, "Lat": 43.20, "Lon": 25.60},
        {"Species Name": "Carpinus betulus", "Common Name": "European Hornbeam", "Native Region": "Europe & Western Asia (inc. S. UK)", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 35, "Min Winter (°C)": -30, "Soil Preference": "Clay-tolerant", "Foliage": "Deciduous", "Records": 318900, "MAT (°C)": 9.8, "MAT Min": 5, "MAT Opt Min": 8, "MAT Opt Max": 12, "MAT Max": 15, "Lat": 49.40, "Lon": 6.20},
        {"Species Name": "Alnus glutinosa", "Common Name": "Common Alder", "Native Region": "Europe, Western Asia & N. Africa (inc. UK)", "USDA Min": 3, "USDA Max": 7, "UK Hardiness": "H7", "Drought Tolerance": "Low", "Max Temp (°C)": 33, "Min Winter (°C)": -36, "Soil Preference": "Moist / Alluvial", "Foliage": "Deciduous", "Records": 584000, "MAT (°C)": 8.6, "MAT Min": 3, "MAT Opt Min": 6, "MAT Opt Max": 11, "MAT Max": 14, "Lat": 53.80, "Lon": 9.90},
        {"Species Name": "Alnus cordata", "Common Name": "Italian Alder", "Native Region": "Southern Italy & Corsica", "USDA Min": 6, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 39, "Min Winter (°C)": -20, "Soil Preference": "Chalk / Alkaline", "Foliage": "Deciduous", "Records": 11800, "MAT (°C)": 12.6, "MAT Min": 7, "MAT Opt Min": 10, "MAT Opt Max": 15, "MAT Max": 18, "Lat": 40.60, "Lon": 15.80},
        {"Species Name": "Fraxinus excelsior", "Common Name": "European Ash", "Native Region": "Europe & Western Asia (inc. UK)", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H7", "Drought Tolerance": "Med", "Max Temp (°C)": 34, "Min Winter (°C)": -32, "Soil Preference": "Chalk / Alkaline", "Foliage": "Deciduous", "Records": 742000, "MAT (°C)": 9.0, "MAT Min": 4, "MAT Opt Min": 7, "MAT Opt Max": 11, "MAT Max": 14, "Lat": 52.80, "Lon": 1.10},
        {"Species Name": "Fraxinus ornus", "Common Name": "Manna / Flowering Ash", "Native Region": "Mediterranean & SE Europe", "USDA Min": 6, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 40, "Min Winter (°C)": -22, "Soil Preference": "Chalk / Alkaline", "Foliage": "Deciduous", "Records": 36400, "MAT (°C)": 13.1, "MAT Min": 7, "MAT Opt Min": 10, "MAT Opt Max": 16, "MAT Max": 19, "Lat": 42.40, "Lon": 13.40},
        {"Species Name": "Crataegus monogyna", "Common Name": "Common Hawthorn", "Native Region": "Europe, NW Africa & W. Asia (inc. UK)", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H7", "Drought Tolerance": "High", "Max Temp (°C)": 37, "Min Winter (°C)": -30, "Soil Preference": "Clay-tolerant", "Foliage": "Deciduous", "Records": 892000, "MAT (°C)": 9.8, "MAT Min": 4, "MAT Opt Min": 7, "MAT Opt Max": 13, "MAT Max": 16, "Lat": 51.90, "Lon": -0.90},
        {"Species Name": "Corylus avellana", "Common Name": "Common Hazel", "Native Region": "Europe & Western Asia (inc. UK)", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 35, "Min Winter (°C)": -29, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 645000, "MAT (°C)": 9.4, "MAT Min": 4, "MAT Opt Min": 7, "MAT Opt Max": 12, "MAT Max": 15, "Lat": 52.40, "Lon": 6.80},
        {"Species Name": "Corylus colurna", "Common Name": "Turkish Hazel", "Native Region": "SE Europe & Western Asia", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 40, "Min Winter (°C)": -29, "Soil Preference": "Chalk / Alkaline", "Foliage": "Deciduous", "Records": 4850, "MAT (°C)": 11.8, "MAT Min": 6, "MAT Opt Min": 9, "MAT Opt Max": 15, "MAT Max": 18, "Lat": 41.20, "Lon": 28.90},
        {"Species Name": "Castanea sativa", "Common Name": "Sweet Chestnut", "Native Region": "Southern Europe & Asia Minor", "USDA Min": 5, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 39, "Min Winter (°C)": -23, "Soil Preference": "Acidic / Loamy", "Foliage": "Deciduous", "Records": 168400, "MAT (°C)": 12.1, "MAT Min": 7, "MAT Opt Min": 9, "MAT Opt Max": 15, "MAT Max": 18, "Lat": 43.40, "Lon": 11.30},
        {"Species Name": "Juglans regia", "Common Name": "Common / Persian Walnut", "Native Region": "SE Europe to Central Asia", "USDA Min": 5, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 39, "Min Winter (°C)": -23, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 112800, "MAT (°C)": 11.9, "MAT Min": 7, "MAT Opt Min": 9, "MAT Opt Max": 15, "MAT Max": 18, "Lat": 40.90, "Lon": 68.50},
        {"Species Name": "Prunus avium", "Common Name": "Wild Cherry / Gean", "Native Region": "Europe, Anatolia & NW Africa (inc. UK)", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 36, "Min Winter (°C)": -29, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 388000, "MAT (°C)": 10.1, "MAT Min": 5, "MAT Opt Min": 8, "MAT Opt Max": 13, "MAT Max": 16, "Lat": 50.80, "Lon": 7.10},
        {"Species Name": "Prunus padus", "Common Name": "Bird Cherry", "Native Region": "Northern Europe & Asia (inc. N. UK)", "USDA Min": 3, "USDA Max": 7, "UK Hardiness": "H7", "Drought Tolerance": "Low", "Max Temp (°C)": 31, "Min Winter (°C)": -38, "Soil Preference": "Moist / Alluvial", "Foliage": "Deciduous", "Records": 312000, "MAT (°C)": 7.4, "MAT Min": 2, "MAT Opt Min": 5, "MAT Opt Max": 10, "MAT Max": 13, "Lat": 58.20, "Lon": 13.40},
        {"Species Name": "Salix alba", "Common Name": "White Willow", "Native Region": "Europe & Western/Central Asia (inc. UK)", "USDA Min": 3, "USDA Max": 8, "UK Hardiness": "H7", "Drought Tolerance": "Low", "Max Temp (°C)": 36, "Min Winter (°C)": -36, "Soil Preference": "Moist / Alluvial", "Foliage": "Deciduous", "Records": 289000, "MAT (°C)": 9.8, "MAT Min": 4, "MAT Opt Min": 7, "MAT Opt Max": 13, "MAT Max": 16, "Lat": 52.00, "Lon": 5.10},
        {"Species Name": "Populus tremula", "Common Name": "European Aspen", "Native Region": "Europe & Northern Asia (inc. UK)", "USDA Min": 2, "USDA Max": 7, "UK Hardiness": "H7", "Drought Tolerance": "Med", "Max Temp (°C)": 34, "Min Winter (°C)": -42, "Soil Preference": "Acidic / Loamy", "Foliage": "Deciduous", "Records": 348000, "MAT (°C)": 7.8, "MAT Min": 2, "MAT Opt Min": 5, "MAT Opt Max": 11, "MAT Max": 14, "Lat": 59.90, "Lon": 10.70},
        {"Species Name": "Populus nigra", "Common Name": "Black Poplar", "Native Region": "Europe, SW Asia & NW Africa (inc. UK)", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 37, "Min Winter (°C)": -30, "Soil Preference": "Moist / Alluvial", "Foliage": "Deciduous", "Records": 118500, "MAT (°C)": 10.7, "MAT Min": 5, "MAT Opt Min": 8, "MAT Opt Max": 14, "MAT Max": 17, "Lat": 51.80, "Lon": -0.50},

        # Mediterranean & Climate-Future Trees
        {"Species Name": "Quercus suber", "Common Name": "Cork Oak", "Native Region": "Western Mediterranean Basin", "USDA Min": 8, "USDA Max": 10, "UK Hardiness": "H4", "Drought Tolerance": "High", "Max Temp (°C)": 43, "Min Winter (°C)": -12, "Soil Preference": "Sandy / Rocky", "Foliage": "Evergreen", "Records": 28410, "MAT (°C)": 15.8, "MAT Min": 10, "MAT Opt Min": 13, "MAT Opt Max": 18, "MAT Max": 21, "Lat": 39.50, "Lon": -7.80},
        {"Species Name": "Quercus ilex", "Common Name": "Holm Oak", "Native Region": "Mediterranean Basin", "USDA Min": 7, "USDA Max": 10, "UK Hardiness": "H5", "Drought Tolerance": "High", "Max Temp (°C)": 41, "Min Winter (°C)": -15, "Soil Preference": "Chalk / Alkaline", "Foliage": "Evergreen", "Records": 148320, "MAT (°C)": 14.2, "MAT Min": 8, "MAT Opt Min": 11, "MAT Opt Max": 17, "MAT Max": 20, "Lat": 41.90, "Lon": 12.50},
        {"Species Name": "Olea europaea", "Common Name": "European Olive", "Native Region": "Mediterranean Basin", "USDA Min": 8, "USDA Max": 11, "UK Hardiness": "H4", "Drought Tolerance": "High", "Max Temp (°C)": 45, "Min Winter (°C)": -10, "Soil Preference": "Sandy / Rocky", "Foliage": "Evergreen", "Records": 112200, "MAT (°C)": 16.4, "MAT Min": 11, "MAT Opt Min": 14, "MAT Opt Max": 20, "MAT Max": 23, "Lat": 37.98, "Lon": 23.72},
        {"Species Name": "Celtis australis", "Common Name": "Mediterranean Hackberry", "Native Region": "Mediterranean Basin & W. Asia", "USDA Min": 7, "USDA Max": 10, "UK Hardiness": "H4", "Drought Tolerance": "High", "Max Temp (°C)": 43, "Min Winter (°C)": -15, "Soil Preference": "Chalk / Alkaline", "Foliage": "Deciduous", "Records": 24800, "MAT (°C)": 14.9, "MAT Min": 9, "MAT Opt Min": 12, "MAT Opt Max": 18, "MAT Max": 21, "Lat": 41.40, "Lon": 2.10},
        {"Species Name": "Arbutus unedo", "Common Name": "Strawberry Tree", "Native Region": "Mediterranean & SW Ireland", "USDA Min": 7, "USDA Max": 10, "UK Hardiness": "H5", "Drought Tolerance": "High", "Max Temp (°C)": 40, "Min Winter (°C)": -14, "Soil Preference": "Sandy / Rocky", "Foliage": "Evergreen", "Records": 48200, "MAT (°C)": 13.8, "MAT Min": 8, "MAT Opt Min": 11, "MAT Opt Max": 17, "MAT Max": 20, "Lat": 38.70, "Lon": -9.10},
        {"Species Name": "Morus nigra", "Common Name": "Black Mulberry", "Native Region": "Western Asia (naturalised Europe)", "USDA Min": 6, "USDA Max": 9, "UK Hardiness": "H5", "Drought Tolerance": "High", "Max Temp (°C)": 41, "Min Winter (°C)": -18, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 7400, "MAT (°C)": 13.9, "MAT Min": 8, "MAT Opt Min": 11, "MAT Opt Max": 17, "MAT Max": 20, "Lat": 36.80, "Lon": 51.20},
        {"Species Name": "Platanus × acerifolia", "Common Name": "London Plane", "Native Region": "Cultivated Hybrid (Europe / N. America)", "USDA Min": 5, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 41, "Min Winter (°C)": -26, "Soil Preference": "Clay-tolerant", "Foliage": "Deciduous", "Records": 38900, "MAT (°C)": 12.8, "MAT Min": 7, "MAT Opt Min": 10, "MAT Opt Max": 16, "MAT Max": 19, "Lat": 48.80, "Lon": 2.35},

        # East Asian Urban & Resilient Species
        {"Species Name": "Ginkgo biloba", "Common Name": "Maidenhair Tree", "Native Region": "East Asia (Eastern China)", "USDA Min": 4, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 39, "Min Winter (°C)": -31, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 34500, "MAT (°C)": 13.4, "MAT Min": 7, "MAT Opt Min": 10, "MAT Opt Max": 16, "MAT Max": 20, "Lat": 30.30, "Lon": 119.40},
        {"Species Name": "Zelkova serrata", "Common Name": "Japanese Zelkova", "Native Region": "East Asia (Japan, Korea, China)", "USDA Min": 5, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 38, "Min Winter (°C)": -26, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 16800, "MAT (°C)": 12.9, "MAT Min": 7, "MAT Opt Min": 10, "MAT Opt Max": 16, "MAT Max": 19, "Lat": 35.70, "Lon": 138.90},
        {"Species Name": "Ulmus parvifolia", "Common Name": "Chinese Lacebark Elm", "Native Region": "East Asia (China, Japan, Korea)", "USDA Min": 5, "USDA Max": 10, "UK Hardiness": "H5", "Drought Tolerance": "High", "Max Temp (°C)": 42, "Min Winter (°C)": -25, "Soil Preference": "Clay-tolerant", "Foliage": "Deciduous", "Records": 14200, "MAT (°C)": 14.5, "MAT Min": 8, "MAT Opt Min": 11, "MAT Opt Max": 17, "MAT Max": 21, "Lat": 32.10, "Lon": 118.80},
        {"Species Name": "Pistacia chinensis", "Common Name": "Chinese Pistache", "Native Region": "East Asia (Central & S. China)", "USDA Min": 6, "USDA Max": 10, "UK Hardiness": "H5", "Drought Tolerance": "High", "Max Temp (°C)": 43, "Min Winter (°C)": -20, "Soil Preference": "Sandy / Rocky", "Foliage": "Deciduous", "Records": 6150, "MAT (°C)": 15.1, "MAT Min": 9, "MAT Opt Min": 12, "MAT Opt Max": 18, "MAT Max": 21, "Lat": 34.30, "Lon": 108.90},
        {"Species Name": "Koelreuteria paniculata", "Common Name": "Golden Rain Tree", "Native Region": "East Asia (China & Korea)", "USDA Min": 5, "USDA Max": 9, "UK Hardiness": "H5", "Drought Tolerance": "High", "Max Temp (°C)": 41, "Min Winter (°C)": -24, "Soil Preference": "Chalk / Alkaline", "Foliage": "Deciduous", "Records": 19400, "MAT (°C)": 13.7, "MAT Min": 8, "MAT Opt Min": 10, "MAT Opt Max": 17, "MAT Max": 20, "Lat": 36.20, "Lon": 114.30},
        {"Species Name": "Styphnolobium japonicum", "Common Name": "Japanese Pagoda Tree", "Native Region": "East Asia (China)", "USDA Min": 5, "USDA Max": 9, "UK Hardiness": "H5", "Drought Tolerance": "High", "Max Temp (°C)": 41, "Min Winter (°C)": -25, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 8200, "MAT (°C)": 13.4, "MAT Min": 8, "MAT Opt Min": 10, "MAT Opt Max": 16, "MAT Max": 20, "Lat": 35.10, "Lon": 112.90},
        {"Species Name": "Lagerstroemia indica", "Common Name": "Crape Myrtle", "Native Region": "East & South Asia", "USDA Min": 7, "USDA Max": 10, "UK Hardiness": "H4", "Drought Tolerance": "High", "Max Temp (°C)": 44, "Min Winter (°C)": -16, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 28850, "MAT (°C)": 16.5, "MAT Min": 10, "MAT Opt Min": 13, "MAT Opt Max": 20, "MAT Max": 23, "Lat": 26.80, "Lon": 112.60},
        {"Species Name": "Magnolia grandiflora", "Common Name": "Southern Magnolia", "Native Region": "Southeastern North America", "USDA Min": 7, "USDA Max": 10, "UK Hardiness": "H5", "Drought Tolerance": "Med", "Max Temp (°C)": 41, "Min Winter (°C)": -18, "Soil Preference": "Acidic / Loamy", "Foliage": "Evergreen", "Records": 68400, "MAT (°C)": 15.7, "MAT Min": 9, "MAT Opt Min": 12, "MAT Opt Max": 19, "MAT Max": 22, "Lat": 31.80, "Lon": -84.20},

        # North American Broadleaves
        {"Species Name": "Quercus rubra", "Common Name": "Northern Red Oak", "Native Region": "Eastern & Central North America", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 37, "Min Winter (°C)": -32, "Soil Preference": "Acidic / Loamy", "Foliage": "Deciduous", "Records": 295400, "MAT (°C)": 10.6, "MAT Min": 5, "MAT Opt Min": 8, "MAT Opt Max": 14, "MAT Max": 17, "Lat": 42.10, "Lon": -76.50},
        {"Species Name": "Quercus palustris", "Common Name": "Pin Oak", "Native Region": "Eastern & Central North America", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 38, "Min Winter (°C)": -31, "Soil Preference": "Moist / Alluvial", "Foliage": "Deciduous", "Records": 84200, "MAT (°C)": 11.4, "MAT Min": 6, "MAT Opt Min": 8, "MAT Opt Max": 14, "MAT Max": 17, "Lat": 39.80, "Lon": -86.10},
        {"Species Name": "Cercis canadensis", "Common Name": "Eastern Redbud", "Native Region": "Eastern North America", "USDA Min": 4, "USDA Max": 9, "UK Hardiness": "H5", "Drought Tolerance": "Med", "Max Temp (°C)": 37, "Min Winter (°C)": -30, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 92100, "MAT (°C)": 13.0, "MAT Min": 7, "MAT Opt Min": 10, "MAT Opt Max": 16, "MAT Max": 19, "Lat": 38.20, "Lon": -84.50},
        {"Species Name": "Acer rubrum", "Common Name": "Red Maple", "Native Region": "Eastern & Central North America", "USDA Min": 3, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "Low", "Max Temp (°C)": 35, "Min Winter (°C)": -34, "Soil Preference": "Acidic / Loamy", "Foliage": "Deciduous", "Records": 364200, "MAT (°C)": 10.9, "MAT Min": 5, "MAT Opt Min": 8, "MAT Opt Max": 14, "MAT Max": 17, "Lat": 42.90, "Lon": -73.80},
        {"Species Name": "Liquidambar styraciflua", "Common Name": "American Sweetgum", "Native Region": "Eastern North America & Mexico", "USDA Min": 5, "USDA Max": 9, "UK Hardiness": "H5", "Drought Tolerance": "Med", "Max Temp (°C)": 39, "Min Winter (°C)": -24, "Soil Preference": "Moist / Alluvial", "Foliage": "Deciduous", "Records": 178500, "MAT (°C)": 14.1, "MAT Min": 8, "MAT Opt Min": 11, "MAT Opt Max": 17, "MAT Max": 20, "Lat": 35.60, "Lon": -78.60},
        {"Species Name": "Liriodendron tulipifera", "Common Name": "Tulip Tree", "Native Region": "Eastern North America", "USDA Min": 4, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 37, "Min Winter (°C)": -28, "Soil Preference": "Well-drained Loam", "Foliage": "Deciduous", "Records": 152000, "MAT (°C)": 12.4, "MAT Min": 7, "MAT Opt Min": 9, "MAT Opt Max": 15, "MAT Max": 18, "Lat": 37.50, "Lon": -79.40},
        {"Species Name": "Gleditsia triacanthos", "Common Name": "Honey Locust", "Native Region": "Central & Eastern North America", "USDA Min": 4, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 41, "Min Winter (°C)": -30, "Soil Preference": "Clay-tolerant", "Foliage": "Deciduous", "Records": 74500, "MAT (°C)": 12.8, "MAT Min": 7, "MAT Opt Min": 9, "MAT Opt Max": 16, "MAT Max": 19, "Lat": 38.60, "Lon": -90.20},
        {"Species Name": "Robinia pseudoacacia", "Common Name": "Black Locust", "Native Region": "Eastern & Central North America", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 40, "Min Winter (°C)": -31, "Soil Preference": "Sandy / Rocky", "Foliage": "Deciduous", "Records": 386000, "MAT (°C)": 11.7, "MAT Min": 6, "MAT Opt Min": 9, "MAT Opt Max": 15, "MAT Max": 18, "Lat": 36.50, "Lon": -82.50},

        # Conifers
        {"Species Name": "Pinus sylvestris", "Common Name": "Scots Pine", "Native Region": "Northern Europe & Asia (inc. Scotland)", "USDA Min": 2, "USDA Max": 7, "UK Hardiness": "H7", "Drought Tolerance": "Med", "Max Temp (°C)": 33, "Min Winter (°C)": -42, "Soil Preference": "Sandy / Rocky", "Foliage": "Conifer", "Records": 789400, "MAT (°C)": 7.2, "MAT Min": 2, "MAT Opt Min": 5, "MAT Opt Max": 10, "MAT Max": 13, "Lat": 60.40, "Lon": 24.90},
        {"Species Name": "Pinus nigra", "Common Name": "Corsican / Austrian Pine", "Native Region": "Southern Europe, Corsica & Anatolia", "USDA Min": 4, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 39, "Min Winter (°C)": -28, "Soil Preference": "Chalk / Alkaline", "Foliage": "Conifer", "Records": 92400, "MAT (°C)": 11.1, "MAT Min": 6, "MAT Opt Min": 8, "MAT Opt Max": 14, "MAT Max": 17, "Lat": 42.10, "Lon": 9.10},
        {"Species Name": "Pinus pinea", "Common Name": "Stone Pine", "Native Region": "Mediterranean Basin", "USDA Min": 8, "USDA Max": 11, "UK Hardiness": "H4", "Drought Tolerance": "High", "Max Temp (°C)": 44, "Min Winter (°C)": -11, "Soil Preference": "Sandy / Rocky", "Foliage": "Conifer", "Records": 24400, "MAT (°C)": 15.9, "MAT Min": 10, "MAT Opt Min": 13, "MAT Opt Max": 19, "MAT Max": 22, "Lat": 41.20, "Lon": 13.00},
        {"Species Name": "Taxus baccata", "Common Name": "English Yew", "Native Region": "Europe, NW Africa & W. Asia (inc. UK)", "USDA Min": 5, "USDA Max": 8, "UK Hardiness": "H7", "Drought Tolerance": "High", "Max Temp (°C)": 36, "Min Winter (°C)": -26, "Soil Preference": "Chalk / Alkaline", "Foliage": "Conifer", "Records": 214500, "MAT (°C)": 9.9, "MAT Min": 5, "MAT Opt Min": 7, "MAT Opt Max": 13, "MAT Max": 16, "Lat": 51.20, "Lon": -0.30},
        {"Species Name": "Cedrus atlantica", "Common Name": "Atlas Cedar", "Native Region": "North Africa (Atlas Mts.)", "USDA Min": 6, "USDA Max": 9, "UK Hardiness": "H6", "Drought Tolerance": "High", "Max Temp (°C)": 40, "Min Winter (°C)": -22, "Soil Preference": "Well-drained Loam", "Foliage": "Conifer", "Records": 8420, "MAT (°C)": 13.1, "MAT Min": 8, "MAT Opt Min": 10, "MAT Opt Max": 16, "MAT Max": 19, "Lat": 33.40, "Lon": -5.20},
        {"Species Name": "Cedrus deodara", "Common Name": "Deodar Cedar", "Native Region": "Western Himalayas", "USDA Min": 7, "USDA Max": 9, "UK Hardiness": "H5", "Drought Tolerance": "Med", "Max Temp (°C)": 39, "Min Winter (°C)": -17, "Soil Preference": "Well-drained Loam", "Foliage": "Conifer", "Records": 13800, "MAT (°C)": 13.0, "MAT Min": 8, "MAT Opt Min": 10, "MAT Opt Max": 16, "MAT Max": 19, "Lat": 32.20, "Lon": 76.30},
        {"Species Name": "Cupressus sempervirens", "Common Name": "Mediterranean Cypress", "Native Region": "Eastern Mediterranean Basin", "USDA Min": 7, "USDA Max": 10, "UK Hardiness": "H4", "Drought Tolerance": "High", "Max Temp (°C)": 44, "Min Winter (°C)": -14, "Soil Preference": "Sandy / Rocky", "Foliage": "Conifer", "Records": 38200, "MAT (°C)": 15.4, "MAT Min": 9, "MAT Opt Min": 12, "MAT Opt Max": 19, "MAT Max": 22, "Lat": 37.50, "Lon": 22.80},
        {"Species Name": "Taxodium distichum", "Common Name": "Bald Cypress", "Native Region": "Southeastern North America", "USDA Min": 4, "USDA Max": 10, "UK Hardiness": "H5", "Drought Tolerance": "High", "Max Temp (°C)": 42, "Min Winter (°C)": -26, "Soil Preference": "Moist / Alluvial", "Foliage": "Conifer", "Records": 41400, "MAT (°C)": 15.6, "MAT Min": 9, "MAT Opt Min": 12, "MAT Opt Max": 19, "MAT Max": 22, "Lat": 30.40, "Lon": -89.80},
        {"Species Name": "Metasequoia glyptostroboides", "Common Name": "Dawn Redwood", "Native Region": "South-Central China (Hubei/Sichuan)", "USDA Min": 5, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Low", "Max Temp (°C)": 36, "Min Winter (°C)": -26, "Soil Preference": "Moist / Alluvial", "Foliage": "Conifer", "Records": 6850, "MAT (°C)": 12.1, "MAT Min": 7, "MAT Opt Min": 9, "MAT Opt Max": 15, "MAT Max": 18, "Lat": 30.20, "Lon": 108.70},
        {"Species Name": "Sequoiadendron giganteum", "Common Name": "Giant Redwood / Wellingtonia", "Native Region": "California (Sierra Nevada)", "USDA Min": 6, "USDA Max": 8, "UK Hardiness": "H6", "Drought Tolerance": "Med", "Max Temp (°C)": 36, "Min Winter (°C)": -23, "Soil Preference": "Well-drained Loam", "Foliage": "Conifer", "Records": 11600, "MAT (°C)": 10.4, "MAT Min": 6, "MAT Opt Min": 8, "MAT Opt Max": 13, "MAT Max": 16, "Lat": 36.60, "Lon": -118.80},
        {"Species Name": "Picea abies", "Common Name": "Norway Spruce", "Native Region": "Northern, Central & Eastern Europe", "USDA Min": 3, "USDA Max": 7, "UK Hardiness": "H7", "Drought Tolerance": "Low", "Max Temp (°C)": 30, "Min Winter (°C)": -40, "Soil Preference": "Acidic / Loamy", "Foliage": "Conifer", "Records": 618000, "MAT (°C)": 6.8, "MAT Min": 2, "MAT Opt Min": 4, "MAT Opt Max": 9, "MAT Max": 12, "Lat": 60.80, "Lon": 11.50},
        {"Species Name": "Larix decidua", "Common Name": "European Larch", "Native Region": "Central European Mountains (Alps)", "USDA Min": 3, "USDA Max": 7, "UK Hardiness": "H7", "Drought Tolerance": "Low", "Max Temp (°C)": 31, "Min Winter (°C)": -38, "Soil Preference": "Well-drained Loam", "Foliage": "Conifer", "Records": 228000, "MAT (°C)": 7.1, "MAT Min": 2, "MAT Opt Min": 4, "MAT Opt Max": 9, "MAT Max": 13, "Lat": 46.80, "Lon": 10.20},
    ]
    return pd.DataFrame(records)


# ---------------------------------------------------------------------------
# 3. RECORD CONFIDENCE, MAT RISK & LIVE GBIF API HELPERS
# ---------------------------------------------------------------------------
def classify_records_level(count: float) -> str:
    """Classify record confidence as Low (Red), Medium (Amber), or Good (Green)."""
    if pd.isna(count) or count <= 0:
        return "Low"
    if count < 100:
        return "Low" if count < 10 else ("Medium" if count < 20 else "Good")
    return "Low" if count < 10000 else ("Medium" if count < 50000 else "Good")


def mat_risk_score(row: pd.Series, mat_c: float) -> int:
    """Return BGCI-style 0–3 MAT risk score (3=Green, 2=Amber, 1=Orange, 0=Red)."""
    if row["MAT Opt Min"] <= mat_c <= row["MAT Opt Max"]:
        return 3
    if (row["MAT Opt Min"] - 1.8 <= mat_c < row["MAT Opt Min"]) or (
        row["MAT Opt Max"] < mat_c <= row["MAT Opt Max"] + 1.5
    ):
        return 2
    if row["MAT Min"] <= mat_c <= row["MAT Max"]:
        return 1
    return 0


@st.cache_data(ttl=3600)
def query_gbif_occurrences(species_name: str, limit: int = 100) -> dict:
    """Query live GBIF species match and individual georeferenced tree occurrence records with dates."""
    clean = species_name.replace("×", "x").strip()
    match_url = f"https://api.gbif.org/v1/species/match?name={urllib.parse.quote(clean)}"
    with urllib.request.urlopen(match_url, timeout=12) as resp:
        match_data = json.loads(resp.read().decode("utf-8"))

    taxon_key = match_data.get("acceptedUsageKey") or match_data.get("usageKey")
    if not taxon_key:
        return {"total": 0, "uk_total": 0, "countries": [], "df": pd.DataFrame()}

    occ_url = (
        f"https://api.gbif.org/v1/occurrence/search?taxonKey={taxon_key}"
        f"&hasCoordinate=true&hasGeospatialIssue=false&limit={limit}"
        f"&facet=country&facetLimit=8"
    )
    with urllib.request.urlopen(occ_url, timeout=12) as resp:
        occ_data = json.loads(resp.read().decode("utf-8"))

    rows = []
    for r in occ_data.get("results", []):
        lat = r.get("decimalLatitude")
        lon = r.get("decimalLongitude")
        if not (isinstance(lat, (int, float)) and isinstance(lon, (int, float))):
            continue
        ev_date = r.get("eventDate")
        if isinstance(ev_date, str) and len(ev_date) >= 10:
            ev_date = ev_date[:10]
        elif r.get("year"):
            ev_date = str(r.get("year"))
        else:
            ev_date = "Undated"

        rows.append({
            "GBIF ID": r.get("key"),
            "Event Date": ev_date,
            "Year": r.get("year"),
            "Country": r.get("country") or r.get("countryCode") or "—",
            "Locality": r.get("locality") or r.get("stateProvince") or "—",
            "Elevation (m)": r.get("elevation"),
            "Record Type": str(r.get("basisOfRecord") or "").replace("_", " ").title(),
            "Institution": r.get("institutionCode") or "—",
            "lat": round(float(lat), 4),
            "lon": round(float(lon), 4),
        })

    facets = occ_data.get("facets", [])
    countries = facets[0].get("counts", []) if facets else []
    uk_entry = next((c["count"] for c in countries if c.get("name") == "GB"), 0)

    return {
        "total": int(occ_data.get("count", len(rows))),
        "uk_total": int(uk_entry),
        "countries": countries,
        "df": pd.DataFrame(rows),
    }


@st.cache_data(ttl=3600)
def search_gbif_species(query: str) -> pd.DataFrame:
    """Search GBIF Backbone Taxonomy for accepted tree/plant species and fetch live occurrence counts."""
    url = (
        f"https://api.gbif.org/v1/species/search?q={urllib.parse.quote(query.strip())}"
        "&rank=SPECIES&status=ACCEPTED&datasetKey=d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"
        "&highertaxonKey=7707728&limit=25"
    )
    with urllib.request.urlopen(url, timeout=12) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    seen = set()
    rows = []
    for item in data.get("results", []):
        name = item.get("canonicalName") or item.get("scientificName") or ""
        if not name or item.get("nameType") == "HYBRID" or " x " in name or "×" in name:
            continue
        if name in seen:
            continue
        seen.add(name)
        key = item.get("key")
        cnt = 0
        if key:
            try:
                c_url = f"https://api.gbif.org/v1/occurrence/search?taxonKey={key}&hasCoordinate=true&limit=0"
                with urllib.request.urlopen(c_url, timeout=6) as cr:
                    cnt = int(json.loads(cr.read().decode("utf-8")).get("count", 0))
            except Exception:
                cnt = 0
        rows.append({
            "Species Name": name,
            "Family": item.get("family") or "—",
            "Taxon Key": key,
            "Live GBIF Records": cnt,
            "Confidence": classify_records_level(cnt),
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# 4. RESILIENCE SCORING MODEL
# ---------------------------------------------------------------------------
DROUGHT_RANK = {"Low": 1, "Med": 2, "High": 3}
STRESS_RANK = {"Low": 1, "Moderate": 2, "Severe": 3}


def classify_resilience(
    row: pd.Series,
    eff_mat_c: float,
    summer_max_c: int,
    drought_stress: str,
) -> tuple[str, int]:
    """Classify each tree species as Fully Resilient, Borderline, or Unsuited using MAT, heat & drought."""
    mat_risk = mat_risk_score(row, eff_mat_c)
    mat_score = 0 if mat_risk == 3 else (1 if mat_risk >= 1 else 2)

    thermal_margin = int(row["Max Temp (°C)"]) - summer_max_c
    if thermal_margin >= 1:
        heat_score = 0
    elif thermal_margin >= -2:
        heat_score = 1
    else:
        heat_score = 2

    drought_delta = DROUGHT_RANK[row["Drought Tolerance"]] - STRESS_RANK[drought_stress]
    drought_score = 0 if drought_delta >= 0 else (1 if drought_delta == -1 else 2)

    worst = max(mat_score, heat_score, drought_score)
    status = (
        "Fully Resilient" if worst == 0
        else ("Borderline" if worst == 1 else "Unsuited")
    )
    return status, thermal_margin


# ---------------------------------------------------------------------------
# 5. UK SITE PRESETS & SIDEBAR CONTROLS
# ---------------------------------------------------------------------------
df_raw = load_tree_database()

@st.cache_data(ttl=3600)
def calibrate_custom_coordinates(lat: float, lon: float) -> dict:
    """Fetch CMIP6 baseline climate metrics from Open-Meteo for custom coordinates."""
    url = (
        f"https://climate-api.open-meteo.com/v1/climate?latitude={lat:.3f}"
        f"&longitude={lon:.3f}&start_date=2018-01-01&end_date=2022-12-31"
        "&models=MRI_AGCM3_2_S&daily=temperature_2m_max,temperature_2m_min,precipitation_sum"
    )
    with urllib.request.urlopen(url, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    daily = data.get("daily", {})
    tmax = sorted([v for v in daily.get("temperature_2m_max", []) if isinstance(v, (int, float))])
    tmin = sorted([v for v in daily.get("temperature_2m_min", []) if isinstance(v, (int, float))])
    precip = [v for v in daily.get("precipitation_sum", []) if isinstance(v, (int, float))]
    if not tmax or not tmin:
        raise ValueError("Insufficient climate series returned for these coordinates.")

    p98_max = tmax[min(len(tmax) - 1, int(len(tmax) * 0.985))]
    p85_max = tmax[min(len(tmax) - 1, int(len(tmax) * 0.85))]
    p02_min = tmin[max(0, int(len(tmin) * 0.015))]
    mat_c = round(((sum(tmax) / len(tmax)) + (sum(tmin) / len(tmin))) / 2.0, 1)
    years = max(1.0, len(precip) / 365.0)
    annual_precip = round(sum(precip) / years) if precip else 700
    peak_c = round(min(46, max(22, p98_max)))
    mean_high_c = round(min(peak_c, max(15, p85_max)))
    winter_min = round(p02_min)

    drought = (
        "Severe" if (annual_precip < 520 or peak_c >= 39)
        else ("Moderate" if (annual_precip < 820 or peak_c >= 33) else "Low")
    )
    return {
        "summer": (mean_high_c, peak_c),
        "mat": mat_c,
        "drought": drought,
        "winter_min": winter_min,
        "precip": annual_precip,
    }


UK_LOCATIONS = {
    "London": {"summer": (24, 35), "mat": 11.5, "drought": "Moderate"},
    "Cambridge": {"summer": (23, 34), "mat": 10.8, "drought": "Moderate"},
    "Exeter": {"summer": (21, 31), "mat": 11.1, "drought": "Low"},
    "Manchester": {"summer": (20, 30), "mat": 10.0, "drought": "Low"},
    "Edinburgh": {"summer": (18, 28), "mat": 9.0, "drought": "Low"},
    "Inverness": {"summer": (17, 26), "mat": 8.2, "drought": "Low"},
}

if "uk_loc" not in st.session_state:
    st.session_state.uk_loc = "London"
if "custom_site_open" not in st.session_state:
    st.session_state.custom_site_open = False
if "custom_site_meta" not in st.session_state:
    st.session_state.custom_site_meta = None
if "summer_val" not in st.session_state:
    st.session_state.summer_val = (24, 35)
if "mat_val" not in st.session_state:
    st.session_state.mat_val = 11.5
if "drought_val" not in st.session_state:
    st.session_state.drought_val = "Moderate"

st.title("SylvaClime — Climate Risk & GBIF Tree Selection")

st.subheader("UK Site Locations")
loc_cols = st.columns(7)
for idx, (loc_name, cfg) in enumerate(UK_LOCATIONS.items()):
    is_active = st.session_state.uk_loc == loc_name
    if loc_cols[idx].button(
        f"{loc_name}\\n(MAT {cfg['mat']:.0f}° · {cfg['summer'][1]}°C)",
        key=f"loc_{loc_name}",
        use_container_width=True,
        type="primary" if is_active else "secondary",
    ):
        st.session_state.uk_loc = loc_name
        st.session_state.custom_site_open = False
        st.session_state.summer_val = cfg["summer"]
        st.session_state.mat_val = cfg["mat"]
        st.session_state.drought_val = cfg["drought"]
        st.rerun()

custom_active = st.session_state.uk_loc == "Custom"
custom_meta = st.session_state.custom_site_meta
custom_btn_label = (
    f"{custom_meta['label']}\\n(MAT {custom_meta['mat']:.0f}° · {custom_meta['summer'][1]}°C)"
    if custom_active and custom_meta
    else "Custom Site\\n(Enter Lat / Lon)"
)
if loc_cols[6].button(
    custom_btn_label,
    key="loc_custom_site",
    use_container_width=True,
    type="primary" if (custom_active or st.session_state.custom_site_open) else "secondary",
):
    st.session_state.custom_site_open = not st.session_state.custom_site_open
    st.rerun()

if st.session_state.custom_site_open:
    with st.form("custom_coords_form"):
        c_name, c_lat, c_lon, c_btn = st.columns([3, 2, 2, 2])
        site_name_in = c_name.text_input("Site Name (optional)", placeholder="e.g. Kew Gardens")
        lat_in = c_lat.text_input("Latitude", value="51.4787")
        lon_in = c_lon.text_input("Longitude", value="-0.2956")
        c_btn.write("")
        c_btn.write("")
        submitted = c_btn.form_submit_button("Apply Site", use_container_width=True, type="primary")
        if submitted:
            try:
                lat_val = float(lat_in.strip())
                lon_val = float(lon_in.strip())
                if not (-90 <= lat_val <= 90 and -180 <= lon_val <= 180):
                    raise ValueError("Coordinates out of range.")
                cal = calibrate_custom_coordinates(lat_val, lon_val)
                label = site_name_in.strip() or f"Custom ({lat_val:.3f}, {lon_val:.3f})"
                st.session_state.uk_loc = "Custom"
                st.session_state.custom_site_meta = {**cal, "label": label, "lat": lat_val, "lon": lon_val}
                st.session_state.summer_val = cal["summer"]
                st.session_state.mat_val = cal["mat"]
                st.session_state.drought_val = cal["drought"]
                st.rerun()
            except Exception as exc:
                st.error(f"Could not apply custom coordinates: {exc}")

with st.sidebar:
    st.header("Site Climate & Filters")

    summer_temp_range = st.slider(
        "Expected Summer Temperature Range (°C)",
        min_value=16,
        max_value=46,
        key="summer_val",
        step=1,
    )
    summer_max_c = summer_temp_range[1]

    base_mat_c = st.slider(
        "Site Baseline MAT (°C)",
        min_value=4.0,
        max_value=22.0,
        key="mat_val",
        step=0.5,
    )

    drought_stress = st.select_slider(
        "Projected Summer Drought Stress",
        options=["Low", "Moderate", "Severe"],
        key="drought_val",
    )

    st.divider()
    st.subheader("Species Characteristics")

    drought_filter = st.multiselect(
        "Drought Tolerance",
        options=["Low", "Med", "High"],
        default=["Low", "Med", "High"],
    )

    soil_filter = st.multiselect(
        "Soil Preference",
        options=sorted(df_raw["Soil Preference"].unique().tolist()),
        default=sorted(df_raw["Soil Preference"].unique().tolist()),
    )

    foliage_filter = st.multiselect(
        "Foliage Type",
        options=sorted(df_raw["Foliage"].unique().tolist()),
        default=sorted(df_raw["Foliage"].unique().tolist()),
    )


# ---------------------------------------------------------------------------
# 6. CLIMATE CHANGE SCENARIO SELECTOR
# ---------------------------------------------------------------------------
if "scenario" not in st.session_state:
    st.session_state.scenario = "current"

st.subheader("Specify the climate change scenario")
sc_col1, sc_col2, sc_col3 = st.columns(3)

if sc_col1.button(
    "Current (2020)\\nBaseline (+0°C)",
    use_container_width=True,
    type="primary" if st.session_state.scenario == "current" else "secondary",
):
    st.session_state.scenario = "current"

if sc_col2.button(
    "Emissions Limited (SSP2)\\nRCP4.5 by 2050 (+2°C)",
    use_container_width=True,
    type="primary" if st.session_state.scenario == "ssp2_2050" else "secondary",
):
    st.session_state.scenario = "ssp2_2050"

if sc_col3.button(
    "Business as Usual (SSP3)\\nRCP7.0 by 2090 (+4°C)",
    use_container_width=True,
    type="primary" if st.session_state.scenario == "ssp3_2090" else "secondary",
):
    st.session_state.scenario = "ssp3_2090"

scenario = st.session_state.scenario
if scenario == "current":
    eff_summer_max = summer_max_c
    eff_mat_c = base_mat_c
    eff_drought = drought_stress
    scenario_label = "Current (2020)"
elif scenario == "ssp2_2050":
    eff_summer_max = min(48, summer_max_c + 2)
    eff_mat_c = base_mat_c + 2.0
    eff_drought = "Moderate" if drought_stress == "Low" else drought_stress
    scenario_label = "Emissions Limited · SSP2 · RCP4.5 by 2050"
else:
    eff_summer_max = min(48, summer_max_c + 4)
    eff_mat_c = base_mat_c + 4.0
    eff_drought = "Moderate" if drought_stress == "Low" else "Severe"
    scenario_label = "Business as Usual · SSP3 · RCP7.0 by 2090"


# ---------------------------------------------------------------------------
# 7. EVALUATE & FILTER DATASET
# ---------------------------------------------------------------------------
df_eval = df_raw.copy()
results = df_eval.apply(
    lambda row: classify_resilience(row, eff_mat_c, eff_summer_max, eff_drought),
    axis=1,
)
df_eval["Resilience Status"] = [r[0] for r in results]
df_eval["Thermal Margin (°C)"] = [r[1] for r in results]
df_eval["Records Level"] = df_eval["Records"].apply(classify_records_level)
df_eval["2020 Risk"] = df_eval.apply(lambda r: mat_risk_score(r, base_mat_c), axis=1)
df_eval["2050 Risk"] = df_eval.apply(lambda r: mat_risk_score(r, base_mat_c + 2.0), axis=1)
df_eval["2090 Risk"] = df_eval.apply(lambda r: mat_risk_score(r, base_mat_c + 4.0), axis=1)

mask = (
    df_eval["Drought Tolerance"].isin(drought_filter)
    & df_eval["Soil Preference"].isin(soil_filter)
    & df_eval["Foliage"].isin(foliage_filter)
)
df_filtered = df_eval[mask].copy()

status_order = {"Fully Resilient": 0, "Borderline": 1, "Unsuited": 2}
df_filtered["_sort"] = df_filtered["Resilience Status"].map(status_order)
df_filtered = df_filtered.sort_values(["_sort", "Thermal Margin (°C)"], ascending=[True, False]).drop(columns=["_sort"])


# ---------------------------------------------------------------------------
# 8. MAIN PANEL OUTPUT
# ---------------------------------------------------------------------------
st.caption(
    f"Scenario: **{scenario_label}** — Site MAT **{eff_mat_c:.1f}°C** · "
    f"Summer peak {eff_summer_max}°C · {eff_drought.lower()} drought stress."
)

col1, col2, col3, col4 = st.columns(4)
col1.metric("Species Evaluated", len(df_filtered))
col2.metric("Fully Resilient", int((df_filtered["Resilience Status"] == "Fully Resilient").sum()))
col3.metric("Borderline", int((df_filtered["Resilience Status"] == "Borderline").sum()))
col4.metric("Unsuited", int((df_filtered["Resilience Status"] == "Unsuited").sum()))

tab_table, tab_matrix, tab_chart, tab_gbif = st.tabs([
    "Climate Risk Table",
    "Risk Matrix (4°–20°C)",
    "Thermal Envelope Chart",
    "Individual GBIF Tree Records & Catalog",
])


def style_records_level(val: str) -> str:
    if val == "Good":
        return "background-color: #DCFCE7; color: #14532D; font-weight: 700;"
    if val == "Medium":
        return "background-color: #FEF3C7; color: #78350F; font-weight: 700;"
    return "background-color: #FEE2E2; color: #7F1D1D; font-weight: 700;"


def style_risk_score(val: int) -> str:
    if val == 3:
        return "background-color: #7CB342; color: #141A16; font-weight: 700; text-align: center;"
    if val == 2:
        return "background-color: #F2D027; color: #141A16; font-weight: 700; text-align: center;"
    if val == 1:
        return "background-color: #EA6A15; color: #FFFFFF; font-weight: 700; text-align: center;"
    return "background-color: #C62828; color: #FFFFFF; font-weight: 700; text-align: center;"


def style_status(val: str) -> str:
    if val == "Fully Resilient":
        return "background-color: #E7F5EE; color: #166534; font-weight: 600;"
    if val == "Borderline":
        return "background-color: #FEF3C7; color: #92400E; font-weight: 600;"
    return "background-color: #FEE2E2; color: #991B1B; font-weight: 600;"


with tab_table:
    display_cols = [
        "Species Name",
        "Native Region",
        "Records",
        "Records Level",
        "MAT (°C)",
        "2020 Risk",
        "2050 Risk",
        "2090 Risk",
        "Resilience Status",
        "Max Temp (°C)",
        "Drought Tolerance",
        "Soil Preference",
    ]

    styled_df = (
        df_filtered[display_cols]
        .style.map(style_records_level, subset=["Records Level"])
        .map(style_risk_score, subset=["2020 Risk", "2050 Risk", "2090 Risk"])
        .map(style_status, subset=["Resilience Status"])
    )
    st.dataframe(styled_df, use_container_width=True, hide_index=True)

    csv_bytes = df_filtered[display_cols].to_csv(index=False).encode("utf-8")
    st.download_button(
        label="Download Climate Risk Palette (CSV)",
        data=csv_bytes,
        file_name="climate_resilient_trees.csv",
        mime="text/csv",
    )

with tab_matrix:
    st.subheader(f"Temperature Risk Matrix (Active Site MAT: {round(eff_mat_c)}°C)")
    temp_cols = [f"{t}°" for t in range(4, 21)]
    matrix_rows = []
    for _, r in df_filtered.iterrows():
        entry = {
            "Species Name": r["Species Name"],
            "Native Range": r["Native Region"],
            "Records": int(r["Records"]),
            "Records Level": r["Records Level"],
            "MAT (°C)": r["MAT (°C)"],
        }
        for t in range(4, 21):
            entry[f"{t}°"] = mat_risk_score(r, float(t))
        entry["Hottest (°C)"] = r["Max Temp (°C)"]
        entry["Coldest (°C)"] = r["Min Winter (°C)"]
        matrix_rows.append(entry)

    df_matrix = pd.DataFrame(matrix_rows)
    if not df_matrix.empty:
        styled_matrix = (
            df_matrix.style.map(style_records_level, subset=["Records Level"])
            .map(style_risk_score, subset=temp_cols)
        )
        st.dataframe(styled_matrix, use_container_width=True, hide_index=True)

with tab_chart:
    st.subheader("Heat Ceiling & Drought Tolerance Suitability")
    color_scale = alt.Scale(
        domain=["Fully Resilient", "Borderline", "Unsuited"],
        range=["#15803D", "#D97706", "#DC2626"],
    )
    scatter = (
        alt.Chart(df_filtered)
        .mark_circle(size=140, opacity=0.9)
        .encode(
            x=alt.X("Drought Tolerance:N", title="Drought Tolerance", sort=["Low", "Med", "High"]),
            y=alt.Y("Max Temp (°C):Q", title="Max Temperature Threshold (°C)", scale=alt.Scale(domain=[26, 48])),
            color=alt.Color("Resilience Status:N", scale=color_scale),
            tooltip=[
                "Species Name",
                "Native Region",
                "Records",
                "Records Level",
                "MAT (°C)",
                "Resilience Status",
                "Drought Tolerance",
                "Max Temp (°C)",
            ],
        )
        .properties(height=420)
    )
    threshold_rule = (
        alt.Chart(pd.DataFrame({"y": [eff_summer_max]}))
        .mark_rule(strokeDash=[6, 4], color="#1F2937", strokeWidth=1.5)
        .encode(y="y:Q")
    )
    st.altair_chart(scatter + threshold_rule, use_container_width=True)

with tab_gbif:
    st.subheader("Live GBIF Individual Tree Occurrences & Genus Explorer (api.gbif.org)")
    selected_species = st.selectbox(
        "Inspect live individual tree records with observation dates",
        options=df_filtered["Species Name"].tolist(),
    )
    custom_species = st.text_input(
        "Or type any botanical species name to inspect",
        placeholder="e.g., Quercus robur, Acer rubrum, Sorbus torminalis",
    )
    target_species = custom_species.strip() or selected_species

    if target_species:
        try:
            gbif_res = query_gbif_occurrences(target_species, limit=100)
            occ_df = gbif_res["df"]
            m1, m2, m3 = st.columns(3)
            m1.metric("Global Georeferenced Records", f"{gbif_res['total']:,}")
            m2.metric("UK (GB) Records (sample facet)", f"{gbif_res['uk_total']:,}")
            if not occ_df.empty and occ_df["Year"].dropna().any():
                yr_min = int(occ_df["Year"].dropna().min())
                yr_max = int(occ_df["Year"].dropna().max())
                m3.metric("Sample Observation Span", f"{yr_min}–{yr_max}")
            else:
                m3.metric("Sample Points Loaded", len(occ_df))

            if not occ_df.empty:
                st.map(occ_df, latitude="lat", longitude="lon", size=20, use_container_width=True)
                st.markdown("#### Individual Tree Occurrence Records (Sampled from api.gbif.org)")
                st.dataframe(
                    occ_df[["GBIF ID", "Event Date", "Country", "Locality", "lat", "lon", "Elevation (m)", "Record Type", "Institution"]],
                    use_container_width=True,
                    hide_index=True,
                )
        except Exception as exc:
            st.warning(f"Could not fetch live GBIF records: {exc}")

    st.divider()
    st.markdown("#### Search GBIF Backbone Taxonomy by Genus or Species")
    genus_query = st.text_input("Search GBIF species catalog", placeholder="e.g., Quercus, Acer, Betula, Sorbus, Pinus")
    if genus_query.strip():
        try:
            cat_df = search_gbif_species(genus_query)
            if not cat_df.empty:
                st.dataframe(cat_df, use_container_width=True, hide_index=True)
            else:
                st.info("No matching accepted plant species found in GBIF.")
        except Exception as exc:
            st.warning(f"GBIF taxonomy search failed: {exc}")
`;

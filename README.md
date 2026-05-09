# TradeTrack - Advanced Trading Journal

TradeTrack is a premium, full-stack web application designed for traders to log, track, and analyze their trading performance. Featuring a stunning cyberpunk/glassmorphism UI, it provides deep analytics, equity curves, and performance insights to help traders improve their edge.

## 🚀 Features

- **Intuitive Dashboard**: Live telemetry of Total P/L, Win Rate, Best/Worst trades, and an interactive Equity Curve.
- **Detailed Trade Logging**: Record assets, entry/exit prices, stoploss, targets, risk/reward, strategies, and even upload trade screenshots.
- **Advanced Analytics**:
  - Profit factor and expectancy calculations.
  - Drawdown tracking and streak analysis.
  - Performance breakdowns by asset, strategy, day of the week, and session (Morning/Afternoon/Night).
  - Mistake tag tracking to identify recurring errors.
  - Automated trading insights and warnings (e.g., overtrading, size issues).
- **Calendar View**: Monthly grid overview of trading days, highlighting daily P/L and best/worst performing days.
- **Filtering**: Global filters by date range, asset, and strategy across all views.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS (via CDN), Chart.js
- **Backend**: Python 3, Flask, SQLite3
- **Design**: Cyberpunk aesthetic with Orbitron/JetBrains Mono fonts, neon glow effects, and glassmorphism.

## 📁 Project Structure

```text
trading journal/
├── client/
│   ├── index.html        # Main frontend UI
│   ├── script.js         # Frontend logic and API integration
│   └── uploads/          # Directory for trade screenshot uploads (created automatically)
├── server/
│   ├── app.py            # Flask backend application and REST API
│   └── database.db       # SQLite database (auto-generated)
└── README.md             # Project documentation
```

## ⚙️ Prerequisites

- Python 3.x
- `pip` (Python package installer)

## 🚀 Setup & Running

1. **Navigate to the Project Root:**
   ```bash
   cd "trading journal"
   ```

2. **Set up Virtual Environment (Optional but recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install Dependencies:**
   ```bash
   pip install Flask Werkzeug
   ```

4. **Run the Server:**
   Navigate to the `server` directory and start the Flask application:
   ```bash
   cd server
   python app.py
   ```
   The backend will automatically initialize the SQLite database if it doesn't exist.

5. **Access the Application:**
   Open your web browser and navigate to:
   ```text
   http://127.0.0.1:5001
   ```
   *Note: The Flask server automatically serves the frontend static files from the `client` folder.*

## 📊 API Endpoints (Backend)

- `GET /api/stats`: Retrieve basic trading statistics and equity curve data.
- `GET /api/trades`: Retrieve the list of trades (supports filtering).
- `POST /api/trades`: Add a new trade.
- `PUT /api/trades/<trade_id>`: Update or close an existing trade.
- `DELETE /api/trades/<trade_id>`: Delete a trade.
- `GET /api/analytics`: Retrieve advanced analytics, performance metrics, and automated insights.

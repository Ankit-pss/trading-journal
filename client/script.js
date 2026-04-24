let equityChartInstance = null;
let ratioChartInstance = null;
let distributionChartInstance = null;
let dayOfWeekChartInstance = null;
let globalTradeData = [];
let editingTradeId = null;
let currentFilters = "";

// Navigation Logic
function navigate(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    
    document.getElementById('view-' + viewId).classList.remove('hidden');
    document.getElementById('nav-' + viewId).classList.add('active');

    // Trigger data fetch depending on the view
    if (viewId === 'dashboard') {
        loadDashboardStats();
    } else if (viewId === 'history') {
        loadHistory();
    } else if (viewId === 'analytics') {
        loadAnalytics();
    } else if (viewId === 'calendar') {
        loadCalendar();
    }
}


function getFilterQueryString() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    const asset = document.getElementById('filter-asset').value.toUpperCase();
    const strategy = document.getElementById('filter-strategy').value;
    
    let qs = [];
    if (start) qs.push(`start_date=${start}`);
    if (end) qs.push(`end_date=${end}`);
    if (asset) qs.push(`asset=${asset}`);
    if (strategy) qs.push(`strategy=${strategy}`);
    
    return qs.length ? '?' + qs.join('&') : '';
}

function applyFilters() {
    currentFilters = getFilterQueryString();
    // Reload active view or all views
    loadDashboardStats();
    loadHistory();
    loadAnalytics();
    loadCalendar();
}

function clearFilters() {
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';
    document.getElementById('filter-asset').value = '';
    document.getElementById('filter-strategy').value = '';
    currentFilters = '';
    applyFilters();
}

// Format Currency
const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
const formatPercentage = (val) => `${val.toFixed(1)}%`;

async function loadDashboardStats() {
    try {
        const res = await fetch('/api/stats' + currentFilters);
        const data = await res.json();
        
        document.getElementById('stats-pnl').textContent = formatCurrency(data.total_profit);
        document.getElementById('stats-pnl').className = data.total_profit >= 0 ? "text-3xl font-bold text-success" : "text-3xl font-bold text-danger";
        
        document.getElementById('stats-winrate').textContent = formatPercentage(data.win_rate);
        document.getElementById('stats-total').textContent = data.total_trades;
        
        document.getElementById('stats-best').textContent = `Best: ${formatCurrency(data.best_trade)}`;
        document.getElementById('stats-worst').textContent = `Worst: ${formatCurrency(data.worst_trade)}`;

        renderCharts(data.equity_curve || [], data.winning_trades || 0, data.losing_trades || 0);

    } catch (e) {
        console.error("Failed to load dashboard stats", e);
    }
}

function renderCharts(equityData, wins, losses) {
    // Equity Curve
    const ctxEquity = document.getElementById('equityChart').getContext('2d');
    if (equityChartInstance) equityChartInstance.destroy();
    
    equityChartInstance = new Chart(ctxEquity, {
        type: 'line',
        data: {
            labels: equityData.map((d, i) => `Trade ${i+1}`),
            datasets: [{
                label: 'Equity Growth',
                data: equityData.map(d => d.equity),
                borderColor: '#00f0ff',
                backgroundColor: 'rgba(0, 240, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#00f0ff',
                pointBorderColor: 'transparent',
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: false },
                y: { 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#a1a1aa' } 
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Win/Loss Ratio Pie
    const ctxRatio = document.getElementById('ratioChart').getContext('2d');
    if (ratioChartInstance) ratioChartInstance.destroy();
    
    // Default to 1 to 1 if no trades just for aesthetic empty state
    const w = (wins + losses === 0) ? 1 : wins;
    const l = (wins + losses === 0) ? 1 : losses;

    ratioChartInstance = new Chart(ctxRatio, {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Losses'],
            datasets: [{
                data: [w, l],
                backgroundColor: ['#00ffcc', '#ff3366'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#e0e0e0', font: { family: 'JetBrains Mono' } }
                }
            },
            cutout: '70%'
        }
    });
}

function submitTrade(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('date', document.getElementById('t-date').value);
    formData.append('asset', document.getElementById('t-asset').value);
    formData.append('type', document.getElementById('t-type').value);
    formData.append('strategy', document.getElementById('t-strategy').value);
    formData.append('quantity', document.getElementById('t-quantity').value);
    formData.append('entry_price', document.getElementById('t-entry').value);
    
    const sl = document.getElementById('t-stoploss').value;
    if (sl) formData.append('stoploss', sl);
    
    const tg = document.getElementById('t-target').value;
    if (tg) formData.append('target', tg);
    
    formData.append('exit_price', document.getElementById('t-exit').value);
    formData.append('notes', document.getElementById('t-notes').value);
    const risk = document.getElementById('t-risk-amount').value;
    if (risk) formData.append('risk_amount', risk);
    
    const reward = document.getElementById('t-reward-amount').value;
    if (reward) formData.append('reward_amount', reward);
    
    const mistakes = document.getElementById('t-mistakes').value;
    if (mistakes) formData.append('mistakes', mistakes);

    
    // Add photo if present
    const fileInput = document.getElementById('t-photo');
    if (fileInput.files.length > 0) {
        formData.append('photo', fileInput.files[0]);
    }

    const url = editingTradeId ? `/api/trades/${editingTradeId}` : '/api/trades';
    const methodTarget = editingTradeId ? 'PUT' : 'POST';

    fetch(url, {
        method: methodTarget,
        body: formData // Fetch will automatically set correct headers for FormData
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === 'success') {
            alert(editingTradeId ? 'Trade Successfully Updated!' : 'Trade Synchronized & Logged!');
            cancelEdit(); // Resets form and states
            navigate('dashboard');
        } else {
            alert(res.message || "Error saving trade");
        }
    })
    .catch(console.error);
}

function editTrade(id) {
    const trade = globalTradeData.find(t => t.id === id);
    if (!trade) return;
    
    editingTradeId = id;
    
    document.getElementById('t-date').value = trade.date;
    document.getElementById('t-asset').value = trade.asset;
    document.getElementById('t-type').value = trade.type;
    document.getElementById('t-strategy').value = trade.strategy;
    document.getElementById('t-quantity').value = trade.quantity;
    document.getElementById('t-entry').value = trade.entry_price;
    document.getElementById('t-stoploss').value = trade.stoploss !== null ? trade.stoploss : '';
    document.getElementById('t-target').value = trade.target !== null ? trade.target : '';
    document.getElementById('t-exit').value = trade.exit_price !== null ? trade.exit_price : '';
    document.getElementById('t-notes').value = trade.notes || '';
    document.getElementById('t-risk-amount').value = trade.risk_amount !== null ? trade.risk_amount : '';
    document.getElementById('t-reward-amount').value = trade.reward_amount !== null ? trade.reward_amount : '';
    document.getElementById('t-mistakes').value = trade.mistakes || '';

    
    document.getElementById('form-subtitle').textContent = 'Modification';
    document.getElementById('form-title').textContent = 'EDIT TRADE';
    document.getElementById('submit-trade-btn').textContent = 'UPDATE TRADE';
    document.getElementById('cancel-edit-btn').classList.remove('hidden');
    
    navigate('add-trade');
}

function cancelEdit() {
    editingTradeId = null;
    document.getElementById('addTradeForm').reset();
    
    let now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('t-date').value = now.toISOString().slice(0, 19);
    
    document.getElementById('form-subtitle').textContent = 'New Entry';
    document.getElementById('form-title').textContent = 'ADD TRADE';
    document.getElementById('submit-trade-btn').textContent = 'LOG TRADE';
    document.getElementById('cancel-edit-btn').classList.add('hidden');
}

async function deleteTrade(id) {
    if (!confirm("Are you sure you want to permanently delete this trade?")) return;
    
    try {
        const res = await fetch('/api/trades/' + id, { method: 'DELETE' });
        const data = await res.json();
        if(data.status === 'success') {
            loadHistory();
        } else {
            alert(data.message || "Error deleting trade");
        }
    } catch(e) { console.error(e); }
}

async function loadHistory() {
    try {
        const res = await fetch('/api/trades' + currentFilters);
        const trades = await res.json();
        globalTradeData = trades;
        
        const tbody = document.getElementById('history-table-body');
        tbody.innerHTML = '';
        
        trades.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-dim/50 hover:bg-white/5 transition-colors';
            
            let pnlContent = '';
            if (t.exit_price === null || t.exit_price === undefined) {
                pnlContent = `<button onclick="closeTrade(${t.id})" class="text-[10px] uppercase tracking-widest text-primary border border-primary px-3 py-1 rounded shadow-[0_0_8px_rgba(0,240,255,0.2)] hover:bg-primary hover:text-black transition-all">CLOSE</button>`;
            } else {
                const isProfit = t.profit_loss >= 0;
                const pnlClass = isProfit ? 'text-success' : 'text-danger';
                pnlContent = `<span class="${pnlClass}">${formatCurrency(t.profit_loss)}</span>`;
            }
            
            let photoHtml = t.photo ? `<a href="${t.photo}" target="_blank" class="text-primary hover:underline ml-2" title="View attached photo"><span class="material-symbols-outlined text-[10px]">image</span></a>` : '';
            
            let actionsHtml = `
                <div class="flex items-center justify-center gap-3">
                    <button onclick="editTrade(${t.id})" class="text-gray-400 hover:text-primary transition-colors" title="Edit Trade"><span class="material-symbols-outlined text-[16px]">edit</span></button>
                    <button onclick="deleteTrade(${t.id})" class="text-gray-400 hover:text-danger transition-colors" title="Delete Trade"><span class="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
            `;
            
            tr.innerHTML = `
                <td class="py-3 px-4">${t.date.split('T')[0]}</td>
                <td class="py-3 px-4 font-bold text-white flex items-center">${t.asset}${photoHtml}</td>
                <td class="py-3 px-4"><span class="px-2 py-1 bg-surface rounded text-xs border ${t.type.toUpperCase() === 'BUY' ? 'border-primary text-primary' : 'border-secondary text-secondary'}">${t.type.toUpperCase()}</span></td>
                <td class="py-3 px-4">${t.strategy}</td>
                <td class="py-3 px-4 text-right">${t.quantity}</td>
                <td class="py-3 px-4 text-right font-bold">${pnlContent}</td>
                <td class="py-3 px-4 text-center">${actionsHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch(e) {
        console.error(e);
    }
}

async function closeTrade(id) {
    const ep = prompt("Enter the final exit price for this trade:");
    if (!ep || isNaN(ep)) return;
    
    try {
        const res = await fetch('/api/trades/' + id, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ exit_price: parseFloat(ep) })
        });
        const data = await res.json();
        if(data.status === 'success') {
            loadHistory();
            // Optionally reload stats if we want dashboard updated immediately
        } else {
            alert(data.message || "Error closing trade");
        }
    } catch(e) { 
        console.error("Failed to close trade: ", e); 
    }
}

async function loadAnalytics() {
    try {
        const res = await fetch('/api/analytics' + currentFilters);
        const data = await res.json();
        
        if(data.status === 'error') {
            console.error(data.message);
            return;
        }

        // Global Metrics
        document.getElementById('an-pf').textContent = data.performance.profit_factor;
        document.getElementById('an-expectancy').textContent = formatCurrency(data.performance.expectancy);
        document.getElementById('an-drawdown').textContent = formatCurrency(data.equity.max_drawdown);
        document.getElementById('an-rr').textContent = '1:' + data.risk.avg_rr_ratio;
        document.getElementById('an-avgwin').textContent = formatCurrency(data.performance.avg_win);
        document.getElementById('an-avgloss').textContent = formatCurrency(data.performance.avg_loss);
        document.getElementById('an-winstreak').textContent = data.risk.max_win_streak + ' Wins';
        document.getElementById('an-lossstreak').textContent = data.risk.max_loss_streak + ' Losses';

        // Insights
        const insightsContainer = document.getElementById('analytics-insights');
        insightsContainer.innerHTML = '';
        data.insights.forEach(ins => {
            insightsContainer.innerHTML += `
                <div class="glass p-4 rounded-xl border border-primary/20 flex items-center gap-4">
                    <span class="material-symbols-outlined text-primary text-2xl">tips_and_updates</span>
                    <p class="text-sm tracking-wide text-gray-200">${ins}</p>
                </div>
            `;
        });

        // Asset Table
        const assetTbody = document.getElementById('asset-analytics-body');
        assetTbody.innerHTML = '';
        data.by_asset.forEach(a => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-dim/50 hover:bg-white/5';
            const isProfit = a.total_net >= 0;
            const avgW = a.avg_win.toFixed(2);
            const avgL = a.avg_loss.toFixed(2);
            tr.innerHTML = `
                <td class="py-3 px-2 font-bold text-white">${a.asset}</td>
                <td class="py-3 px-2 text-right">${a.total}</td>
                <td class="py-3 px-2 text-right">${formatPercentage(a.win_rate)}</td>
                <td class="py-3 px-2 text-right text-[10px]"><span class="text-success">${avgW}</span> / <span class="text-danger">${avgL}</span></td>
                <td class="py-3 px-2 text-right">${a.profit_factor.toFixed(2)}</td>
                <td class="py-3 px-2 text-right font-bold ${isProfit ? 'text-success': 'text-danger'}">${formatCurrency(a.total_net)}</td>
            `;
            assetTbody.appendChild(tr);
        });

        // Strategy Table
        const stratTbody = document.getElementById('strategy-analytics-body');
        stratTbody.innerHTML = '';
        data.by_strategy.forEach(s => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-dim/50 hover:bg-white/5';
            const isProfit = s.profit >= 0;
            tr.innerHTML = `
                <td class="py-3 px-2 font-bold text-white">${s.strategy}</td>
                <td class="py-3 px-2 text-right">${s.total}</td>
                <td class="py-3 px-2 text-right">${formatPercentage(s.win_rate)}</td>
                <td class="py-3 px-2 text-right font-bold ${isProfit ? 'text-success': 'text-danger'}">${formatCurrency(s.profit)}</td>
            `;
            stratTbody.appendChild(tr);
        });

        // Charts
        renderAnalyticsCharts(data);

    } catch(e) {
        console.error("Failed to load analytics: ", e);
    }
}

function renderAnalyticsCharts(data) {
    // Returns Distribution (True Histogram representation)
    const ctxDist = document.getElementById('distributionChart').getContext('2d');
    if (distributionChartInstance) distributionChartInstance.destroy();
    
    const distData = [...data.distribution.profits, ...data.distribution.losses];
    
    let binLabels = [];
    let binCounts = [];
    let bgColors = [];

    if (distData.length > 0) {
        const minVal = Math.min(...distData);
        const maxVal = Math.max(...distData);
        
        // Aim for around 8-10 bins for readability
        const numBins = 8;
        let range = maxVal - minVal;
        if (range === 0) range = 10; 
        
        const binSize = range / numBins;
        const bins = Array(numBins).fill(0);
        
        distData.forEach(val => {
            let binIdx = Math.floor((val - minVal) / binSize);
            if (binIdx >= numBins) binIdx = numBins - 1; // Include max value in the last bin
            bins[binIdx]++;
        });
        
        for (let i = 0; i < numBins; i++) {
            const binStart = minVal + (i * binSize);
            const binEnd = minVal + ((i + 1) * binSize);
            
            binLabels.push(`$${Math.round(binStart)} to $${Math.round(binEnd)}`);
            binCounts.push(bins[i]);
            
            // Color bin red if it's mostly negative, green if mostly positive
            const midPoint = (binStart + binEnd) / 2;
            bgColors.push(midPoint < 0 ? '#ff3366' : '#00ffcc');
        }
    }

    distributionChartInstance = new Chart(ctxDist, {
        type: 'bar',
        data: {
            labels: binLabels,
            datasets: [{
                label: 'Number of Trades',
                data: binCounts,
                backgroundColor: bgColors,
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    grid: { display: false },
                    ticks: { color: '#a1a1aa', maxRotation: 45, minRotation: 45, font: {size: 10} } 
                },
                y: { 
                    grid: { color: 'rgba(255,255,255,0.05)' }, 
                    ticks: { color: '#a1a1aa', stepSize: 1 },
                    title: { display: true, text: 'Number of Trades', color: '#a1a1aa', font: {size: 10} }
                }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.raw + (context.raw === 1 ? ' Trade' : ' Trades');
                        }
                    }
                }
            }
        }
    });

    // Day of Week
    const ctxDow = document.getElementById('dayOfWeekChart').getContext('2d');
    if (dayOfWeekChartInstance) dayOfWeekChartInstance.destroy();
    
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dowProfits = daysOrder.map(day => data.by_day_of_week[day] ? data.by_day_of_week[day].profit : 0);
    const dowColors = dowProfits.map(v => v >= 0 ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 51, 102, 0.5)');
    const dowBorders = dowProfits.map(v => v >= 0 ? '#00f0ff' : '#ff3366');

    dayOfWeekChartInstance = new Chart(ctxDow, {
        type: 'bar',
        data: {
            labels: daysOrder.map(d => d.substring(0,3)),
            datasets: [{
                label: 'Net P/L',
                data: dowProfits,
                backgroundColor: dowColors,
                borderColor: dowBorders,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { color: '#a1a1aa' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a1a1aa' } }
            },
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            }
        }
    });
}

// Calendar Logic
let currentCalendarDate = new Date();

function changeCalendarMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    loadCalendar();
}

async function loadCalendar() {
    try {
        const res = await fetch('/api/trades' + currentFilters);
        const trades = await res.json();
        
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        
        document.getElementById('calendar-month-year').textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentCalendarDate);
        
        // Aggregate daily data
        const dailyPnL = {};
        const dailyTradesCount = {};
        let monthTotalTrades = 0;
        let monthWinningDays = 0;
        let monthLosingDays = 0;
        let monthTotalPnL = 0;
        let bestDayPnL = -Infinity;
        let worstDayPnL = Infinity;
        
        trades.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate.getFullYear() === year && tDate.getMonth() === month && t.exit_price !== null) {
                const dayStr = String(tDate.getDate());
                if (!dailyPnL[dayStr]) {
                    dailyPnL[dayStr] = 0;
                    dailyTradesCount[dayStr] = 0;
                }
                dailyPnL[dayStr] += t.profit_loss;
                dailyTradesCount[dayStr] += 1;
                monthTotalTrades++;
                monthTotalPnL += t.profit_loss;
            }
        });
        
        for (const [day, pnl] of Object.entries(dailyPnL)) {
            if (pnl > 0) monthWinningDays++;
            else if (pnl < 0) monthLosingDays++;
            
            if (pnl > bestDayPnL) bestDayPnL = pnl;
            if (pnl < worstDayPnL) worstDayPnL = pnl;
        }
        
        // Update Monthly Summary UI
        document.getElementById('cal-total-trades').textContent = monthTotalTrades;
        const pnlEl = document.getElementById('cal-total-pnl');
        pnlEl.textContent = formatCurrency(monthTotalPnL);
        pnlEl.className = monthTotalPnL >= 0 ? "font-bold text-2xl mt-1 text-success" : "font-bold text-2xl mt-1 text-danger";
        
        const totalDays = monthWinningDays + monthLosingDays;
        document.getElementById('cal-win-rate').textContent = totalDays > 0 ? formatPercentage((monthWinningDays / totalDays) * 100) : "0%";
        
        document.getElementById('cal-best-day').textContent = bestDayPnL !== -Infinity ? formatCurrency(bestDayPnL) : "--";
        document.getElementById('cal-worst-day').textContent = worstDayPnL !== Infinity ? formatCurrency(worstDayPnL) : "--";
        
        // Render Calendar Grid
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Empty boxes for days of week before 1st of month
        for (let i = 0; i < firstDay; i++) {
            grid.innerHTML += `<div class="p-4 rounded-xl border border-transparent"></div>`;
        }
        
        // Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayStr = String(day);
            const pnl = dailyPnL[dayStr];
            const tradeCount = dailyTradesCount[dayStr] || 0;
            
            let colorClass = "bg-surface/30 border border-dim opacity-50"; // No trade
            let pnlText = "";
            
            if (tradeCount > 0) {
                if (pnl > 0) {
                    colorClass = "bg-success/10 border border-success/30 shadow-[0_0_15px_rgba(0,255,204,0.1)]";
                    pnlText = `<span class="text-success font-bold text-sm md:text-base tracking-widest block mt-2">+${formatCurrency(pnl)}</span>`;
                } else if (pnl < 0) {
                    colorClass = "bg-danger/10 border border-danger/30 shadow-[0_0_15px_rgba(255,51,102,0.1)]";
                    pnlText = `<span class="text-danger font-bold text-sm md:text-base tracking-widest block mt-2">${formatCurrency(pnl)}</span>`;
                } else {
                    colorClass = "bg-white/5 border border-gray-500/30";
                    pnlText = `<span class="text-gray-300 font-bold text-sm md:text-base tracking-widest block mt-2">$0.00</span>`;
                }
            }
            
            grid.innerHTML += `
                <div class="p-3 md:p-4 rounded-xl flex flex-col items-center justify-center min-h-[100px] transition-transform hover:scale-105 cursor-default ${colorClass}">
                    <div class="flex flex-col items-center justify-center w-full">
                        <span class="text-xs md:text-sm font-bold text-gray-400 mb-1">${day}</span>
                        ${tradeCount > 0 ? `<span class="text-[9px] bg-white/10 px-2 py-0.5 rounded text-gray-300 uppercase tracking-widest">${tradeCount} trade${tradeCount>1?'s':''}</span>` : '<span class="text-[9px] text-gray-600 uppercase tracking-widest mt-1">No Trade</span>'}
                    </div>
                    ${pnlText}
                </div>
            `;
        }
    } catch(e) {
        console.error(e);
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Set default datetime to now, including seconds
    let now = new Date();
    // adjust for local timezone offset
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('t-date').value = now.toISOString().slice(0, 19);

    // Live exact clock feature
    setInterval(() => {
        const clockEl = document.getElementById('live-clock');
        if (clockEl) {
            const d = new Date();
            clockEl.textContent = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
    }, 1000);

    loadDashboardStats();

    // Attach event listeners for Live Projections
    const inputsToWatch = ['t-quantity', 't-entry', 't-stoploss', 't-target', 't-type'];
    inputsToWatch.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateLiveProjections);
    });
});

// ETH Trading Rules live calculator
function calculateLiveProjections() {
    const qty = parseFloat(document.getElementById('t-quantity').value) || 0;
    const entry = parseFloat(document.getElementById('t-entry').value) || 0;
    const stoplossInput = parseFloat(document.getElementById('t-stoploss').value) || 0;
    const targetInput = parseFloat(document.getElementById('t-target').value) || 0;
    const type = document.getElementById('t-type').value;
    
    // ETH rules: 100 quantity = 1 ETH
    const eth = qty / 100;
    
    let targetPoints = 0;
    let stoplossPoints = 0;
    
    if (entry > 0) {
        // Auto-detect if user entered points directly (if value is very small relative to entry)
        const isTargetPoints = targetInput > 0 && targetInput < (entry * 0.5); 
        const isStopPoints = stoplossInput > 0 && stoplossInput < (entry * 0.5);

        if (isTargetPoints) {
            targetPoints = targetInput;
        } else if (targetInput > 0) {
            targetPoints = type === 'BUY' ? targetInput - entry : entry - targetInput;
        }

        if (isStopPoints) {
            stoplossPoints = stoplossInput;
        } else if (stoplossInput > 0) {
            stoplossPoints = type === 'BUY' ? entry - stoplossInput : stoplossInput - entry;
        }
    } else {
        // If no entry price yet, just treat inputs as points
        targetPoints = targetInput;
        stoplossPoints = stoplossInput;
    }
    
    const profit = Math.max(0, targetPoints) * eth;
    const loss = Math.max(0, stoplossPoints) * eth;
    
    let rr = 0;
    if (loss > 0) {
        rr = profit / loss;
    }
    
    const ethEl = document.getElementById('calc-eth');
    if(ethEl) ethEl.textContent = eth.toFixed(4) + ' ETH';
    
    const profitEl = document.getElementById('calc-profit');
    if(profitEl) profitEl.textContent = formatCurrency(profit);
    
    const lossEl = document.getElementById('calc-loss');
    if(lossEl) lossEl.textContent = formatCurrency(loss);
    
    const rrEl = document.getElementById('calc-rr');
    if(rrEl) rrEl.textContent = rr > 0 ? '1:' + rr.toFixed(2) : '0.0';
}

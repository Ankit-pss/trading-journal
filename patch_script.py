import re

with open('client/script.js', 'r') as f:
    content = f.read()

# Add currentFilters at the top
content = content.replace('let editingTradeId = null;', 'let editingTradeId = null;\nlet currentFilters = "";')

# Add applyFilters and clearFilters
filters_code = """
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
"""

content = content.replace('// Format Currency', filters_code + '\n// Format Currency')

# Update fetch calls to use currentFilters
content = content.replace("fetch('/api/stats')", "fetch('/api/stats' + currentFilters)")
content = content.replace("fetch('/api/trades')", "fetch('/api/trades' + currentFilters)")
content = content.replace("fetch('/api/analytics')", "fetch('/api/analytics' + currentFilters)")
content = content.replace("fetch('/api/trades');", "fetch('/api/trades' + currentFilters);") # there are two fetch('/api/trades')

# Add new fields to formData in submitTrade
submit_addition = """
    const risk = document.getElementById('t-risk-amount').value;
    if (risk) formData.append('risk_amount', risk);
    
    const reward = document.getElementById('t-reward-amount').value;
    if (reward) formData.append('reward_amount', reward);
    
    const mistakes = document.getElementById('t-mistakes').value;
    if (mistakes) formData.append('mistakes', mistakes);
"""
content = content.replace("formData.append('notes', document.getElementById('t-notes').value);", "formData.append('notes', document.getElementById('t-notes').value);" + submit_addition)

# Update editTrade to populate new fields
edit_addition = """
    document.getElementById('t-risk-amount').value = trade.risk_amount !== null ? trade.risk_amount : '';
    document.getElementById('t-reward-amount').value = trade.reward_amount !== null ? trade.reward_amount : '';
    document.getElementById('t-mistakes').value = trade.mistakes || '';
"""
content = content.replace("document.getElementById('t-notes').value = trade.notes || '';", "document.getElementById('t-notes').value = trade.notes || '';" + edit_addition)

with open('client/script.js', 'w') as f:
    f.write(content)

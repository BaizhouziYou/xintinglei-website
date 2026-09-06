(() => {
function initStatusPage() {
    const initId = Date.now();
    const siteConfig = window.XINTINGLEI_CONFIG || {};
    const apiBaseUrl = String(siteConfig.statusApiBaseUrl || '').replace(/\/$/, '');
    const LATEST_API = `${apiBaseUrl}/api/status/latest`;
    const HISTORY_API = `${apiBaseUrl}/api/status/history`;

    const rootContainer = document.querySelector('.status-layout-container');
    if (!rootContainer) return;
    rootContainer.dataset.statusInitId = String(initId);

    const statusBody = document.getElementById('status-card-body');
    const playersBody = document.getElementById('players-card-body');
    const availabilityCard = document.getElementById('availability-card');
    const availabilityBody = document.getElementById('availability-card-body');
    const pingButton = document.getElementById('manual-ping-button');
    const pingResult = document.getElementById('manual-ping-result');
    let lastHistory = null;
    let resizeTimer;

    // Advanced SVG Icons for UI Elements
    const iconServer = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`;
    const iconClock = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    const iconUsers = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
    const iconActivity = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`;

    const statusTitle = statusBody?.closest('.info-card')?.querySelector('.info-card-title');
    const playersTitle = playersBody?.closest('.info-card')?.querySelector('.info-card-title');
    const availabilityTitle = availabilityCard?.querySelector('.info-card-title');

    if (statusTitle) statusTitle.innerHTML = `${iconServer} 实时状态`;
    if (playersTitle) playersTitle.innerHTML = `${iconUsers} 在线玩家`;
    if (availabilityTitle) availabilityTitle.innerHTML = `${iconActivity} 24小时可用率`;

    function handleManualPing() {
        if (!pingButton || !pingResult) return;

        pingButton.disabled = true;
        pingButton.innerHTML = '测试中 <span style="animation: pulse-online 1s infinite; display:inline-block; width:6px; height:6px; background:#fff; border-radius:50%; margin-left:6px; vertical-align:middle; transform:translateY(-1px);"></span>';
        pingResult.textContent = '-- ms';

        const socket = new WebSocket(siteConfig.statusWebSocketUrl || 'ws://localhost:3000');
        let startTime;

        socket.onopen = () => {
            startTime = performance.now();
            socket.send('ping');
        };

        socket.onmessage = () => {
            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);
            pingResult.innerHTML = `<strong>${latency} ms</strong>`;
            socket.close();
        };

        socket.onerror = () => {
            pingResult.innerHTML = '<strong style="color:#ef4444;">连接失败</strong>';
        };

        const timeout = setTimeout(() => {
            if (socket.readyState < 2) {
                socket.close();
                pingResult.innerHTML = '<strong style="color:#ef4444;">测试超时</strong>';
            }
        }, 5000);

        socket.onclose = () => {
            clearTimeout(timeout);
            pingButton.disabled = false;
            pingButton.textContent = '重新测试';
        };
    }

    function renderLoading() {
        if(statusBody) statusBody.innerHTML = '<p style="text-align:center;width:100%;color:#94a3b8;">正在建立安全连接...</p>';
        if(playersBody) playersBody.innerHTML = '<p style="text-align:center;width:100%;color:#94a3b8;">正在同步档案...</p>';
        if(availabilityBody) availabilityBody.innerHTML = '<p style="text-align:center;width:100%;color:#94a3b8;">正在解析流数据...</p>';
    }

    function renderError() {
        if(statusBody) statusBody.innerHTML = '<p style="text-align:center;width:100%;color:#ef4444;">状态接口异常</p>';
        if(playersBody) playersBody.innerHTML = '<p style="text-align:center;width:100%;color:#ef4444;">无法获取列表</p>';
        if(availabilityBody) availabilityBody.innerHTML = '<p style="text-align:center;width:100%;color:#ef4444;">拓扑计算失败</p>';
    }

    function renderLatestStatus(data) {
        if (!statusBody) return;
        if (!data || !data.timestamp) {
            statusBody.innerHTML = `
                <div class="status-live-info">
                    <div class="glowing-dot offline"></div>
                    <span class="status-text-main offline">状态未知</span>
                </div>
                <div class="status-meta-info"><span>暂无数据</span></div>`;
            renderPlayerList(null, 0); return;
        }
        const lastUpdatedTime = new Date(data.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (data.is_online) {
            const latencyClass = data.latency > 500 ? 'latency-warning' : '';
            const latencyHTML = `<span class="${latencyClass}" style="display:inline-flex; align-items:center; gap:4px;">${iconActivity} ${data.latency} ms</span>`;
            statusBody.innerHTML = `
                <div class="status-live-info">
                    <div class="glowing-dot online"></div>
                    <span class="status-text-main online">在线</span>
                </div>
                <div class="status-meta-info">
                    <span style="display:flex; align-items:center; gap:6px; color:#f8fafc;">${iconUsers} ${data.players_online} 名玩家 / ${latencyHTML}</span>
                    <span style="display:flex; align-items:center; gap:6px;">${iconClock} 更新于 ${lastUpdatedTime}</span>
                </div>`;
            renderPlayerList(data.player_sample, data.players_online);
        } else {
            statusBody.innerHTML = `
                <div class="status-live-info">
                    <div class="glowing-dot offline"></div>
                    <span class="status-text-main offline">离线</span>
                </div>
                <div class="status-meta-info">
                    <span style="display:flex; align-items:center; gap:6px; color:#ef4444;">${iconServer} 服务器当前不可用</span>
                    <span style="display:flex; align-items:center; gap:6px;">${iconClock} 检查于 ${lastUpdatedTime}</span>
                </div>`;
            renderPlayerList(null, 0);
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderPlayerList(players, onlineCount) {
        if (!playersBody) return;
        if (onlineCount === 0) { playersBody.innerHTML = '<p style="text-align:center;width:100%;color:#94a3b8;">当前没有在线玩家</p>'; return; }
        if (players && Array.isArray(players) && players.length > 0) {
            const filteredPlayers = players.filter(name => name !== 'Anonymous Player');
            if (filteredPlayers.length > 0) {
                playersBody.innerHTML = filteredPlayers.map(name => `<div class="player-capsule">${escapeHtml(name)}</div>`).join('');
            } else {
                playersBody.innerHTML = '<p style="text-align:center;width:100%;color:#94a3b8;">有隐匿的玩家在线</p>';
            }
        } else {
            playersBody.innerHTML = `<p style="text-align:center;width:100%;color:#94a3b8;">当前有 ${onlineCount} 名玩家在线，名单未公开</p>`;
        }
    }

    function renderAvailability(history) {
        if (!availabilityBody) return;
        if (!history || !Array.isArray(history)) { availabilityBody.innerHTML = '<p style="text-align:center;width:100%;color:#94a3b8;">暂无历史记录</p>'; return; }
        lastHistory = history;
        const records = history
            .filter((entry) => Number.isFinite(new Date(entry.timestamp).getTime()))
            .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));
        if (!records.length) { availabilityBody.innerHTML = '<p style="text-align:center;width:100%;color:#94a3b8;">暂无有效历史记录</p>'; return; }

        const BAR_WIDTH = 12;
        const BAR_GAP = 4;
        const availableWidth = availabilityBody.clientWidth || 432;
        const visibleCount = Math.max(1, Math.floor((availableWidth + BAR_GAP) / (BAR_WIDTH + BAR_GAP)));
        const barsData = records.slice(-visibleCount);
        const onlineCount = records.filter((entry) => entry.is_online === true || entry.is_online === 1).length;
        const percentage = ((onlineCount / records.length) * 100).toFixed(1);

        availabilityBody.innerHTML = `
            <div class="availability-stats">
                <span class="availability-percent">${percentage}%</span>
            </div>
            <div class="availability-chart-visual">
                ${barsData.map(r => {
                    let s = 'offline';
                    if (r.is_online === true || r.is_online === 1) s = 'online';
                    const time = new Date(r.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const status = s === 'online' ? '运行正常' : '服务中断';
                    return `<div class="availability-bar-item ${s}" role="button" tabindex="0" aria-label="${time}，${status}"></div>`;
                }).join('')}
            </div>`;
        addChartInteractions(barsData);
    }

    function addChartInteractions(barsData) {
        const chart = availabilityBody.querySelector('.availability-chart-visual');
        const bars = chart ? Array.from(chart.children) : [];
        if (bars.length === 0 || !availabilityCard) return;

        let tooltip = availabilityCard.querySelector('.availability-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'availability-tooltip';
            availabilityCard.appendChild(tooltip);
        }

        const resetBars = () => bars.forEach((bar) => {
            bar.style.transform = '';
            bar.style.opacity = '';
            bar.style.filter = '';
            bar.style.zIndex = '';
        });

        const activateBar = (index) => {
            const bar = bars[index];
            const dataPoint = barsData[index];
            bars.forEach((otherBar, otherIndex) => {
                const distance = Math.abs(index - otherIndex);
                if (distance === 0) {
                    otherBar.style.transform = 'scaleY(1.4)';
                    otherBar.style.opacity = '1';
                    otherBar.style.filter = 'brightness(1.5) drop-shadow(0 0 10px currentColor)';
                    otherBar.style.zIndex = '3';
                } else if (distance === 1) {
                    otherBar.style.transform = 'scaleY(1.2)';
                    otherBar.style.opacity = '0.9';
                    otherBar.style.filter = 'brightness(1.2)';
                    otherBar.style.zIndex = '2';
                } else if (distance === 2) {
                    otherBar.style.transform = 'scaleY(1.05)';
                    otherBar.style.opacity = '0.8';
                    otherBar.style.filter = 'none';
                    otherBar.style.zIndex = '1';
                } else {
                    otherBar.style.transform = 'scaleY(1)';
                    otherBar.style.opacity = '0.7';
                    otherBar.style.filter = 'none';
                    otherBar.style.zIndex = '1';
                }
            });
            const time = new Date(dataPoint.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const online = dataPoint.is_online === true || dataPoint.is_online === 1;
            tooltip.innerHTML = `<strong>${time}</strong><br>${online ? '<span style="color:#10b981;">运行正常</span>' : '<span style="color:#ef4444;">服务中断</span>'}`;
            const cardRect = availabilityCard.getBoundingClientRect();
            const barRect = bar.getBoundingClientRect();
            const preferredLeft = barRect.left - cardRect.left + barRect.width / 2;
            const edgePadding = 12;
            const halfTooltipWidth = tooltip.offsetWidth / 2;
            const tooltipLeft = Math.min(
                cardRect.width - halfTooltipWidth - edgePadding,
                Math.max(halfTooltipWidth + edgePadding, preferredLeft)
            );
            tooltip.style.left = `${tooltipLeft}px`;
            tooltip.style.top = `${barRect.top - cardRect.top - 10}px`;
            tooltip.style.transform = 'translate(-50%, -100%)';
            tooltip.classList.add('visible');
        };

        bars.forEach((bar, index) => {
            bar.addEventListener('mouseenter', () => activateBar(index));
            bar.addEventListener('click', () => activateBar(index));
            bar.addEventListener('pointerup', (event) => {
                if (event.pointerType !== 'mouse') activateBar(index);
            });
            bar.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activateBar(index);
                }
            });
        });
        chart.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
            resetBars();
        });
    }

    async function fetchAllData() {
        renderLoading();
        try {
            const [latestRes, historyRes] = await Promise.all([ fetch(LATEST_API), fetch(HISTORY_API) ]);
            if (!latestRes.ok || !historyRes.ok) throw new Error('API response error');
            const latestData = await latestRes.json();
            const historyData = await historyRes.json();
            if (rootContainer && rootContainer.dataset.statusInitId !== String(initId)) return;
            renderLatestStatus(latestData);
            renderAvailability(historyData);
        } catch {
            if (rootContainer && rootContainer.dataset.statusInitId !== String(initId)) return;
            renderError();
        }
    }

    fetchAllData();
    window.addEventListener('resize', () => {
        if (!lastHistory) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => renderAvailability(lastHistory), 120);
    });
    if (pingButton) pingButton.addEventListener('click', handleManualPing);
}

window.initStatusPage = initStatusPage;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStatusPage);
} else {
    initStatusPage();
}
})();

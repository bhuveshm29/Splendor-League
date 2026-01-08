// API Base URL
const API_BASE = '';

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
    loadRegions();
    loadLeaderboard();
});

// Load regions for filter
async function loadRegions() {
    try {
        const response = await fetch(`${API_BASE}/api/regions`);
        const regions = await response.json();
        const filter = document.getElementById('region-filter');

        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region.id;
            option.textContent = region.name;
            filter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading regions:', error);
    }
}

// Load leaderboard data
async function loadLeaderboard() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('leaderboard-container');
    const noPlayers = document.getElementById('no-players');

    // Region filter removed from UI for now as per design, defaulting to API default

    loading.classList.remove('hidden');
    container.classList.add('hidden');
    if (noPlayers) noPlayers.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/api/leaderboard`);
        const data = await response.json();

        loading.classList.add('hidden');

        if (data.length === 0) {
            if (noPlayers) noPlayers.classList.remove('hidden');
            return;
        }

        container.innerHTML = '';
        data.forEach(player => {
            const card = createLeaderboardCard(player);
            container.appendChild(card);
        });

        container.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        loading.classList.add('hidden');
        showAlert('error', 'Failed to load leaderboard');
    }
}

// Create leaderboard card
function createLeaderboardCard(player) {
    const card = document.createElement('div');

    // Assign color class based on rank
    let colorClass = 'card-neutral';
    if (player.rank === 1) colorClass = 'card-blue';
    else if (player.rank === 2) colorClass = 'card-teal';
    else if (player.rank === 3) colorClass = 'card-green';

    card.className = `leaderboard-card ${colorClass}`;
    card.style.animation = 'fadeInUp 0.3s ease-out';

    const playerId = player.player_id || player.id;

    // Placeholder avatar (using first letter)
    const initial = player.name.charAt(0).toUpperCase();

    card.innerHTML = `
        <div class="card-left">
            <div class="avatar">${initial}</div>
            <div class="player-info">
                <div class="player-name">${escapeHtml(player.name.toUpperCase())}</div>
                <div class="player-title">${player.games_played} Games Played</div>
            </div>
        </div>
        
        <div class="card-metrics">
            <div class="metric-group">
                <span class="metric-label">Rating</span>
                <span class="metric-value">${player.rating}</span>
            </div>
             <div class="metric-group">
                <span class="metric-label">Win Rate</span>
                <span class="metric-value">${player.win_rate}%</span>
            </div>
        </div>
        
        <div class="card-rank">
            <span class="rank-number">${String(player.rank).padStart(3, '0')}</span>
        </div>
        
        <div class="card-actions">
             <button class="btn-invisible" onclick="showPlayerDetails(${playerId})"></button>
        </div>
    `;

    return card;
}

// Show player details modal
async function showPlayerDetails(playerId) {
    const modal = document.getElementById('player-modal');

    try {
        const response = await fetch(`${API_BASE}/api/players/${playerId}`);
        const player = await response.json();

        document.getElementById('modal-player-name').textContent = player.name;
        document.getElementById('modal-rating').textContent = player.rating;
        document.getElementById('modal-games').textContent = player.games_played;
        document.getElementById('modal-winrate').textContent = `${player.win_rate}%`;
        document.getElementById('modal-avgpoints').textContent = player.average_points;
        document.getElementById('modal-player-region').textContent = player.region_name;
        document.getElementById('modal-first').textContent = player.first_place;
        document.getElementById('modal-second').textContent = player.second_place;
        document.getElementById('modal-third').textContent = player.third_place;
        document.getElementById('modal-fourth').textContent = player.fourth_place;

        const recentGamesBody = document.getElementById('recent-games-body');
        recentGamesBody.innerHTML = '';

        if (player.recent_games && player.recent_games.length > 0) {
            player.recent_games.forEach(game => {
                const tr = document.createElement('tr');
                const date = new Date(game.played_at).toLocaleDateString();
                const ratingChange = game.rating_change >= 0
                    ? `+${game.rating_change}`
                    : game.rating_change;
                const changeColor = game.rating_change >= 0 ? 'var(--success)' : 'var(--error)';

                tr.innerHTML = `
                    <td>${date}</td>
                    <td>${getPlacementEmoji(game.placement)} ${game.placement}${getPlacementSuffix(game.placement)}</td>
                    <td>${game.points}</td>
                    <td style="color: ${changeColor}; font-weight: 600;">${ratingChange}</td>
                `;
                recentGamesBody.appendChild(tr);
            });
        } else {
            recentGamesBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No games played yet</td></tr>';
        }

        modal.classList.add('active');
    } catch (error) {
        console.error('Error loading player details:', error);
        alert('Failed to load player details');
    }
}

// Close player modal
function closePlayerModal() {
    const modal = document.getElementById('player-modal');
    modal.classList.remove('active');
}

// Close modal when clicking outside
document.getElementById('player-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'player-modal') {
        closePlayerModal();
    }
});

// Helper functions
function getPlacementEmoji(placement) {
    const emojis = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4️⃣' };
    return emojis[placement] || '';
}

function getPlacementSuffix(placement) {
    const suffixes = { 1: 'st', 2: 'nd', 3: 'rd', 4: 'th' };
    return suffixes[placement] || 'th';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => alertDiv.remove(), 5000);
}

// API Base URL
const API_BASE = '';

let allPlayers = [];

// Check login status on page load
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
});

// Check if admin is logged in
async function checkLoginStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/check`);
        const data = await response.json();

        if (data.logged_in) {
            showAdminPanel();
        }
    } catch (error) {
        console.error('Error checking login status:', error);
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const alertDiv = document.getElementById('login-alert');

    try {
        const response = await fetch(`${API_BASE}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAdminPanel();
        } else {
            alertDiv.innerHTML = '<div class="alert alert-error">Invalid credentials</div>';
        }
    } catch (error) {
        console.error('Login error:', error);
        alertDiv.innerHTML = '<div class="alert alert-error">Login failed</div>';
    }
}

// Handle logout
async function handleLogout() {
    try {
        await fetch(`${API_BASE}/api/admin/logout`, { method: 'POST' });
        location.reload();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show admin panel
function showAdminPanel() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    loadPlayers();
    loadRegions();
    loadGames();
    updatePlayerInputs();
}

// Load all regions
async function loadRegions() {
    try {
        const response = await fetch(`${API_BASE}/api/regions`);
        const regions = await response.json();

        const playerRegionSelect = document.getElementById('player-region');

        // Clear and add default option
        playerRegionSelect.innerHTML = '<option value="">Select Region</option>';

        regions.forEach(region => {
            const row = document.createElement('option');
            row.value = region.id;
            row.textContent = region.name;
            playerRegionSelect.appendChild(row);
        });

        // Populate regions list for deletion
        const regionsList = document.getElementById('regions-list');
        if (regionsList) {
            regionsList.innerHTML = '';
            if (regions.length === 0) {
                regionsList.innerHTML = '<p class="text-muted">No regions yet</p>';
            } else {
                regions.forEach(region => {
                    const div = document.createElement('div');
                    div.className = 'stat-item';
                    div.style.display = 'flex';
                    div.style.justifyContent = 'space-between';
                    div.style.alignItems = 'center';
                    div.style.marginBottom = 'var(--spacing-sm)';
                    div.innerHTML = `
                        <span>${escapeHtml(region.name)}</span>
                        <button class="btn btn-danger btn-sm" onclick="handleDeleteRegion(${region.id}, '${escapeHtml(region.name)}')" title="Delete Region">Delete</button>
                    `;
                    regionsList.appendChild(div);
                });
            }
        }

        // Also update a region list for deletion if it exists, or create one?
        // The HTML doesn't have a region list container. I need to add one in admin.html first?
        // Or I can dynamically inject it.
        // Let's modify admin.html to include a region list container first.
        // Wait, I should do that in a separate step.
        // For now, let's keep this as-is and assume I'll add the list rendering logic next.
    } catch (error) {
        console.error('Error loading regions:', error);
    }
}

// Handle add region
async function handleAddRegion(event) {
    event.preventDefault();
    const name = document.getElementById('region-name').value.trim();
    const alertDiv = document.getElementById('admin-alert');

    try {
        const response = await fetch(`${API_BASE}/api/admin/regions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await response.json();
        if (response.ok) {
            alertDiv.innerHTML = '<div class="alert alert-success">Region added successfully!</div>';
            document.getElementById('region-name').value = '';
            loadRegions();
            setTimeout(() => alertDiv.innerHTML = '', 3000);
        } else {
            alertDiv.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
        }
    } catch (error) {
        alertDiv.innerHTML = '<div class="alert alert-error">Failed to add region</div>';
    }
}

// Load all players
async function loadPlayers() {
    const loading = document.getElementById('players-loading');
    const list = document.getElementById('players-list');

    loading.classList.remove('hidden');
    list.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/api/players`);
        allPlayers = await response.json();

        loading.classList.add('hidden');

        if (allPlayers.length === 0) {
            list.innerHTML = '<p class="text-muted">No players yet</p>';
        } else {
            list.innerHTML = '';
            allPlayers.forEach(player => {
                const playerCard = createPlayerCard(player);
                list.appendChild(playerCard);
            });
        }

        list.classList.remove('hidden');
        updatePlayerInputs();
    } catch (error) {
        console.error('Error loading players:', error);
        loading.classList.add('hidden');
    }
}

// Create player card
function createPlayerCard(player) {
    const div = document.createElement('div');
    div.className = 'stat-item';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.marginBottom = 'var(--spacing-sm)';

    div.innerHTML = `
        <div>
            <strong>${escapeHtml(player.name)}</strong>
            <span class="text-muted"> - ${escapeHtml(player.region_name)} - Rating: ${player.rating}</span>
        </div>
        <button class="btn btn-danger" onclick="handleDeletePlayer(${player.id}, '${escapeHtml(player.name)}')" title="Delete Player">
            Delete
        </button>
    `;

    return div;
}

// Handle add player
async function handleAddPlayer(event) {
    event.preventDefault();

    const name = document.getElementById('player-name').value.trim();
    const region_id = document.getElementById('player-region').value;
    const alertDiv = document.getElementById('admin-alert');

    if (!name || !region_id) {
        alertDiv.innerHTML = '<div class="alert alert-error">Name and Region are required</div>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/admin/players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, region_id: parseInt(region_id) })
        });

        const data = await response.json();

        if (response.ok) {
            alertDiv.innerHTML = '<div class="alert alert-success">Player added successfully!</div>';
            document.getElementById('player-name').value = '';
            document.getElementById('player-region').value = '';
            loadPlayers();
            setTimeout(() => alertDiv.innerHTML = '', 3000);
        } else {
            alertDiv.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
        }
    } catch (error) {
        console.error('Error adding player:', error);
        alertDiv.innerHTML = '<div class="alert alert-error">Failed to add player</div>';
    }
}

// Handle delete player
async function handleDeletePlayer(playerId, playerName) {
    if (!confirm(`Are you sure you want to delete ${playerName}?`)) {
        return;
    }

    const alertDiv = document.getElementById('admin-alert');

    try {
        const response = await fetch(`${API_BASE}/api/admin/players/${playerId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            alertDiv.innerHTML = '<div class="alert alert-success">Player deleted successfully!</div>';
            loadPlayers();
            setTimeout(() => alertDiv.innerHTML = '', 3000);
        } else {
            alertDiv.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
        }
    } catch (error) {
        console.error('Error deleting player:', error);
        alertDiv.innerHTML = '<div class="alert alert-error">Failed to delete player</div>';
    }
}

// Update player inputs based on number of players
function updatePlayerInputs() {
    const numPlayers = parseInt(document.getElementById('num-players').value);
    const container = document.getElementById('player-inputs');

    container.innerHTML = '';

    for (let i = 1; i <= numPlayers; i++) {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.style.padding = 'var(--spacing-md)';
        div.style.background = 'rgba(99, 102, 241, 0.05)';
        div.style.borderRadius = 'var(--radius-md)';
        div.style.marginBottom = 'var(--spacing-md)';

        div.innerHTML = `
            <h4>Player ${i}</h4>
            
            <div class="form-group">
                <label class="form-label">Player</label>
                <select id="player-${i}" class="form-select" required>
                    <option value="">Select player...</option>
                    ${allPlayers.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.region_name)})</option>`).join('')}
                </select>
            </div>
            
            <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div class="form-group">
                    <label class="form-label">Placement (1-4)</label>
                    <input type="number" id="placement-${i}" class="form-input" min="1" max="4" value="${i}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Points (1-15)</label>
                    <input type="number" id="points-${i}" class="form-input" min="1" max="15" required>
                </div>
            </div>
        `;

        container.appendChild(div);
    }
}

// Handle submit game
async function handleSubmitGame(event) {
    event.preventDefault();

    const numPlayers = parseInt(document.getElementById('num-players').value);
    const alertDiv = document.getElementById('game-alert');

    const results = [];
    const selectedPlayers = new Set();

    for (let i = 1; i <= numPlayers; i++) {
        const playerId = parseInt(document.getElementById(`player-${i}`).value);
        const placement = parseInt(document.getElementById(`placement-${i}`).value);
        const points = parseInt(document.getElementById(`points-${i}`).value);

        if (!playerId) {
            alertDiv.innerHTML = '<div class="alert alert-error">Please select all players</div>';
            return;
        }

        if (selectedPlayers.has(playerId)) {
            alertDiv.innerHTML = '<div class="alert alert-error">Each player can only be selected once</div>';
            return;
        }

        selectedPlayers.add(playerId);

        results.push({
            player_id: playerId,
            placement: placement,
            points: points
        });
    }

    try {
        const response = await fetch(`${API_BASE}/api/admin/games`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results })
        });

        const data = await response.json();

        if (response.ok) {
            alertDiv.innerHTML = '<div class="alert alert-success">Game submitted successfully! Ratings updated.</div>';
            document.getElementById('game-form').reset();
            updatePlayerInputs();
            loadGames();
            setTimeout(() => alertDiv.innerHTML = '', 5000);
        } else {
            alertDiv.innerHTML = `<div class="alert alert-error">${data.error}</div>`;
        }
    } catch (error) {
        console.error('Error submitting game:', error);
        alertDiv.innerHTML = '<div class="alert alert-error">Failed to submit game</div>';
    }
}

// Load recent games
async function loadGames() {
    const loading = document.getElementById('games-loading');
    const list = document.getElementById('games-list');

    loading.classList.remove('hidden');
    list.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE}/api/games?limit=10`);
        const games = await response.json();

        loading.classList.add('hidden');

        if (games.length === 0) {
            list.innerHTML = '<p class="text-muted">No games yet</p>';
        } else {
            list.innerHTML = '';
            games.forEach(game => {
                const gameCard = createGameCard(game);
                list.appendChild(gameCard);
            });
        }

        list.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading games:', error);
        loading.classList.add('hidden');
    }
}

// Create game card
function createGameCard(game) {
    const div = document.createElement('div');
    div.className = 'stat-item';
    div.style.marginBottom = 'var(--spacing-md)';

    const date = new Date(game.played_at).toLocaleString();

    const participantsHtml = game.participants.map(p => {
        const ratingChange = p.rating_change >= 0 ? `+${p.rating_change}` : p.rating_change;
        const changeColor = p.rating_change >= 0 ? 'var(--success)' : 'var(--error)';

        return `
            <div style="display: flex; justify-content: space-between; padding: var(--spacing-xs) 0;">
                <span>${getPlacementEmoji(p.placement)} ${escapeHtml(p.player_name)}</span>
                <span>
                    <strong>${p.points} pts</strong>
                    <span style="color: ${changeColor}; margin-left: var(--spacing-sm);">${ratingChange}</span>
                </span>
            </div>
        `;
    }).join('');

    div.innerHTML = `
        <div style="margin-bottom: var(--spacing-sm); display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>Game #${game.id}</strong>
                <span class="text-muted"> - ${date}</span>
            </div>
            <button class="btn btn-danger btn-sm" onclick="handleDeleteGame(${game.id})" style="padding: 2px 8px; font-size: 12px;">Delete</button>
        </div>
        ${participantsHtml}
    `;

    return div;
}

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

from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from models import db, Player, Game, GameParticipant, Region
from rating_system import rating_system
from config import Config
from functools import wraps
from datetime import datetime

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize database
db.init_app(app)

# Ensure tables exist (run within app context)
# Wrapped in try-except to prevent crash if DB is not available yet
try:
    with app.app_context():
        db.create_all()
except Exception as e:
    print(f"Error creating database tables: {e}")


def admin_required(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'error': 'Admin authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function


# ============================================================================
# PUBLIC ROUTES
# ============================================================================

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/admin')
def admin_page():
    return render_template('admin.html')


# ============================================================================
# PUBLIC API ENDPOINTS
# ============================================================================

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get current player rankings (overall or regional-filtered)"""
    region_id = request.args.get('region_id', type=int)
    
    query = Player.query
    if region_id:
        query = query.filter_by(region_id=region_id)
    
    players = query.all()
    # Sort by mu (since sigma is similar for starters, mu handles it)
    sorted_players = sorted(players, key=lambda p: p.rating, reverse=True)
    
    leaderboard = []
    for rank, player in enumerate(sorted_players, 1):
        player_data = player.to_dict()
        player_data['rank'] = rank
        leaderboard.append(player_data)
    
    return jsonify(leaderboard)


@app.route('/api/regions', methods=['GET'])
def get_regions():
    regions = Region.query.all()
    return jsonify([r.to_dict() for r in regions])


@app.route('/api/players', methods=['GET'])
def get_players():
    players = Player.query.all()
    return jsonify([p.to_dict() for p in players])


@app.route('/api/players/<int:player_id>', methods=['GET'])
def get_player(player_id):
    player = Player.query.get_or_404(player_id)
    player_data = player.to_dict()
    
    # Add recent games
    recent_participations = GameParticipant.query.filter_by(player_id=player_id)\
        .order_by(GameParticipant.id.desc())\
        .limit(15)\
        .all()
    
    player_data['recent_games'] = []
    for participation in recent_participations:
        game_data = {
            'game_id': participation.game_id,
            'played_at': participation.game.played_at.isoformat(),
            'placement': participation.placement,
            'points': participation.points,
            'rating_change': participation.rating_change,
            'num_players': participation.game.num_players
        }
        player_data['recent_games'].append(game_data)
    
    return jsonify(player_data)


@app.route('/api/games', methods=['GET'])
def get_games():
    limit = request.args.get('limit', 20, type=int)
    games = Game.query.order_by(Game.played_at.desc()).limit(limit).all()
    return jsonify([g.to_dict() for g in games])


# ============================================================================
# ADMIN API ENDPOINTS
# ============================================================================

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    if data.get('username') == Config.ADMIN_USERNAME and data.get('password') == Config.ADMIN_PASSWORD:
        session['admin_logged_in'] = True
        return jsonify({'success': True})
    return jsonify({'success': False}), 401


@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_logged_in', None)
    return jsonify({'success': True})


@app.route('/api/admin/check', methods=['GET'])
def admin_check():
    return jsonify({'logged_in': session.get('admin_logged_in', False)})


@app.route('/api/admin/regions', methods=['POST'])
@admin_required
def add_region():
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name or Region.query.filter_by(name=name).first():
        return jsonify({'error': 'Invalid or duplicate region name'}), 400
    
    region = Region(name=name)
    db.session.add(region)
    db.session.commit()
    return jsonify({'success': True, 'region': region.to_dict()}), 201


@app.route('/api/admin/players', methods=['POST'])
@admin_required
def add_player():
    data = request.get_json()
    name = data.get('name', '').strip()
    region_id = data.get('region_id')
    
    if not name or not region_id:
        return jsonify({'error': 'Name and Region are required'}), 400
    
    if Player.query.filter_by(name=name).first():
        return jsonify({'error': 'Player already exists'}), 400
    
    region = Region.query.get(region_id)
    if not region:
        return jsonify({'error': 'Region not found'}), 404
    
    init = rating_system.create_initial_rating()
    player = Player(name=name, region_id=region_id, mu=init.mu, sigma=init.sigma)
    
    db.session.add(player)
    db.session.commit()
    return jsonify({'success': True, 'player': player.to_dict()}), 201


@app.route('/api/admin/players/<int:player_id>', methods=['DELETE'])
@admin_required
def delete_player(player_id):
    player = Player.query.get_or_404(player_id)
    # Cascade delete is handled by database models (participations relationship)
    # But we need to ensure we don't end up with games having missing players?
    # Actually, GameParticipant is cascade='all, delete-orphan' from Player side?
    # Let's check models.py. 
    # Player.participations = db.relationship(..., cascade='all, delete-orphan')
    # So deleting player deletes their participation records.
    # However, this leaves Games with fewer participants.
    # We might want to warn or just allow it (it breaks rating integrity technically, but user asked for it).
    
    db.session.delete(player)
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/admin/regions/<int:region_id>', methods=['DELETE'])
@admin_required
def delete_region(region_id):
    region = Region.query.get_or_404(region_id)
    # Cascade delete handled by models (players -> games)
    db.session.delete(region)
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/admin/games/<int:game_id>', methods=['DELETE'])
@admin_required
def delete_game(game_id):
    game = Game.query.get_or_404(game_id)
    
    # Revert simple stats
    for p in game.participants:
        player = p.player
        if player:
            player.games_played -= 1
            player.total_points -= p.points
            if p.placement == 1: player.first_place -= 1
            elif p.placement == 2: player.second_place -= 1
            elif p.placement == 3: player.third_place -= 1
            elif p.placement == 4: player.fourth_place -= 1
            
    db.session.delete(game)
    db.session.commit()
    return jsonify({'success': True})


@app.route('/api/admin/games', methods=['POST'])
@admin_required
def submit_game():
    data = request.get_json()
    results = data.get('results', [])
    
    if not results or len(results) < 2 or len(results) > 4:
        return jsonify({'error': 'Game must have 2-4 players'}), 400

    player_data_list = []
    for r in results:
        player = Player.query.get(r['player_id'])
        if not player:
            return jsonify({'error': f"Player {r['player_id']} not found"}), 404
        player_data_list.append({
            'player': player,
            'placement': r['placement'],
            'points': r['points']
        })

    # Calculate ratings
    processed = rating_system.process_game_results(player_data_list)
    
    # Create game
    game = Game(num_players=len(results))
    db.session.add(game)
    db.session.flush()

    for res in processed:
        player = res['player']
        
        participant = GameParticipant(
            game_id=game.id,
            player_id=player.id,
            placement=res['placement'],
            points=res['points'],
            mu_before=res['mu_before'],
            sigma_before=res['sigma_before'],
            mu_after=res['mu_after'],
            sigma_after=res['sigma_after']
        )
        db.session.add(participant)
        
        # Update player
        player.mu = res['mu_after']
        player.sigma = res['sigma_after']
        player.games_played += 1
        player.total_points += res['points']
        if res['placement'] == 1: player.first_place += 1
        elif res['placement'] == 2: player.second_place += 1
        elif res['placement'] == 3: player.third_place += 1
        elif res['placement'] == 4: player.fourth_place += 1
        
    db.session.commit()
    return jsonify({'success': True, 'game': game.to_dict()}), 201


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5001)

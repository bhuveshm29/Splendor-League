from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Region(db.Model):
    """Tournament region model"""
    __tablename__ = 'regions'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    players = db.relationship('Player', back_populates='region')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat()
        }


class Player(db.Model):
    """Player model with a single assigned region and rating"""
    __tablename__ = 'players'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey('regions.id'), nullable=False)
    
    # Rating (Global/Single)
    mu = db.Column(db.Float, nullable=False)
    sigma = db.Column(db.Float, nullable=False)
    
    # Statistics
    games_played = db.Column(db.Integer, default=0)
    first_place = db.Column(db.Integer, default=0)
    second_place = db.Column(db.Integer, default=0)
    third_place = db.Column(db.Integer, default=0)
    fourth_place = db.Column(db.Integer, default=0)
    total_points = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    region = db.relationship('Region', back_populates='players')
    participations = db.relationship('GameParticipant', back_populates='player', cascade='all, delete-orphan')
    
    @property
    def rating(self):
        """Conservative rating (mu - 3*sigma) used for leaderboard"""
        return int(max(0, round(self.mu - 3 * self.sigma)))
    
    @property
    def average_points(self):
        return round(self.total_points / self.games_played, 2) if self.games_played > 0 else 0
    
    @property
    def win_rate(self):
        return round((self.first_place / self.games_played) * 100, 1) if self.games_played > 0 else 0
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'region_id': self.region_id,
            'region_name': self.region.name if self.region else "Unknown",
            'rating': self.rating,
            'mu': int(round(self.mu)),
            'sigma': int(round(self.sigma)),
            'games_played': self.games_played,
            'first_place': self.first_place,
            'second_place': self.second_place,
            'third_place': self.third_place,
            'fourth_place': self.fourth_place,
            'total_points': self.total_points,
            'average_points': self.average_points,
            'win_rate': self.win_rate,
            'created_at': self.created_at.isoformat()
        }


class Game(db.Model):
    """Game model storing match results"""
    __tablename__ = 'games'
    
    id = db.Column(db.Integer, primary_key=True)
    played_at = db.Column(db.DateTime, default=datetime.utcnow)
    num_players = db.Column(db.Integer, nullable=False)
    
    # Relationships
    participants = db.relationship('GameParticipant', back_populates='game', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'played_at': self.played_at.isoformat(),
            'num_players': self.num_players,
            'participants': [p.to_dict() for p in sorted(self.participants, key=lambda x: x.placement)]
        }


class GameParticipant(db.Model):
    """Junction table linking players to games with their results"""
    __tablename__ = 'game_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    placement = db.Column(db.Integer, nullable=False)
    points = db.Column(db.Integer, nullable=False)
    
    # Rating tracking at the time of the game
    mu_before = db.Column(db.Float, nullable=False)
    sigma_before = db.Column(db.Float, nullable=False)
    mu_after = db.Column(db.Float, nullable=False)
    sigma_after = db.Column(db.Float, nullable=False)
    
    # Relationships
    game = db.relationship('Game', back_populates='participants')
    player = db.relationship('Player', back_populates='participations')
    
    @property
    def rating_change(self):
        rating_before = int(round(self.mu_before))
        rating_after = int(round(self.mu_after))
        return rating_after - rating_before
    
    def to_dict(self):
        return {
            'id': self.id,
            'player_id': self.player_id,
            'player_name': self.player.name,
            'placement': self.placement,
            'points': self.points,
            'rating_change': self.rating_change,
            'mu_before': int(round(self.mu_before)),
            'mu_after': int(round(self.mu_after))
        }

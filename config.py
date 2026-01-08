import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration"""
    
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database
    # Use PostgreSQL in production, SQLite for local development
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
        # Fix for Heroku postgres:// -> postgresql://
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = DATABASE_URL or 'sqlite:///splendor_ratings.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Admin credentials
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME') or 'Bhuvesh'
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD') or 'ATFbhuveshAnmol'
    
    # OpenSkill parameters for Plackett-Luce model
    OPENSKILL_MU = 1000.0  # Initial rating mean
    OPENSKILL_SIGMA = 1000.0 / 3.0  # Initial rating uncertainty
    OPENSKILL_BETA = OPENSKILL_SIGMA / 2.0  # Skill class width
    OPENSKILL_TAU = OPENSKILL_SIGMA / 100.0  # Dynamics factor

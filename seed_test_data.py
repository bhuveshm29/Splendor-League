from app import app
from models import db, Player, Game, GameParticipant, Region
from rating_system import rating_system
from datetime import datetime, timedelta
import random

def seed_test_data():
    with app.app_context():
        print("Seeding test data with per-player regions...")

        # 1. Create Regions
        region_names = ["West Delhi"]
        regions = {}
        for name in region_names:
            region = Region.query.filter_by(name=name).first()
            if not region:
                region = Region(name=name)
                db.session.add(region)
                db.session.commit()
            regions[name] = region

        # 2. Create Players and assign each to ONE region
        player_info = [
            ("Alice", "West Delhi"),
            ("Bob", "West Delhi"),
            ("Charlie", "West Delhi"),
            ("Diana", "West Delhi"),
            ("Eve", "West Delhi"),
            ("Frank", "West Delhi"),
            ("Grace", "West Delhi"),
            ("Hank", "West Delhi")
        ]
        
        players = {}
        for name, region_name in player_info:
            player = Player.query.filter_by(name=name).first()
            if not player:
                initial_rating = rating_system.create_initial_rating()
                region = regions[region_name]
                player = Player(
                    name=name, 
                    region_id=region.id, 
                    mu=initial_rating.mu, 
                    sigma=initial_rating.sigma
                )
                db.session.add(player)
                db.session.commit()
            players[name] = player

        # 3. Simulate games (Cross-regional games possible)
        scenarios = []
        for i in range(30):
            num_players = random.choice([2, 3, 4])
            game_players = random.sample(list(players.values()), num_players)
            
            # Random points and placements
            points = sorted([random.randint(5, 15) for _ in range(num_players)], reverse=True)
            
            results = []
            for j, p in enumerate(game_players):
                placement = 1
                for k in range(j):
                    if points[j] < points[k]:
                        placement += 1
                
                results.append({
                    "player": p,
                    "placement": placement,
                    "points": points[j]
                })
            scenarios.append(results)

        # 4. Process scenarios
        for idx, scenario_results in enumerate(scenarios):
            # Calculate new ratings
            processed = rating_system.process_game_results(scenario_results)
            
            # Create game
            game = Game(num_players=len(scenario_results))
            game.played_at = datetime.utcnow() - timedelta(days=(len(scenarios) - idx))
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

                # Update Global Player Stats
                player.mu = res['mu_after']
                player.sigma = res['sigma_after']
                player.games_played += 1
                player.total_points += res['points']
                if res['placement'] == 1: player.first_place += 1
                elif res['placement'] == 2: player.second_place += 1
                elif res['placement'] == 3: player.third_place += 1
                elif res['placement'] == 4: player.fourth_place += 1

        db.session.commit()
        print("Successfully seeded database with per-player regional data!")

if __name__ == "__main__":
    seed_test_data()

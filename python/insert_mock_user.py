import psycopg2, os
from dotenv import load_dotenv
load_dotenv('.env.local')
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute("INSERT INTO users (clerk_id, email, name) VALUES ('mock_user_123', 'dev@example.com', 'Dev User') ON CONFLICT DO NOTHING")
conn.commit()
print("inserted mock user")

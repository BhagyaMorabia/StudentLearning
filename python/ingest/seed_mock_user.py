import psycopg2

conn = psycopg2.connect('postgresql://neondb_owner:npg_SFWjH7Gpcf8V@ep-polished-lab-aobw7a12-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')
cur = conn.cursor()
cur.execute("INSERT INTO users (clerk_id, email, name) VALUES ('test-user-123', 'test@example.com', 'Test User') ON CONFLICT (clerk_id) DO NOTHING;")
conn.commit()
print('Mock user inserted successfully!')

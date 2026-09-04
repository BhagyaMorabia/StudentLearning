import json
import uuid
from jee_syllabus import SYLLABUS

def generate_id(path_str):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"neuraljee://{path_str}"))

# 1. Build the mapping dictionary (UUID -> Human Readable Name)
uuid_to_name = {}
for subj_name, chapters in SYLLABUS.items():
    for chapter in chapters:
        for topic in chapter["topics"]:
            for subtopic in topic["subtopics"]:
                path_str = f"{subj_name}/{chapter['name']}/{topic['name']}/{subtopic['name']}"
                subtopic_id = generate_id(path_str)
                uuid_to_name[subtopic_id] = path_str

# 2. Read the edges JSON
try:
    with open('../data/prerequisite_edges.json', 'r') as f:
        edges = json.load(f)
except Exception as e:
    print(f"Error loading edges: {e}")
    edges = []

print(f"Total Edges: {len(edges)}")
print("Sample of translated prerequisites:")

count = 0
for edge in edges:
    from_name = uuid_to_name.get(edge['from_id'], edge['from_id'])
    to_name = uuid_to_name.get(edge['to_id'], edge['to_id'])
    
    # Let's find some cross-subject ones for fun!
    from_subj = from_name.split('/')[0] if '/' in from_name else ""
    to_subj = to_name.split('/')[0] if '/' in to_name else ""
    
    if from_subj != to_subj and from_subj and to_subj:
        print(f"CROSS-SUBJECT: [ {from_name} ] ---> [ {to_name} ]")
        count += 1
        if count > 15:
            break

if count == 0:
    # If no cross-subject, just print a few normal ones
    for edge in edges[:10]:
        from_name = uuid_to_name.get(edge['from_id'], edge['from_id'])
        to_name = uuid_to_name.get(edge['to_id'], edge['to_id'])
        print(f"[ {from_name} ] ---> [ {to_name} ]")

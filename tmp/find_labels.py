import json, os, urllib.request

api_key = os.environ.get('LINEAR_API_KEY', '')
if not api_key:
    print("ERROR: LINEAR_API_KEY not set")
    exit(1)

VSDK_TEAM_ID = 'f038e19e-5f94-4569-bb07-6ad0166299c9'
ISSUE_ID = 'a2776162-f026-44a2-a4bf-5928513154de'

# Current labels:
# webrtc-afk-bot: 91d8bc0b-c733-4e79-b486-2070a856b4b6
# js: 52278a5b-bd74-4798-b1d1-9f45d7ae3e73
# working: 36dcaede-adec-4c8f-b8a1-a9811df0a242

# Need to find bot-review label ID
# First, query the team's labels
query = """
query($teamId: String!) {
  team(id: $teamId) {
    labels {
      nodes {
        id
        name
      }
    }
  }
}
"""

req = urllib.request.Request(
    'https://api.linear.app/graphql',
    data=json.dumps({'query': query, 'variables': {'teamId': VSDK_TEAM_ID}}).encode(),
    headers={
        'Content-Type': 'application/json',
        'Authorization': api_key,
    }
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode())
    
    labels = result['data']['team']['labels']['nodes']
    for label in labels:
        if 'bot' in label['name'].lower() or 'review' in label['name'].lower() or 'working' in label['name'].lower() or 'afk' in label['name'].lower():
            print(f"{label['name']}: {label['id']}")
except Exception as e:
    print(f"Error: {e}")

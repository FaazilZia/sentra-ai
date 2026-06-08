import json
import urllib.request
import urllib.error
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

API_KEY = "rnd_GsAPGQpofaSBNa1bFCcILlb9yErJ"
SERVICE_ID = "srv-d7f41nn7f7vs73dhv5ug"
NEW_DIRECT_URL = "postgresql://postgres.kanlqyjmvfbkhpkfygvh:Faazilzia%40786@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

def get_env_vars():
    url = f"https://api.render.com/v1/services/{SERVICE_ID}/env-vars"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {API_KEY}")
    req.add_header("Accept", "application/json")
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data
    except urllib.error.HTTPError as e:
        print(f"Error fetching env vars: {e.code} - {e.read().decode()}")
        raise

def update_env_vars(env_vars):
    url = f"https://api.render.com/v1/services/{SERVICE_ID}/env-vars"
    
    payload = []
    found = False
    for item in env_vars:
        key = item["envVar"]["key"]
        value = item["envVar"]["value"]
        if key == "DIRECT_URL":
            value = NEW_DIRECT_URL
            found = True
        payload.append({"key": key, "value": value})
        
    if not found:
        payload.append({"key": "DIRECT_URL", "value": NEW_DIRECT_URL})
        
    req = urllib.request.Request(url, method="PUT")
    req.add_header("Authorization", f"Bearer {API_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    
    data = json.dumps(payload).encode("utf-8")
    
    try:
        with urllib.request.urlopen(req, data=data) as response:
            print("Successfully updated environment variables:")
            print(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Error updating env vars: {e.code} - {e.read().decode()}")
        raise

def trigger_deploy():
    url = f"https://api.render.com/v1/services/{SERVICE_ID}/deploys"
    req = urllib.request.Request(url, method="POST")
    req.add_header("Authorization", f"Bearer {API_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    
    data = json.dumps({}).encode("utf-8")
    
    try:
        with urllib.request.urlopen(req, data=data) as response:
            print("Successfully triggered manual redeploy:")
            print(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Error triggering deploy: {e.code} - {e.read().decode()}")
        raise

if __name__ == "__main__":
    print("Fetching current env vars...")
    vars_list = get_env_vars()
    print("Updating env vars list...")
    update_env_vars(vars_list)
    print("Triggering redeploy...")
    trigger_deploy()
    print("Done!")

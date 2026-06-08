import json
import urllib.request
import urllib.error
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

API_KEY = "rnd_GsAPGQpofaSBNa1bFCcILlb9yErJ"
SERVICE_ID = "srv-d7f41nn7f7vs73dhv5ug"

def get_env_vars():
    url = f"https://api.render.com/v1/services/{SERVICE_ID}/env-vars"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {API_KEY}")
    req.add_header("Accept", "application/json")
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            for item in data:
                print(f"{item['envVar']['key']} = {item['envVar']['value']}")
    except urllib.error.HTTPError as e:
        print(f"Error fetching env vars: {e.code} - {e.read().decode()}")

if __name__ == "__main__":
    get_env_vars()

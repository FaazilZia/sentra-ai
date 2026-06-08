import json
import urllib.request
import urllib.error
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

API_KEY = "rnd_GsAPGQpofaSBNa1bFCcILlb9yErJ"
SERVICE_ID = "srv-d7f41nn7f7vs73dhv5ug"

def check_deploys():
    url = f"https://api.render.com/v1/services/{SERVICE_ID}/deploys?limit=5"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {API_KEY}")
    req.add_header("Accept", "application/json")

    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            for d in data:
                deploy = d['deploy']
                print(f"Deploy ID: {deploy['id']}, Status: {deploy['status']}, Created At: {deploy['createdAt']}")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_deploys()

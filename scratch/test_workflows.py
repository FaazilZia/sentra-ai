import json
import urllib.request
import urllib.error
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

BACKEND_URL = "https://sentra-backend-node.onrender.com"

def test_api():
    # 1. Login
    login_url = f"{BACKEND_URL}/api/v1/auth/login"
    login_data = json.dumps({
        "email": "admin@sentra.ai",
        "password": "Sentra@Admin123"
    }).encode('utf-8')
    
    req1 = urllib.request.Request(login_url, data=login_data, method="POST")
    req1.add_header("Content-Type", "application/json")
    
    try:
        with urllib.request.urlopen(req1) as response:
            res_body = json.loads(response.read().decode())
            print("Login Success!")
            token = res_body["data"]["accessToken"]
            print(f"Token: {token[:20]}...")
            
            # 2. Get Workflows
            workflows_url = f"{BACKEND_URL}/api/v1/workflows"
            req2 = urllib.request.Request(workflows_url)
            req2.add_header("Authorization", f"Bearer {token}")
            
            with urllib.request.urlopen(req2) as response2:
                res_body2 = json.loads(response2.read().decode())
                print("Get Workflows Success!")
                print(res_body2)
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()

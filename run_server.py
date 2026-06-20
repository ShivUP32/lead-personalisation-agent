import os
import sys
import webbrowser
import uvicorn
from dotenv import load_dotenv

# Add project root to python path to resolve api.main
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
env_paths = [".env.local", ".env.local.txt", ".env"]
loaded = False
for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path, override=True)
        print(f"⚡ Loaded environment variables from: {env_path}")
        loaded = True
        break
if not loaded:
    print("⚠️ No environment file found. Please create a .env.local file with GEMINI_API_KEY.")

PORT = 3009

if __name__ == "__main__":
    url = f"http://localhost:{PORT}"
    print(f"==================================================")
    print(f"🚀 VoiceCare AI Lead Personalisation Console Local Server")
    print(f"👉 Running at: {url}")
    print(f"==================================================")

    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Could not open browser automatically: {e}")

    # Run uvicorn server
    uvicorn.run("api.main:app", host="127.0.0.1", port=PORT, reload=True)

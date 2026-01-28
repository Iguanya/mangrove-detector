from flask import Flask, render_template, request, jsonify
from inference_sdk import InferenceHTTPClient
from dotenv import load_dotenv
import os
import traceback
import time
from datetime import datetime
from PIL import Image
import pillow_heif
import paramiko

load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

api_key = os.getenv("ROBOFLOW_API_KEY")

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=api_key
)

SFTP_HOST = os.getenv("SFTP_HOST")
SFTP_PORT = int(os.getenv("SFTP_PORT", 22))
SFTP_USERNAME = os.getenv("SFTP_USERNAME")
SFTP_PASSWORD = os.getenv("SFTP_PASSWORD")
SFTP_REMOTE_PATH = os.getenv("SFTP_REMOTE_PATH", "/uploads")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "heic", "heif"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def upload_to_sftp(local_filepath, remote_filename):
    if not all([SFTP_HOST, SFTP_USERNAME, SFTP_PASSWORD]):
        print("[WARN] SFTP credentials not configured, skipping remote upload")
        return False
    
    try:
        transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
        transport.connect(username=SFTP_USERNAME, password=SFTP_PASSWORD)
        sftp = paramiko.SFTPClient.from_transport(transport)
        
        try:
            sftp.stat(SFTP_REMOTE_PATH)
        except FileNotFoundError:
            sftp.mkdir(SFTP_REMOTE_PATH)
        
        remote_filepath = f"{SFTP_REMOTE_PATH}/{remote_filename}"
        sftp.put(local_filepath, remote_filepath)
        print(f"[INFO] File uploaded to SFTP: {remote_filepath}")
        
        sftp.close()
        transport.close()
        return True
    except Exception as e:
        print(f"[ERROR] SFTP upload failed: {e}")
        traceback.print_exc()
        return False

def cleanup_uploads(max_age_seconds=24*60*60):
    now = time.time()
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        return
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.isfile(filepath):
            file_age = now - os.path.getmtime(filepath)
            if file_age > max_age_seconds:
                try:
                    os.remove(filepath)
                    print(f"[INFO] Deleted old file: {filepath}")
                except Exception as e:
                    print(f"[ERROR] Could not delete {filepath}: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/detect', methods=['GET', 'POST'])
def detect():
    if request.method == 'POST':
        try:
            cleanup_uploads()

            if 'image' not in request.files:
                print("[ERROR] No image uploaded")
                return jsonify({"error": "No image uploaded"}), 400

            file = request.files['image']
            if file.filename == '':
                print("[ERROR] No selected file")
                return jsonify({"error": "No selected file"}), 400

            if not allowed_file(file.filename):
                print(f"[ERROR] Unsupported file type: {file.filename}")
                return jsonify({"error": "Unsupported file type"}), 400

            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

            ext = file.filename.rsplit(".", 1)[1].lower()
            if ext in ("heic", "heif"):
                print(f"[INFO] Converting HEIC/HEIF to JPEG: {file.filename}")
                heif_file = pillow_heif.read_heif(file.read())
                image = Image.frombytes(heif_file.mode, heif_file.size, heif_file.data)
            else:
                image = Image.open(file.stream)

            filename = datetime.now().strftime("%Y%m%d%H%M%S_") + "uploaded.jpg"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image = image.convert("RGB")
            image.save(filepath, format="JPEG", quality=95)
            print(f"[INFO] Image saved locally to {filepath}")

            upload_to_sftp(filepath, filename)

            print("[INFO] Sending image to Roboflow workflow...")
            result = client.run_workflow(
                workspace_name="mangrove-7pypu",
                workflow_id="detect-count-and-visualize-2",
                images={"image": filepath},
                use_cache=True
            )
            print(f"[INFO] Workflow result received: {result}")

            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify({
                    "success": True,
                    "redirect_url": request.url,
                    "result": result
                })

            return render_template('result.html', image_path=filepath, result=result)

        except Exception as e:
            print("[ERROR] Exception in /detect route:")
            traceback.print_exc()
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify({"error": str(e)}), 500
            else:
                return render_template('error.html', error=str(e)), 500

    return render_template('detect.html')

@app.route("/log", methods=["POST"])
def log_message():
    data = request.json
    level = data.get("level", "INFO")
    message = data.get("message", "")
    print(f"[{level}] {message}")
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)

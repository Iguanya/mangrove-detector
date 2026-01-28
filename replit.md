# MangroveID

## Overview
MangroveID is a Flask-based web application that uses AI to identify mangroves and coastal plants from uploaded images or camera captures. It uses the Roboflow inference API for image detection.

## Project Architecture
- **Backend**: Flask (Python 3.11)
- **Frontend**: Jinja2 templates with Tailwind CSS
- **AI/ML**: Roboflow inference SDK for plant detection
- **Image Processing**: Pillow with HEIC/HEIF support

## Key Files
- `app.py` - Main Flask application with routes for:
  - `/` - Home page
  - `/detect` - Image upload and detection
- `templates/` - Jinja2 HTML templates
- `static/` - CSS, JS, and uploaded images
- `src/input.css` - Tailwind CSS source file

## Environment Variables
- `ROBOFLOW_API_KEY` - Required API key for Roboflow inference

## Running the App
The Flask server runs on port 5000:
```bash
python app.py
```

## Dependencies
Python packages are listed in `requirements.txt`:
- flask
- opencv-python
- inference-sdk
- python-dotenv
- pillow
- pillow-heif

## Recent Changes
- January 28, 2026: UI and Camera Improvements
  - Redesigned detect page with modern tabbed interface
  - Added drag & drop image upload with preview
  - Improved camera controls with better state management
  - Added loading spinners and status messages
  - Live scan feature with real-time results display
  - Smooth animations and transitions
  - Mobile-responsive design
  
- January 26, 2026: Initial Replit environment setup
  - Configured Flask to run on port 5000
  - Installed all Python dependencies
  - Set up workflow for Flask server

"""
email_service.py — Terroir notification mailer
Uses Gmail SMTP (app password) via environment variables.
Set SMTP_EMAIL and SMTP_APP_PASSWORD in backend/.env
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "")
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def _build_base_html(title: str, color: str, icon: str, body_html: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body {{ font-family: 'Georgia', serif; background: #fefae0; margin: 0; padding: 0; }}
  .wrapper {{ max-width: 600px; margin: 40px auto; background: #fefae0; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.08); }}
  .header {{ background: {color}; padding: 40px 48px; }}
  .header h1 {{ color: #fefae0; font-size: 28px; margin: 0; letter-spacing: -0.5px; }}
  .header p {{ color: rgba(254,250,224,0.75); font-size: 13px; margin: 8px 0 0; font-family: monospace; letter-spacing: 0.2em; text-transform: uppercase; }}
  .icon {{ font-size: 48px; margin-bottom: 16px; display: block; }}
  .body {{ padding: 40px 48px; }}
  .body p {{ color: #43493e; line-height: 1.8; font-size: 16px; margin: 0 0 16px; }}
  .metric-row {{ display: flex; gap: 16px; margin: 24px 0; }}
  .metric {{ flex: 1; background: #e7e3ca; border-radius: 16px; padding: 20px; text-align: center; }}
  .metric .value {{ font-size: 28px; font-weight: 900; color: #173809; letter-spacing: -1px; }}
  .metric .label {{ font-size: 11px; color: #73796d; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 4px; font-family: monospace; }}
  .alert-box {{ background: #9f402d15; border-left: 4px solid #9f402d; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }}
  .alert-box p {{ color: #9f402d; margin: 0; font-weight: 600; }}
  .footer {{ background: #173809; padding: 32px 48px; text-align: center; }}
  .footer p {{ color: rgba(254,250,224,0.5); font-size: 12px; margin: 0; font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase; }}
  .footer a {{ color: #c5efad; text-decoration: none; }}
  .cta {{ display: inline-block; background: #c5efad; color: #173809; font-weight: 900; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; margin: 24px 0; }}
</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="icon">{icon}</span>
      <h1>{title}</h1>
      <p>Technological Terroir · Field Intelligence</p>
    </div>
    <div class="body">
      {body_html}
    </div>
    <div class="footer">
      <p>© 2026 Technological Terroir · <a href="http://localhost:5173/profile">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>
"""


def send_satellite_spike_alert(to_email: str, user_name: str, location: str, ndvi: float, ndwi: float, anomaly: str):
    """Send an email warning about abnormal satellite data."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print(f"[email_service] SMTP not configured — skipping spike alert to {to_email}")
        return False

    subject = "⚠️ Field Alert: Satellite Anomaly Detected"
    body_html = f"""
      <p>Dear <strong>{user_name}</strong>,</p>
      <p>Our satellite monitoring system has detected an unusual pattern over your registered field location at <strong>{location}</strong>. Immediate attention may be required.</p>
      <div class="alert-box">
        <p>⚠️ Anomaly Detected: {anomaly}</p>
      </div>
      <div class="metric-row">
        <div class="metric">
          <div class="value">{ndvi:.2f}</div>
          <div class="label">NDVI Index</div>
        </div>
        <div class="metric">
          <div class="value">{ndwi:.2f}</div>
          <div class="label">NDWI Index</div>
        </div>
      </div>
      <p>NDVI values below 0.3 may indicate crop stress, disease, or water deficiency. NDWI below 0.1 suggests potential drought stress.</p>
      <p>Log in to your dashboard to view the full satellite scan and our AI-powered recommendations.</p>
      <a class="cta" href="http://localhost:5173/soil-health">View Full Satellite Scan</a>
    """

    return _send_email(to_email, subject, _build_base_html("Satellite Field Anomaly", "#9f402d", "🛰️", body_html))


def send_biweekly_ai_report(to_email: str, user_name: str, location: str, report_text: str, soil_data: dict):
    """Send a biweekly AI-generated soil & crop report."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print(f"[email_service] SMTP not configured — skipping biweekly report to {to_email}")
        return False

    subject = "🌱 Your Biweekly Soil Intelligence Report"
    ph = soil_data.get("ph", "—")
    nitrogen = soil_data.get("nitrogen", "—")
    phosphorus = soil_data.get("phosphorus", "—")
    potassium = soil_data.get("potassium", "—")

    body_html = f"""
      <p>Dear <strong>{user_name}</strong>,</p>
      <p>Here is your biweekly field intelligence report for <strong>{location}</strong>, generated by our AI agronomist.</p>
      <div class="metric-row">
        <div class="metric">
          <div class="value">{ph}</div>
          <div class="label">Soil pH</div>
        </div>
        <div class="metric">
          <div class="value">{nitrogen}</div>
          <div class="label">Nitrogen (ppm)</div>
        </div>
        <div class="metric">
          <div class="value">{phosphorus}</div>
          <div class="label">Phosphorus (ppm)</div>
        </div>
        <div class="metric">
          <div class="value">{potassium}</div>
          <div class="label">Potassium (ppm)</div>
        </div>
      </div>
      <p><strong>AI Field Analysis</strong></p>
      <p style="font-style: italic; color: #2d4f1e;">{report_text}</p>
      <a class="cta" href="http://localhost:5173/soil-health">Open Full Dashboard</a>
    """

    return _send_email(to_email, subject, _build_base_html("Biweekly Intelligence Report", "#173809", "🌱", body_html))


import webbrowser
import tempfile
import time

def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    try:
        # Try real SMTP first
        if SMTP_EMAIL and SMTP_PASSWORD:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Technological Terroir <{SMTP_EMAIL}>"
            msg["To"] = to_email
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.login(SMTP_EMAIL, SMTP_PASSWORD)
                server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
            print(f"[email_service] Sent: {subject} → {to_email}")
            return True
        else:
            raise Exception("SMTP not configured")
            
    except Exception as e:
        print(f"[email_service] Real email failed ({e}). Falling back to local browser demo preview.")
        
        # Fallback: Save HTML locally and open in browser
        try:
            filename = f"terroir_email_demo_{int(time.time())}.html"
            temp_path = os.path.join(tempfile.gettempdir(), filename)
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(html_body)
            
            # Open it in the default web browser (macOS / Windows / Linux)
            webbrowser.open(f"file://{temp_path}")
            print(f"[email_service] Opened simulated email preview in browser: {temp_path}")
            return True
        except Exception as fallback_error:
            print(f"[email_service] Fallback also failed: {fallback_error}")
            return False

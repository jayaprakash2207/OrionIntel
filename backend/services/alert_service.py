"""
Alert Delivery Service — Email + WhatsApp + SMS
Sends trading alerts from the OI engine to configured channels.
"""
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from concurrent.futures import ThreadPoolExecutor
from core.config import settings

_executor = ThreadPoolExecutor(max_workers=2)

# ── Config from settings (loaded from .env via pydantic-settings) ────────────

def _cfg():
    return {
        "EMAIL_FROM":      settings.ALERT_EMAIL_FROM,
        "EMAIL_TO":        settings.ALERT_EMAIL_TO,
        "EMAIL_PASSWORD":  settings.ALERT_EMAIL_PASSWORD,
        "EMAIL_SMTP":      settings.ALERT_EMAIL_SMTP,
        "EMAIL_PORT":      settings.ALERT_EMAIL_PORT,
        "TWILIO_SID":      settings.TWILIO_ACCOUNT_SID,
        "TWILIO_TOKEN":    settings.TWILIO_AUTH_TOKEN,
        "TWILIO_FROM":     settings.TWILIO_WHATSAPP_FROM,
        "TWILIO_WA_TO":    settings.TWILIO_WHATSAPP_TO,
        "TWILIO_SMS_FROM": settings.TWILIO_SMS_FROM,
        "TWILIO_SMS_TO":   settings.TWILIO_SMS_TO,
        "TEAMS_WEBHOOK":      settings.TEAMS_WEBHOOK_URL,
        "TELEGRAM_TOKEN":     settings.TELEGRAM_BOT_TOKEN,
        "TELEGRAM_CHAT_ID":   settings.TELEGRAM_CHAT_ID,
        "DISCORD_WEBHOOK":    settings.DISCORD_WEBHOOK_URL,
    }


def _split_recipients(raw: str):
    """Return a cleaned list of recipients from a comma/space separated string."""
    if not raw:
        return []
    parts = [p.strip() for p in raw.replace(";", ",").split(",")]
    return [p for p in parts if p]


def _format_alert_text(alert: dict, spot: float) -> str:
    from datetime import datetime
    from zoneinfo import ZoneInfo
    now_ist = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%d %b %Y, %I:%M:%S %p IST")
    emoji = {
        "MARKET UP": "🟢📈",
        "MARKET DOWN": "🔴📉",
        "BIG PLAYERS ENTERED": "🐋💰",
        "BULLISH BREAKOUT": "🚀🟢",
        "BEARISH BREAKDOWN": "💥🔴",
        "SHORT COVERING — FAST MOVE UP": "⚡🟢",
        "LONG UNWINDING — FAST MOVE DOWN": "⚡🔴",
        "PCR EXTREME BULLISH": "📊🟢",
        "PCR EXTREME BEARISH": "📊🔴",
    }.get(alert.get("alert", ""), "⚠️")

    direction_icon = "▲" if alert.get("direction") == "bullish" else "▼"

    return f"""{emoji} *NIFTY ALERT — {alert.get('alert', 'SIGNAL')}*

{direction_icon} Direction: {alert.get('direction', '—').upper()}
🎯 Action: {alert.get('action', '—')}
💪 Strength: {alert.get('strength', '—').upper()}
🔮 Confidence: {alert.get('confidence', '—').upper()}

📍 Nifty Spot: {spot:,.0f}

📝 Reason:
{alert.get('reason', '—')}

⏰ {now_ist} · OrionIntel"""


def _send_email_sync(subject: str, body: str) -> dict:
    c = _cfg()
    if not all([c["EMAIL_FROM"], c["EMAIL_TO"], c["EMAIL_PASSWORD"]]):
        return {"success": False, "error": "Email not configured (add ALERT_EMAIL_FROM/TO/PASSWORD to .env)"}
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = c["EMAIL_FROM"]
        msg["To"]      = c["EMAIL_TO"]
        html_body = body.replace("\n", "<br>")
        msg.attach(MIMEText(body, "plain"))
        msg.attach(MIMEText(f"<html><body style='font-family:monospace'>{html_body}</body></html>", "html"))
        with smtplib.SMTP(c["EMAIL_SMTP"], c["EMAIL_PORT"]) as server:
            server.starttls()
            server.login(c["EMAIL_FROM"], c["EMAIL_PASSWORD"])
            server.send_message(msg)
        return {"success": True, "channel": "email", "to": c["EMAIL_TO"]}
    except Exception as e:
        return {"success": False, "error": str(e), "channel": "email"}


def _send_whatsapp_sync(message: str) -> dict:
    c = _cfg()
    recipients = _split_recipients(c["TWILIO_WA_TO"])
    if not all([c["TWILIO_SID"], c["TWILIO_TOKEN"], c["TWILIO_FROM"], recipients]):
        return {"success": False, "error": "WhatsApp not configured (add TWILIO_* keys to .env)"}
    try:
        from twilio.rest import Client
        client = Client(c["TWILIO_SID"], c["TWILIO_TOKEN"])
        results = []
        for to in recipients:
            msg = client.messages.create(body=message, from_=c["TWILIO_FROM"], to=to)
            results.append({"to": to, "sid": msg.sid, "success": True})
        return {
            "success": all(r["success"] for r in results),
            "channel": "whatsapp",
            "sent": results,
        }
    except ImportError:
        return {"success": False, "error": "twilio package not installed. Run: pip install twilio", "channel": "whatsapp"}
    except Exception as e:
        return {"success": False, "error": str(e), "channel": "whatsapp"}


def _send_teams_sync(alert: dict, spot: float) -> dict:
    c = _cfg()
    webhook_url = c["TEAMS_WEBHOOK"]
    if not webhook_url:
        return {"success": False, "error": "Teams not configured (add TEAMS_WEBHOOK_URL to .env)"}
    try:
        import httpx
        direction = alert.get("direction", "").upper()
        color = "00C400" if direction == "BULLISH" else "FF0000" if direction == "BEARISH" else "FFA500"
        payload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": color,
            "summary": f"Nifty Alert: {alert.get('alert', 'SIGNAL')}",
            "sections": [{
                "activityTitle": f"🚨 NIFTY ALERT — {alert.get('alert', 'SIGNAL')}",
                "activitySubtitle": f"Spot: {spot:,.0f} | {direction}",
                "facts": [
                    {"name": "Action",     "value": alert.get("action", "—")},
                    {"name": "Strength",   "value": alert.get("strength", "—").upper()},
                    {"name": "Confidence", "value": alert.get("confidence", "—").upper()},
                    {"name": "Reason",     "value": alert.get("reason", "—")},
                ],
                "markdown": True,
            }]
        }
        resp = httpx.post(webhook_url, json=payload, timeout=15)
        if resp.status_code == 200:
            return {"success": True, "channel": "teams"}
        return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text}", "channel": "teams"}
    except Exception as e:
        return {"success": False, "error": str(e), "channel": "teams"}


def _send_telegram_sync(alert: dict, spot: float) -> dict:
    c = _cfg()
    token = c["TELEGRAM_TOKEN"]
    chat_id = c["TELEGRAM_CHAT_ID"]
    if not token or not chat_id:
        return {"success": False, "error": "Telegram not configured (add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env)"}
    try:
        import httpx
        from datetime import datetime
        from zoneinfo import ZoneInfo
        now_ist = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%d %b %Y, %I:%M:%S %p IST")
        direction = alert.get("direction", "").upper()
        icon = "🟢📈" if direction == "BULLISH" else "🔴📉" if direction == "BEARISH" else "⚠️"
        text = (
            f"{icon} *NIFTY ALERT — {alert.get('alert', 'SIGNAL')}*\n\n"
            f"{'▲' if direction == 'BULLISH' else '▼'} Direction: {direction}\n"
            f"🎯 Action: {alert.get('action', '—')}\n"
            f"💪 Strength: {alert.get('strength', '—').upper()}\n"
            f"🔮 Confidence: {alert.get('confidence', '—').upper()}\n\n"
            f"📍 Nifty Spot: {spot:,.0f}\n\n"
            f"📝 {alert.get('reason', '—')}\n\n"
            f"⏰ {now_ist} · OrionIntel"
        )
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        resp = httpx.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}, timeout=15)
        data = resp.json()
        if data.get("ok"):
            return {"success": True, "channel": "telegram"}
        return {"success": False, "error": data.get("description", "Unknown error"), "channel": "telegram"}
    except Exception as e:
        return {"success": False, "error": str(e), "channel": "telegram"}


def _send_discord_sync(alert: dict, spot: float) -> dict:
    c = _cfg()
    webhook_url = c["DISCORD_WEBHOOK"]
    if not webhook_url:
        return {"success": False, "error": "Discord not configured (add DISCORD_WEBHOOK_URL to .env)"}
    try:
        import httpx
        from datetime import datetime
        from zoneinfo import ZoneInfo
        now_ist = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%d %b %Y, %I:%M:%S %p IST")
        direction = alert.get("direction", "").upper()
        color = 0x00C400 if direction == "BULLISH" else 0xFF0000 if direction == "BEARISH" else 0xFFA500
        icon = {
            "MARKET UP": "🟢📈",
            "MARKET DOWN": "🔴📉",
            "BIG PLAYERS ENTERED": "🐋💰",
            "BULLISH BREAKOUT": "🚀🟢",
            "BEARISH BREAKDOWN": "💥🔴",
            "SHORT COVERING — FAST MOVE UP": "⚡🟢",
            "LONG UNWINDING — FAST MOVE DOWN": "⚡🔴",
            "PCR EXTREME BULLISH": "📊🟢",
            "PCR EXTREME BEARISH": "📊🔴",
        }.get(alert.get("alert", ""), "⚠️")
        direction_arrow = "▲" if direction == "BULLISH" else "▼"
        payload = {
            "username": "OrionIntel",
            "content": "@everyone",
            "embeds": [{
                "title": f"{icon} NIFTY ALERT — {alert.get('alert', 'SIGNAL')}",
                "color": color,
                "fields": [
                    {"name": "Direction",   "value": f"{direction_arrow} {direction}", "inline": True},
                    {"name": "Action",      "value": alert.get("action", "—"),         "inline": True},
                    {"name": "Strength",    "value": alert.get("strength", "—").upper(), "inline": True},
                    {"name": "Confidence",  "value": alert.get("confidence", "—").upper(), "inline": True},
                    {"name": "Nifty Spot",  "value": f"{spot:,.0f}",                   "inline": True},
                    {"name": "Reason",      "value": alert.get("reason", "—"),          "inline": False},
                ],
                "footer": {"text": f"OrionIntel · {now_ist}"},
            }]
        }
        resp = httpx.post(webhook_url, json=payload, timeout=15)
        if resp.status_code in (200, 204):
            return {"success": True, "channel": "discord"}
        return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text}", "channel": "discord"}
    except Exception as e:
        return {"success": False, "error": str(e), "channel": "discord"}


def _send_sms_sync(message: str) -> dict:
    c = _cfg()
    recipients = _split_recipients(c["TWILIO_SMS_TO"])
    if not all([c["TWILIO_SID"], c["TWILIO_TOKEN"], c["TWILIO_SMS_FROM"], recipients]):
        return {"success": False, "error": "SMS not configured (add TWILIO_SMS_FROM/TO to .env)"}
    try:
        from twilio.rest import Client
        client = Client(c["TWILIO_SID"], c["TWILIO_TOKEN"])
        results = []
        for to in recipients:
            msg = client.messages.create(body=message[:160], from_=c["TWILIO_SMS_FROM"], to=to)
            results.append({"to": to, "sid": msg.sid, "success": True})
        return {
            "success": all(r["success"] for r in results),
            "channel": "sms",
            "sent": results,
        }
    except ImportError:
        return {"success": False, "error": "twilio package not installed", "channel": "sms"}
    except Exception as e:
        return {"success": False, "error": str(e), "channel": "sms"}


async def send_alert(alert: dict, spot_price: float, channels: list = None) -> dict:
    """
    Send a trading alert to configured channels.
    channels: list of 'email', 'whatsapp', 'sms', 'teams' (default: all configured)
    """
    if channels is None:
        channels = ["email", "whatsapp", "sms", "teams", "telegram", "discord"]

    text = _format_alert_text(alert, spot_price)
    subject = f"🚨 Nifty Alert: {alert.get('alert', 'SIGNAL')} — {alert.get('direction', '').upper()}"

    loop = asyncio.get_event_loop()
    results = {}

    tasks = []
    if "email" in channels:
        tasks.append(("email", loop.run_in_executor(_executor, _send_email_sync, subject, text)))
    if "whatsapp" in channels:
        tasks.append(("whatsapp", loop.run_in_executor(_executor, _send_whatsapp_sync, text)))
    if "sms" in channels:
        tasks.append(("sms", loop.run_in_executor(_executor, _send_sms_sync, text)))
    if "teams" in channels:
        tasks.append(("teams", loop.run_in_executor(_executor, _send_teams_sync, alert, spot_price)))
    if "telegram" in channels:
        tasks.append(("telegram", loop.run_in_executor(_executor, _send_telegram_sync, alert, spot_price)))
    if "discord" in channels:
        tasks.append(("discord", loop.run_in_executor(_executor, _send_discord_sync, alert, spot_price)))

    for channel, task in tasks:
        try:
            results[channel] = await task
        except Exception as e:
            results[channel] = {"success": False, "error": str(e)}

    return {
        "alert_sent": alert.get("alert"),
        "results": results,
        "any_success": any(r.get("success") for r in results.values()),
    }


async def send_strong_alerts(alerts: list, spot_price: float, min_strength: str = "strong") -> list:
    """
    Filter alerts by strength AND confidence before sending.
    Only sends: strength=strong AND confidence=high
    """
    strength_rank   = {"weak": 0, "medium": 1, "strong": 2}
    confidence_rank = {"low": 0, "medium": 1, "high": 2}
    min_rank = strength_rank.get(min_strength, 2)

    results = []
    for alert in alerts:
        alert_rank      = strength_rank.get(alert.get("strength", "weak"), 0)
        confidence      = confidence_rank.get(alert.get("confidence", "low"), 0)
        if alert_rank >= min_rank and confidence >= confidence_rank["high"]:
            result = await send_alert(alert, spot_price)
            results.append(result)

    return results


def get_alert_config_status() -> dict:
    """Check which alert channels are configured."""
    c = _cfg()
    return {
        "email": {
            "configured": bool(c["EMAIL_FROM"] and c["EMAIL_TO"] and c["EMAIL_PASSWORD"]),
            "from": c["EMAIL_FROM"] or "not set",
            "to": c["EMAIL_TO"] or "not set",
            "setup": "Add ALERT_EMAIL_FROM, ALERT_EMAIL_TO, ALERT_EMAIL_PASSWORD to backend/.env",
        },
        "whatsapp": {
            "configured": bool(c["TWILIO_SID"] and c["TWILIO_TOKEN"] and c["TWILIO_FROM"] and _split_recipients(c["TWILIO_WA_TO"])),
            "to": _split_recipients(c["TWILIO_WA_TO"]) or "not set",
            "setup": "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_WHATSAPP_TO (comma-separated for multiple) to backend/.env. Requires Twilio account.",
        },
        "sms": {
            "configured": bool(c["TWILIO_SID"] and c["TWILIO_TOKEN"] and c["TWILIO_SMS_FROM"] and _split_recipients(c["TWILIO_SMS_TO"])),
            "to": _split_recipients(c["TWILIO_SMS_TO"]) or "not set",
            "setup": "Add TWILIO_SMS_FROM, TWILIO_SMS_TO (comma-separated for multiple) to backend/.env. Requires Twilio account.",
        },
        "teams": {
            "configured": bool(c["TEAMS_WEBHOOK"]),
            "webhook": c["TEAMS_WEBHOOK"][:40] + "..." if c["TEAMS_WEBHOOK"] else "not set",
            "setup": "Add TEAMS_WEBHOOK_URL to backend/.env. Get it from Teams channel → Connectors → Incoming Webhook.",
        },
        "telegram": {
            "configured": bool(c["TELEGRAM_TOKEN"] and c["TELEGRAM_CHAT_ID"]),
            "chat_id": c["TELEGRAM_CHAT_ID"] or "not set",
            "setup": "Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to backend/.env.",
        },
        "discord": {
            "configured": bool(c["DISCORD_WEBHOOK"]),
            "webhook": c["DISCORD_WEBHOOK"][:40] + "..." if c["DISCORD_WEBHOOK"] else "not set",
            "setup": "Add DISCORD_WEBHOOK_URL to backend/.env. Get it from Discord channel → Edit Channel → Integrations → Webhooks.",
        },
    }

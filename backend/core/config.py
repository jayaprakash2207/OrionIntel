from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # AI
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    # Market data
    ALPHA_VANTAGE_KEY: str = ""
    COINGECKO_API_KEY: str = ""
    FINNHUB_API_KEY: str = ""
    POLYGON_API_KEY: str = ""
    # News
    NEWS_API_KEY: str = ""
    # Economic
    FRED_API_KEY: str = ""
    # Database
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    # Weather
    OPENWEATHER_API_KEY: str = ""
    # Social
    REDDIT_CLIENT_ID: str = ""
    REDDIT_CLIENT_SECRET: str = ""
    # Trading
    ALPACA_API_KEY: str = ""
    ALPACA_SECRET_KEY: str = ""
    ALPACA_BASE_URL: str = "https://paper-api.alpaca.markets"
    # Shipping
    MARINETRAFFIC_API_KEY: str = ""
    # Angel One SmartAPI
    ANGEL_API_KEY: str = ""
    ANGEL_SECRET_KEY: str = ""
    ANGEL_CLIENT_ID: str = ""
    ANGEL_PIN: str = ""
    ANGEL_TOTP_SECRET: str = ""
    # Alerts — Email
    ALERT_EMAIL_FROM: str = ""
    ALERT_EMAIL_TO: str = ""
    ALERT_EMAIL_PASSWORD: str = ""
    ALERT_EMAIL_SMTP: str = "smtp.gmail.com"
    ALERT_EMAIL_PORT: int = 587
    # Alerts — Twilio WhatsApp / SMS
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = ""
    TWILIO_WHATSAPP_TO: str = ""
    TWILIO_SMS_FROM: str = ""
    TWILIO_SMS_TO: str = ""
    # Alerts — Microsoft Teams
    TEAMS_WEBHOOK_URL: str = ""
    # Alerts — Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    # Alerts — Discord
    DISCORD_WEBHOOK_URL: str = ""
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

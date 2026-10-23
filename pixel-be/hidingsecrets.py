import re

# --- Security Redaction Function ---
def redact_sensitive_data(text: str) -> str:
    """
    Scans extracted OCR text and redacts sensitive patterns 
    like API keys, passwords, tokens, OTPs, and credit cards.
    """
    if not text:
        return ""

    # 1. Redact known API key formats (OpenAI sk-, Google AIza, JWT tokens)
    text = re.sub(
        r'\b(sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35}|eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+)\b', 
        '[REDACTED_API_KEY]', 
        text
    )

    # 2. Redact key-value secrets (e.g., password = "secret123", api_key: xyz)
    text = re.sub(
        r'(?i)\b(password|passwd|pwd|secret|api_key|apikey|auth_token|bearer|access_token)\s*[:=]\s*([^\s]+)', 
        r'\1: [REDACTED_SECRET]', 
        text
    )

    # 3. Redact OTPs and verification codes (e.g., "OTP is 482910", "code: 1234")
    text = re.sub(
        r'(?i)\b(otp|verification code|auth code|security code)\s*[:=]?\s*(\d{4,8})\b', 
        r'\1: [REDACTED_OTP]', 
        text
    )

    # 4. Redact potential Credit Card numbers (13 to 16 digits)
    text = re.sub(
        r'\b(?:\d[ -]*?){13,16}\b', 
        '[REDACTED_CARD_NUMBER]', 
        text
    )

    return text
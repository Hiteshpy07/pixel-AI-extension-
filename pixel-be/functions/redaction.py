import re

def redact_info(text:str):
    ''' basically it takes the retext from ocr , pass ot thorugh itself , and maskes the sensitive information , before passingit to ai clous models'''
    # uses rezex model fo pythin

    if not retext:
        return ""

      # 1. Specific Cloud Provider API Keys
    # OpenAI (sk-...), Google Gemini (AIza...), GitHub (ghp_..., gho_...), AWS (AKIA...)
    retext = re.sub(
        r'\b(sk-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z-_]{35}|gh[pousr]_[A-Za-z0-9_]{36,}|AKIA[0-9A-Z]{16})\b',
        '[REDACTED_API_KEY]',
        retext
    )
    # 2. Stripe API Keys (sk_live_..., sk_test_...)
    retext = re.sub(
        r'\b(sk_live_[0-9a-zA-Z]{24,}|sk_test_[0-9a-zA-Z]{24,}|pk_live_[0-9a-zA-Z]{24,})\b',
        '[REDACTED_STRIPE_KEY]',
        retext
    )
    # 3. JSON Web Tokens (JWT) - Starts with eyJ...
    retext = re.sub(
        r'\b(eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b',
        '[REDACTED_JWT_TOKEN]',
        retext
    )
    # 4. Database Connection Strings (e.g. postgres://user:password@host:port/db)
    retext = re.sub(
        r'(?i)\b((?:postgres|postgresql|mysql|mongodb|redis):\/\/[a-zA-Z0-9_-]+:)([^@\s]+)(@[a-zA-Z0-9.-]+)',
        r'\1[REDACTED_DB_PASSWORD]\3',
        retext
    )
    # 5. Key-Value Secrets (e.g. password = "secret", api_key: "xyz", bearer ...)
    retext = re.sub(
        r'(?i)\b(password|passwd|pwd|secret|api_key|apikey|auth_token|access_token|client_secret|private_key)\s*[:=]\s*([^\s,;]+)',
        r'\1: [REDACTED_SECRET]',
        retext
    )
    # 6. Authorization Bearer Headers (e.g. "Bearer a1b2c3d4...")
    retext = re.sub(
        r'(?i)\b(bearer)\s+([a-zA-Z0-9_\-\.]{15,})\b',
        r'\1 [REDACTED_BEARER_TOKEN]',
        retext
    )
    # 7. OTPs and verification codes (4 to 8 digits next to keywords like "otp" or "code")
    retext = re.sub(
        r'(?i)\b(otp|verification code|auth code|security code)\s*[:=]?\s*(\d{4,8})\b',
        r'\1: [REDACTED_OTP]',
        retext
    )

    return retext

    

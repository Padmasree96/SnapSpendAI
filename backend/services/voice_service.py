import os
from config import settings

class VoiceService:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(os.path.join(self.upload_dir, "voice"), exist_ok=True)

    def generate_voice_response(self, text: str, filename: str, lang: str = 'en') -> str:
        """Convert text to speech and save as mp3."""
        try:
            from gtts import gTTS
        except ImportError:
            # Voice response is optional; return empty URL when gTTS is unavailable.
            return ""

        # Clean text (remove markdown symbols)
        clean_text = text.replace("**", "").replace("#", "").replace("-", " ")
        
        # Detection of Tamil language for gTTS
        if self._is_tamil(clean_text):
            lang = 'ta'

        try:
            tts = gTTS(text=clean_text, lang=lang)
            file_path = os.path.join(self.upload_dir, "voice", f"{filename}.mp3")
            tts.save(file_path)
            return f"/uploads/voice/{filename}.mp3"
        except Exception:
            # Avoid failing chat response when TTS network/service fails.
            return ""

    def _is_tamil(self, text: str) -> bool:
        import re
        tamil_range = re.compile(r'[\u0b80-\u0bff]')
        return bool(tamil_range.search(text))

voice_service = VoiceService()

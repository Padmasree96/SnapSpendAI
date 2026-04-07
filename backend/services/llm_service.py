"""
Reusable OpenAI LLM integration service.
"""

from typing import Optional

from config import settings


class LLMService:
    def __init__(self):
        self._client: Optional[object] = None

    def _get_client(self):
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("openai package is not installed. Run: pip install openai") from exc

        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured.")
        if self._client is None:
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=settings.OPENAI_TIMEOUT_SECONDS)
        return self._client

    def generate_text_response(
        self,
        user_query: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        temperature: float = 0.2,
    ) -> str:
        """
        Send user query to OpenAI and return plain text output.
        """
        client = self._get_client()

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if context:
            messages.append({"role": "system", "content": f"Retrieved context:\n{context}"})
        messages.append({"role": "user", "content": user_query})

        completion = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=temperature,
        )

        content = completion.choices[0].message.content if completion.choices else ""
        if isinstance(content, str):
            return content.strip()
        return str(content).strip()


llm_service = LLMService()


def ask_llm(
    user_query: str,
    system_prompt: Optional[str] = None,
    context: Optional[str] = None,
    temperature: float = 0.2,
) -> str:
    """Reusable function wrapper requested by the API layer."""
    return llm_service.generate_text_response(
        user_query=user_query,
        system_prompt=system_prompt,
        context=context,
        temperature=temperature,
    )

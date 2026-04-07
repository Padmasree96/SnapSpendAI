from pydantic import BaseModel, field_validator


class RagQuestionRequest(BaseModel):
    question: str

    @field_validator("question")
    @classmethod
    def validate_question(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Question cannot be empty")
        if len(cleaned) > 4000:
            raise ValueError("Question is too long")
        return cleaned

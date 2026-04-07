"""
Simple RAG orchestration: ingest files, retrieve context, and answer with LLM.
"""

import os
import re
from collections import Counter
from typing import Dict, List

from config import settings
from services.document_processor import document_processor
from services.llm_service import ask_llm
from services.security_service import validate_user_prompt
from services.vector_service import vector_service

RAG_SYSTEM_PROMPT = (
    "You are a finance assistant. Answer only from retrieved document context. "
    "If the answer is not present, reply: "
    "'I don't know based on the uploaded documents.' "
    "Do not invent facts."
)


class RAGService:
    def _tokenize(self, text: str) -> Counter:
        return Counter(re.findall(r"[a-z0-9]+", (text or "").lower()))

    def _score_segment(self, segment: str, query_tokens: Counter) -> float:
        segment_tokens = self._tokenize(segment)
        if not segment_tokens or not query_tokens:
            return 0.0

        overlap = sum(min(count, segment_tokens[token]) for token, count in query_tokens.items())
        if overlap <= 0:
            return 0.0

        return overlap / max(len(segment_tokens), 1)

    def _split_into_segments(self, text: str) -> List[str]:
        raw_segments = re.split(r"[\n\r]+|(?<=[.!?])\s+", text or "")
        segments = []
        for segment in raw_segments:
            cleaned = " ".join(segment.split())
            if len(cleaned) >= 20:
                segments.append(cleaned)
        return segments

    def _build_local_answer(self, question: str, docs: List[object]) -> str:
        query_tokens = self._tokenize(question)
        ranked_segments = []

        for doc in docs:
            source = str(doc.metadata.get("source", "uploaded_file"))
            chunk = doc.metadata.get("chunk", 0)
            segments = self._split_into_segments(doc.page_content)
            if not segments:
                preview = " ".join((doc.page_content or "").split())
                if preview:
                    segments = [preview[:280]]

            for segment in segments:
                ranked_segments.append({
                    "score": self._score_segment(segment, query_tokens),
                    "text": segment[:280],
                    "source": source,
                    "chunk": chunk,
                })

        ranked_segments.sort(key=lambda item: item["score"], reverse=True)
        best_segments = [item for item in ranked_segments[:3] if item["text"]]

        if not best_segments:
            return "I found uploaded documents, but I could not extract any readable text from the most relevant chunks."

        lines = ["I found these relevant details in your uploaded documents:"]
        for item in best_segments:
            lines.append(f"- {item['text']} (Source: {item['source']}, chunk {item['chunk']})")

        if not settings.OPENAI_API_KEY:
            lines.append("Local document memory mode is active, so this answer is based on direct document matches.")

        return "\n".join(lines)

    def ingest_file(self, file_path: str, user_id: int) -> int:
        """Extract text, chunk it, embed it, and store in FAISS."""
        documents = document_processor.process_file(file_path)
        if not documents:
            return 0

        source_name = os.path.basename(file_path)
        return vector_service.add_documents(documents=documents, user_id=user_id, source_name=source_name)

    def answer_from_documents(self, question: str, user_id: int) -> Dict:
        """Retrieve top chunks and produce grounded answer."""
        clean_question = validate_user_prompt(question)
        docs = vector_service.similarity_search(clean_question, user_id=user_id, k=settings.RAG_TOP_K)

        if not docs:
            return {
                "answer": "I don't know based on the uploaded documents. Please upload a file first.",
                "sources": [],
                "retrievedChunks": 0,
            }

        context_blocks: List[str] = []
        sources: List[Dict] = []
        for idx, doc in enumerate(docs, start=1):
            source = str(doc.metadata.get("source", "uploaded_file"))
            chunk = doc.metadata.get("chunk", idx - 1)
            context_blocks.append(f"[{idx}] source={source} chunk={chunk}\n{doc.page_content}")
            sources.append({"source": source, "chunk": chunk})

        context_text = "\n\n".join(context_blocks)
        try:
            answer = ask_llm(
                user_query=clean_question,
                system_prompt=RAG_SYSTEM_PROMPT,
                context=context_text,
                temperature=0,
            )
        except Exception:
            answer = self._build_local_answer(clean_question, docs)

        return {"answer": answer, "sources": sources, "retrievedChunks": len(docs)}

    def clear_user_documents(self, user_id: int) -> int:
        return vector_service.clear_user_index(user_id)

    def get_memory_status(self, user_id: int) -> Dict:
        status = vector_service.get_user_status(user_id)
        status["ready"] = status["chunkCount"] > 0
        status["modeLabel"] = "OpenAI + FAISS" if status["mode"] == "faiss" else "Local document memory"
        return status


rag_service = RAGService()

import json
import math
import os
import re
import shutil
from collections import Counter
from dataclasses import dataclass
from typing import Dict, List, Tuple

from config import settings


@dataclass
class LocalDocument:
    page_content: str
    metadata: Dict


class VectorService:
    def __init__(self):
        self.index_path = settings.FAISS_INDEX_PATH
        self.fallback_store_path = f"{self.index_path}_local.json"
        self.embeddings = None
        self.vector_store = None
        self._faiss_class = None
        self._document_class = None
        self._fallback_documents: List[LocalDocument] = []
        self._last_faiss_error = None
        self._mode = "local"
        self._load_fallback_store_if_possible()
        self._initialize_store_if_possible()

    def _import_langchain_components(self) -> Tuple[object, object, object]:
        """Lazy import to avoid breaking startup when optional deps are missing."""
        try:
            from langchain_community.vectorstores import FAISS
            from langchain_core.documents import Document
            from langchain_openai import OpenAIEmbeddings
        except ImportError as exc:
            raise RuntimeError(
                "RAG dependencies missing. Install: pip install langchain langchain-openai langchain-community faiss-cpu"
            ) from exc
        return FAISS, Document, OpenAIEmbeddings

    def _remember_faiss_error(self, exc: Exception) -> None:
        message = str(exc)
        if message != self._last_faiss_error:
            print(f"Warning: falling back to local document memory: {message}")
            self._last_faiss_error = message
        self._mode = "local"

    def _initialize_store_if_possible(self) -> None:
        """Try loading existing FAISS index without breaking startup."""
        if not settings.OPENAI_API_KEY or not os.path.exists(self.index_path):
            return

        try:
            FAISS, _, OpenAIEmbeddings = self._import_langchain_components()
            self._faiss_class = FAISS
            self.embeddings = OpenAIEmbeddings(
                openai_api_key=settings.OPENAI_API_KEY,
                model=settings.EMBEDDING_MODEL,
            )
            self.vector_store = FAISS.load_local(
                self.index_path,
                self.embeddings,
                allow_dangerous_deserialization=True,
            )
            self._mode = "faiss"
        except Exception as exc:
            self._remember_faiss_error(exc)
            self.vector_store = None

    def _ensure_runtime_components(self) -> None:
        FAISS, Document, OpenAIEmbeddings = self._import_langchain_components()
        self._faiss_class = FAISS
        self._document_class = Document
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured.")
        if self.embeddings is None:
            self.embeddings = OpenAIEmbeddings(
                openai_api_key=settings.OPENAI_API_KEY,
                model=settings.EMBEDDING_MODEL,
            )
        if self.vector_store is None and os.path.exists(self.index_path):
            self.vector_store = FAISS.load_local(
                self.index_path,
                self.embeddings,
                allow_dangerous_deserialization=True,
            )

    def _can_use_faiss(self) -> bool:
        if not settings.OPENAI_API_KEY:
            self._mode = "local"
            return False

        try:
            self._ensure_runtime_components()
            self._mode = "faiss"
            return True
        except Exception as exc:
            self._remember_faiss_error(exc)
            return False

    def _load_fallback_store_if_possible(self) -> None:
        if not os.path.exists(self.fallback_store_path):
            return

        try:
            with open(self.fallback_store_path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except Exception:
            self._fallback_documents = []
            return

        documents: List[LocalDocument] = []
        for item in payload if isinstance(payload, list) else []:
            if not isinstance(item, dict):
                continue
            documents.append(
                LocalDocument(
                    page_content=str(item.get("page_content") or ""),
                    metadata=dict(item.get("metadata") or {}),
                )
            )
        self._fallback_documents = documents

    def _save_fallback_store(self) -> None:
        if not self._fallback_documents:
            if os.path.exists(self.fallback_store_path):
                os.remove(self.fallback_store_path)
            return

        payload = [
            {"page_content": doc.page_content, "metadata": doc.metadata}
            for doc in self._fallback_documents
        ]
        with open(self.fallback_store_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)

    def _tokenize(self, text: str) -> Counter:
        return Counter(re.findall(r"[a-z0-9]+", (text or "").lower()))

    def _score_local_document(self, query_tokens: Counter, page_content: str, metadata: Dict) -> float:
        doc_tokens = self._tokenize(page_content)
        if not query_tokens or not doc_tokens:
            return 0.0

        overlap = sum(min(count, doc_tokens[token]) for token, count in query_tokens.items())
        if overlap <= 0:
            return 0.0

        query_size = max(sum(query_tokens.values()), 1)
        doc_size = max(sum(doc_tokens.values()), 1)
        score = overlap / math.sqrt(query_size * doc_size)

        source = str(metadata.get("source", "")).lower()
        chunk = str(metadata.get("chunk", ""))
        if source and any(token in source for token in query_tokens):
            score += 0.35
        if chunk and chunk.isdigit():
            score += max(0.0, 0.05 - (int(chunk) * 0.001))

        return score

    def _to_local_document(self, doc: object, metadata: Dict) -> LocalDocument:
        return LocalDocument(page_content=str(getattr(doc, "page_content", "") or ""), metadata=metadata)

    def _append_fallback_documents(self, documents: List[LocalDocument]) -> None:
        self._fallback_documents.extend(documents)
        self._save_fallback_store()

    def _prepare_documents(self, documents: List[object], user_id: int, source_name: str) -> List[LocalDocument]:
        prepared_docs: List[LocalDocument] = []
        for idx, doc in enumerate(documents):
            metadata = dict(getattr(doc, "metadata", {}) or {})
            metadata["user_id"] = str(user_id)
            metadata["source"] = metadata.get("source") or source_name
            metadata["chunk"] = metadata.get("chunk", idx)
            prepared_docs.append(self._to_local_document(doc, metadata))
        return prepared_docs

    def _get_faiss_user_documents(self, user_id: int) -> List[LocalDocument]:
        if not self._can_use_faiss() or self.vector_store is None:
            return []

        docs = list(self.vector_store.docstore._dict.values())
        return [
            LocalDocument(page_content=doc.page_content, metadata=dict(doc.metadata or {}))
            for doc in docs
            if str(doc.metadata.get("user_id")) == str(user_id)
        ]

    def _search_fallback_documents(self, query: str, user_id: int, k: int) -> List[LocalDocument]:
        user_docs = [doc for doc in self._fallback_documents if str(doc.metadata.get("user_id")) == str(user_id)]
        if not user_docs:
            return []

        query_tokens = self._tokenize(query)
        ranked = [
            (
                self._score_local_document(query_tokens, doc.page_content, doc.metadata),
                str(doc.metadata.get("source", "")),
                int(doc.metadata.get("chunk", 0)) if str(doc.metadata.get("chunk", "")).isdigit() else 0,
                doc,
            )
            for doc in user_docs
        ]
        ranked.sort(key=lambda item: (item[0], item[1], -item[2]), reverse=True)

        top_docs = [item[3] for item in ranked[:k] if item[0] > 0]
        if top_docs:
            return top_docs

        return user_docs[:k]

    def _save(self) -> None:
        if self.vector_store is None:
            return
        self.vector_store.save_local(self.index_path)

    def add_documents(self, documents: List[object], user_id: int, source_name: str) -> int:
        """Store uploaded chunks in local memory and FAISS when available."""
        if not documents:
            return 0

        prepared_docs = self._prepare_documents(documents, user_id, source_name)
        self._append_fallback_documents(prepared_docs)

        if self._can_use_faiss():
            try:
                faiss_docs = [
                    self._document_class(page_content=doc.page_content, metadata=doc.metadata)
                    for doc in prepared_docs
                ]
                if self.vector_store is None:
                    self.vector_store = self._faiss_class.from_documents(faiss_docs, self.embeddings)
                else:
                    self.vector_store.add_documents(faiss_docs)
                self._save()
                self._mode = "faiss"
            except Exception as exc:
                self._remember_faiss_error(exc)

        return len(prepared_docs)

    def similarity_search(self, query: str, user_id: int, k: int = 5) -> List[object]:
        """Retrieve top-k documents for a specific user."""
        if self._can_use_faiss() and self.vector_store is not None:
            try:
                search_k = max(k * 8, 20)
                retrieved = self.vector_store.similarity_search(query, k=search_k)

                filtered: List[object] = []
                for doc in retrieved:
                    if str(doc.metadata.get("user_id")) == str(user_id):
                        filtered.append(doc)
                    if len(filtered) >= k:
                        break
                if filtered:
                    self._mode = "faiss"
                    return filtered
            except Exception as exc:
                self._remember_faiss_error(exc)

        self._mode = "local"
        return self._search_fallback_documents(query, user_id, k)

    def clear_user_index(self, user_id: int) -> int:
        """Remove one user's chunks from every accessible RAG store."""
        local_before = len(self._fallback_documents)
        self._fallback_documents = [
            doc for doc in self._fallback_documents
            if str(doc.metadata.get("user_id")) != str(user_id)
        ]
        removed_local = local_before - len(self._fallback_documents)
        self._save_fallback_store()

        if self._can_use_faiss() and self.vector_store is not None:
            all_docs = list(self.vector_store.docstore._dict.values())
            remaining = [doc for doc in all_docs if str(doc.metadata.get("user_id")) != str(user_id)]
            removed_faiss = len(all_docs) - len(remaining)

            if removed_faiss > 0:
                if remaining:
                    self.vector_store = self._faiss_class.from_documents(remaining, self.embeddings)
                    self._save()
                else:
                    self.clear_index()

        return removed_local

    def get_user_status(self, user_id: int) -> Dict:
        accessible_docs = [doc for doc in self._fallback_documents if str(doc.metadata.get("user_id")) == str(user_id)]
        if not accessible_docs:
            accessible_docs = self._get_faiss_user_documents(user_id)

        source_counts: Dict[str, int] = {}
        for doc in accessible_docs:
            source = str(doc.metadata.get("source") or "uploaded_file")
            source_counts[source] = source_counts.get(source, 0) + 1

        mode = "faiss" if self._can_use_faiss() else "local"
        return {
            "mode": mode,
            "llmEnabled": bool(settings.OPENAI_API_KEY),
            "chunkCount": len(accessible_docs),
            "documentCount": len(source_counts),
            "sources": [
                {"source": source, "chunks": chunks}
                for source, chunks in sorted(source_counts.items())
            ],
        }

    def clear_index(self) -> None:
        if os.path.exists(self.index_path):
            shutil.rmtree(self.index_path)
        self.vector_store = None


vector_service = VectorService()

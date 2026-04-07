import os
from dataclasses import dataclass
from importlib import import_module
from typing import List

from config import settings


@dataclass
class SimpleDocument:
    page_content: str
    metadata: dict


class SimpleTextSplitter:
    def __init__(self, chunk_size: int, chunk_overlap: int, separators=None):
        self.chunk_size = max(int(chunk_size or 0), 1)
        self.chunk_overlap = max(min(int(chunk_overlap or 0), self.chunk_size - 1), 0)
        self.separators = separators or ["\n\n", "\n", " ", ""]

    def split_text(self, text: str) -> List[str]:
        normalized = (text or "").replace("\r\n", "\n").strip()
        if not normalized:
            return []
        if len(normalized) <= self.chunk_size:
            return [normalized]

        chunks: List[str] = []
        start = 0
        text_length = len(normalized)

        while start < text_length:
            end = min(start + self.chunk_size, text_length)
            candidate = normalized[start:end]

            if end < text_length:
                split_at = -1
                for separator in self.separators:
                    if not separator:
                        continue
                    idx = candidate.rfind(separator)
                    if idx > max(0, len(candidate) // 2):
                        split_at = idx + len(separator)
                        break

                if split_at > 0:
                    candidate = candidate[:split_at]
                    end = start + split_at

            cleaned = candidate.strip()
            if cleaned:
                chunks.append(cleaned)

            if end >= text_length:
                break

            start = max(end - self.chunk_overlap, start + 1)

        return chunks


class DocumentProcessor:
    def __init__(self):
        self.text_splitter = None
        self._document_class = None
        if settings.TESSERACT_PATH:
            try:
                import pytesseract

                pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH
            except Exception:
                pass

    def _ensure_langchain_components(self) -> None:
        if self.text_splitter is not None and self._document_class is not None:
            return

        fallback_splitter = SimpleTextSplitter(
            chunk_size=settings.RAG_CHUNK_SIZE,
            chunk_overlap=settings.RAG_CHUNK_OVERLAP,
            separators=["\n\n", "\n", " ", ""],
        )

        try:
            try:
                # LangChain >=1 style
                splitter_module = import_module("langchain_text_splitters")
            except ImportError:
                # LangChain <=0.3 style
                splitter_module = import_module("langchain.text_splitter")
            documents_module = import_module("langchain_core.documents")
            RecursiveCharacterTextSplitter = splitter_module.RecursiveCharacterTextSplitter
            Document = documents_module.Document
        except Exception:
            self.text_splitter = fallback_splitter
            self._document_class = SimpleDocument
            return

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.RAG_CHUNK_SIZE,
            chunk_overlap=settings.RAG_CHUNK_OVERLAP,
            separators=["\n\n", "\n", " ", ""],
        )
        self._document_class = Document

    def process_file(self, file_path: str) -> List[object]:
        """Process supported file types and return chunked LangChain documents."""
        self._ensure_langchain_components()
        ext = os.path.splitext(file_path)[1].lower()
        text = ""

        if ext == ".pdf":
            text = self._extract_pdf(file_path)
        elif ext in [".xlsx", ".xls"]:
            text = self._extract_excel(file_path)
        elif ext == ".csv":
            text = self._extract_csv(file_path)
        elif ext in [".jpg", ".jpeg", ".png"]:
            text = self._extract_image_ocr(file_path)
        else:
            raise ValueError(f"Unsupported file extension: {ext}")

        if not text.strip():
            return []

        chunks = self.text_splitter.split_text(text)
        return [
            self._document_class(page_content=chunk, metadata={"source": os.path.basename(file_path), "chunk": index})
            for index, chunk in enumerate(chunks)
        ]

    def _extract_pdf(self, file_path: str) -> str:
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError("pypdf is not installed. Run: pip install pypdf") from exc

        text = ""
        reader = PdfReader(file_path)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text

    def _extract_excel(self, file_path: str) -> str:
        try:
            import pandas as pd
        except ImportError as exc:
            raise RuntimeError("pandas is not installed. Run: pip install pandas") from exc

        df = pd.read_excel(file_path)
        return df.to_string()

    def _extract_csv(self, file_path: str) -> str:
        try:
            import pandas as pd
        except ImportError as exc:
            raise RuntimeError("pandas is not installed. Run: pip install pandas") from exc

        df = pd.read_csv(file_path)
        return df.to_string()

    def _extract_image_ocr(self, file_path: str) -> str:
        try:
            import cv2
            import pytesseract
            from PIL import Image
        except ImportError as exc:
            raise RuntimeError(
                "Image OCR dependencies missing. Install: pip install opencv-python-headless pillow pytesseract"
            ) from exc

        if settings.TESSERACT_PATH:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH

        try:
            image = cv2.imread(file_path)
            if image is None:
                return pytesseract.image_to_string(Image.open(file_path))

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            _, threshold = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            return pytesseract.image_to_string(threshold)
        except Exception as exc:
            raise RuntimeError(
                "Image OCR requires Tesseract installed and configured (set TESSERACT_PATH in .env)."
            ) from exc


document_processor = DocumentProcessor()

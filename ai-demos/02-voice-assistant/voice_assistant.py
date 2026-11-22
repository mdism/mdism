"""
A small voice assistant: speech in, spoken answer out.

    microphone / audio file
        -> 1. SPEECH-TO-TEXT  (faster-whisper, runs locally)
        -> 2. LLM ANSWER      (small open model, grounded in knowledge.md)
        -> 3. TEXT-TO-SPEECH  (pyttsx3, uses your operating system's voice)
        -> answer.wav  +  a line in logs/audit_log.jsonl

Everything runs on your own machine. No audio or text is sent to a cloud API.

Run:
    python voice_assistant.py --audio question.wav
    python voice_assistant.py --text "What order do I put on the gown?"   (skip step 1)
    python voice_assistant.py --audio question.wav --llm ollama --llm-model llama3.2:3b
"""
import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent

SYSTEM_PROMPT = (
    "You are a helpful assistant for cleanroom staff. Answer ONLY from the document below. "
    "If the answer is not in the document, say: \"I don't know, please ask your supervisor.\" "
    "Keep answers to one or two short sentences, because they will be read aloud.\n\n"
    "DOCUMENT:\n{doc}"
)


# ---------- 1. Speech-to-text ----------
class SpeechToText:
    def __init__(self, model_size="base"):
        from faster_whisper import WhisperModel
        # int8 on CPU keeps it fast and light; the model downloads once (~150 MB for "base").
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
        self.name = f"faster-whisper-{model_size}"

    def transcribe(self, audio_path):
        segments, _info = self.model.transcribe(str(audio_path), language="en")
        return " ".join(s.text.strip() for s in segments).strip()


# ---------- 2. LLM ----------
class LocalLLM:
    """Runs a small open model with Hugging Face transformers."""

    def __init__(self, model_name="Qwen/Qwen2.5-0.5B-Instruct"):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        self.torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name).eval()
        self.name = model_name

    def answer(self, system, question):
        messages = [{"role": "system", "content": system}, {"role": "user", "content": question}]
        if getattr(self.tokenizer, "chat_template", None):
            prompt = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        else:
            prompt = f"{system}\n\nQuestion: {question}\nAnswer:"
        enc = self.tokenizer(prompt, return_tensors="pt", add_special_tokens=False)
        with self.torch.no_grad():
            out = self.model.generate(**enc, max_new_tokens=80, do_sample=False,
                                      pad_token_id=self.tokenizer.eos_token_id)
        return self.tokenizer.decode(out[0, enc["input_ids"].shape[1]:], skip_special_tokens=True).strip()


class OllamaLLM:
    """Uses a model served by Ollama (https://ollama.com) on this machine. Better answers
    than the 0.5B model, if you are happy to install Ollama."""

    def __init__(self, model_name="llama3.2:3b", host="http://localhost:11434"):
        self.name, self.host = f"ollama:{model_name}", host
        self.model_name = model_name

    def answer(self, system, question):
        import requests
        r = requests.post(f"{self.host}/api/chat", timeout=120, json={
            "model": self.model_name, "stream": False, "options": {"temperature": 0},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": question}],
        })
        r.raise_for_status()
        return r.json()["message"]["content"].strip()


# ---------- 3. Text-to-speech ----------
class TextToSpeech:
    def __init__(self):
        import pyttsx3
        self.engine = pyttsx3.init()  # Windows: SAPI5 voices, macOS: NSSpeech, Linux: espeak
        self.engine.setProperty("rate", 170)
        self.name = "pyttsx3"

    def speak_to_file(self, text, out_path):
        self.engine.save_to_file(text, str(out_path))
        self.engine.runAndWait()
        return out_path


# ---------- The pipeline ----------
class VoiceAssistant:
    def __init__(self, llm="local", llm_model=None, whisper_size="base", use_tts=True,
                 knowledge_file=HERE / "knowledge.md"):
        self.system = SYSTEM_PROMPT.format(doc=Path(knowledge_file).read_text(encoding="utf-8"))
        self.knowledge_file = Path(knowledge_file).name
        self.stt = None
        self.whisper_size = whisper_size
        if llm == "ollama":
            self.llm = OllamaLLM(llm_model or "llama3.2:3b")
        else:
            self.llm = LocalLLM(llm_model or "Qwen/Qwen2.5-0.5B-Instruct")
        self.tts = TextToSpeech() if use_tts else None
        self.log_path = HERE / "logs" / "audit_log.jsonl"
        self.log_path.parent.mkdir(exist_ok=True)

    def run(self, audio_path=None, text=None, out_audio=HERE / "outputs" / "answer.wav"):
        timings = {}
        t = time.time()
        if text is None:
            if self.stt is None:  # load Whisper only when audio is actually used
                self.stt = SpeechToText(self.whisper_size)
            text = self.stt.transcribe(audio_path)
        timings["stt_s"] = round(time.time() - t, 2)

        t = time.time()
        reply = self.llm.answer(self.system, text)
        timings["llm_s"] = round(time.time() - t, 2)

        t = time.time()
        audio_out = None
        if self.tts:
            Path(out_audio).parent.mkdir(exist_ok=True)
            audio_out = str(self.tts.speak_to_file(reply, out_audio))
        timings["tts_s"] = round(time.time() - t, 2)

        # Audit trail: who/what/when for every answer. In a GxP system this is the kind of
        # record an auditor asks for (ALCOA+: attributable, contemporaneous, accurate...).
        record = {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "input_type": "text" if audio_path is None else "audio",
            "transcript": text,
            "answer": reply,
            "models": {"stt": self.stt.name if self.stt else None, "llm": self.llm.name,
                       "tts": self.tts.name if self.tts else None},
            "knowledge_source": self.knowledge_file,
            "timings": timings,
        }
        with open(self.log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
        return {"transcript": text, "answer": reply, "audio": audio_out, "timings": timings}


def main():
    p = argparse.ArgumentParser()
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--audio", help="path to a .wav/.mp3/.m4a recording of your question")
    src.add_argument("--text", help="type the question instead of speaking it")
    p.add_argument("--llm", choices=["local", "ollama"], default="local")
    p.add_argument("--llm-model", default=None, help="HF model id (local) or Ollama tag")
    p.add_argument("--whisper", default="base", help="tiny / base / small (bigger = more accurate, slower)")
    p.add_argument("--no-tts", action="store_true", help="print the answer only, no audio")
    args = p.parse_args()

    va = VoiceAssistant(llm=args.llm, llm_model=args.llm_model, whisper_size=args.whisper,
                        use_tts=not args.no_tts)
    result = va.run(audio_path=args.audio, text=args.text)
    print(f"\nYou said : {result['transcript']}")
    print(f"Answer   : {result['answer']}")
    if result["audio"]:
        print(f"Audio    : {result['audio']}")
    print(f"Timings  : {result['timings']}")


if __name__ == "__main__":
    main()

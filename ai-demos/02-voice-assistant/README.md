# Demo 2: A voice LLM assistant

**Use case:** a hands-free helper for cleanroom staff. You ask a question out loud, it answers out
loud, using only a (synthetic) gowning guide. Gloved hands in a cleanroom are a real reason to want
voice instead of a keyboard.

```
 🎤 your question (audio)
   │
   ▼
 1. Speech-to-text   faster-whisper (OpenAI Whisper, optimised)   "What order do I put on the gown?"
   │
   ▼
 2. LLM              small open model + knowledge.md in the prompt  "Hair cover, face mask, coverall,
   │                                                                  overshoes, then sterile gloves."
   ▼
 3. Text-to-speech   pyttsx3 (your computer's built-in voice)      🔊 answer.wav
   │
   ▼
 audit log           logs/audit_log.jsonl: time, transcript, answer, model versions, timings
```

Everything runs **locally**. No audio or text leaves your computer, which is what you want before a
voice tool ever hears real company or patient information.

> `knowledge.md` is a **made-up** gowning guide written for this demo. It is not a real SOP.

## Files

| File | What it does |
|---|---|
| `voice_assistant.py` | The three steps as three small classes, plus the pipeline and the audit log. Has a command line. |
| `app.py` | A web page (Gradio): press record, ask, hear the answer. |
| `knowledge.md` | The only source the assistant may answer from. Swap in any document you like. |

## How to run it

You need Python 3.10+. On Windows and macOS the text-to-speech voice is built in. On Linux install
`espeak-ng` first. `ffmpeg` is not needed for `.wav` files.

```bash
cd ai-demos/02-voice-assistant
python -m venv .venv
.venv\Scripts\activate          # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt

# a) Text in, spoken answer out (no microphone needed, good first test)
python voice_assistant.py --text "What order do I put on the gown?"

# b) Audio file in (record a question with your phone or the Windows Voice Recorder)
python voice_assistant.py --audio my_question.wav

# c) The web page with a microphone button
python app.py                   # then open http://127.0.0.1:7860
```

The first run downloads Whisper `base` (about 150 MB) and `Qwen/Qwen2.5-0.5B-Instruct` (about 1 GB).
The answer is saved to `outputs/answer.wav` and every turn is added to `logs/audit_log.jsonl`.

### Better answers with Ollama (optional)

The 0.5B model is small, so answers can be clumsy. For a nicer demo install
[Ollama](https://ollama.com), run `ollama pull llama3.2:3b`, then:

```bash
python voice_assistant.py --text "Can I reuse my gown?" --llm ollama --llm-model llama3.2:3b
```

(In `app.py`, change `VoiceAssistant()` to `VoiceAssistant(llm="ollama")`.)

### Try these questions

- "What do I remove before gowning?" (in the guide)
- "What if my gown touches the floor?" (in the guide)
- "What is the cleanroom temperature?" (**not** in the guide: it should say it doesn't know)

The last one is the important test. A grounded assistant must refuse rather than invent an answer.

## What each piece teaches

- **Speech-to-text (STT):** Whisper turns audio into text. Model sizes `tiny`, `base`, `small`,
  `medium` trade speed for accuracy (`--whisper small`). Accents and background noise matter, so
  test with real voices.
- **Grounding:** the system prompt contains the document and says "answer only from this". This is
  the simplest form of RAG. A real system would search many documents and pass only the relevant
  parts.
- **Text-to-speech (TTS):** short answers sound better. The prompt asks for one or two sentences.
- **Latency:** the script prints how long each step took. Voice feels natural under about 2 seconds,
  which is why production systems stream audio and use faster models.
- **Audit trail:** every answer is logged with the model names and source document. In a regulated
  (GxP) setting you must be able to show who asked what, what the system answered, and which
  version of the system answered it.

**Tested here:** the pipeline, audit log and web page were checked with a tiny test model on a
machine that could not download the Whisper or Qwen weights, so speech recognition and the spoken
voice were not heard here. Run step (a) first on your computer to check the full loop.

## Ideas to extend it

- Stream the answer so the voice starts speaking before the LLM finishes.
- Replace pyttsx3 with a natural neural voice such as Piper.
- Add a wake word, or push-to-talk on a keyboard key.
- Search several SOPs with embeddings (real RAG) and say which SOP and section the answer came from.
- Add a confidence check: if the transcript is unclear, ask the user to repeat.

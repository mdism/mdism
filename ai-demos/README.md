# AI demos for regulated industries (pharma)

Two small, working demos built to learn from and to show in interviews. Each folder has its own
step-by-step README.

| Demo | What it shows | Runs on |
|---|---|---|
| [01-finetuning-lora](01-finetuning-lora/) | Fine-tune a small open LLM with LoRA to turn free-text messages into structured adverse-event records, with a **before vs after** score | Laptop CPU (slow) or free Colab GPU |
| [02-voice-assistant](02-voice-assistant/) | Voice in, voice out: speech-to-text → grounded LLM answer → text-to-speech, with an audit log | Laptop CPU, fully local |
| [PHARMA-COMPLIANCE.md](PHARMA-COMPLIANCE.md) | HIPAA, GxP, 21 CFR Part 11, GAMP 5 in plain language, and how they change the way you build AI | Reading |

All data is **synthetic**. Nothing here uses patient data.

## A 4-week learning path

Plan about one hour a day. Each week ends with something you can show.

**Week 1: How LLMs and fine-tuning work**
- Hugging Face LLM Course, chapters 1 to 3 (free): https://huggingface.co/learn/llm-course
- Read `01-finetuning-lora/common.py` and `make_dataset.py`. Change the data generator and see what
  the examples look like.
- Show: your own synthetic dataset for a pharma task you choose.

**Week 2: Run and understand the fine-tuning demo**
- Run Demo 1 on Colab. Read `train_lora.py` line by line: tokenize, loss masking, forward,
  backward, optimizer step.
- Hugging Face PEFT docs on LoRA: https://huggingface.co/docs/peft
- Change one thing (LoRA rank, epochs, a new field) and compare the scores.
- Show: your before/after table and a short note on what still fails.

**Week 3: Voice and grounding**
- Run Demo 2. Ask questions inside and outside `knowledge.md` and check it refuses the outside ones.
- Swap the LLM for Ollama, try Whisper `small`, measure the latency of each step.
- Show: a 1-minute screen recording of the voice demo.

**Week 4: Pharma compliance and the story**
- Read [PHARMA-COMPLIANCE.md](PHARMA-COMPLIANCE.md), then skim HHS's HIPAA pages and 21 CFR Part 11
  (links inside).
- Write one page: "How I would validate this model for a GxP use" (intended use, risk, test set,
  acceptance criteria, audit trail, change control).
- Show: a LinkedIn post or blog article walking through both demos and that page.

## Limits to be honest about

- These are learning demos, not validated systems. Real use in a GxP process needs validation, a
  human reviewer, and Quality sign-off.
- Small models (0.5B) are fast but make mistakes. The point is the method, the measurement and the
  controls, not a perfect score.
- Models download from Hugging Face on first run (about 1 GB each).

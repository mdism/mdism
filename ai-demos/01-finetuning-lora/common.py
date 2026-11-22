"""Shared helpers: the prompt, loading data, and scoring answers."""
import json
import re

import torch

INSTRUCTION = (
    "You are a pharmacovigilance intake assistant. Read the message and reply with ONLY a JSON "
    'object with these keys: "is_adverse_event" (true/false), "drug" (generic name, lowercase), '
    '"reaction" (short phrase, or null if none), "serious" (true if the person was hospitalised, '
    "otherwise false)."
)


def load_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def build_prompt(tokenizer, text):
    """Turn a message into the exact text the model sees before it answers.

    Instruct models were trained with a "chat template" (special tokens that mark
    the user turn and the assistant turn). Using it gives the base model a fair
    chance in the "before" test. If a model has no template we fall back to a
    simple plain-text format.
    """
    if getattr(tokenizer, "chat_template", None):
        messages = [{"role": "user", "content": f"{INSTRUCTION}\n\nMessage: {text}"}]
        return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    return f"### Instruction\n{INSTRUCTION}\n\n### Message\n{text}\n\n### JSON\n"


def target_text(label):
    """The answer we want the model to learn, as one line of JSON."""
    return json.dumps(label)


def pick_device():
    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def parse_json(output):
    """Pull the first {...} block out of the model's answer. None if it isn't valid JSON."""
    match = re.search(r"\{.*?\}", output, flags=re.DOTALL)
    if not match:
        return None
    try:
        value = json.loads(match.group(0))
        return value if isinstance(value, dict) else None
    except json.JSONDecodeError:
        return None


def score(predictions, labels):
    """Compare model answers with the correct labels. Returns percentages."""
    n = len(labels)
    valid = ae = drug = serious = exact = 0
    for pred, gold in zip(predictions, labels):
        if pred is None:
            continue
        valid += 1
        ae += pred.get("is_adverse_event") == gold["is_adverse_event"]
        drug += str(pred.get("drug", "")).strip().lower() == gold["drug"]
        serious += pred.get("serious") == gold["serious"]
        exact += (pred.get("is_adverse_event") == gold["is_adverse_event"]
                  and str(pred.get("drug", "")).strip().lower() == gold["drug"]
                  and (pred.get("reaction") or None) == gold["reaction"]
                  and pred.get("serious") == gold["serious"])
    pct = lambda x: round(100 * x / n, 1)
    return {
        "valid_json_%": pct(valid),
        "adverse_event_correct_%": pct(ae),
        "drug_correct_%": pct(drug),
        "serious_correct_%": pct(serious),
        "all_fields_exact_%": pct(exact),
    }

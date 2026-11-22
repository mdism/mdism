"""
Step 3: measure the model BEFORE and AFTER fine-tuning on the held-out test set.

The test set uses drug names and sentence styles the model never saw in
training, so a good score means it learned the task, not the examples.

Run:  python evaluate.py                       (base model only)
      python evaluate.py --adapter outputs/lora-adapter   (base vs fine-tuned)
Out:  results/eval_report.md and results/predictions.jsonl
"""
import argparse
import json
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

from common import build_prompt, load_jsonl, parse_json, pick_device, score

HERE = Path(__file__).parent


@torch.no_grad()
def predict(model, tokenizer, texts, device, batch_size=8):
    tokenizer.padding_side = "left"  # decoder models generate from the right edge
    outputs = []
    for i in range(0, len(texts), batch_size):
        prompts = [build_prompt(tokenizer, t) for t in texts[i:i + batch_size]]
        enc = tokenizer(prompts, return_tensors="pt", padding=True, add_special_tokens=False).to(device)
        gen = model.generate(**enc, max_new_tokens=64, do_sample=False,
                             pad_token_id=tokenizer.pad_token_id)
        for row in gen[:, enc["input_ids"].shape[1]:]:
            outputs.append(tokenizer.decode(row, skip_special_tokens=True).strip())
        print(f"  {len(outputs)}/{len(texts)}")
    return outputs


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--model", default="Qwen/Qwen2.5-0.5B-Instruct")
    p.add_argument("--adapter", default=None, help="folder saved by train_lora.py")
    p.add_argument("--limit", type=int, default=None)
    args = p.parse_args()

    device = pick_device()
    test = load_jsonl(HERE / "data" / "test.jsonl")[:args.limit]
    texts = [ex["text"] for ex in test]
    labels = [ex["label"] for ex in test]

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    dtype = torch.bfloat16 if device == "cuda" else torch.float32
    model = AutoModelForCausalLM.from_pretrained(args.model, dtype=dtype).to(device).eval()

    runs = {}
    print("BEFORE (base model):")
    runs["before"] = predict(model, tokenizer, texts, device)
    if args.adapter:
        print("AFTER (base model + LoRA adapter):")
        model = PeftModel.from_pretrained(model, args.adapter).to(device).eval()
        runs["after"] = predict(model, tokenizer, texts, device)

    scores = {name: score([parse_json(o) for o in outs], labels) for name, outs in runs.items()}

    out = HERE / "results"
    out.mkdir(exist_ok=True)
    with open(out / "predictions.jsonl", "w", encoding="utf-8") as f:
        for i, ex in enumerate(test):
            f.write(json.dumps({"text": ex["text"], "expected": ex["label"],
                                **{name: outs[i] for name, outs in runs.items()}}) + "\n")

    names = list(scores)
    lines = [f"# Evaluation on {len(test)} held-out test messages", "",
             f"Model: `{args.model}`" + (f", adapter: `{args.adapter}`" if args.adapter else ""), "",
             "| Metric | " + " | ".join(names) + " |",
             "|---|" + "---|" * len(names)]
    for metric in scores[names[0]]:
        lines.append(f"| {metric} | " + " | ".join(str(scores[n][metric]) for n in names) + " |")
    lines += ["", "## Example", "", f"Message: {test[0]['text']}", "",
              f"Expected: `{json.dumps(test[0]['label'])}`", ""]
    lines += [f"{name}: `{runs[name][0]}`" + "  " for name in names]
    report = "\n".join(lines) + "\n"
    (out / "eval_report.md").write_text(report, encoding="utf-8")
    print("\n" + report)


if __name__ == "__main__":
    main()

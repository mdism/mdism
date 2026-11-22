"""
Step 2: fine-tune a small open model with LoRA.

What LoRA does, in one paragraph: the base model has hundreds of millions of
weights. Instead of changing all of them, LoRA freezes them and adds a few tiny
extra matrices ("adapters") next to the existing layers. Only the adapters are
trained. That is why it fits on a laptop or a free Colab GPU, and why the saved
result is a few MB instead of a full model copy.

This script uses a plain PyTorch training loop (no Trainer class) so every step
is visible: tokenize, forward pass, loss, backward pass, optimizer step.

Run:  python train_lora.py
      python train_lora.py --model Qwen/Qwen2.5-0.5B-Instruct --epochs 2
Out:  outputs/lora-adapter/   (the trained adapter, a few MB)
"""
import argparse
import random
import time
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer

from common import build_prompt, load_jsonl, pick_device, target_text

HERE = Path(__file__).parent


def tokenize_example(tokenizer, example, max_len):
    """Build input ids and labels. Labels are -100 for the prompt part, so the
    loss only counts the answer: we teach the model to *answer*, not to repeat
    the question."""
    prompt = build_prompt(tokenizer, example["text"])
    answer = target_text(example["label"]) + tokenizer.eos_token
    prompt_ids = tokenizer(prompt, add_special_tokens=False)["input_ids"]
    answer_ids = tokenizer(answer, add_special_tokens=False)["input_ids"]
    input_ids = (prompt_ids + answer_ids)[:max_len]
    labels = ([-100] * len(prompt_ids) + answer_ids)[:max_len]
    return input_ids, labels


def make_batches(rows, batch_size, pad_id, shuffle, rng):
    order = list(range(len(rows)))
    if shuffle:
        rng.shuffle(order)
    for i in range(0, len(order), batch_size):
        chunk = [rows[j] for j in order[i:i + batch_size]]
        width = max(len(ids) for ids, _ in chunk)
        ids = torch.full((len(chunk), width), pad_id)
        labels = torch.full((len(chunk), width), -100)
        mask = torch.zeros((len(chunk), width), dtype=torch.long)
        for k, (x, y) in enumerate(chunk):
            ids[k, :len(x)] = torch.tensor(x)
            labels[k, :len(y)] = torch.tensor(y)
            mask[k, :len(x)] = 1
        yield ids, labels, mask


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--model", default="Qwen/Qwen2.5-0.5B-Instruct")
    p.add_argument("--epochs", type=int, default=2)
    p.add_argument("--batch-size", type=int, default=8)
    p.add_argument("--lr", type=float, default=2e-4)
    p.add_argument("--lora-r", type=int, default=8, help="adapter size; bigger = more capacity")
    p.add_argument("--max-len", type=int, default=256)
    p.add_argument("--limit", type=int, default=None, help="use only N training rows (quick test)")
    p.add_argument("--out", default=str(HERE / "outputs" / "lora-adapter"))
    args = p.parse_args()

    torch.manual_seed(0)
    rng = random.Random(0)
    device = pick_device()
    print(f"device: {device}  model: {args.model}")

    # 1. Load tokenizer and base model.
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    dtype = torch.bfloat16 if device == "cuda" else torch.float32
    model = AutoModelForCausalLM.from_pretrained(args.model, dtype=dtype).to(device)

    # 2. Wrap it with LoRA adapters. Base weights are frozen automatically.
    lora = LoraConfig(r=args.lora_r, lora_alpha=2 * args.lora_r, lora_dropout=0.05,
                      target_modules="all-linear", task_type="CAUSAL_LM")
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()  # e.g. "trainable params: 4.4M || all params: 498M || 0.88%"

    # 3. Tokenize the training data.
    train = load_jsonl(HERE / "data" / "train.jsonl")[:args.limit]
    rows = [tokenize_example(tokenizer, ex, args.max_len) for ex in train]

    # 4. Train.
    optimizer = torch.optim.AdamW((p for p in model.parameters() if p.requires_grad), lr=args.lr)
    model.train()
    step, start = 0, time.time()
    for epoch in range(args.epochs):
        for ids, labels, mask in make_batches(rows, args.batch_size, tokenizer.pad_token_id, True, rng):
            ids, labels, mask = ids.to(device), labels.to(device), mask.to(device)
            loss = model(input_ids=ids, attention_mask=mask, labels=labels).loss  # forward pass
            loss.backward()                                                      # gradients
            optimizer.step()                                                     # update adapters
            optimizer.zero_grad()
            step += 1
            if step % 5 == 0:
                print(f"epoch {epoch + 1}  step {step}  loss {loss.item():.4f}  "
                      f"({time.time() - start:.0f}s)")

    # 5. Save only the adapter (small). The base model is downloaded again when needed.
    model.save_pretrained(args.out)
    tokenizer.save_pretrained(args.out)
    print(f"saved adapter to {args.out}")


if __name__ == "__main__":
    main()

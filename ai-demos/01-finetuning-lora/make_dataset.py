"""
Step 1: build a small SYNTHETIC dataset.

Task: read a short free-text message (like one a pharma company's call centre
might receive) and turn it into a structured JSON record:

    {"is_adverse_event": true, "drug": "ibuprofen", "reaction": "rash", "serious": false}

Every message is generated from templates below. No real patient, no real
report, no personal data. That is on purpose: in pharma you never train a demo
on real safety reports.

To check that the model learns the *skill* and not just the examples, the test
set uses drug names and sentence templates the model never sees in training.

Run:  python make_dataset.py
Out:  data/train.jsonl and data/test.jsonl
"""
import json
import random
from pathlib import Path

SEED = 42

TRAIN_DRUGS = ["paracetamol", "ibuprofen", "metformin", "amoxicillin", "atorvastatin",
               "amlodipine", "omeprazole", "cetirizine", "losartan", "sertraline",
               "levothyroxine", "azithromycin"]
TEST_DRUGS = ["simvastatin", "pantoprazole", "doxycycline", "naproxen"]  # unseen in training

MILD_REACTIONS = ["rash", "headache", "nausea", "dizziness", "stomach pain", "itching",
                  "dry mouth", "drowsiness", "diarrhoea", "muscle pain"]
SERIOUS_REACTIONS = ["severe allergic reaction", "difficulty breathing", "chest pain",
                     "fainting", "swelling of the face", "seizure"]

# {d} = drug, {r} = reaction
TRAIN_AE_MILD = [
    "I started taking {d} last week and now I have {r}.",
    "Since my doctor put me on {d} I keep getting {r}.",
    "My mother takes {d} and she complains of {r} every morning.",
    "Got {r} two days after the first dose of {d}. Is that normal?",
    "Reporting {r} after using {d} for a few days.",
]
TRAIN_AE_SERIOUS = [
    "After taking {d} I had {r} and was admitted to hospital.",
    "My husband was rushed to the emergency room with {r} after his {d} dose and kept overnight.",
    "Patient on {d} developed {r} and needed hospitalisation.",
    "I had {r} on {d} and stayed in hospital for three days.",
]
TRAIN_NOT_AE = [
    "Can I take {d} with food?",
    "Where can I buy {d} near me?",
    "What is the shelf life of {d} once the pack is opened?",
    "My {d} prescription ran out, how do I get a refill?",
    "Is there a cheaper generic version of {d}?",
]
TEST_AE_MILD = [
    "Ever since switching to {d} I have noticed {r}.",
    "Quick note: {r} started soon after I began {d}.",
]
TEST_AE_SERIOUS = [
    "{d} caused {r} and my father had to be hospitalised.",
    "Following {d}, she experienced {r} and was admitted for observation.",
]
TEST_NOT_AE = [
    "Should {d} be stored in the fridge?",
    "How many tablets of {d} come in one strip?",
]


def make_example(rng, drugs, ae_mild, ae_serious, not_ae):
    drug = rng.choice(drugs)
    kind = rng.choices(["mild", "serious", "none"], weights=[4, 3, 3])[0]
    if kind == "mild":
        reaction = rng.choice(MILD_REACTIONS)
        text = rng.choice(ae_mild).format(d=drug, r=reaction)
        label = {"is_adverse_event": True, "drug": drug, "reaction": reaction, "serious": False}
    elif kind == "serious":
        reaction = rng.choice(SERIOUS_REACTIONS)
        text = rng.choice(ae_serious).format(d=drug, r=reaction)
        label = {"is_adverse_event": True, "drug": drug, "reaction": reaction, "serious": True}
    else:
        text = rng.choice(not_ae).format(d=drug, r="")
        label = {"is_adverse_event": False, "drug": drug, "reaction": None, "serious": False}
    # Capitalise the first letter so a sentence that starts with the drug name looks natural.
    text = text[0].upper() + text[1:]
    return {"text": text, "label": label}


def main(n_train=300, n_test=60):
    rng = random.Random(SEED)
    out = Path(__file__).parent / "data"
    out.mkdir(exist_ok=True)
    train = [make_example(rng, TRAIN_DRUGS, TRAIN_AE_MILD, TRAIN_AE_SERIOUS, TRAIN_NOT_AE)
             for _ in range(n_train)]
    test = [make_example(rng, TEST_DRUGS, TEST_AE_MILD, TEST_AE_SERIOUS, TEST_NOT_AE)
            for _ in range(n_test)]
    for name, rows in [("train", train), ("test", test)]:
        with open(out / f"{name}.jsonl", "w", encoding="utf-8") as f:
            for row in rows:
                f.write(json.dumps(row) + "\n")
        print(f"wrote {len(rows)} examples to data/{name}.jsonl")
    print("example:", json.dumps(train[0], indent=2))


if __name__ == "__main__":
    main()

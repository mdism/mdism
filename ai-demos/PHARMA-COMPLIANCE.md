# Pharma compliance for AI engineers: a beginner's map

You do not need to be a compliance expert to lead AI work in pharma. You need to know the main
rules by name, what each one protects, and how they change the way you build. This page is that
map. It is a learning summary, not legal advice. Each company has a Quality and a Privacy team who
make the final call.

## The two big families

| | **Privacy laws** (protect people's data) | **GxP** (protect product quality and patient safety) |
|---|---|---|
| Question it asks | Whose personal data is this, and are we allowed to use it? | Can we prove this system works correctly, every time, and show the record? |
| Examples | HIPAA (US), GDPR (EU), DPDP Act 2023 (India) | GMP, GCP, GLP, GDP, GVP, plus 21 CFR Part 11 and EU Annex 11 |
| Who checks | Privacy office, data protection officer | Quality Assurance, and regulators such as FDA, EMA, CDSCO in inspections |

## HIPAA in five points

1. **What:** a US law that protects **PHI**, protected health information: health data that can be
   linked to a person (name, dates, phone, email, medical record number and other identifiers; the
   law lists 18 types).
2. **Who it applies to:** "covered entities" (hospitals, doctors, insurers) and their "business
   associates" (vendors handling PHI for them). A pharma company is often not a covered entity
   itself, but it meets PHI through hospitals, clinical trials, patient support programmes and data
   partners, and the contracts then require HIPAA-level care.
3. **De-identification:** data stops being PHI if you remove the identifiers (the "Safe Harbor"
   method) or an expert certifies the risk is very small ("Expert Determination").
4. **Vendors:** if a cloud or AI provider will touch PHI, there must be a **Business Associate
   Agreement (BAA)** first. Never paste PHI into a public chatbot.
5. **Minimum necessary:** use only the data the task needs. Plus access control, encryption and
   logging.

Official source: https://www.hhs.gov/hipaa/index.html

## GxP in plain language

"GxP" means "Good *x* Practice". The *x* is the area:

- **GMP**, Manufacturing: making the medicine (batch records, cleanrooms, deviations).
- **GCP**, Clinical: running clinical trials (consent, trial data, safety reporting).
- **GLP**, Laboratory: non-clinical lab studies.
- **GDP**, Distribution: storage and transport (temperature, cold chain).
- **GVP**, Pharmacovigilance: collecting and reporting side effects (Demo 1 is a toy version of
  this).

The idea behind all of them: **if it isn't documented, it didn't happen.** Any computer system that
affects product quality, patient safety or the data regulators rely on is "GxP-relevant" and must be
**validated** for its intended use.

### The rules on computer systems

- **21 CFR Part 11** (US FDA): rules for electronic records and electronic signatures. Key asks:
  validated systems, secure **audit trails** (who changed what, when, why), access control, and
  records you can retrieve for an inspection. Text: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11
- **EU GMP Annex 11**: the European equivalent for computerised systems.
- **GAMP 5** (ISPE industry guide): the common, **risk-based** method for validating computerised
  systems. The second edition (2022) adds material on AI and machine learning.
- **Computer Software Assurance (CSA)** (FDA): encourages focusing testing effort on the features
  with the highest risk, instead of documenting everything equally.
- **ALCOA+** (data integrity): records must be Attributable, Legible, Contemporaneous, Original,
  Accurate, plus Complete, Consistent, Enduring and Available.

### Newer AI-specific guidance worth reading

- FDA draft guidance (January 2025) on using AI to support regulatory decisions for drugs. It
  proposes a risk-based "credibility assessment": define the question, the context of use, the
  risk, then show evidence the model is fit for that use.
- EMA reflection paper on AI in the medicinal product lifecycle (2024).
- EU AI Act: risk tiers for AI systems, with extra duties for high-risk uses.

## How this changes the way you build AI

| Compliance need | What you do as the engineer | Where you see it in these demos |
|---|---|---|
| No PHI in development | Use synthetic or de-identified data; keep data local or under a BAA | Both demos use synthetic data and run locally |
| Intended use is defined | Write down exactly what the model does and does not do | README "use case" sections and disclaimers |
| Validation evidence | A fixed test set, clear acceptance criteria, saved results | `evaluate.py` and `results/eval_report.md` |
| Version control | Pin model names, data versions, code commits | Model names in the report and audit log; data generated with a fixed seed |
| Audit trail | Log every input, output, model version, timestamp | `logs/audit_log.jsonl` in Demo 2 |
| Human in the loop | A qualified person reviews AI output before it counts | Not built; talk about it as the next step |
| Change control | Retraining or a new model version means re-testing before release | Re-run `evaluate.py` after any change |
| Monitoring | Track accuracy and drift in production | Not built; good interview topic |

## Interview-ready answer

> "I treat an AI model in a GxP process like any other computerised system. I define the intended
> use and risk first, build with synthetic or de-identified data, and produce validation evidence: a
> fixed test set, acceptance criteria and results tied to a specific model and data version. Every
> prediction is logged with an audit trail, a qualified human reviews outputs that affect patients
> or product, and any retraining goes through change control and re-testing. For PHI I follow
> minimum-necessary access and only use vendors under a BAA."

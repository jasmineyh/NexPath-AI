---
name: CV parser design
description: Hybrid CV parser conventions and test commands
---
CV parsing lives in artifacts/api-server/src/lib/cv (layout -> sections -> rule parse -> validators; optional LLM merge guarded by source-text verification). Browser only extracts pdfjs items (nexpath/src/lib/cv-extract-core.ts, shared with tests).
**Why:** user wants layout-aware parsing for two-column Canva CVs, never invent data, silent fallback to rules.
**How to apply:** after parser changes run tests/make-fixtures.ts then tests/cv.test.ts (49 assertions). User's real fixture Example_resume_SDC.pdf was not available; synthetic_two_column.pdf stands in.

# LOCALE-FULL — Complete locale packs for all CIRKLE languages

**Agent**: full-stack-developer
**Task ID**: LOCALE-FULL
**Scope**: i18n locale pack expansion (9 languages) + loader update

## Files created / modified

### Created (NEW)
- `src/lib/locale-packs/ar-formal.json` — Formal Arabic (MSA / فصحى), `dir: rtl`
- `src/lib/locale-packs/zh.json` — Simplified Chinese (简体中文), `dir: ltr`

### Updated (expanded from ~101 to full 322 keys)
- `src/lib/locale-packs/fr.json` — French
- `src/lib/locale-packs/es.json` — Spanish
- `src/lib/locale-packs/tr.json` — Turkish
- `src/lib/locale-packs/ur.json` — Urdu (`dir: rtl`)
- `src/lib/locale-packs/hi.json` — Hindi

### Loader / dictionary
- `src/lib/i18n-loader.ts` — added `ar-formal` + `zh` to `LocaleCode`, `LOCALE_PACKS`, `COUNTRY_TO_LOCALE` (Gulf → `ar-formal`, China + Sinosphere → `zh`), and Accept-Language resolver
- `src/lib/i18n.ts` — JSDoc + `applyLocaleToDocument` docstring updated to mention all 9 locales and the three RTL ones (`ar`, `ar-formal`, `ur`)

## Structural parity

Ran a flatten-and-diff check against the `ar.json` reference. Every one of the 9 packs (including the existing `en` and the new `ar-formal`/`zh`) has the **exact same 322-key nested structure**:

```
Reference (ar.json) key count: 322
  OK  ar-formal.json (322 keys)
  OK  en.json (322 keys)
  OK  es.json (322 keys)
  OK  fr.json (322 keys)
  OK  hi.json (322 keys)
  OK  tr.json (322 keys)
  OK  ur.json (322 keys)
  OK  zh.json (322 keys)
ALL LOCALE PACKS MATCH STRUCTURE OF ar.json
```

(0 missing keys, 0 extra keys for each pack.)

## Loader runtime check

```
ALL_LOCALES: en, ar, ar-formal, fr, es, tr, ur, hi, zh   (9)
Direction: en→ltr, ar→rtl, ar-formal→rtl, fr→ltr, es→ltr, tr→ltr, ur→rtl, hi→ltr, zh→ltr
Country:   CN→zh, SA→ar-formal, EG→ar, US→en, FR→fr
Accept-Language: "ar-SA,ar;q=0.9,en;q=0.8" → ar
                 "zh-CN,zh;q=0.9,en;q=0.8" → zh
                 "ar-formal"                → ar-formal   (explicit MSA honored)
Fallbacks: getPack('xx')           → en (Cirkle)
           resolveLocaleFromCountry('ZZ') → en
```

## Lint

`bun run lint` → **0 errors, 0 warnings** ✅

## Not modified

- Brain AI system — untouched.
- `proxy.ts` — untouched.
- No other protected systems touched.

## Backward compatibility

`dict[locale].home.hello`, `dict[locale].nav`, `getDictionary(locale).ai.title`, etc. continue to work — `Locale` was widened from 7 to 9 codes and the original `en`/`ar` entries (and their nested shapes) are unchanged.

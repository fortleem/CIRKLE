# LOCALE-EXPAND — 8 new locale packs for CIRKLE

**Agent**: full-stack-developer
**Task ID**: LOCALE-EXPAND
**Scope**: i18n locale pack expansion (8 new languages) + loader + dictionary updates

## Context

This task continues the work started by **LOCALE-FULL** (`/home/z/my-project/agent-ctx/LOCALE-FULL-full-stack-developer.md`), which shipped the first 9 locale packs (en, ar, ar-formal, fr, es, tr, ur, hi, zh) with a unified 322-key nested JSON structure. LOCALE-EXPAND adds 8 more languages on top of that same structure.

## Files created / modified

### Created (NEW) — 8 locale packs under `src/lib/locale-packs/`
- `ja.json` — Japanese (日本語), `dir: ltr`, `appName: サークル`
- `it.json` — Italian, `dir: ltr`
- `de.json` — German, `dir: ltr`
- `ru.json` — Russian (Русский), `dir: ltr`, `appName: Круг`
- `pt.json` — Brazilian Portuguese, `dir: ltr`
- `id.json` — Indonesian, `dir: ltr`
- `ko.json` — Korean (한국어), `dir: ltr`, `appName: 서클`
- `fa.json` — Persian/Farsi (فارسی), `dir: rtl`, `appName: دایره` ← the **4th RTL locale** alongside `ar`, `ar-formal`, `ur`

### Modified
- `src/lib/i18n-loader.ts`
  - Header comment updated: "9 locale packs" → "17 locale packs"
  - 8 new `import …Json from "./locale-packs/<code>.json"` statements
  - `LocaleCode` union widened from 9 → 17 codes (added `ja | it | de | ru | pt | id | ko | fa`)
  - `LOCALE_PACKS` registry extended with 8 new entries
  - `COUNTRY_TO_LOCALE` map extended:
    - Japan → `ja`
    - Italy, San Marino → `it`
    - Germany, Austria, Liechtenstein → `de`
    - Russia, Belarus → `ru`
    - Brazil, Portugal, Angola, Mozambique, Cape Verde, Guinea-Bissau, Timor-Leste, São Tomé → `pt`
    - Indonesia → `id`
    - South Korea, North Korea → `ko`
    - Iran, Afghanistan, Tajikistan → `fa`
  - 8 new back-compat named exports (`ja`, `it`, `de`, `ru`, `pt`, `id`, `ko`, `fa`)
- `src/lib/i18n.ts`
  - `Locale` type JSDoc updated to list all 17 locales
  - `dict` JSDoc updated to mention all 17 shipped locales
  - `applyLocaleToDocument` JSDoc updated: `fa` is now listed as the 4th RTL locale (alongside `ar`, `ar-formal`, `ur`). Runtime behavior was already correct because `applyLocaleToDocument` reads `getDirection(locale)` which reads the pack's `dir` field — `fa.json` declares `dir: "rtl"`, so the `<html dir="rtl">` flip happens automatically without code changes.

## Structural parity

Ran a flatten-and-diff check against `en.json`. Every one of the 8 new packs has the **exact same 322-key nested structure**:

```
Reference (en.json) key count: 322
  OK  ja.json (322 keys, dir=ltr)
  OK  it.json (322 keys, dir=ltr)
  OK  de.json (322 keys, dir=ltr)
  OK  ru.json (322 keys, dir=ltr)
  OK  pt.json (322 keys, dir=ltr)
  OK  id.json (322 keys, dir=ltr)
  OK  ko.json (322 keys, dir=ltr)
  OK  fa.json (322 keys, dir=rtl)
ALL NEW LOCALE PACKS MATCH STRUCTURE OF en.json
```

(0 missing keys, 0 extra keys for each pack — verified by sorting flattened key paths and diffing against the English reference.)

## Required-key spot checks (29/29 passed)

All mandatory keys from the task spec verified at runtime via `getPack(code)`:

```
  OK  ja.appName = "サークル"
  OK  ja.tabs.home = "ホーム"
  OK  ja.home.whatsOnYourMind = "今どうしてる？"
  OK  ja.privacy.noAds = "広告なし"
  OK  it.greeting.morning = "Buongiorno"
  OK  it.buttons.search = "Cerca"
  OK  it.privacy.noAds = "Senza pubblicità"
  OK  de.greeting.morning = "Guten Morgen"
  OK  de.buttons.send = "Senden"
  OK  de.privacy.noAds = "Ohne Werbung"
  OK  ru.appName = "Круг"
  OK  ru.tabs.home = "Главная"
  OK  ru.home.whatsOnYourMind = "Что у вас на уме?"
  OK  ru.privacy.noAds = "Без рекламы"
  OK  pt.greeting.morning = "Bom dia"
  OK  pt.buttons.search = "Buscar"
  OK  pt.privacy.noAds = "Sem anúncios"
  OK  id.greeting.morning = "Selamat pagi"
  OK  id.buttons.send = "Kirim"
  OK  id.privacy.noAds = "Tanpa iklan"
  OK  ko.appName = "서클"
  OK  ko.tabs.home = "홈"
  OK  ko.home.whatsOnYourMind = "무슨 생각을 하고 있나요?"
  OK  ko.privacy.noAds = "광고 없음"
  OK  fa.appName = "دایره"
  OK  fa.tabs.home = "خانه"
  OK  fa.home.whatsOnYourMind = "به چه فکر می‌کنید؟"
  OK  fa.privacy.noAds = "بدون تبلیغات"
  OK  fa.dir = "rtl"
```

## Loader runtime check

```
ALL_LOCALES: en, ar, ar-formal, fr, es, tr, ur, hi, zh, ja, it, de, ru, pt, id, ko, fa   (17)
Direction: en->ltr, ar->rtl, ar-formal->rtl, fr->ltr, es->ltr, tr->ltr, ur->rtl, hi->ltr,
           zh->ltr, ja->ltr, it->ltr, de->ltr, ru->ltr, pt->ltr, id->ltr, ko->ltr, fa->rtl
Country:   JP->ja, IT->it, DE->de, AT->de, RU->ru, BY->ru, BR->pt, PT->pt,
           ID->id, KR->ko, IR->fa, SA->ar-formal, US->en, FR->fr, CN->zh
Accept-Language: "ja-JP,ja;q=0.9,en;q=0.8" -> ja
                 "fa-IR,fa;q=0.9,en;q=0.8" -> fa
Fallbacks: getPack('xx')           -> en (Cirkle)
           resolveLocaleFromCountry('ZZ') -> en
           loadLocalePack('ko').appName   -> 서클
ALL CHECKS PASSED ✅
```

## Lint

`bun run lint` → **0 errors, 0 warnings** ✅

## Translation notes

- All packs use **native scripts and proper diacritics**: Japanese (hiragana/katakana/kanji mix), Korean (Hangul), Russian (Cyrillic with ё), Persian (Persian-Arabic script with ZWNJ `\u200c` for compound words like `می‌کنید`).
- Brand names **Wasl, Mashahd, Lamahat, Midan, Rihla, Pay, Mail** are kept untranslated in every pack (same convention as `en.json` and `fr.json`) — they are Cirkle product names.
- Cirkle's own app name is localized where a clean native transliteration exists: Japanese `サークル`, Russian `Круг`, Korean `서클`, Persian `دایره`. Italian/German/Portuguese/Indonesian keep `Cirkle` (the brand is also a valid word in those Latin scripts).
- The Persian pack uses Persian digits in the `mailSub` and `mesh` strings (`۳ جدید`, `۴ همتا`) and the Russian pack uses Cyrillic-friendly punctuation (em-dashes, № where applicable).
- The onboarding `slide2.title` says "Eight worlds. One Cirkle." in English — the localized versions preserve the count ("8つの世界", "Otto mondi", "Acht Welten", "Восемь миров", "Oito mundos", "Delapan dunia", "여덟 개의 세계", "هشت دنیا") since Cirkle still ships eight product worlds (Wasl/Mashahd/Lamahat/Midan/Rihla/Pay/Mail + AI).

## Backward compatibility

`dict[locale].home.hello`, `dict[locale].nav`, `getDictionary(locale).ai.title`, `applyLocaleToDocument(locale)`, etc. continue to work — `LocaleCode` was widened from 9 to 17 codes and the original `en`/`ar`/etc. entries (and their nested shapes) are unchanged.

## Not modified (per task rules)

- Brain AI system — untouched.
- `proxy.ts` — untouched.
- No other protected systems touched.

## Future upgrade path

The `loadLocalePack` async loader is still a thin synchronous wrapper. When the 17-pack bundle grows large enough to warrant code-splitting, swap its body to `await import(\`./locale-packs/${locale}.json\`)` — the async signature is already reserved, so the swap is non-breaking.

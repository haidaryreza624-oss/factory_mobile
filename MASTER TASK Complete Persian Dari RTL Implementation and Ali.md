MASTER TASK: Complete Persian/Dari RTL Implementation and Alignment Audit (Expo React Native)

Act as a senior React Native engineer specializing in internationalization, Persian typography, bidirectional text rendering, and Android/iOS UI development.

Your task is to make the ENTIRE application properly support Persian/Dari (RTL).

This is not a cosmetic redesign. It is a technical RTL correction and implementation task.

The previous RTL implementation was unsuccessful. Do not repeat the same approach of adding "textAlign: 'right'" or "writingDirection: 'rtl'" randomly to individual components.

You must inspect the application, identify the actual causes of alignment problems, implement a centralized solution, and verify it on the target platforms.

Do not declare this task complete until the implementation has been tested.

---

PHASE 1 — FULL PROJECT AUDIT

Before modifying anything:

1. Inspect the complete Expo project structure.
2. Identify the Expo SDK and React Native versions.
3. Identify the navigation library and navigation architecture.
4. Inspect the root application entry point and layout.
5. Identify the current font configuration and loaded Persian fonts.
6. Inspect all existing Text, TextInput, Pressable, View, ScrollView, FlatList and other UI components.
7. Identify existing RTL configurations.
8. Identify hardcoded left/right margins, paddings, borders and positioning.
9. Identify icon and text combinations.
10. Identify all screens and reusable components that require RTL support.

Find the root causes of the existing RTL problems before applying fixes.

Do not blindly replace existing styles.

---

PHASE 2 — GLOBAL RTL ARCHITECTURE

Implement a centralized RTL architecture.

Requirements:

- Persian/Dari must be treated as an RTL language.
- English must remain supported as LTR if language switching exists.
- The application layout direction must be consistent across screens.
- RTL configuration must happen before the application renders.
- Avoid calling I18nManager configuration repeatedly inside components.
- Handle the fact that forceRTL and allowRTL can require an application reload or restart.
- Ensure navigation headers, tab bars, drawers and screen transitions respect the selected direction.

Use React Native's I18nManager correctly.

Important APIs to investigate:

- I18nManager.isRTL
- I18nManager.allowRTL()
- I18nManager.forceRTL()
- I18nManager.swapLeftAndRightInRTL()

Do not assume that forceRTL automatically fixes every text or component alignment problem.

For a Persian-only application, establish a consistent RTL configuration. If the application supports language switching, implement a deliberate direction-switching and reload strategy.

---

PHASE 3 — PERSIAN TYPOGRAPHY SYSTEM

Typography is a critical part of this task.

Use a properly licensed Persian font with complete Arabic/Persian character coverage.

Preferred font:

- Vazirmatn

Alternative:

- Noto Sans Arabic
- Estedad

Requirements:

1. Load fonts correctly using Expo font loading.
2. Do not render application content before required fonts are loaded.
3. Define centralized typography tokens.
4. Apply the correct font family consistently to Text and TextInput.
5. Preserve appropriate line heights.
6. Check Persian character shaping.
7. Check diacritics and glyph clipping.
8. Verify vertical alignment on Android.
9. Avoid inconsistent font weights and synthetic bold rendering.
10. Do not allow individual components to silently fall back to the system font.

Investigate Android font padding behavior.

Use "includeFontPadding: false" where appropriate, but test the result rather than applying it blindly.

Do not use one fixed line height for every font size.

---

PHASE 4 — CENTRALIZED TEXT COMPONENTS

Create reusable components instead of configuring text independently on every screen.

At minimum, implement:

- AppText
- AppHeading
- AppLabel
- AppCaption
- AppTextInput
- AppSearchInput

AppText should support:

- Centralized Persian font configuration.
- Correct writing direction.
- Correct text alignment.
- Custom styles.
- Font weights.
- Font sizes.
- Multiline text.
- Number handling.
- Accessibility.
- Explicit LTR exceptions.

For Persian content, use the appropriate RTL direction and alignment.

For English content, preserve LTR direction when needed.

Do not force every string to RTL if it contains English identifiers, email addresses, URLs, phone numbers or other LTR content.

Do not wrap every nested Text component in another Text component unnecessarily.

---

PHASE 5 — FLEXBOX AND COMPONENT ALIGNMENT

This is one of the most important parts.

Audit the entire application for incorrect assumptions about left-to-right layouts.

Review:

- flexDirection
- alignItems
- justifyContent
- textAlign
- writingDirection
- direction
- position
- left
- right
- marginLeft
- marginRight
- paddingLeft
- paddingRight
- borderLeftWidth
- borderRightWidth

Use logical layout properties where supported by the installed React Native version:

- marginStart / marginEnd
- paddingStart / paddingEnd
- borderStartWidth / borderEndWidth
- start / end

Avoid hardcoded left/right positioning when the layout should adapt to the current direction.

Important:

Do not blindly set "flexDirection: 'row-reverse'" on every RTL component.

Understand how React Native handles RTL layout direction and how it interacts with row and row-reverse.

Do not reverse an already reversed layout.

Verify the actual visual order of children.

---

PHASE 6 — PERSIAN COMPONENT ALIGNMENT

Audit and correct every reusable component.

Navigation

- Sidebar and drawer placement.
- Bottom tab navigation.
- Navigation icons.
- Back and forward buttons.
- Header title alignment.
- Header action placement.
- Navigation gestures.

Forms

- Labels.
- Text inputs.
- Placeholders.
- Input icons.
- Password visibility buttons.
- Search fields.
- Dropdowns.
- Select components.
- Checkboxes.
- Radio buttons.
- Switches.
- Validation messages.

Lists and tables

- List item alignment.
- Avatar positioning.
- Icon positioning.
- Primary and secondary text.
- Row action buttons.
- Column alignment.
- Numeric values.
- Status indicators.

Other components

- Cards.
- Modals.
- Bottom sheets.
- Popovers.
- Tooltips.
- Toast notifications.
- Date pickers.
- Time pickers.
- Progress indicators.
- Empty states.
- Loading indicators.

Every component must be visually inspected in RTL mode.

---

PHASE 7 — BIDIRECTIONAL TEXT (CRITICAL)

Persian applications frequently contain mixed RTL and LTR content.

Examples:

- Persian text with English names.
- Persian text with numbers.
- Phone numbers.
- Email addresses.
- URLs.
- Dates.
- Times.
- Currency values.
- Product codes.
- Usernames.
- Mathematical expressions.

Do not assume that "writingDirection: 'rtl'" will correctly handle every mixed-content string.

Implement explicit direction handling where appropriate.

Use separate text elements for independently aligned LTR and RTL content.

Where supported and necessary, use Unicode directional isolation controls such as:

- LRI: U+2066
- RLI: U+2067
- FSI: U+2068
- PDI: U+2069

Use them carefully and only around dynamic mixed-direction values that need isolation.

Do not insert invisible directional characters into every string.

Test the following examples:

1. سلام، به برنامه خوش آمدید
2. شماره تماس: 0791234567
3. Email: example@gmail.com
4. محصول iPhone 15 Pro
5. قیمت: 1,250 افغانی
6. تاریخ: 2026/11/20
7. کد محصول: PRD-1024
8. ثبت سفارش جدید

The visual ordering must remain correct.

---

PHASE 8 — TEXT INPUT AND CURSOR BEHAVIOR

TextInput requires separate testing.

Verify:

- Persian text starts from the correct side.
- Cursor starts at the correct position.
- Placeholder alignment is correct.
- Typed text remains correctly aligned.
- Selection handles work correctly.
- Copy and paste work correctly.
- Mixed Persian and English input behaves correctly.
- Multiline input behaves correctly.
- Search input behaves correctly.
- Password input behaves correctly.

Do not assume TextInput automatically inherits the correct behavior from its parent View.

Test on an actual Android device or emulator.

---

PHASE 9 — ICON AND TEXT ALIGNMENT

The application uses an Apple-inspired iconography system.

Ensure icons and text work together correctly in RTL.

Requirements:

- Navigation icons must appear in the correct visual positions.
- Icon + label combinations must maintain correct spacing.
- Action buttons must not reverse their contents incorrectly.
- Back and forward directional icons must be handled appropriately.
- Non-directional icons must not be unnecessarily mirrored.
- Directional icons should change orientation where appropriate.

Do not confuse visual icon mirroring with Flexbox child ordering.

---

PHASE 10 — CENTRALIZED DESIGN TOKENS

Create a centralized RTL-aware styling system.

For example:

- typography.ts
- spacing.ts
- colors.ts
- layout.ts
- direction.ts

Avoid duplicating RTL logic throughout the application.

Create reusable helpers only where they provide genuine value.

All components should use consistent typography, spacing and logical alignment conventions.

Do not introduce unnecessary abstraction.

---

PHASE 11 — AUTOMATED AND MANUAL TESTING

Testing is mandatory.

Create a dedicated RTL test screen that demonstrates:

1. Persian headings.
2. Persian paragraphs.
3. Persian and English mixed text.
4. Numbers and phone numbers.
5. Email addresses and URLs.
6. Text inputs.
7. Search inputs.
8. Buttons with icons.
9. Lists.
10. Cards.
11. Modals.
12. Navigation.
13. Multiline text.
14. Dropdowns.
15. Validation errors.

Test the application on:

- Android (mandatory).
- iOS (if supported by the project).

Test different screen widths and font sizes.

Use actual screenshots to inspect alignment.

Check for:

- Clipped Persian characters.
- Incorrect text direction.
- Reversed icons.
- Misaligned labels.
- Incorrect cursor position.
- Unexpected spacing.
- Overlapping elements.
- Incorrect multiline wrapping.

Do not rely exclusively on successful compilation or TypeScript checks.

---

PHASE 12 — COMPLETION REPORT

After implementation, provide a concise report containing:

1. Root causes discovered.
2. Files modified.
3. New reusable components created.
4. RTL configuration changes.
5. Font configuration changes.
6. Platform-specific fixes.
7. Screens and components audited.
8. Tests performed.
9. Tests that passed.
10. Remaining issues or platform limitations.

Clearly distinguish between issues that were fixed and issues that were not verified.

Do not claim that RTL is fully fixed if it has not been tested.

---

NON-NEGOTIABLE RULES

- Do not apply random "textAlign: 'right'" styles throughout the application.
- Do not use "row-reverse" everywhere.
- Do not assume that "I18nManager.forceRTL(true)" solves everything.
- Do not break existing business logic.
- Do not unnecessarily redesign the UI.
- Do not introduce incompatible dependencies.
- Do not silently remove existing functionality.
- Do not declare completion without verification.

The objective is a genuinely native-feeling Persian/Dari RTL application in which text, icons, navigation, forms, lists, and every other UI component are correctly aligned and behave naturally.

Prioritize correctness over speed.
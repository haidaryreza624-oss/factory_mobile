Implement an Apple SF Symbols Icon System

Act as a senior React Native UI engineer. I want to replace the application's generic outline iconography with an Apple-inspired iconography system based on Apple's SF Symbols.

1. Primary Design Direction

Use Apple's SF Symbols as the visual reference for the entire application's iconography.

The desired appearance:

- Filled and solid glyphs rather than thin outline icons.
- Clean, recognizable silhouettes.
- Balanced proportions and consistent visual weight.
- Minimalist, refined and professional appearance.
- Carefully selected multicolor or hierarchical icons where appropriate.
- Consistent icon sizing and alignment.

The application should feel closer to native iOS applications rather than a generic AI-generated SaaS dashboard.

2. Icon Library and Implementation

First inspect the existing Expo and React Native project.

Use the "expo-symbols" package if the project's Expo SDK supports it.

Documentation:
https://docs.expo.dev/versions/latest/sdk/symbols/

Use Apple's SF Symbols through the supported native implementation on iOS.

For Android, provide visually equivalent icons using a compatible icon library or custom SVG assets. Do not assume SF Symbols are natively available on Android.

Possible fallback:

- Phosphor Icons (Filled style)
- Custom SVG icons
- Other visually consistent filled glyph assets

Android and iOS should maintain the same visual identity even if their underlying icon assets differ.

3. Icon Styling Rules

- Prefer filled variants over thin outline variants.
- Use consistent icon sizes based on context.
- Use monochromatic icons for most navigation and toolbar actions.
- Use accent colors selectively.
- Use multicolor or hierarchical symbols only when they improve meaning.
- Avoid excessive colored rounded-square backgrounds.
- Avoid placing every icon inside a circular or rounded-square container.
- Do not mix unrelated icon families or visual weights.
- Never use emojis as interface icons.

4. Component Architecture

Create a centralized, reusable icon component.

For example:

"AppIcon"

It should support:

- Semantic icon names.
- Platform-specific icon mapping.
- Filled and regular variants where appropriate.
- Configurable size.
- Configurable color.
- Accessibility labels.
- Consistent default styling.

Centralize the icon mappings so individual screens do not import different icon libraries directly.

5. Application-Wide Consistency

Apply this icon system consistently across:

- Tab navigation.
- Side navigation.
- Headers.
- Action buttons.
- Inventory screens.
- Forms.
- Data tables.
- Settings.
- Notifications.
- Empty states.
- Status indicators.

Use appropriate symbols for each action rather than reusing generic icons.

6. Important Restrictions

- Do not redesign business logic.
- Do not change navigation behavior.
- Do not break existing functionality.
- Do not unnecessarily introduce additional dependencies.
- Do not replace existing components unless necessary.
- Preserve the application's existing color palette and typography unless a change is required for icon consistency.

7. Implementation Workflow

1. Inspect the current Expo SDK and dependencies.
2. Verify compatibility with "expo-symbols".
3. Install the appropriate package if supported.
4. Create the centralized "AppIcon" component.
5. Define semantic icon mappings for the application.
6. Implement Android fallbacks.
7. Gradually replace existing icons throughout the application.
8. Test both Android and iOS rendering.
9. Verify alignment, sizing, color consistency and accessibility.

Before making changes, explain the proposed implementation and identify any platform limitations.

The final result should be a cohesive, Apple-inspired iconography system, not a collection of unrelated icon libraries.
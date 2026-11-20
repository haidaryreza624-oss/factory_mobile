import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Radius, Spacing } from '@/constants/theme';
import { fa } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

export interface ChoiceOption<Value extends string = string> {
  id: Value;
  label: string;
  description?: string;
  leading?: ReactNode;
}

export interface ChoiceGroupProps<Value extends string = string> {
  label: string;
  options: ChoiceOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  searchable?: boolean;
  disabled?: boolean;
  optionColumns?: number;
}

export function ChoiceGroup<Value extends string,>({
  label,
  options,
  value,
  onChange,
  searchable = options.length >= 6,
  disabled = false,
  optionColumns,
}: ChoiceGroupProps<Value>) {
  const theme = useTheme();
  const optionWidth = optionColumns && optionColumns > 1
    ? `${100 / optionColumns - 3}%`
    : undefined;
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedQuery))
    : options;

  return (
    <View style={styles.group}>
      <ThemedText type="label">{label}</ThemedText>
      {searchable ? (
        <AppTextInput
          accessibilityLabel={fa.common.search}
          placeholder={fa.common.search}
          value={query}
          onChangeText={setQuery}
          editable={!disabled}
          returnKeyType="search"
        />
      ) : null}
      <View style={[styles.options, optionColumns ? styles.columnOptions : null]}>
        {filteredOptions.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.id)}
              style={({ pressed }) => [
                styles.option,
                optionWidth ? { width: optionWidth, flexShrink: 0 } : null,
                {
                  backgroundColor: selected ? theme.primary : theme.surfaceMuted,
                  borderColor: selected ? theme.primary : theme.border,
                  opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
                },
              ]}>
              <View
                style={[
                  styles.optionContent,
                  option.leading ? styles.leadingOption : undefined,
                ]}>
                {option.leading}
                <View style={option.leading ? styles.optionTexts : null}>
                  <ThemedText
                    type="smallBold"
                    style={[
                      styles.optionLabel,
                      { color: selected ? theme.primaryText : theme.text },
                    ]}>
                    {option.label}
                  </ThemedText>
                  {option.description ? (
                    <ThemedText
                      type="caption"
                      style={[
                        styles.optionDescription,
                        { color: selected ? theme.primaryText : theme.textSecondary },
                      ]}>
                      {option.description}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      {options.length > 0 && filteredOptions.length === 0 ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {fa.common.noResults}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  columnOptions: {
    justifyContent: 'center',
  },
  option: {
    minHeight: 44,
    maxWidth: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  optionContent: {
    alignItems: 'center',
    gap: 1,
  },
  leadingOption: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  optionTexts: {
    flexShrink: 1,
  },
  optionLabel: {
    flexShrink: 1,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  optionDescription: {
    flexShrink: 1,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});

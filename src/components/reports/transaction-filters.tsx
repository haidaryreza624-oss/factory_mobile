import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Card } from '@/components/ui/card';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { Icon } from '@/components/ui/icon';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fa } from '@/i18n';
import { toPersianDigits } from '@/lib/persian';

export type TransactionStatusFilter = 'all' | 'complete' | 'incomplete';
export type TransactionCurrencyFilter = 'all' | 'AFN' | 'USD';

interface TransactionFiltersProps {
  search: string;
  status: TransactionStatusFilter;
  currency: TransactionCurrencyFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TransactionStatusFilter) => void;
  onCurrencyChange: (value: TransactionCurrencyFilter) => void;
}

export function TransactionFilters({
  search,
  status,
  currency,
  onSearchChange,
  onStatusChange,
  onCurrencyChange,
}: TransactionFiltersProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const activeFilterCount =
    Number(Boolean(search.trim())) +
    Number(status !== 'all') +
    Number(currency !== 'all');

  return (
    <Card padded={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.trigger,
          { opacity: pressed ? 0.8 : 1 },
        ]}>
        <View style={styles.triggerText}>
          <ThemedText type="smallBold">{fa.reports.filterTransactions}</ThemedText>
          {activeFilterCount > 0 ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {fa.reports.activeFilters(toPersianDigits(String(activeFilterCount)))}
            </ThemedText>
          ) : null}
        </View>
        <View style={expanded ? styles.chevronExpanded : undefined}>
          <Icon name={Icons.chevronDown} size={20} color={theme.textSecondary} />
        </View>
      </Pressable>
      {expanded ? (
        <View style={styles.content}>
          <AppTextInput
            accessibilityLabel={fa.common.search}
            placeholder={fa.reports.searchTransactions}
            value={search}
            onChangeText={onSearchChange}
            returnKeyType="search"
          />
          <ChoiceGroup
            label={fa.reports.transactionStatus}
            options={[
              { id: 'all', label: fa.reports.allStatuses },
              { id: 'complete', label: fa.reports.completeFilter },
              { id: 'incomplete', label: fa.reports.incompleteFilter },
            ]}
            value={status}
            onChange={onStatusChange}
          />
          <ChoiceGroup
            label={fa.reports.currencyFilter}
            options={[
              { id: 'all', label: fa.reports.allCurrencies },
              { id: 'AFN', label: fa.units.afn },
              { id: 'USD', label: fa.units.usd },
            ]}
            value={currency}
            onChange={onCurrencyChange}
          />
          {activeFilterCount > 0 ? (
            <AppButton
              label={fa.reports.clearFilters}
              variant="ghost"
              size="small"
              onPress={() => {
                onSearchChange('');
                onStatusChange('all');
                onCurrencyChange('all');
              }}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  triggerText: {
    gap: Spacing.one,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
});

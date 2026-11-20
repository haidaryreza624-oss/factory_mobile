import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type { CashFlowTotals } from '@/db/types';
import { formatAfn } from '@/lib/format';

interface CashFlowSummaryProps {
  title: string;
  description: string;
  totalLabel: string;
  totals: CashFlowTotals;
}

export function CashFlowSummary({
  title,
  description,
  totalLabel,
  totals,
}: CashFlowSummaryProps) {
  return (
    <Card tone="info">
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {description}
      </ThemedText>
      <View style={styles.totalRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {totalLabel}
        </ThemedText>
        <ThemedText
          type="smallBold"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}>
          {formatAfn(totals.afn)}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});

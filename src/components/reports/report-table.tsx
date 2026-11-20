import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ReportTableProps {
  headers: string[];
  rows: string[][];
  columnFlexes: number[];
  onRowPress?: (rowIndex: number) => void;
  rowBadges?: { label: string; tone: BadgeTone }[];
}

export function ReportTable({
  headers,
  rows,
  columnFlexes,
  onRowPress,
  rowBadges,
}: ReportTableProps) {
  const theme = useTheme();

  return (
    <Card padded={false}>
      <View>
        <View
          style={[
            styles.row,
            styles.headerRow,
            { borderBottomColor: theme.border, backgroundColor: theme.surfaceMuted },
          ]}
        >
          {headers.map((header, index) => (
            <View key={header} style={[styles.cell, { flex: columnFlexes[index] ?? 1 }]}>
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.centeredText}
              >
                {header}
              </ThemedText>
            </View>
          ))}
        </View>
        {rows.map((row, rowIndex) => {
          const rowStyle = [
            styles.row,
            { borderBottomColor: theme.border },
            rowIndex === rows.length - 1 && styles.lastRow,
          ];
          const cells = row.map((value, columnIndex) => (
            <View
              key={`cell-${columnIndex}`}
              style={[styles.cell, { flex: columnFlexes[columnIndex] ?? 1 }]}
            >
              {columnIndex === row.length - 1 && rowBadges?.[rowIndex] ? (
                <Badge
                  label={rowBadges[rowIndex].label}
                  tone={rowBadges[rowIndex].tone}
                />
              ) : (
                <ThemedText type="small" style={styles.centeredText}>
                  {value}
                </ThemedText>
              )}
            </View>
          ));

          return onRowPress ? (
            <Pressable
              key={`row-${rowIndex}`}
              accessibilityRole="button"
              accessibilityLabel={row.join('. ')}
              onPress={() => onRowPress(rowIndex)}
              style={({ pressed }) => [rowStyle, pressed && styles.pressed]}
            >
              {cells}
            </Pressable>
          ) : (
            <View key={`row-${rowIndex}`} style={rowStyle}>
              {cells}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  headerRow: {
    backgroundColor: 'transparent',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  cell: {
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  centeredText: {
    width: '100%',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  pressed: { opacity: 0.72 },
});

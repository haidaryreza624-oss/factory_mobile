import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { fa } from '@/i18n';
import { formatAfn, formatKg } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

export interface ReportTrendPoint {
  label: string;
  value: number;
  unit: 'AFN' | 'KG';
}

interface ReportLineChartProps {
  title: string;
  points: ReportTrendPoint[];
}

export function ReportLineChart({ title, points }: ReportLineChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const values = points.map((point) => point.value);
  const maximum = Math.max(0, ...values);
  const minimum = Math.min(0, ...values);
  const range = Math.max(1, maximum - minimum);
  const graphHeight = 126;
  const horizontalPadding = 12;
  const usableWidth = Math.max(0, width - horizontalPadding * 2);
  const coordinates = points.map((point, index) => ({
    x: horizontalPadding + (points.length <= 1 ? usableWidth / 2 : index * usableWidth / (points.length - 1)),
    y: 10 + ((maximum - point.value) / range) * 86,
  }));
  const labelIndexes = points.length <= 5
    ? points.map((_, index) => index)
    : Array.from({ length: 5 }, (_, index) =>
        Math.round(index * (points.length - 1) / 4)
      );

  return (
    <Card>
      <ThemedText type="subtitle">{title}</ThemedText>
      {points.length === 0 ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {fa.reports.noChartData}
        </ThemedText>
      ) : (
        <>
          <View onLayout={onLayout} style={[styles.graph, { height: graphHeight }]}>
            {[10, 53, 96].map((top) => (
              <View
                key={`grid-${top}`}
                style={[styles.gridline, { top, backgroundColor: theme.border }]}
              />
            ))}
            {coordinates.slice(1).map((point, index) => {
              const previous = coordinates[index];
              const dx = point.x - previous.x;
              const dy = point.y - previous.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx);
              return (
                <View
                  key={`segment-${index}`}
                  style={[
                    styles.segment,
                    {
                      width: length,
                      left: (previous.x + point.x - length) / 2,
                      top: (previous.y + point.y) / 2,
                      backgroundColor: theme.primary,
                      transform: [{ rotate: `${angle}rad` }],
                    },
                  ]}
                />
              );
            })}
            {coordinates.map((point, index) => (
              <View
                key={`point-${index}`}
                style={[
                  styles.point,
                  {
                    left: point.x - 5,
                    top: point.y - 5,
                    borderColor: theme.primary,
                    backgroundColor: theme.surface,
                  },
                ]}
              />
            ))}
            {labelIndexes.map((index) => {
              const point = coordinates[index];
              return (
                <View
                  key={`label-${points[index].label}`}
                  style={[
                    styles.axisLabel,
                    { left: Math.max(0, Math.min(Math.max(0, width - 80), point.x - 40)) },
                  ]}
                >
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                    {points[index].label}
                  </ThemedText>
                </View>
              );
            })}
          </View>
          <View style={styles.rangeLabels}>
            <ThemedText type="caption" themeColor="textSecondary">
              {formatTrendValue(points[0].value, points[0].unit)}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {formatTrendValue(points[points.length - 1].value, points[points.length - 1].unit)}
            </ThemedText>
          </View>
        </>
      )}
    </Card>
  );
}

function formatTrendValue(value: number, unit: ReportTrendPoint['unit']): string {
  return unit === 'AFN' ? formatAfn(value) : formatKg(value);
}

const styles = StyleSheet.create({
  graph: {
    position: 'relative',
    width: '100%',
    direction: 'ltr',
  },
  gridline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  segment: {
    position: 'absolute',
    height: 2,
    marginTop: -1,
  },
  point: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderWidth: 2,
    borderRadius: 5,
  },
  axisLabel: {
    position: 'absolute',
    bottom: 0,
    width: 80,
    alignItems: 'center',
  },
  rangeLabels: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
});

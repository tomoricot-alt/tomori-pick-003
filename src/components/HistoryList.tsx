import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDateTime, HISTORY_LIMIT, HistoryEntry } from '../lib/history';
import { colors } from '../theme';

type Props = {
  history: readonly HistoryEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function HistoryList({ history, onRemove, onClear }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.title} accessibilityRole="header">抽選履歴</Text>
        <Text style={styles.count}>直近{HISTORY_LIMIT}回まで</Text>
      </View>

      {history.length === 0 ? (
        <Text style={styles.empty}>まだ履歴はありません。ルーレットを回してみましょう。</Text>
      ) : (
        history.map((h) => (
          <View key={h.id} style={styles.row} testID="history-row">
            <View style={{ flex: 1 }}>
              <Text style={styles.label} numberOfLines={1}>{h.label}</Text>
              <Text style={styles.time}>{formatDateTime(h.at)}</Text>
            </View>
            <Pressable
              onPress={() => onRemove(h.id)}
              style={styles.del}
              accessibilityRole="button"
              accessibilityLabel={`${h.label}の履歴を削除`}
            >
              <Text style={styles.delText}>削除</Text>
            </Pressable>
          </View>
        ))
      )}

      {history.length > 0 &&
        (confirming ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmText}>履歴をすべて削除しますか？</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                testID="history-clear-yes"
                style={[styles.btn, { backgroundColor: colors.danger }]}
                onPress={() => { onClear(); setConfirming(false); }}
                accessibilityRole="button"
              >
                <Text style={[styles.btnText, { color: '#fff' }]}>削除する</Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={() => setConfirming(false)} accessibilityRole="button">
                <Text style={styles.btnText}>やめる</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable testID="history-clear" style={[styles.btn, { marginTop: 12 }]} onPress={() => setConfirming(true)} accessibilityRole="button">
            <Text style={[styles.btnText, { color: colors.danger }]}>履歴をすべて削除</Text>
          </Pressable>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  count: { fontSize: 14, color: colors.sub, fontWeight: '600' },
  empty: { color: colors.sub, fontSize: 14, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderTopWidth: 1, borderTopColor: colors.line, gap: 8 },
  label: { fontSize: 16, fontWeight: '700', color: colors.ink },
  time: { fontSize: 13, color: colors.sub, marginTop: 2 },
  del: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  delText: { fontSize: 14, fontWeight: '700', color: colors.danger },
  confirm: { marginTop: 12, backgroundColor: colors.dangerSoft, borderRadius: 12, padding: 12, gap: 8 },
  confirmText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  btn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  btnText: { fontSize: 14, fontWeight: '800', color: colors.ink },
});

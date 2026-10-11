import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addOption, editOption, MAX_LABEL_LENGTH, MAX_OPTIONS, MIN_OPTIONS, removeOption } from '../lib/options';
import { colors } from '../theme';

type Props = {
  options: readonly string[];
  disabled: boolean;
  onChange: (next: string[]) => void;
};

export function OptionsEditor({ options, disabled, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const add = () => {
    const r = addOption(options, draft);
    if (!r.ok) return setError(r.error);
    onChange(r.options);
    setDraft('');
    setError(null);
  };
  const startEdit = (i: number) => {
    setEditing(i);
    setEditText(options[i]);
    setEditError(null);
  };
  const saveEdit = () => {
    if (editing === null) return;
    const r = editOption(options, editing, editText);
    if (!r.ok) return setEditError(r.error);
    onChange(r.options);
    setEditing(null);
  };
  const remove = (i: number) => {
    const r = removeOption(options, i);
    if (!r.ok) return setError(r.error);
    onChange(r.options);
    setError(null);
    setEditing(null);
  };

  const full = options.length >= MAX_OPTIONS;
  const atMin = options.length <= MIN_OPTIONS;

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.title} accessibilityRole="header">選択肢</Text>
        <Text style={styles.count}>{options.length} / {MAX_OPTIONS}</Text>
      </View>

      {options.map((opt, i) => (
        <View key={`${i}-${opt}`} style={styles.row}>
          {editing === i ? (
            <View style={{ flex: 1 }}>
              <View style={styles.editRow}>
                <TextInput
                  testID={`edit-input-${i}`}
                  style={[styles.input, { flex: 1 }]}
                  value={editText}
                  onChangeText={(t) => { setEditText(t); setEditError(null); }}
                  onSubmitEditing={saveEdit}
                  autoFocus
                  maxLength={MAX_LABEL_LENGTH * 2}
                  returnKeyType="done"
                  accessibilityLabel={`${opt}を編集`}
                />
                <Pressable testID={`save-${i}`} onPress={saveEdit} style={[styles.small, styles.smallPrimary]} accessibilityRole="button">
                  <Text style={styles.smallPrimaryText}>保存</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(null)} style={styles.small} accessibilityRole="button">
                  <Text style={styles.smallText}>取消</Text>
                </Pressable>
              </View>
              {editError && <Text style={styles.error} accessibilityRole="alert">{editError}</Text>}
            </View>
          ) : (
            <>
              <View style={[styles.dot, { backgroundColor: colors.green }]} />
              <Text style={styles.label} numberOfLines={1}>{opt}</Text>
              <Pressable
                testID={`edit-${i}`}
                disabled={disabled}
                onPress={() => startEdit(i)}
                style={[styles.small, disabled && styles.off]}
                accessibilityRole="button"
                accessibilityLabel={`${opt}を編集`}
              >
                <Text style={styles.smallText}>編集</Text>
              </Pressable>
              <Pressable
                testID={`delete-${i}`}
                disabled={disabled || atMin}
                onPress={() => remove(i)}
                style={[styles.small, (disabled || atMin) && styles.off]}
                accessibilityRole="button"
                accessibilityLabel={`${opt}を削除`}
              >
                <Text style={[styles.smallText, { color: colors.danger }]}>削除</Text>
              </Pressable>
            </>
          )}
        </View>
      ))}

      <View style={styles.addRow}>
        <TextInput
          testID="add-input"
          style={[styles.input, { flex: 1 }]}
          value={draft}
          onChangeText={(t) => { setDraft(t); setError(null); }}
          onSubmitEditing={add}
          placeholder={full ? '上限に達しました' : '選択肢を入力'}
          placeholderTextColor={colors.sub}
          editable={!disabled && !full}
          maxLength={MAX_LABEL_LENGTH * 2}
          returnKeyType="done"
          accessibilityLabel="新しい選択肢"
        />
        <Pressable
          testID="add-button"
          onPress={add}
          disabled={disabled || full}
          style={[styles.addBtn, (disabled || full) && styles.off]}
          accessibilityRole="button"
        >
          <Text style={styles.addBtnText}>追加</Text>
        </Pressable>
      </View>
      {error && <Text testID="add-error" style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Text style={styles.hint}>{MIN_OPTIONS}〜{MAX_OPTIONS}個、1つ{MAX_LABEL_LENGTH}文字まで。内容は自動で保存されます。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  count: { fontSize: 14, color: colors.sub, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderTopWidth: 1, borderTopColor: colors.line, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1, fontSize: 16, color: colors.ink },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  small: { minHeight: 44, minWidth: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  smallText: { fontSize: 14, fontWeight: '700', color: colors.green },
  smallPrimary: { backgroundColor: colors.green },
  smallPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  off: { opacity: 0.35 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  input: {
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16, // iOS Safari の自動ズームを防ぐ
    color: colors.ink,
    backgroundColor: '#fff',
  },
  addBtn: { minHeight: 46, paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 14, marginTop: 6, fontWeight: '600' },
  hint: { color: colors.sub, fontSize: 12, marginTop: 10 },
});

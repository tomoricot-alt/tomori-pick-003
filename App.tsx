import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { HistoryList } from './src/components/HistoryList';
import { OptionsEditor } from './src/components/OptionsEditor';
import { Wheel, WheelHandle } from './src/components/Wheel';
import { addHistory, HistoryEntry, removeHistory } from './src/lib/history';
import { canSpin, DEFAULT_OPTIONS } from './src/lib/options';
import { randomIndex, randomJitter, targetRotation } from './src/lib/roulette';
import { loadHistory, loadOptions, saveHistory, saveOptions } from './src/lib/storage';
import { colors } from './src/theme';
import { useReducedMotion } from './src/useReducedMotion';

export default function App() {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const wheelRef = useRef<WheelHandle>(null);
  const rotationRef = useRef(0);
  const spinningRef = useRef(false); // state より先に同期的に二重操作を弾く

  const [ready, setReady] = useState(false);
  const [options, setOptions] = useState<string[]>([...DEFAULT_OPTIONS]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([loadOptions(), loadHistory()]).then(([o, h]) => {
      setOptions(o);
      setHistory(h);
      setReady(true);
    });
  }, []);
  // 読み込み完了前に初期値で上書き保存しないよう ready を待つ
  useEffect(() => { if (ready) saveOptions(options); }, [ready, options]);
  useEffect(() => { if (ready) saveHistory(history); }, [ready, history]);

  const changeOptions = (next: string[]) => {
    setOptions(next);
    setResult(null); // 盤面が変わるので古い結果は消す
    setCopied(false);
  };

  const spin = useCallback(async () => {
    if (spinningRef.current || !canSpin(options)) return;
    spinningRef.current = true;
    setSpinning(true);
    setResult(null);
    setCopied(false);

    const n = options.length;
    const picked = randomIndex(n); // 先に結果を決め、止まる角度をそれに合わせる
    const target = targetRotation(rotationRef.current, picked, n, 5, randomJitter());
    rotationRef.current = target;
    try {
      await wheelRef.current?.spinTo(target, reduced);
    } finally {
      setResult(options[picked]);
      setHistory((h) => addHistory(h, options[picked], Date.now()));
      spinningRef.current = false;
      setSpinning(false);
    }
  }, [options, reduced]);

  const copy = async () => {
    if (result === null) return;
    try {
      await Clipboard.setStringAsync(result);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const wheelSize = Math.max(240, Math.min(width - 48, 340));
  const spinnable = canSpin(options) && !spinning;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.brand}>TOMORI PICK</Text>
            <Text style={styles.catch}>迷ったら、回そう。</Text>
          </View>

          <View style={styles.wheelCard}>
            <View style={{ alignItems: 'center' }}>
              <Wheel ref={wheelRef} labels={options} size={wheelSize} />
            </View>

            <Pressable
              testID="spin-button"
              onPress={spin}
              disabled={!spinnable}
              style={({ pressed }) => [styles.spin, !spinnable && styles.spinOff, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !spinnable, busy: spinning }}
              accessibilityLabel={spinning ? '抽選中' : 'ルーレットを回す'}
            >
              <Text style={styles.spinText}>{spinning ? '抽選中…' : result === null ? '回す' : 'もう一度回す'}</Text>
            </Pressable>

            <View style={styles.resultBox} accessibilityLiveRegion="polite">
              {result === null ? (
                <Text style={styles.resultHint}>{spinning ? 'どれになるかな…' : 'ボタンを押すと、ひとつ選びます'}</Text>
              ) : (
                <>
                  <Text style={styles.resultLabel}>けっか</Text>
                  <Text testID="result" style={styles.result} accessibilityRole="alert">{result}</Text>
                  <Pressable testID="copy-button" onPress={copy} style={styles.copy} accessibilityRole="button">
                    <Text style={styles.copyText}>{copied ? 'コピーしました ✓' : '結果をコピー'}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          <OptionsEditor options={options} disabled={spinning} onChange={changeOptions} />
          <HistoryList
            history={history}
            onRemove={(id) => setHistory((h) => removeHistory(h, id))}
            onClear={() => setHistory([])}
          />
          <Text style={styles.footer}>TOMORI APP LAB #003 ・ データはこの端末内にだけ保存されます</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { alignItems: 'center', paddingVertical: 16 },
  page: { width: '100%', maxWidth: 520, paddingHorizontal: 16, gap: 16 },
  header: { alignItems: 'center', paddingTop: 8 },
  brand: { fontSize: 14, fontWeight: '800', letterSpacing: 3, color: colors.green },
  catch: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 4 },
  wheelCard: { backgroundColor: colors.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.line, alignItems: 'center', gap: 14 },
  spin: {
    alignSelf: 'stretch',
    minHeight: 60,
    borderRadius: 30,
    backgroundColor: colors.orangeDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinOff: { backgroundColor: '#B9AE98' },
  spinText: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  resultBox: { alignSelf: 'stretch', minHeight: 110, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft, borderRadius: 18, padding: 12 },
  resultHint: { color: colors.sub, fontSize: 14 },
  resultLabel: { color: colors.green, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  result: { color: colors.ink, fontSize: 34, fontWeight: '800', textAlign: 'center', marginVertical: 4 },
  copy: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1.5, borderColor: colors.green, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginTop: 4 },
  copyText: { color: colors.green, fontSize: 15, fontWeight: '800' },
  footer: { textAlign: 'center', color: colors.sub, fontSize: 12, paddingBottom: 24 },
});

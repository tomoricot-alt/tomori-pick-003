import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { buildSlices, labelFontSize } from '../lib/wheel';
import { colors } from '../theme';

export type WheelHandle = {
  /** target(度)まで回す。完了で resolve。reduced なら即座に止める。 */
  spinTo: (target: number, reduced: boolean) => Promise<void>;
};

type Props = { labels: readonly string[]; size: number };

const DURATION_MS = 4200;

export const Wheel = forwardRef<WheelHandle, Props>(function Wheel({ labels, size }, ref) {
  const rotation = useRef(new Animated.Value(0)).current;
  const slices = useMemo(() => buildSlices(labels, size), [labels, size]);
  const n = labels.length;
  const c = size / 2;
  const fontSize = labelFontSize(n, size);

  useImperativeHandle(ref, () => ({
    spinTo: (target, reduced) =>
      new Promise<void>((resolve) => {
        if (reduced) {
          rotation.setValue(target);
          resolve();
          return;
        }
        Animated.timing(rotation, {
          toValue: target,
          duration: DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }).start(() => resolve());
      }),
  }));

  const spin = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }); // 範囲外は外挿される

  return (
    <View style={{ width: size, height: size + 22 }} accessible accessibilityLabel={`ルーレット。選択肢は${n}個: ${labels.join('、')}`}>
      {/* 回転する盤面 */}
      <Animated.View
        testID="wheel"
        style={{ position: 'absolute', top: 22, width: size, height: size, transform: [{ rotate: spin }] }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={c} cy={c} r={c - 1} fill={colors.green} />
          {slices.map((s, i) => (
            <G key={i}>
              <Path d={s.path} fill={s.fill} stroke={colors.card} strokeWidth={2} strokeLinejoin="round" />
              <SvgText
                x={c}
                y={c - c * 0.62}
                fill={s.textColor}
                fontSize={fontSize}
                fontWeight="700"
                textAnchor="middle"
                alignmentBaseline="middle"
                transform={`rotate(${s.labelAngle} ${c} ${c})`}
              >
                {s.label}
              </SvgText>
            </G>
          ))}
          <Circle cx={c} cy={c} r={c - 4} fill="none" stroke={colors.green} strokeWidth={4} />
        </Svg>
      </Animated.View>
      {/* 固定のハブ（中央）とポインター（真上） */}
      <View pointerEvents="none" style={[styles.hub, { top: 22 + c - 22, left: c - 22 }]} />
      <View pointerEvents="none" style={[styles.pointerWrap, { left: c - 16 }]}>
        <Svg width={32} height={40} viewBox="0 0 32 40">
          <Polygon points="2,2 30,2 16,38" fill={colors.orangeDark} stroke={colors.card} strokeWidth={3} strokeLinejoin="round" />
        </Svg>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  hub: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 4,
    borderColor: colors.green,
  },
  pointerWrap: { position: 'absolute', top: 0, width: 32, height: 40 },
});

// Shared motion primitives (React Native Animated API only — no new deps).
// Durations 150–350ms, ease-out. Keep everything subtle.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, type ViewStyle } from 'react-native';
import { motion as motionTokens } from '../config/theme';

/** Fade + slide-up entrance. `delay` is used for staggered list entrances. */
export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motionTokens.fadeDuration,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: motionTokens.fadeDuration,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [opacity, translateY, delay]);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

/** Press feedback: scale to 0.97 while pressed. Wraps any content. */
export function PressScale({
  children,
  onPress,
  style,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.timing(scale, {
      toValue: motionTokens.pressScale,
      duration: motionTokens.pressDuration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.timing(scale, {
      toValue: 1,
      duration: motionTokens.pressDuration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Stagger delay for a list item index (capped so long lists don't lag). */
export function staggerDelay(index: number): number {
  return Math.min(index, motionTokens.maxStagger) * motionTokens.staggerStep;
}

/** Shimmering skeleton bar. Width/height/borderRadius passed via style. */
export function Skeleton({ style }: { style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 450, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={[{ backgroundColor: '#e2e8f0', borderRadius: 8, opacity }, style]} />;
}

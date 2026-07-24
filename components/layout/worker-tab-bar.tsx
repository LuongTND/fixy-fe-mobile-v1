import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  useDerivedValue,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';

type WorkerTab = 'home' | 'jobs' | 'wallet' | 'profile';

type WorkerTabBarProps = Readonly<{
  activeTab: WorkerTab;
}>;

const SLOT_COUNT = 4;

const INDEX_TO_TAB: Record<number, WorkerTab> = {
  0: 'home',
  1: 'jobs',
  2: 'wallet',
  3: 'profile',
};

const TAB_TO_INDEX: Record<WorkerTab, number> = {
  home: 0,
  jobs: 1,
  wallet: 2,
  profile: 3,
};

interface TabItemProps {
  slot: number;
  iconActive: keyof typeof MaterialIcons.glyphMap;
  iconInactive: keyof typeof MaterialIcons.glyphMap;
  activeIndex: SharedValue<number>;
}

const TabItem = React.memo(function TabItem({
  slot,
  iconActive,
  iconInactive,
  activeIndex,
}: TabItemProps) {
  const isActive = useDerivedValue(() => {
    return activeIndex.value === slot;
  });

  const iconActiveStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isActive.value ? 1 : 0, { duration: 160 }),
      transform: [
        {
          scale: withSpring(isActive.value ? 1.2 : 1.0, {
            damping: 14,
            stiffness: 180,
          }),
        },
      ],
      position: 'absolute',
    };
  });

  const iconInactiveStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isActive.value ? 0 : 1, { duration: 160 }),
      transform: [
        {
          scale: withSpring(isActive.value ? 1.2 : 1.0, {
            damping: 14,
            stiffness: 180,
          }),
        },
      ],
    };
  });

  return (
    <View style={styles.tab}>
      <View style={styles.iconWrapper}>
        <Animated.View style={[iconInactiveStyle, { position: 'absolute' }]}>
          <MaterialIcons name={iconInactive} size={26} color="#818A91" />
        </Animated.View>
        <Animated.View style={[iconActiveStyle, { position: 'absolute' }]}>
          <MaterialIcons name={iconActive} size={26} color="#0F382C" />
        </Animated.View>
      </View>
    </View>
  );
});

let lastActiveIndex: number | null = null;

export function WorkerTabBar({ activeTab }: WorkerTabBarProps) {
  const insets = useSafeAreaInsets();

  const handlePress = (tab: WorkerTab) => {
    if (tab === activeTab) return;

    if (tab === 'home') router.replace('/worker-home' as any);
    if (tab === 'jobs') router.replace('/worker-jobs' as any);
    if (tab === 'wallet') router.replace('/worker-wallet' as any);
    if (tab === 'profile') router.replace('/worker-profile' as any);
  };

  const handleNavigate = (index: number) => {
    const tab = INDEX_TO_TAB[index];
    if (tab) {
      handlePress(tab);
    }
  };

  const initialIndex = lastActiveIndex !== null ? lastActiveIndex : (TAB_TO_INDEX[activeTab] ?? 0);
  const activeIndex = useSharedValue(initialIndex);
  const totalBarWidth = useSharedValue(0);
  const isPressed = useSharedValue(false);

  React.useEffect(() => {
    activeIndex.value = TAB_TO_INDEX[activeTab] ?? 0;
    lastActiveIndex = TAB_TO_INDEX[activeTab] ?? 0;
  }, [activeTab]);

  const tapGesture = Gesture.Tap()
    .maxDuration(5000)
    .onStart((e) => {
      'worklet';
      if (totalBarWidth.value <= 0) return;
      const raw = Math.floor(e.x / (totalBarWidth.value / SLOT_COUNT));
      const clamped = Math.max(0, Math.min(raw, SLOT_COUNT - 1));
      activeIndex.value = clamped;
      runOnJS(handleNavigate)(clamped);
    });

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      'worklet';
      if (totalBarWidth.value <= 0) return;
      isPressed.value = true;
      const raw = Math.floor(e.x / (totalBarWidth.value / SLOT_COUNT));
      const clamped = Math.max(0, Math.min(raw, SLOT_COUNT - 1));
      activeIndex.value = clamped;
    })
    .onUpdate((e) => {
      'worklet';
      if (totalBarWidth.value <= 0) return;
      const raw = Math.floor(e.x / (totalBarWidth.value / SLOT_COUNT));
      const clamped = Math.max(0, Math.min(raw, SLOT_COUNT - 1));
      activeIndex.value = clamped;
    })
    .onEnd(() => {
      'worklet';
      isPressed.value = false;
      runOnJS(handleNavigate)(activeIndex.value);
    })
    .onFinalize(() => {
      'worklet';
      isPressed.value = false;
    });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const bottomMargin = insets.bottom > 0 ? insets.bottom : 12;

  return (
    <View style={[styles.floatingBottomBar, { bottom: bottomMargin }]}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={styles.gestureZone}
          onLayout={(e) => {
            totalBarWidth.value = e.nativeEvent.layout.width;
          }}>
          {/* pointerEvents none — gesture owns this layer */}
          <View style={styles.tabsRow} pointerEvents="none">
            <TabItem
              slot={0}
              iconActive="home"
              iconInactive="home"
              activeIndex={activeIndex}
            />
            <TabItem
              slot={1}
              iconActive="work"
              iconInactive="work"
              activeIndex={activeIndex}
            />
            <TabItem
              slot={2}
              iconActive="account-balance-wallet"
              iconInactive="account-balance-wallet"
              activeIndex={activeIndex}
            />
            <TabItem
              slot={3}
              iconActive="person"
              iconInactive="person"
              activeIndex={activeIndex}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  // Original styles preserved exactly
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#DDDDDD',
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 10,
    color: '#818A91',
    marginTop: 4,
  },
  tabTextActive: {
    color: '#FF8228',
    fontFamily: 'Montserrat_700Bold',
  },

  // Premium glassmorphic floating bottom tab bar styles
  floatingBottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(221, 221, 221, 0.8)',
    borderRadius: 30,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    paddingHorizontal: 8,
    height: 60,
  },
  gestureZone: {
    flex: 1,
    height: '100%',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  iconWrapper: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/nativewindui/Text';
import { useAuthStore } from '@/store/store';
import { selectAuthRole } from '@/hooks/useProtectedRoute';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const role = useAuthStore(selectAuthRole);

  React.useEffect(() => {
    if (isHydrating) return;

    if (isAuthenticated) {
      if (role === 'worker') {
        router.replace('/(worker)/worker-home' as any);
      } else if (role === 'customer') {
        router.replace('/(customer)/home' as any);
      }
    }
  }, [isAuthenticated, isHydrating, role]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View style={styles.background} pointerEvents="none">
          <View
            style={[styles.bgCircle1, { top: -SCREEN_WIDTH * 0.1, right: -SCREEN_WIDTH * 0.2 }]}
          />
          <View
            style={[styles.bgCircle2, { bottom: SCREEN_WIDTH * 0.2, left: -SCREEN_WIDTH * 0.1 }]}
          />
        </View>

        <View style={[styles.main, { paddingTop: insets.top + 32 }]}>
          {/* Logo Spa */}
          <View style={styles.logoContainer}>
            <View style={styles.logoInner}>
              <MaterialIcons name="spa" size={56} color="#D4AF37" />
            </View>
          </View>

          {/* Copy Spa Text */}
          <View style={styles.copy}>
            <Text style={[styles.headline, styles.darkText]}>Chăm sóc sắc đẹp</Text>
            <Text style={[styles.headline, styles.goldText]}>Trải nghiệm tại nhà</Text>
            <Text style={styles.subtitle}>
              Đặt dịch vụ Spa, Massage & Skincare thư giãn chuyên nghiệp tận nơi nhanh chóng, uy tín.
            </Text>
          </View>

          {/* Họa tiết Spa */}
          <View style={styles.illustration}>
            <View style={styles.illustrationFrame}>
              <View style={styles.spaBadgeOuter}>
                <MaterialIcons name="auto-awesome" size={28} color="#D4AF37" />
              </View>
              <View style={[styles.geoCircle, { top: 8, right: 12 }]} />
              <View style={[styles.geoBar, { bottom: 24, left: 24 }]} />
              <View style={[styles.geoSquare, { top: '38%', left: '12%' }]}>
                <MaterialIcons name="local-florist" size={18} color="#0F382C" />
              </View>
              <View style={[styles.geoDot, { bottom: 12, right: '25%' }]} />
            </View>
          </View>
        </View>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
          <Pressable
            onPress={() => router.push('/register' as any)}
            className="elevation-3 h-14 w-full items-center justify-center rounded-2xl bg-[#0F382C] shadow-md shadow-[#0F382C]/20 active:scale-[0.98] active:opacity-90">
            <Text
              style={{ fontFamily: 'Montserrat_700Bold' }}
              className="text-center text-[16px] text-white">
              Bắt đầu ngay
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/login' as any)}
            className="h-14 w-full items-center justify-center rounded-2xl border-2 border-[#0F382C] bg-white active:bg-[#F4F1EA]">
            <Text
              style={{ fontFamily: 'Montserrat_700Bold' }}
              className="text-center text-[16px] text-[#0F382C]">
              Đăng nhập
            </Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Bạn là kĩ thuật viên Spa? </Text>
            <Pressable onPress={() => router.push('/register' as any)}>
              <Text style={styles.footerLink}>Đăng ký làm kĩ thuật viên</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(15, 56, 44, 0.06)',
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  logoContainer: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 56,
    backgroundColor: '#0F382C',
    shadowColor: '#0F382C',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 2.5,
    borderColor: '#D4AF37',
  },
  logoInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#164839',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 16,
  },
  headline: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
  },
  darkText: {
    color: '#0F382C',
  },
  goldText: {
    color: '#D4AF37',
  },
  subtitle: {
    maxWidth: 290,
    marginTop: 12,
    color: '#6B7280',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  illustration: {
    width: '100%',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  illustrationFrame: {
    position: 'relative',
    width: 150,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaBadgeOuter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F2F7F2',
    borderWidth: 1.5,
    borderColor: '#C6DFC6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  geoCircle: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#0F382C',
    opacity: 0.3,
  },
  geoBar: {
    position: 'absolute',
    width: 60,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D4AF37',
    transform: [{ rotate: '45deg' }],
    opacity: 0.7,
  },
  geoSquare: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EAE6DF',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '12deg' }],
    opacity: 0.8,
  },
  geoDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F382C',
    opacity: 0.6,
  },
  actions: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    color: '#6B7280',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  footerLink: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    lineHeight: 21,
  },
});

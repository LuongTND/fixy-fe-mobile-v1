import { router } from 'expo-router';
import * as React from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/nativewindui/Text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

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
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/fixy-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.copy}>
            <Text style={[styles.headline, styles.darkText]}>Kết nối thợ giỏi</Text>
            <Text style={[styles.headline, styles.orangeText]}>Vạn việc được lo</Text>
            <Text style={styles.subtitle}>
              Đặt thợ sửa chữa, bảo trì nhanh chóng, uy tín, minh bạch.
            </Text>
          </View>

          <View style={styles.illustration}>
            <View style={styles.illustrationFrame}>
              <View style={[styles.geoCircle, { top: 16, right: 16 }]} />
              <View style={[styles.geoBar, { bottom: 32, left: 32 }]} />
              <View style={[styles.geoSquare, { top: '45%', left: '20%' }]} />
              <View style={[styles.geoDot, { bottom: 16, right: '30%' }]} />
            </View>
          </View>
        </View>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
          <Pressable
            onPress={() => router.push('/register' as any)}
            className="elevation-3 h-14 w-full items-center justify-center rounded-2xl bg-[#ff8228] shadow-md shadow-[#ff8228]/20 active:scale-[0.98] active:opacity-90">
            <Text
              style={{ fontFamily: 'Montserrat_600SemiBold' }}
              className="text-center text-[16px] text-white">
              Bắt đầu ngay
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/login' as any)}
            className="h-14 w-full items-center justify-center rounded-2xl border-2 border-[#ff8228] bg-white active:bg-[#f5f3f2]">
            <Text
              style={{ fontFamily: 'Montserrat_600SemiBold' }}
              className="text-center text-[16px] text-[#ff8228]">
              Đăng nhập
            </Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Bạn là thợ? </Text>
            <Pressable onPress={() => router.push('/register' as any)}>
              <Text style={styles.footerLink}>Đăng ký làm thợ</Text>
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
    backgroundColor: '#fbf9f8',
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
    backgroundColor: 'rgba(255, 130, 40, 0.08)',
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 130, 40, 0.06)',
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  logoContainer: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#ff8228',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  copy: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
  },
  headline: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'center',
  },
  darkText: {
    color: '#383838',
  },
  orangeText: {
    color: '#ff8228',
  },
  subtitle: {
    maxWidth: 280,
    marginTop: 12,
    color: '#574237',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  illustration: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  illustrationFrame: {
    position: 'relative',
    width: 160,
    height: 160,
  },
  geoCircle: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#ff8228',
    opacity: 0.6,
  },
  geoBar: {
    position: 'absolute',
    width: 64,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff8228',
    transform: [{ rotate: '45deg' }],
    opacity: 0.8,
  },
  geoSquare: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#ffb68c',
    transform: [{ rotate: '12deg' }],
    opacity: 0.5,
  },
  geoDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#9a4600',
    opacity: 0.7,
  },
  actions: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    color: '#574237',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  footerLink: {
    color: '#ff8228',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 21,
  },
});

import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabType = 'home' | 'orders' | 'messages' | 'favorites' | 'profile';

interface BottomTabBarProps {
  activeTab: TabType;
}

export function BottomTabBar({ activeTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const handlePress = (tab: TabType) => {
    if (tab === activeTab) return;

    if (tab === 'home') {
      router.replace('/home' as any);
    } else if (tab === 'profile') {
      router.replace('/profile' as any);
    } else if (tab === 'orders') {
      router.replace('/orders' as any);
    } else if (tab === 'messages') {
      Alert.alert('Tin nhắn', 'Hộp thư trò chuyện.');
    } else if (tab === 'favorites') {
      Alert.alert('Yêu thích', 'Danh sách thợ yêu thích.');
    }
  };

  return (
    <View
      style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12), paddingTop: 12 }]}>
      {/* Trang chủ */}
      <Pressable style={styles.tab} onPress={() => handlePress('home')}>
        <View
          style={activeTab === 'home' ? styles.activeIconIndicator : styles.inactiveIconIndicator}>
          <MaterialIcons
            name="home"
            size={24}
            color={activeTab === 'home' ? '#622a00' : '#818A91'}
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>
          Trang chủ
        </Text>
      </Pressable>

      {/* Đơn hàng */}
      <Pressable style={styles.tab} onPress={() => handlePress('orders')}>
        <View
          style={
            activeTab === 'orders' ? styles.activeIconIndicator : styles.inactiveIconIndicator
          }>
          <MaterialIcons
            name="assignment"
            size={24}
            color={activeTab === 'orders' ? '#622a00' : '#818A91'}
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
          Đơn hàng
        </Text>
      </Pressable>

      {/* Tin nhắn */}
      <Pressable style={styles.tab} onPress={() => handlePress('messages')}>
        <View
          style={
            activeTab === 'messages' ? styles.activeIconIndicator : styles.inactiveIconIndicator
          }>
          <MaterialIcons
            name="chat"
            size={24}
            color={activeTab === 'messages' ? '#622a00' : '#818A91'}
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
          Tin nhắn
        </Text>
      </Pressable>

      {/* Yêu thích */}
      <Pressable style={styles.tab} onPress={() => handlePress('favorites')}>
        <View
          style={
            activeTab === 'favorites' ? styles.activeIconIndicator : styles.inactiveIconIndicator
          }>
          <MaterialIcons
            name="favorite-border"
            size={24}
            color={activeTab === 'favorites' ? '#622a00' : '#818A91'}
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
          Yêu thích
        </Text>
      </Pressable>

      {/* Tài khoản */}
      <Pressable style={styles.tab} onPress={() => handlePress('profile')}>
        <View
          style={
            activeTab === 'profile' ? styles.activeIconIndicator : styles.inactiveIconIndicator
          }>
          <MaterialIcons
            name="person"
            size={24}
            color={activeTab === 'profile' ? '#622a00' : '#818A91'}
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
          Tài khoản
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderColor: '#EAE5E3',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
    paddingHorizontal: 12,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  activeIconIndicator: {
    width: 64,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIconIndicator: {
    width: 64,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#818A91',
    marginTop: 4,
  },
  activeTabText: {
    color: '#622a00',
    fontFamily: 'Montserrat_700Bold',
  },
});

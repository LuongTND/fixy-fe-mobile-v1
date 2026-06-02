import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type WorkerTab = 'home' | 'jobs' | 'wallet' | 'profile';

type WorkerTabBarProps = Readonly<{
  activeTab: WorkerTab;
}>;

export function WorkerTabBar({ activeTab }: WorkerTabBarProps) {
  const insets = useSafeAreaInsets();

  const navigate = (tab: WorkerTab) => {
    if (tab === activeTab) return;

    if (tab === 'home') router.replace('/worker-home' as any);
    if (tab === 'jobs') router.replace('/worker-jobs' as any);
    if (tab === 'wallet') router.replace('/worker-wallet' as any);
    if (tab === 'profile') router.replace('/worker-profile' as any);
  };

  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Pressable style={styles.tab} onPress={() => navigate('home')}>
        <MaterialIcons name="home" size={24} color={activeTab === 'home' ? '#FF8228' : '#818A91'} />
        <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>
          Trang chủ
        </Text>
      </Pressable>
      <Pressable style={styles.tab} onPress={() => navigate('jobs')}>
        <MaterialIcons name="work" size={24} color={activeTab === 'jobs' ? '#FF8228' : '#818A91'} />
        <Text style={[styles.tabText, activeTab === 'jobs' && styles.tabTextActive]}>
          Công việc
        </Text>
      </Pressable>
      <Pressable style={styles.tab} onPress={() => navigate('wallet')}>
        <MaterialIcons
          name="account-balance-wallet"
          size={24}
          color={activeTab === 'wallet' ? '#FF8228' : '#818A91'}
        />
        <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>
          Ví tiền
        </Text>
      </Pressable>
      <Pressable style={styles.tab} onPress={() => navigate('profile')}>
        <MaterialIcons
          name="person"
          size={24}
          color={activeTab === 'profile' ? '#FF8228' : '#818A91'}
        />
        <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
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
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
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
});

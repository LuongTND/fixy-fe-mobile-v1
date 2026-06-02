import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import VNPayWebView from '@/components/VNPayWebView';
import { getWalletOverview, WalletOverview } from '@/services/api/wallet';
import { topUpWallet, verifyVnpayCallback } from '@/services/api/payment';
import { PaymentMethod } from '@/services/api/bookings';
import { getApiErrorMessage } from '@/services/api/client';
import { formatDateTime } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { getWalletTransactionIcon, getWalletTransactionLabel } from '@/utils/wallet-transactions';

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

export default function UserWalletScreen() {
  const insets = useSafeAreaInsets();
  const [wallet, setWallet] = React.useState<WalletOverview | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Topup State
  const [topupAmount, setTopupAmount] = React.useState('');
  const [isSubmittingTopup, setIsSubmittingTopup] = React.useState(false);
  const [paymentUrl, setPaymentUrl] = React.useState<string | null>(null);
  const [showPaymentWebView, setShowPaymentWebView] = React.useState(false);

  const fetchWallet = React.useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const data = await getWalletOverview();
        setWallet(data);
      } catch (error) {
        if (!silent) {
          Alert.alert('Lỗi', getApiErrorMessage(error));
        }
        // Offline fallback defaults for demo
        setWallet((currentWallet) =>
          currentWallet ?? {
            balance: 750000,
            lifetimeEarned: 0,
            lifetimeSpent: 1250000,
            recentTransactions: [
              {
                id: 'tx-1',
                type: 'TopUp',
                direction: 'Credit',
                amount: 500000,
                balanceBefore: 250000,
                balanceAfter: 750000,
                status: 'Completed',
                createdDate: new Date().toISOString(),
                description: 'Nạp tiền qua VNPay',
              },
              {
                id: 'tx-2',
                type: 'Payment',
                direction: 'Debit',
                amount: 180000,
                balanceBefore: 430000,
                balanceAfter: 250000,
                status: 'Completed',
                createdDate: new Date(Date.now() - 86400000).toISOString(),
                description: 'Thanh toán Sửa đường nước',
              },
            ],
          }
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWallet(true);
  };

  const handleTopup = async () => {
    const amountVal = Number.parseInt(topupAmount.replace(/\D/g, ''), 10);
    if (Number.isNaN(amountVal) || amountVal < 10000) {
      Alert.alert('Số tiền không hợp lệ', 'Số tiền nạp tối thiểu là 10.000đ');
      return;
    }

    setIsSubmittingTopup(true);
    try {
      // method: PaymentMethod.Vnpay (1)
      const result = await topUpWallet(amountVal, PaymentMethod.Vnpay);
      if (result.paymentUrl) {
        setPaymentUrl(result.paymentUrl);
        setShowPaymentWebView(true);
      } else {
        throw new Error('Không nhận được link thanh toán từ cổng VNPay');
      }
    } catch (error) {
      Alert.alert('Lỗi', getApiErrorMessage(error));
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  const handlePaymentSuccess = async (transactionId: string, params: Record<string, string>) => {
    setIsLoading(true);
    try {
      await verifyVnpayCallback(params);
      Alert.alert('Thành công', 'Nạp tiền vào ví thành công!', [
        {
          text: 'Đóng',
          onPress: () => {
            setTopupAmount('');
            fetchWallet(true);
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Xác thực giao dịch thất bại', getApiErrorMessage(error), [
        {
          text: 'Đóng',
          onPress: () => {
            setTopupAmount('');
            fetchWallet(true);
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentError = (errorMsg: string) => {
    Alert.alert('Kết quả thanh toán', errorMsg, [
      {
        text: 'Đóng',
        onPress: () => {
          setTopupAmount('');
          fetchWallet(true);
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF8228" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#1b1c1c" />
          </Pressable>
          <Text style={styles.headerTitle}>Ví điện tử</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#FF8228"
            />
          }>
          {/* Balance Card */}
          <View style={styles.balanceCardContainer}>
            <LinearGradient
              colors={['#FF8228', '#F45100']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}>
              <View style={styles.balanceDecor}>
                <MaterialIcons
                  name="account-balance-wallet"
                  size={120}
                  color="rgba(255,255,255,0.1)"
                />
              </View>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Số dư ví của tôi</Text>
                <Text style={styles.balanceAmount}>{formatCurrency(wallet?.balance ?? 0)}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Top Up Section */}
          <View style={styles.topupSection}>
            <Text style={styles.sectionTitle}>Nạp tiền vào ví</Text>
            <View style={styles.topupCard}>
              {/* Input row */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Nhập số tiền cần nạp..."
                  placeholderTextColor="#9A9A9A"
                  keyboardType="numeric"
                  value={topupAmount}
                  onChangeText={(val) => {
                    const clean = val.replace(/\D/g, '');
                    if (clean) {
                      setTopupAmount(Number(clean).toLocaleString('vi-VN'));
                    } else {
                      setTopupAmount('');
                    }
                  }}
                />
                <Text style={styles.currencyLabel}>đ</Text>
              </View>

              {/* Quick Selectors */}
              <View style={styles.quickSelectors}>
                {QUICK_AMOUNTS.map((amt) => (
                  <Pressable
                    key={amt}
                    style={styles.quickBtn}
                    onPress={() => setTopupAmount(amt.toLocaleString('vi-VN'))}>
                    <Text style={styles.quickBtnText}>+{amt / 1000}k</Text>
                  </Pressable>
                ))}
              </View>

              {/* Top Up Button */}
              <Pressable
                style={[styles.topupSubmitBtn, isSubmittingTopup && styles.topupSubmitBtnDisabled]}
                onPress={handleTopup}
                disabled={isSubmittingTopup}>
                {isSubmittingTopup ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="payment" size={20} color="#ffffff" />
                    <Text style={styles.topupSubmitBtnText}>Nạp tiền qua VNPay</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          {/* Transaction History */}
          <View style={styles.transactionSection}>
            <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
            <View style={styles.transactionList}>
              {(wallet?.recentTransactions ?? []).map((tx) => (
                <View key={tx.id} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.transactionIcon,
                        tx.direction === 'Debit' && styles.transactionIconDebit,
                      ]}>
                      <MaterialIcons
                        name={getWalletTransactionIcon(tx.type, tx.direction)}
                        size={22}
                        color={tx.direction === 'Debit' ? '#BA1A1A' : '#006E20'}
                      />
                    </View>
                    <View>
                      <Text style={styles.transactionName}>
                        {getWalletTransactionLabel(tx.type, tx.description)}
                      </Text>
                      <Text style={styles.transactionDate}>{formatDateTime(tx.createdDate)}</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      tx.direction === 'Credit' && styles.transactionAmountCredit,
                    ]}>
                    {tx.direction === 'Credit' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </Text>
                </View>
              ))}

              {(wallet?.recentTransactions ?? []).length === 0 && (
                <View style={styles.emptyState}>
                  <MaterialIcons name="receipt-long" size={48} color="#DDDDDD" />
                  <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* VNPay WebView Overlay Modal */}
        {paymentUrl && (
          <VNPayWebView
            visible={showPaymentWebView}
            paymentUrl={paymentUrl}
            onClose={() => setShowPaymentWebView(false)}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F8',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FBF9F8',
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    lineHeight: 24,
    color: '#1b1c1c',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 24,
  },
  balanceCardContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  balanceCard: {
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  balanceDecor: {
    position: 'absolute',
    right: -10,
    top: -10,
    transform: [{ rotate: '12deg' }],
    opacity: 0.2,
  },
  balanceInfo: {
    zIndex: 1,
  },
  balanceLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
  },
  balanceAmount: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 32,
    lineHeight: 40,
    color: '#ffffff',
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: '#1b1c1c',
    marginBottom: 12,
  },
  topupSection: {
    gap: 4,
  },
  topupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 16,
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
    backgroundColor: '#fbf9f8',
  },
  amountInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
  },
  currencyLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
    marginLeft: 8,
  },
  quickSelectors: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#FFF3EA',
    borderWidth: 1,
    borderColor: '#ffcdab',
    borderRadius: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#FF8228',
  },
  topupSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF8228',
    borderRadius: 8,
    height: 48,
    shadowColor: '#FF8228',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  topupSubmitBtnDisabled: {
    backgroundColor: '#EAE5E3',
    shadowOpacity: 0,
    elevation: 0,
  },
  topupSubmitBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
  transactionSection: {
    gap: 4,
  },
  transactionList: {
    gap: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIconDebit: {
    backgroundColor: '#FFEBEE',
  },
  transactionName: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 21,
    color: '#1b1c1c',
  },
  transactionDate: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#818A91',
  },
  transactionAmount: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 21,
    color: '#BA1A1A',
  },
  transactionAmountCredit: {
    color: '#006E20',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#818A91',
  },
});

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { WorkerTabBar } from '@/components/layout/worker-tab-bar';
import { getWalletOverview, WalletOverview } from '@/services/api/wallet';
import { getApiErrorMessage } from '@/services/api/client';
import { formatDateTime } from '@/utils/date';
import {
  createPayoutAccount,
  getPayoutAccounts,
  getPayoutRequests,
  requestPayout,
  PayoutAccount,
  PayoutRequest,
  getWorkerProfileMe,
} from '@/services/api/workers';
import { getPayoutStatus, getPayoutStatusLabel } from '@/utils/payout';
import { formatCurrency } from '@/utils/format';
import { getWalletTransactionIcon, getWalletTransactionLabel } from '@/utils/wallet-transactions';

const TOP_BANKS = [
  { name: 'Vietcombank', code: 'VCB' },
  { name: 'VietinBank', code: 'CTG' },
  { name: 'Techcombank', code: 'TCB' },
  { name: 'BIDV', code: 'BID' },
  { name: 'MB Bank', code: 'MB' },
  { name: 'Agribank', code: 'VBA' },
];

type VietQrBank = {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName?: string;
  short_name?: string;
  logo?: string;
  transferSupported?: number;
  lookupSupported?: number;
  isTransfer?: number;
};

function getBankDisplayName(bank: VietQrBank | { name: string; code: string }): string {
  if ('shortName' in bank) {
    return bank.shortName || bank.short_name || bank.name;
  }
  return bank.name;
}

function getBankLogoUri(bank: VietQrBank | { name: string; code: string }): string | null {
  return 'logo' in bank && bank.logo ? bank.logo : null;
}

export default function WorkerWalletScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: profile = null, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['workerProfileMe'],
    queryFn: getWorkerProfileMe,
    retry: false,
  });

  React.useEffect(() => {
    if (!isLoadingProfile) {
      if (profile === null) {
        router.replace('/(worker)/worker-setup' as any);
      }
    }
  }, [profile, isLoadingProfile]);

  const hasApprovedProfile = profile !== null && profile.status === 1;

  const [wallet, setWallet] = React.useState<WalletOverview | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = React.useState(false);
  const [withdrawAccountDropdownOpen, setWithdrawAccountDropdownOpen] = React.useState(false);
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [selectedPayoutAccountId, setSelectedPayoutAccountId] = React.useState('');
  const [addBankModalOpen, setAddBankModalOpen] = React.useState(false);
  const [bankPickerOpen, setBankPickerOpen] = React.useState(false);
  const [bankSearchQuery, setBankSearchQuery] = React.useState('');
  const [selectedBank, setSelectedBank] = React.useState<VietQrBank | (typeof TOP_BANKS)[number]>(
    TOP_BANKS[0]
  );
  const [accountNumber, setAccountNumber] = React.useState('');
  const [accountHolder, setAccountHolder] = React.useState('');

  const { data: vietqrBanks = [] } = useQuery<VietQrBank[]>({
    queryKey: ['vietqrBanks'],
    queryFn: async () => {
      const response = await fetch('https://api.vietqr.io/v2/banks');
      if (!response.ok) {
        throw new Error('Không thể tải danh sách ngân hàng.');
      }

      const json: { data?: VietQrBank[] } = await response.json();
      return (json.data || []).filter(
        (bank) => bank.isTransfer !== 0 || bank.transferSupported !== 0
      );
    },
  });

  const { data: payoutAccounts = [] } = useQuery<PayoutAccount[]>({
    queryKey: ['payoutAccounts'],
    queryFn: getPayoutAccounts,
    enabled: hasApprovedProfile,
  });

  const { data: payoutRequests = [] } = useQuery<PayoutRequest[]>({
    queryKey: ['payoutRequests'],
    queryFn: getPayoutRequests,
    enabled: hasApprovedProfile,
  });

  const selectedPayoutAccount = React.useMemo(
    () => payoutAccounts.find((account) => account.id === selectedPayoutAccountId) || null,
    [payoutAccounts, selectedPayoutAccountId]
  );

  React.useEffect(() => {
    if (payoutAccounts.length === 0) {
      if (selectedPayoutAccountId) setSelectedPayoutAccountId('');
      return;
    }

    const selectedAccountStillExists = payoutAccounts.some(
      (account) => account.id === selectedPayoutAccountId
    );
    if (!selectedPayoutAccountId || !selectedAccountStillExists) {
      setSelectedPayoutAccountId(payoutAccounts[0].id);
    }
  }, [payoutAccounts, selectedPayoutAccountId]);

  const withdrawMutation = useMutation({
    mutationFn: requestPayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payoutRequests'] });
      queryClient.invalidateQueries({ queryKey: ['walletSummary'] });
      setWithdrawModalOpen(false);
      setWithdrawAccountDropdownOpen(false);
      setWithdrawAmount('');
      Alert.alert('Yêu cầu thành công', 'Yêu cầu rút tiền đang được xem duyệt.');
    },
    onError: (err: any) => {
      Alert.alert('Lỗi', err?.message || 'Không thể gửi yêu cầu rút tiền.');
    },
  });

  const addBankMutation = useMutation({
    mutationFn: createPayoutAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payoutAccounts'] });
      setAddBankModalOpen(false);
      setBankPickerOpen(false);
      setAccountNumber('');
      setAccountHolder('');
      Alert.alert('Thành công', 'Đã thêm tài khoản ngân hàng liên kết.');
    },
    onError: (err: any) => {
      Alert.alert('Lỗi', err?.message || 'Không thể thêm tài khoản ngân hàng.');
    },
  });

  const displayBanks = vietqrBanks.length > 0 ? vietqrBanks : TOP_BANKS;
  const selectedBankLabel = getBankDisplayName(selectedBank) || 'Chọn ngân hàng';
  const selectedBankLogo = getBankLogoUri(selectedBank);
  const filteredBanks = React.useMemo(() => {
    const keyword = bankSearchQuery.trim().toLowerCase();
    if (!keyword) return displayBanks;
    return displayBanks.filter((bank: any) => {
      const name =
        `${bank.shortName || bank.short_name || ''} ${bank.name || ''} ${bank.code || ''}`.toLowerCase();
      return name.includes(keyword);
    });
  }, [bankSearchQuery, displayBanks]);

  React.useEffect(() => {
    if (vietqrBanks.length > 0 && selectedBank === TOP_BANKS[0]) {
      setSelectedBank(vietqrBanks[0]);
    }
  }, [vietqrBanks, selectedBank]);

  const fetchWallet = React.useCallback(async (silent = false) => {
    if (!hasApprovedProfile) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await getWalletOverview();
      setWallet(data);
    } catch (error) {
      if (!silent) {
        Alert.alert('Lỗi', getApiErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasApprovedProfile]);

  React.useEffect(() => {
    if (hasApprovedProfile) {
      fetchWallet();
    }
  }, [fetchWallet, hasApprovedProfile]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWallet(true);
  };

  const handleWithdraw = () => {
    if (payoutAccounts.length === 0) {
      Alert.alert('Chưa có ngân hàng', 'Vui lòng liên kết tài khoản ngân hàng trước.');
      return;
    }
    setWithdrawModalOpen(true);
  };

  if (isLoadingProfile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbf9f8' }}>
        <ActivityIndicator size="large" color="#FF8228" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>Ví của tôi</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={() => Alert.alert('Thông báo', 'Không có thông báo mới.')}>
          <MaterialIcons name="notifications-none" size={24} color="#574237" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#FF8228" />
        }>
        {/* Balance Card */}
        <View style={styles.balanceCardContainer}>
          <LinearGradient
            colors={['#FF8228', '#F45100']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}>
            {/* Decorative icon */}
            <View style={styles.balanceDecor}>
              <MaterialIcons
                name="account-balance-wallet"
                size={120}
                color="rgba(255,255,255,0.1)"
              />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
              {(() => {
                const pendingTotal = (payoutRequests || [])
                  .filter((r) => getPayoutStatus(r) === 0)
                  .reduce((s, r) => s + (r.amount || 0), 0);
                const displayed = (wallet?.balance ?? 0) + pendingTotal;
                return (
                  <>
                    <Text style={styles.balanceAmount}>{formatCurrency(displayed)}</Text>
                    {pendingTotal > 0 ? (
                      <Text style={styles.pendingHint}>
                        -{formatCurrency(pendingTotal)} đang chờ duyệt
                      </Text>
                    ) : null}
                  </>
                );
              })()}
              {isLoading ? (
                <View style={styles.loadingHintRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.loadingHintText}>Đang tải ví...</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.balanceActions}>
              <Pressable style={styles.withdrawBtn} onPress={handleWithdraw}>
                <MaterialIcons name="payments" size={18} color="#9a4600" />
                <Text style={styles.withdrawBtnText}>Rút tiền</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialIcons name="trending-up" size={20} color="#006e20" />
            </View>
            <Text style={styles.statLabel}>Tổng thu nhập</Text>
            <Text style={styles.statValueGreen}>{formatCurrency(wallet?.lifetimeEarned ?? 0)}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#ffdad6' }]}>
              <MaterialIcons name="trending-down" size={20} color="#ba1a1a" />
            </View>
            <Text style={styles.statLabel}>Tổng chi</Text>
            <Text style={styles.statValue}>{formatCurrency(wallet?.lifetimeSpent ?? 0)}</Text>
          </View>
        </View>

        {/* Linked Bank Accounts */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Tài khoản ngân hàng liên kết</Text>
            <Pressable onPress={() => setAddBankModalOpen(true)}>
              <Text style={styles.viewAllText}>+ Thêm mới</Text>
            </Pressable>
          </View>

          {payoutAccounts.length > 0 ? (
            payoutAccounts.map((acc) => (
              <View key={acc.id} style={styles.bankAccountRow}>
                <View style={styles.bankInfo}>
                  <MaterialIcons name="account-balance" size={24} color="#FF8228" />
                  <View style={styles.bankDetails}>
                    <Text style={styles.bankNameText}>
                      {acc.bankName} ({acc.bankCode})
                    </Text>
                    <Text style={styles.bankNumberText}>{acc.accountNumber}</Text>
                    {acc.accountHolderName ? (
                      <Text style={styles.bankHolderText}>{acc.accountHolderName}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>Chưa có tài khoản ngân hàng liên kết nào.</Text>
          )}
        </View>

        {/* Withdrawal requests history */}
        <View style={styles.transactionSection}>
          <Text style={styles.transactionTitle}>Lịch sử rút tiền</Text>
          <View style={styles.transactionList}>
            {payoutRequests.length > 0 ? (
              payoutRequests.map((req) => (
                <View key={req.id} style={styles.requestItem}>
                  <View style={styles.requestLeft}>
                    <MaterialIcons name="arrow-outward" size={20} color="#BA1A1A" />
                    <View>
                      <Text style={styles.requestTitle}>Yêu cầu rút tiền</Text>
                      <Text style={styles.transactionDate}>{formatDateTime(req.createdDate)}</Text>
                    </View>
                  </View>
                  <View style={styles.requestRight}>
                    <Text style={styles.requestAmount}>-{formatCurrency(req.amount)}</Text>
                    <Text style={styles.requestStatusText}>{getPayoutStatusLabel(req)}</Text>
                    {getPayoutStatus(req) === 3 && req.transferredAt ? (
                      <Text style={styles.requestStatusText}>
                        {formatDateTime(req.transferredAt)}
                      </Text>
                    ) : null}
                    {getPayoutStatus(req) === 2 && req.rejectReason ? (
                      <Text style={styles.requestStatusText}>{req.rejectReason}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Chưa có lịch sử rút tiền nào.</Text>
            )}
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionSection}>
          <Text style={styles.transactionTitle}>Lịch sử giao dịch</Text>
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
                      name={getWalletTransactionIcon(tx.type, tx.direction, 'worker')}
                      size={22}
                      color={tx.direction === 'Debit' ? '#574237' : '#00677d'}
                    />
                  </View>
                  <View>
                    <Text style={styles.transactionName}>
                      {getWalletTransactionLabel(tx.type, tx.description, 'worker')}
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

      <WorkerTabBar activeTab="wallet" />

      <Modal visible={addBankModalOpen} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          <View style={styles.withdrawModalContent}>
            {bankPickerOpen ? (
              <>
                <View style={styles.modalHeader}>
                  <Pressable
                    style={styles.modalBackButton}
                    onPress={() => setBankPickerOpen(false)}>
                    <MaterialIcons name="arrow-back" size={24} color="#383838" />
                  </Pressable>
                  <Text style={styles.modalTitle}>Chọn ngân hàng</Text>
                  <Pressable
                    onPress={() => {
                      setBankPickerOpen(false);
                      setAddBankModalOpen(false);
                    }}>
                    <MaterialIcons name="close" size={24} color="#383838" />
                  </Pressable>
                </View>

                <View style={styles.bankSearchBox}>
                  <MaterialIcons name="search" size={20} color="#818A91" />
                  <TextInput
                    style={styles.bankSearchInput}
                    placeholder="Tìm theo tên hoặc mã ngân hàng..."
                    placeholderTextColor="#9A9A9A"
                    value={bankSearchQuery}
                    onChangeText={setBankSearchQuery}
                  />
                </View>

                <ScrollView
                  style={styles.bankPickerList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator>
                  {filteredBanks.map((bank: any) => {
                    const isSelected = selectedBank?.code === bank.code;
                    return (
                      <Pressable
                        key={bank.code}
                        style={[styles.bankPickerItem, isSelected && styles.bankPickerItemActive]}
                        onPress={() => {
                          setSelectedBank(bank);
                          setBankPickerOpen(false);
                          setBankSearchQuery('');
                        }}>
                        {getBankLogoUri(bank) ? (
                          <Image
                            source={{ uri: getBankLogoUri(bank) as string }}
                            style={styles.bankPickerLogo}
                          />
                        ) : (
                          <View style={styles.bankPickerLogoFallback}>
                            <MaterialIcons name="account-balance" size={18} color="#FF8228" />
                          </View>
                        )}
                        <View style={styles.bankPickerInfo}>
                          <Text style={styles.bankPickerName}>{getBankDisplayName(bank)}</Text>
                          <Text style={styles.bankPickerSubtitle}>{bank.code}</Text>
                        </View>
                        {isSelected ? (
                          <MaterialIcons name="check-circle" size={22} color="#FF8228" />
                        ) : null}
                      </Pressable>
                    );
                  })}
                  {filteredBanks.length === 0 ? (
                    <View style={styles.bankPickerEmptyState}>
                      <MaterialIcons name="search-off" size={34} color="#818A91" />
                      <Text style={styles.bankPickerEmptyTitle}>Không tìm thấy ngân hàng</Text>
                      <Text style={styles.bankPickerEmptyText}>
                        Thử tìm bằng tên viết tắt hoặc mã ngân hàng.
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>
              </>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Liên kết tài khoản ngân hàng</Text>
                  <Pressable
                    onPress={() => {
                      setAddBankModalOpen(false);
                      setBankPickerOpen(false);
                    }}>
                    <MaterialIcons name="close" size={24} color="#383838" />
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Chọn ngân hàng:</Text>
                <Pressable style={styles.bankSelectButton} onPress={() => setBankPickerOpen(true)}>
                  <View style={styles.bankSelectLeft}>
                    <View style={styles.bankSelectLogoFallback}>
                      {selectedBankLogo ? (
                        <Image source={{ uri: selectedBankLogo }} style={styles.bankSelectLogo} />
                      ) : (
                        <MaterialIcons name="account-balance" size={20} color="#FF8228" />
                      )}
                    </View>
                    <View style={styles.bankSelectTextWrap}>
                      <Text style={styles.bankSelectLabel}>{selectedBankLabel}</Text>
                      <Text style={styles.bankSelectCode}>{selectedBank?.code || ''}</Text>
                    </View>
                  </View>
                  <MaterialIcons name="keyboard-arrow-down" size={24} color="#818A91" />
                </Pressable>

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Số tài khoản:</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  placeholder="Nhập số tài khoản ngân hàng..."
                  placeholderTextColor="#9A9A9A"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                />

                <Text style={styles.fieldLabel}>Tên chủ tài khoản:</Text>
                <TextInput
                  style={styles.modalInput}
                  autoCapitalize="characters"
                  placeholder="Ví dụ: NGUYEN VAN A"
                  placeholderTextColor="#9A9A9A"
                  value={accountHolder}
                  onChangeText={setAccountHolder}
                />

                <Pressable
                  style={[
                    styles.modalSubmitBtn,
                    (!accountNumber.trim() || !accountHolder.trim() || addBankMutation.isPending) &&
                      styles.modalSubmitBtnDisabled,
                  ]}
                  onPress={() =>
                    addBankMutation.mutate({
                      bankName: getBankDisplayName(selectedBank),
                      bankCode: selectedBank.code,
                      accountNumber,
                      accountHolderName: accountHolder,
                    })
                  }
                  disabled={
                    !accountNumber.trim() || !accountHolder.trim() || addBankMutation.isPending
                  }>
                  {addBankMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Xác nhận liên kết</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={withdrawModalOpen} transparent animationType="fade">
        <View style={styles.centeredModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
          <View style={styles.withdrawModalContent}>
            {withdrawAccountDropdownOpen ? (
              <>
                <View style={styles.modalHeader}>
                  <Pressable
                    style={styles.modalBackButton}
                    onPress={() => setWithdrawAccountDropdownOpen(false)}>
                    <MaterialIcons name="arrow-back" size={24} color="#383838" />
                  </Pressable>
                  <Text style={styles.modalTitle}>Chọn tài khoản nhận tiền</Text>
                  <Pressable
                    onPress={() => {
                      setWithdrawModalOpen(false);
                      setWithdrawAccountDropdownOpen(false);
                    }}>
                    <MaterialIcons name="close" size={24} color="#383838" />
                  </Pressable>
                </View>

                <ScrollView
                  style={styles.payoutPickerList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator>
                  {payoutAccounts.map((acc) => {
                    const isSelected = selectedPayoutAccountId === acc.id;
                    return (
                      <Pressable
                        key={acc.id}
                        style={[
                          styles.payoutAccountOption,
                          isSelected && styles.payoutAccountOptionActive,
                        ]}
                        onPress={() => {
                          setSelectedPayoutAccountId(acc.id);
                          setWithdrawAccountDropdownOpen(false);
                        }}>
                        <MaterialIcons
                          name={isSelected ? 'check-circle' : 'account-balance'}
                          size={22}
                          color={isSelected ? '#FF8228' : '#818A91'}
                        />
                        <View style={styles.payoutAccountOptionDetails}>
                          <Text style={styles.payoutAccountOptionBank} numberOfLines={1}>
                            {acc.bankName} ({acc.bankCode})
                          </Text>
                          <Text style={styles.payoutAccountOptionNumber} numberOfLines={1}>
                            {acc.accountNumber}
                          </Text>
                          {acc.accountHolderName ? (
                            <Text style={styles.payoutAccountOptionHolder} numberOfLines={1}>
                              {acc.accountHolderName}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tạo yêu cầu rút tiền</Text>
                  <Pressable
                    onPress={() => {
                      setWithdrawModalOpen(false);
                      setWithdrawAccountDropdownOpen(false);
                    }}>
                    <MaterialIcons name="close" size={24} color="#383838" />
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Chọn Ngân hàng nhận:</Text>
                <Pressable
                  style={styles.payoutSelectButton}
                  onPress={() => setWithdrawAccountDropdownOpen(true)}>
                  <View style={styles.payoutSelectIcon}>
                    <MaterialIcons name="account-balance" size={20} color="#FF8228" />
                  </View>
                  <View style={styles.payoutSelectDetails}>
                    <Text style={styles.payoutSelectBank} numberOfLines={1}>
                      {selectedPayoutAccount?.bankName || 'Chọn tài khoản ngân hàng'}
                    </Text>
                    <Text style={styles.payoutSelectMeta} numberOfLines={1}>
                      {selectedPayoutAccount
                        ? [
                            selectedPayoutAccount.accountNumber,
                            selectedPayoutAccount.accountHolderName,
                          ]
                            .filter(Boolean)
                            .join(' - ')
                        : 'Chạm để chọn tài khoản nhận tiền'}
                    </Text>
                  </View>
                  <MaterialIcons name="keyboard-arrow-right" size={24} color="#818A91" />
                </Pressable>

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Số tiền rút (đ):</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="number-pad"
                  placeholder="Nhập số tiền rút (tối thiểu 50.000đ)..."
                  placeholderTextColor="#9A9A9A"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                />

                <Pressable
                  style={[
                    styles.modalSubmitBtn,
                    (!withdrawAmount.trim() || withdrawMutation.isPending) &&
                      styles.modalSubmitBtnDisabled,
                  ]}
                  onPress={() => {
                    const amount = Number.parseInt(withdrawAmount, 10);
                    if (Number.isNaN(amount) || amount < 50000) {
                      Alert.alert('Lỗi', 'Số tiền rút tối thiểu là 50.000đ.');
                      return;
                    }
                    withdrawMutation.mutate({ payoutAccountId: selectedPayoutAccountId, amount });
                  }}
                  disabled={
                    !selectedPayoutAccountId || !withdrawAmount.trim() || withdrawMutation.isPending
                  }>
                  {withdrawMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Yêu cầu rút tiền</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
  sectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  loadingHintRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingHintText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.95,
  },
  pendingHint: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 6,
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
    paddingBottom: 110,
    gap: 24,
  },
  scrollView: {
    flex: 1,
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
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    gap: 16,
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
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 30,
    lineHeight: 38,
    color: '#ffffff',
  },
  balanceActions: {
    alignItems: 'flex-end',
    zIndex: 1,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  withdrawBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    lineHeight: 21,
    color: '#9a4600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: '#1b1c1c',
  },
  viewAllText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#FF8228',
    flexShrink: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 8,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#82fc87',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#818A91',
  },
  statValueGreen: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: '#006e20',
  },
  statValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: '#1b1c1c',
  },
  transactionSection: {
    gap: 12,
  },
  bankAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#efedec',
  },
  bankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bankDetails: {
    flex: 1,
  },
  bankNameText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#383838',
  },
  bankNumberText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#818A91',
    marginTop: 2,
  },
  bankHolderText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginTop: 1,
  },
  bankSelectButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#ffffff',
  },
  bankSelectLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bankSelectLogoFallback: {
    width: 40,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2EA',
    overflow: 'hidden',
  },
  bankSelectLogo: {
    width: 40,
    height: 26,
    resizeMode: 'contain',
  },
  bankSelectTextWrap: {
    flex: 1,
  },
  bankSelectLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#383838',
  },
  bankSelectCode: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginTop: 2,
  },
  bankSearchBox: {
    height: 44,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankSearchInput: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
    color: '#383838',
  },
  bankPickerList: {
    maxHeight: 320,
  },
  bankPickerEmptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  bankPickerEmptyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#383838',
    textAlign: 'center',
  },
  bankPickerEmptyText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#818A91',
    textAlign: 'center',
  },
  bankPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#efedec',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  bankPickerItemActive: {
    borderColor: '#FF8228',
    backgroundColor: '#FFF2EA',
  },
  bankPickerInfo: {
    flex: 1,
  },
  bankPickerName: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#383838',
  },
  bankPickerSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#818A91',
    marginTop: 2,
  },
  bankPickerLogoFallback: {
    width: 40,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2EA',
    overflow: 'hidden',
  },
  bankPickerLogo: {
    width: 40,
    height: 26,
    resizeMode: 'contain',
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  requestRight: {
    alignItems: 'flex-end',
  },
  requestTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#1b1c1c',
  },
  requestAmount: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#BA1A1A',
  },
  requestStatusText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#818A91',
    marginTop: 2,
  },
  transactionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: '#1b1c1c',
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
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
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
    backgroundColor: '#E7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionIconDebit: {
    backgroundColor: '#eae8e7',
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
    color: '#1b1c1c',
  },
  transactionAmountCredit: {
    color: '#006e20',
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
  mutedText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    textAlign: 'center',
    paddingVertical: 10,
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  withdrawModalContent: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#f5f3f2',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalBackButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  modalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#383838',
  },
  fieldLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#818A91',
    marginBottom: 2,
  },
  payoutSelectButton: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
  },
  payoutSelectIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2EA',
  },
  payoutSelectDetails: {
    flex: 1,
  },
  payoutSelectBank: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#383838',
  },
  payoutSelectMeta: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 3,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    height: 52,
    paddingHorizontal: 14,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: '#383838',
    marginBottom: 16,
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FF8228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#efedec',
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  payoutPickerList: {
    maxHeight: 360,
  },
  payoutAccountOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  payoutAccountOptionActive: {
    borderColor: '#FF8228',
    backgroundColor: '#FFE6D5',
  },
  payoutAccountOptionDetails: {
    flex: 1,
  },
  payoutAccountOptionBank: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    color: '#383838',
  },
  payoutAccountOptionNumber: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#383838',
    marginTop: 4,
  },
  payoutAccountOptionHolder: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
    marginTop: 2,
  },
});

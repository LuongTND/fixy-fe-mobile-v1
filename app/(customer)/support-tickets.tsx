import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import { getSupportTickets, SupportStatus, SupportTicket } from '@/services/api/support';
import { formatDateTime } from '@/utils/date';
import { getCategoryLabel, getPriorityStyle, getStatusStyle } from '@/utils/support';

type FilterType = 'all' | 'active' | 'resolved';

type FAQCategory = 'all' | 'booking' | 'payment' | 'worker' | 'voucher';

interface FAQItem {
  id: string;
  category: 'booking' | 'payment' | 'worker' | 'voucher';
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'booking',
    question: 'Làm sao để hủy hoặc thay đổi giờ đặt lịch?',
    answer:
      'Bạn có thể vào tab "Đơn hàng" -> Chọn đơn đặt lịch cần thay đổi -> Chọn "Hủy lịch" hoặc "Đổi giờ hẹn".\n\n📌 Lưu ý: Bạn nên thực hiện trước ít nhất 1 giờ trước khi Kỹ thuật viên bắt đầu di chuyển để không phát sinh phụ phí.',
  },
  {
    id: 'faq-2',
    category: 'booking',
    question: 'Kỹ thuật viên đến trễ hoặc không liên lạc được thì phải làm sao?',
    answer:
      'Nếu KTV đến trễ quá 15 phút mà không thông báo, bạn có thể gọi trực tiếp cho KTV qua nút Gọi trong đơn hàng, hoặc bấm nút "Tạo khiếu nại" ngay tại trang này. Hệ thống sẽ hỗ trợ điều phối KTV khác hoặc hoàn tiền 100% cho bạn.',
  },
  {
    id: 'faq-3',
    category: 'payment',
    question: 'Quy trình hoàn tiền diễn ra như thế nào?',
    answer:
      'Khi đơn hàng bị hủy hợp lệ hoặc khiếu nại được duyệt hoàn tiền, số tiền sẽ được hoàn trả tự động vào Ví Fixy của bạn trong vòng 2 - 5 phút. Bạn có thể dùng số dư này cho lần đặt tiếp theo hoặc yêu cầu rút về tài khoản ngân hàng.',
  },
  {
    id: 'faq-4',
    category: 'payment',
    question: 'Tôi có thể thanh toán bằng những hình thức nào?',
    answer:
      'Fixy hỗ trợ 3 hình thức thanh toán linh hoạt:\n• Số dư Ví điện tử Fixy\n• Chuyển khoản quét mã QR (Cổng PayOS / VNPay)\n• Thanh toán tiền mặt trực tiếp cho Kỹ thuật viên sau khi hoàn thành dịch vụ.',
  },
  {
    id: 'faq-5',
    category: 'worker',
    question: 'Kỹ thuật viên của Fixy có đảm bảo tay nghề và an toàn không?',
    answer:
      '100% Kỹ thuật viên trên Fixy đều đã trải qua quy trình xác minh danh tính eKYC (CCCD 2 mặt + Nhận diện khuôn mặt FPT AI), kiểm tra chứng chỉ hành nghề và ký cam kết tuân thủ quy chuẩn chất lượng dịch vụ.',
  },
  {
    id: 'faq-6',
    category: 'worker',
    question: 'Tôi có phải chuẩn bị dụng cụ hoặc mỹ phẩm trước khi thợ đến không?',
    answer:
      'Kỹ thuật viên sẽ tự chuẩn bị đầy đủ các thiết bị chuyên dụng, khăn sạch vô trùng và mỹ phẩm tiêu chuẩn của gói dịch vụ. Bạn chỉ cần chuẩn bị không gian nằm/ngồi thoải mái và nguồn điện/nước cơ bản.',
  },
  {
    id: 'faq-7',
    category: 'voucher',
    question: 'Làm sao để áp dụng mã giảm giá / Voucher?',
    answer:
      'Tại bước "Xác nhận đặt lịch & Thanh toán" (Checkout), bạn nhấn vào mục "Mã giảm giá / Voucher" -> Chọn voucher phù hợp trong danh sách hoặc nhập mã code -> Bấm "Áp dụng". Tổng tiền sẽ tự động được chiết khấu.',
  },
  {
    id: 'faq-8',
    category: 'voucher',
    question: 'Chương trình giới thiệu bạn bè nhận thưởng hoạt động ra sao?',
    answer:
      'Vào mục "Tài khoản" -> Chọn "Giới thiệu bạn bè" để lấy mã giới thiệu cá nhân. Khi bạn bè nhập mã và hoàn tất đơn đầu tiên, cả bạn và người đó đều nhận ngay Voucher giảm giá 50.000 ₫!',
  },
];

export default function SupportTicketsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = React.useState<FilterType>('all');

  // FAQ Modal State
  const [faqModalOpen, setFaqModalOpen] = React.useState(false);
  const [expandedFaqId, setExpandedFaqId] = React.useState<string | null>('faq-1');
  const [faqSearch, setFaqSearch] = React.useState('');
  const [faqCategory, setFaqCategory] = React.useState<FAQCategory>('all');

  const {
    data: tickets = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<SupportTicket[]>({
    queryKey: ['supportTickets'],
    queryFn: () => getSupportTickets(),
  });

  const filteredTickets = React.useMemo(() => {
    return tickets.filter((t) => {
      if (filter === 'active') {
        return t.status === SupportStatus.Open || t.status === SupportStatus.InProgress;
      }
      if (filter === 'resolved') {
        return t.status === SupportStatus.Resolved || t.status === SupportStatus.Closed;
      }
      return true;
    });
  }, [tickets, filter]);

  const filteredFaqList = React.useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchCategory = faqCategory === 'all' || item.category === faqCategory;
      const matchSearch =
        !faqSearch.trim() ||
        item.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
        item.answer.toLowerCase().includes(faqSearch.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [faqCategory, faqSearch]);

  const handleCallHotline = () => {
    Alert.alert('Tổng đài Fixy', 'Gọi tới tổng đài hỗ trợ 1900 6868 (Cước phí 1.000đ/phút)', [
      { text: 'Gọi ngay', onPress: () => Linking.openURL('tel:19006868') },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const toggleFaqItem = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const renderHeader = () => (
    <View style={styles.listHeaderContainer}>
      {/* Quick Action Contact Cards */}
      <View style={styles.quickCardsRow}>
        <Pressable style={styles.quickCard} onPress={handleCallHotline}>
          <View style={[styles.quickIconCircle, { backgroundColor: '#E6F0EB' }]}>
            <MaterialIcons name="phone-in-talk" size={22} color="#0F382C" />
          </View>
          <Text style={styles.quickCardTitle}>Hotline 24/7</Text>
          <Text style={styles.quickCardSub}>1900 6868</Text>
        </Pressable>

        <Pressable
          style={styles.quickCard}
          onPress={() => router.push('/(customer)/create-support-ticket' as any)}>
          <View style={[styles.quickIconCircle, { backgroundColor: '#FEF3C7' }]}>
            <MaterialIcons name="rate-review" size={22} color="#D97706" />
          </View>
          <Text style={styles.quickCardTitle}>Tạo khiếu nại</Text>
          <Text style={styles.quickCardSub}>Gửi yêu cầu mới</Text>
        </Pressable>

        <Pressable style={styles.quickCard} onPress={() => setFaqModalOpen(true)}>
          <View style={[styles.quickIconCircle, { backgroundColor: '#E0F2FE' }]}>
            <MaterialIcons name="help-outline" size={22} color="#0284C7" />
          </View>
          <Text style={styles.quickCardTitle}>Hỏi đáp FAQ</Text>
          <Text style={styles.quickCardSub}>Giải đáp nhanh</Text>
        </Pressable>
      </View>

      {/* Section Title & Tabs */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Phiếu yêu cầu của bạn</Text>
        <Text style={styles.sectionSubtitle}>Theo dõi tiến độ xử lý khiếu nại & hỗ trợ</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, filter === 'all' && styles.activeTab]}
          onPress={() => setFilter('all')}>
          <Text style={[styles.tabText, filter === 'all' && styles.activeTabText]}>
            Tất cả ({tickets.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, filter === 'active' && styles.activeTab]}
          onPress={() => setFilter('active')}>
          <Text style={[styles.tabText, filter === 'active' && styles.activeTabText]}>
            Đang xử lý
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, filter === 'resolved' && styles.activeTab]}
          onPress={() => setFilter('resolved')}>
          <Text style={[styles.tabText, filter === 'resolved' && styles.activeTabText]}>
            Đã đóng
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: SupportTicket }) => {
    const priority = getPriorityStyle(item.priority);
    const status = getStatusStyle(item.status);
    const categoryLabel = getCategoryLabel(item.category);

    return (
      <Pressable
        style={styles.ticketCard}
        onPress={() => router.push(`/support-ticket-detail?id=${item.id}` as any)}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>{status.text}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: priority.bg }]}>
              <Text style={[styles.badgeText, { color: priority.color }]}>{priority.text}</Text>
            </View>
          </View>
          <Text style={styles.cardDate}>{formatDateTime(item.createdDate)}</Text>
        </View>

        <Text style={styles.cardSubject} numberOfLines={1}>
          {item.subject}
        </Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.categoryInfo}>
            <MaterialIcons name="label-outline" size={16} color="#818A91" />
            <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>
          {item.bookingId && (
            <View style={styles.bookingLink}>
              <MaterialIcons name="link" size={16} color="#0F382C" />
              <Text style={styles.bookingLinkText}>Liên kết đơn</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <MaterialIcons name="support-agent" size={24} color="#0F382C" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Trung Tâm Hỗ Trợ</Text>
            <Text style={styles.headerSubtitle}>Chúng tôi sẵn sàng trợ giúp bạn</Text>
          </View>
        </View>

        <Pressable
          style={styles.createTicketBtn}
          onPress={() => router.push('/(customer)/create-support-ticket' as any)}>
          <MaterialIcons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.createTicketBtnText}>Gửi yêu cầu</Text>
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F382C" />
          <Text style={styles.loadingText}>Đang tải dữ liệu hỗ trợ...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#0F382C']}
              tintColor="#0F382C"
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="mark-chat-read" size={48} color="#818A91" />
              </View>
              <Text style={styles.emptyTitle}>Không có yêu cầu nào</Text>
              <Text style={styles.emptySubtitle}>
                Bạn hiện không có khiếu nại hay sự cố nào cần xử lý.
              </Text>
              <Pressable
                style={styles.emptyCta}
                onPress={() => router.push('/(customer)/create-support-ticket' as any)}>
                <Text style={styles.emptyCtaText}>Tạo yêu cầu hỗ trợ mới</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* FAQ MODAL WITH ACCORDION DROPDOWN */}
      <Modal
        visible={faqModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFaqModalOpen(false)}>
        <View style={[styles.faqModalContainer, { paddingTop: Math.max(insets.top, 16) }]}>
          {/* Modal Top Header */}
          <View style={styles.faqModalHeader}>
            <View style={styles.faqModalHeaderLeft}>
              <View style={styles.faqHeaderIcon}>
                <MaterialIcons name="help" size={22} color="#0F382C" />
              </View>
              <View>
                <Text style={styles.faqModalTitle}>Câu Hỏi Thường Gặp</Text>
                <Text style={styles.faqModalSubtitle}>Giải đáp thắc mắc nhanh & chính sách Fixy</Text>
              </View>
            </View>
            <Pressable style={styles.faqCloseBtn} onPress={() => setFaqModalOpen(false)}>
              <MaterialIcons name="close" size={22} color="#4B5563" />
            </Pressable>
          </View>

          {/* Search Box */}
          <View style={styles.faqSearchBox}>
            <MaterialIcons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.faqSearchInput}
              placeholder="Tìm kiếm câu hỏi, từ khóa..."
              placeholderTextColor="#9CA3AF"
              value={faqSearch}
              onChangeText={setFaqSearch}
            />
            {faqSearch ? (
              <Pressable onPress={() => setFaqSearch('')}>
                <MaterialIcons name="cancel" size={18} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </View>

          {/* Category Chips */}
          <View style={styles.faqCategoryRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faqCategoryScroll}>
              <Pressable
                style={[styles.faqChip, faqCategory === 'all' && styles.faqChipActive]}
                onPress={() => setFaqCategory('all')}>
                <Text style={[styles.faqChipText, faqCategory === 'all' && styles.faqChipTextActive]}>
                  Tất cả
                </Text>
              </Pressable>

              <Pressable
                style={[styles.faqChip, faqCategory === 'booking' && styles.faqChipActive]}
                onPress={() => setFaqCategory('booking')}>
                <Text style={[styles.faqChipText, faqCategory === 'booking' && styles.faqChipTextActive]}>
                  Đặt lịch & Hủy
                </Text>
              </Pressable>

              <Pressable
                style={[styles.faqChip, faqCategory === 'payment' && styles.faqChipActive]}
                onPress={() => setFaqCategory('payment')}>
                <Text style={[styles.faqChipText, faqCategory === 'payment' && styles.faqChipTextActive]}>
                  Thanh toán & Hoàn tiền
                </Text>
              </Pressable>

              <Pressable
                style={[styles.faqChip, faqCategory === 'worker' && styles.faqChipActive]}
                onPress={() => setFaqCategory('worker')}>
                <Text style={[styles.faqChipText, faqCategory === 'worker' && styles.faqChipTextActive]}>
                  Kỹ thuật viên
                </Text>
              </Pressable>

              <Pressable
                style={[styles.faqChip, faqCategory === 'voucher' && styles.faqChipActive]}
                onPress={() => setFaqCategory('voucher')}>
                <Text style={[styles.faqChipText, faqCategory === 'voucher' && styles.faqChipTextActive]}>
                  Voucher & Ưu đãi
                </Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* FAQ Accordion List */}
          <ScrollView
            style={styles.faqListScroll}
            contentContainerStyle={[styles.faqListContent, { paddingBottom: insets.bottom + 30 }]}
            showsVerticalScrollIndicator={false}>
            {filteredFaqList.length === 0 ? (
              <View style={styles.faqEmptyBox}>
                <MaterialIcons name="search-off" size={48} color="#D1D5DB" />
                <Text style={styles.faqEmptyText}>Không tìm thấy câu hỏi phù hợp</Text>
              </View>
            ) : (
              filteredFaqList.map((item) => {
                const isExpanded = expandedFaqId === item.id;
                return (
                  <View key={item.id} style={[styles.accordionCard, isExpanded && styles.accordionCardExpanded]}>
                    <Pressable
                      style={styles.accordionHeader}
                      onPress={() => toggleFaqItem(item.id)}>
                      <View style={styles.accordionQuestionRow}>
                        <View style={[styles.accordionDot, isExpanded && styles.accordionDotActive]} />
                        <Text style={[styles.accordionQuestionText, isExpanded && styles.accordionQuestionTextActive]}>
                          {item.question}
                        </Text>
                      </View>
                      <View style={[styles.accordionChevronCircle, isExpanded && styles.accordionChevronCircleActive]}>
                        <MaterialIcons
                          name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                          size={20}
                          color={isExpanded ? '#FFFFFF' : '#6B7280'}
                        />
                      </View>
                    </Pressable>

                    {/* Expandable Answer Content */}
                    {isExpanded && (
                      <View style={styles.accordionBody}>
                        <View style={styles.accordionDivider} />
                        <Text style={styles.accordionAnswerText}>{item.answer}</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Need More Help Banner */}
            <View style={styles.faqBottomBanner}>
              <MaterialIcons name="headset-mic" size={28} color="#0F382C" />
              <View style={styles.faqBottomBannerTextCol}>
                <Text style={styles.faqBottomBannerTitle}>Vẫn cần thêm trợ giúp?</Text>
                <Text style={styles.faqBottomBannerSubtitle}>Đội ngũ hỗ trợ luôn sẵn sàng xử lý khiếu nại</Text>
              </View>
              <Pressable
                style={styles.faqBottomBannerBtn}
                onPress={() => {
                  setFaqModalOpen(false);
                  router.push('/(customer)/create-support-ticket' as any);
                }}>
                <Text style={styles.faqBottomBannerBtnText}>Gửi yêu cầu</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Persistent Bottom Tab Bar */}
      <BottomTabBar activeTab="support" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 10,
  },
  header: {
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#0F382C',
  },
  headerSubtitle: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  createTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F382C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createTicketBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  listHeaderContainer: {
    paddingTop: 16,
  },
  quickCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickCardTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
  },
  quickCardSub: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
  },
  sectionSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#0F382C',
  },
  tabText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
  },
  cardDate: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#9CA3AF',
  },
  cardSubject: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    paddingTop: 10,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#6B7280',
  },
  bookingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingLinkText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#0F382C',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  emptyCta: {
    backgroundColor: '#0F382C',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  // FAQ Modal Styles
  faqModalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  faqModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faqHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqModalTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    color: '#0F382C',
  },
  faqModalSubtitle: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  faqCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  faqSearchInput: {
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#111827',
  },
  faqCategoryRow: {
    paddingVertical: 6,
  },
  faqCategoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  faqChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqChipActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  faqChipText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#4B5563',
  },
  faqChipTextActive: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#FFFFFF',
  },
  faqListScroll: {
    flex: 1,
  },
  faqListContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  faqEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  faqEmptyText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
  },
  accordionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  accordionCardExpanded: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 10,
  },
  accordionQuestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 10,
  },
  accordionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginTop: 6,
  },
  accordionDotActive: {
    backgroundColor: '#0F382C',
  },
  accordionQuestionText: {
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 18,
  },
  accordionQuestionTextActive: {
    color: '#0F382C',
    fontFamily: 'Montserrat_700Bold',
  },
  accordionChevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionChevronCircleActive: {
    backgroundColor: '#0F382C',
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  accordionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
  },
  accordionAnswerText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  faqBottomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0EB',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    gap: 12,
  },
  faqBottomBannerTextCol: {
    flex: 1,
  },
  faqBottomBannerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#0F382C',
  },
  faqBottomBannerSubtitle: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#4B5563',
    marginTop: 1,
  },
  faqBottomBannerBtn: {
    backgroundColor: '#0F382C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  faqBottomBannerBtnText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
});

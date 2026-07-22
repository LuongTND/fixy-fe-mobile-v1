import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getSupportTicket,
  getSupportTicketMessages,
  sendSupportTicketMessage,
  SupportStatus,
  SupportTicket,
  SupportMessage,
} from '@/services/api/support';
import { formatDateTime, formatTime } from '@/utils/date';
import { getCategoryLabel, getPriorityStyle, getStatusStyle } from '@/utils/support';

export default function SupportTicketDetailScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [messageText, setMessageText] = React.useState('');
  const flatListRef = React.useRef<FlatList>(null);

  const scrollToLatestMessage = React.useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  // Queries
  const { data: ticket, isLoading: isTicketLoading } = useQuery<SupportTicket>({
    queryKey: ['supportTicket', id],
    queryFn: () => getSupportTicket(id),
    enabled: !!id,
  });

  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    refetch: refetchMessages,
    isRefetching: isRefetchingMessages,
  } = useQuery<SupportMessage[]>({
    queryKey: ['supportTicketMessages', id],
    queryFn: () => getSupportTicketMessages(id),
    enabled: !!id,
  });

  const messages = React.useMemo(() => {
    const rawMessages =
      messagesData && messagesData.length > 0 ? messagesData : (ticket?.messages ?? []);
    return [...rawMessages].sort(
      (a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
    );
  }, [messagesData, ticket?.messages]);

  // Mutation to Send Message
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => sendSupportTicketMessage(id, { content }),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['supportTicketMessages', id] });
      queryClient.invalidateQueries({ queryKey: ['supportTicket', id] });
      setTimeout(() => {
        scrollToLatestMessage();
      }, 300);
    },
  });

  const handleSend = () => {
    if (!messageText.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  const isClosedOrResolved =
    ticket?.status === SupportStatus.Resolved || ticket?.status === SupportStatus.Closed;

  const priorityStyle = getPriorityStyle(ticket?.priority);
  const statusStyle = getStatusStyle(ticket?.status);

  React.useEffect(() => {
    if (isClosedOrResolved) return;

    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardShowSubscription = Keyboard.addListener(keyboardShowEvent, () => {
      setTimeout(() => {
        scrollToLatestMessage();
      }, 120);
    });

    return () => keyboardShowSubscription.remove();
  }, [isClosedOrResolved, scrollToLatestMessage]);

  if (isTicketLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#FF8228" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.centerContent}>
        <MaterialIcons name="error-outline" size={48} color="#ba1a1a" />
        <Text style={styles.errorText}>Không tìm thấy yêu cầu hỗ trợ.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  // Render header details as flatlist header component
  const renderHeader = () => (
    <View style={styles.detailsCard}>
      <View style={styles.detailsRow}>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.color }]}>{statusStyle.text}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
            <Text style={[styles.badgeText, { color: priorityStyle.color }]}>
              {priorityStyle.text}
            </Text>
          </View>
        </View>
        <Text style={styles.dateText}>{formatDateTime(ticket.createdDate)}</Text>
      </View>

      <Text style={styles.subjectText}>{ticket.subject}</Text>
      <Text style={styles.categoryLabelText}>
        Loại vấn đề:{' '}
        <Text style={styles.categoryValueText}>{getCategoryLabel(ticket.category)}</Text>
      </Text>

      <View style={styles.divider} />

      <Text style={styles.descriptionTitle}>Chi tiết sự cố:</Text>
      <Text style={styles.descriptionText}>{ticket.description}</Text>

      {ticket.bookingId && (
        <Pressable
          style={styles.bookingLinkCard}
          onPress={() => router.push(`/booking-detail?id=${ticket.bookingId}` as any)}>
          <MaterialIcons name="assignment" size={20} color="#01677d" />
          <Text style={styles.bookingLinkText}>Xem chi tiết đơn đặt chỗ liên kết</Text>
          <MaterialIcons name="chevron-right" size={20} color="#818a91" />
        </Pressable>
      )}

      <Text style={styles.messagesSectionTitle}>Trao đổi với hỗ trợ viên</Text>
    </View>
  );

  const renderMessageItem = ({ item }: { item: SupportMessage }) => {
    // If message is sent by system/admin (or isAdmin flag is set)
    const isAdmin = item.isAdmin || item.senderRole?.toUpperCase() === 'ADMIN';
    return (
      <View
        style={[
          styles.messageBubbleContainer,
          isAdmin ? styles.adminBubbleContainer : styles.userBubbleContainer,
        ]}>
        {!isAdmin &&
          (ticket.reporterAvatarUrl ? (
            <Image source={{ uri: ticket.reporterAvatarUrl }} style={styles.senderAvatarImage} />
          ) : (
            <View style={styles.senderAvatarMuted}>
              <MaterialIcons name="person" size={16} color="#818A91" />
            </View>
          ))}
        {isAdmin && (
          <View style={styles.senderAvatarAdmin}>
            <MaterialIcons name="support-agent" size={16} color="#ffffff" />
          </View>
        )}
        <View style={[styles.messageBubble, isAdmin ? styles.adminBubble : styles.userBubble]}>
          <Text style={[styles.messageText, isAdmin ? styles.adminText : styles.userText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTimeText, isAdmin ? styles.adminTime : styles.userTime]}>
            {formatTime(item.createdDate)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1b1c1c" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Yêu cầu #{ticket.id.substring(0, 8)}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages list with ticket info as header */}
      <FlatList
        ref={flatListRef}
        style={styles.chatList}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        ListHeaderComponent={renderHeader}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingMessages}
            onRefresh={refetchMessages}
            colors={['#FF8228']}
          />
        }
        contentContainerStyle={[
          styles.chatListContent,
          { paddingBottom: isClosedOrResolved ? Math.max(insets.bottom, 16) + 16 : 12 },
        ]}
        ListEmptyComponent={
          !isMessagesLoading ? (
            <View style={styles.emptyMessagesContainer}>
              <Text style={styles.emptyMessagesText}>Chưa có tin nhắn trao đổi.</Text>
            </View>
          ) : null
        }
        onContentSizeChange={() => scrollToLatestMessage(false)}
        onLayout={() => scrollToLatestMessage(false)}
      />

      {/* Message Input Box */}
      {!isClosedOrResolved ? (
        <View style={[styles.inputBox, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.chatInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Nhập nội dung phản hồi..."
            placeholderTextColor="#818A91"
            multiline
            onFocus={() => scrollToLatestMessage()}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!messageText.trim() || sendMessageMutation.isPending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || sendMessageMutation.isPending}>
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <MaterialIcons name="send" size={20} color="#ffffff" />
            )}
          </Pressable>
        </View>
      ) : (
        <View style={[styles.closedBox, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <MaterialIcons name="lock-outline" size={18} color="#818a91" />
          <Text style={styles.closedBoxText}>Yêu cầu này đã được đóng hoặc giải quyết.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F8',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    color: '#574237',
    marginTop: 12,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#FF8228',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  header: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#DDDDDD',
    zIndex: 10,
  },
  headerButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
    textAlign: 'center',
  },
  chatListContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  chatList: {
    flex: 1,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 11,
  },
  dateText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#818A91',
  },
  subjectText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
    marginBottom: 8,
  },
  categoryLabelText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
  },
  categoryValueText: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#383838',
  },
  divider: {
    height: 1,
    backgroundColor: '#efedec',
    marginVertical: 14,
  },
  descriptionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#383838',
    marginBottom: 6,
  },
  descriptionText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#574237',
    lineHeight: 20,
    marginBottom: 16,
  },
  bookingLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f8fc',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginTop: 8,
  },
  bookingLinkText: {
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#01677d',
  },
  messagesSectionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: '#1b1c1c',
    marginTop: 20,
    marginBottom: 4,
  },
  emptyMessagesContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyMessagesText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
    maxWidth: '85%',
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  adminBubbleContainer: {
    alignSelf: 'flex-start',
  },
  senderAvatarMuted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE6D5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  senderAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: 8,
  },
  senderAvatarAdmin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#01677d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#FF8228',
    borderBottomRightRadius: 2,
  },
  adminBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 19,
  },
  userText: {
    color: '#ffffff',
  },
  adminText: {
    color: '#1b1c1c',
  },
  messageTimeText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  adminTime: {
    color: '#818A91',
  },
  inputBox: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#DDDDDD',
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#FBF9F8',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#1b1c1c',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF8228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#818A91',
    opacity: 0.5,
  },
  closedBox: {
    flexDirection: 'row',
    backgroundColor: '#F5F3F2',
    borderTopWidth: 1,
    borderColor: '#DDDDDD',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  closedBoxText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#818a91',
  },
});

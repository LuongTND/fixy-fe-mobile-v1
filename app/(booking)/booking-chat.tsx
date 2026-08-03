import { MaterialIcons } from '@expo/vector-icons';
import { HubConnectionBuilder, LogLevel, HubConnection } from '@microsoft/signalr';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Booking,
  BookingChatMessage,
  BookingStatus,
  getBookingChatMessages,
  getBookingDetails,
  getMyBookings,
  getWorkerBookings,
  markBookingChatRead,
  normalizeChatMessage,
  sendBookingChatMessage,
} from '@/services/api/bookings';
import { getApiErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/store/store';
import { formatTime } from '@/utils/date';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

type ChatMessage = BookingChatMessage & { status?: 'sending' | 'sent' | 'failed' };

export default function BookingChatScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const flatListRef = React.useRef<FlatList>(null);

  const [activeBookingId, setActiveBookingId] = React.useState<string | null>(bookingId || null);
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isConnected, setIsConnected] = React.useState(false);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const [inputPanelHeight, setInputPanelHeight] = React.useState(72);

  const accessToken = useAuthStore((state) => state.accessToken);
  const chatHubUrl = Constants.expoConfig?.extra?.chatHubUrl;

  const currentBookingId = bookingId || activeBookingId;

  const scrollToLatestMessage = React.useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const getEstimatedKeyboardHeight = React.useCallback(() => {
    return Math.min(380, Math.max(300, windowHeight * 0.42));
  }, [windowHeight]);

  const normalizeKeyboardHeight = React.useCallback(
    (height?: number, screenY?: number) => {
      const rawHeight =
        typeof screenY === 'number' && screenY > 0 ? windowHeight - screenY : (height ?? 0);
      const maxKeyboardHeight = Math.min(420, windowHeight * 0.55);
      return Math.max(0, Math.min(rawHeight, maxKeyboardHeight));
    },
    [windowHeight]
  );

  const handleInputFocus = React.useCallback(() => {
    if (Platform.OS === 'ios') {
      setKeyboardHeight((currentHeight) => {
        if (currentHeight > 0) return currentHeight;
        return normalizeKeyboardHeight(Keyboard.metrics()?.height) || getEstimatedKeyboardHeight();
      });
    }
    scrollToLatestMessage();
  }, [getEstimatedKeyboardHeight, normalizeKeyboardHeight, scrollToLatestMessage]);

  React.useEffect(() => {
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const keyboardShowSubscription = Keyboard.addListener(keyboardShowEvent, (event) => {
      setKeyboardHeight(
        normalizeKeyboardHeight(event.endCoordinates.height, event.endCoordinates.screenY)
      );
      setTimeout(() => {
        scrollToLatestMessage();
      }, 120);
    });
    const keyboardHideSubscription = Keyboard.addListener(keyboardHideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardShowSubscription.remove();
      keyboardHideSubscription.remove();
    };
  }, [normalizeKeyboardHeight, scrollToLatestMessage]);

  React.useEffect(() => {
    setTimeout(() => {
      scrollToLatestMessage(false);
    }, 60);
  }, [inputPanelHeight, keyboardHeight, scrollToLatestMessage]);

  // Extract current user ID from JWT
  const currentUserId = React.useMemo(() => {
    if (!accessToken) return null;
    const payload = parseJwt(accessToken);
    return (
      payload?.sub ||
      payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      payload?.nameid ||
      payload?.id ||
      null
    );
  }, [accessToken]);

  // Load static info & history
  React.useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      try {
        let targetId = bookingId || activeBookingId;

        // Auto discover active booking if bookingId param is missing
        if (!targetId) {
          try {
            const customerBookings = await getMyBookings();
            const activeCustomer =
              customerBookings.find(
                (b) =>
                  Number(b.status) >= BookingStatus.Pending &&
                  Number(b.status) <= BookingStatus.PendingPayment
              ) || customerBookings[0];

            if (activeCustomer) {
              targetId = activeCustomer.id;
            } else {
              const workerBookings = await getWorkerBookings();
              const activeWorker =
                workerBookings.find(
                  (b) =>
                    Number(b.status) >= BookingStatus.Pending &&
                    Number(b.status) <= BookingStatus.PendingPayment
                ) || workerBookings[0];
              if (activeWorker) {
                targetId = activeWorker.id;
              }
            }
          } catch (e) {
            console.warn('[chat] Auto-discover booking error:', e);
          }
        }

        if (!targetId) {
          if (isMounted) {
            setActiveBookingId(null);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setActiveBookingId(targetId);
        }

        const [details, history] = await Promise.all([
          getBookingDetails(targetId),
          getBookingChatMessages(targetId),
        ]);

        if (isMounted) {
          setBooking(details);
          setMessages(history);
        }

        await markBookingChatRead(targetId).catch(() => {});
      } catch (err) {
        console.warn('Error loading initial chat data:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  // SignalR Hub Connection Setup
  React.useEffect(() => {
    if (!currentBookingId || !chatHubUrl || !accessToken) return;

    let connection: HubConnection | null = null;

    async function startSignalR() {
      // Check if token is expired
      const jwt = parseJwt(accessToken || '');
      const isExpired = jwt?.exp ? Date.now() >= (jwt.exp * 1000 - 10000) : false; // 10s buffer
      if (isExpired) {
        console.log('[chat] Token is expired or expiring soon. Waiting for refresh via initial load...');
        return;
      }

      try {
        connection = new HubConnectionBuilder()
          .withUrl(`${chatHubUrl}?bookingId=${currentBookingId}`, {
            accessTokenFactory: () => accessToken || '',
          })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Information)
          .build();

        // Listeners for message reception
        const handleNewMessage = (msg: any) => {
          const normalized = normalizeChatMessage(msg);
          if (
            normalized &&
            normalized.bookingId?.toLowerCase() === currentBookingId?.toLowerCase()
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id?.toLowerCase() === normalized.id?.toLowerCase()))
                return prev;

              const isMe = normalized.senderId?.toLowerCase() === currentUserId?.toLowerCase();
              if (isMe) {
                const isImage = normalized.type === 1 || !!normalized.mediaUrl;
                if (isImage) {
                  const optIndex = prev.findIndex(
                    (m: any) => m.status === 'sending' && (m.type === 1 || !!m.mediaUrl)
                  );
                  if (optIndex !== -1) {
                    const next = [...prev];
                    next[optIndex] = { ...normalized, status: 'sent' };
                    return next;
                  }
                } else {
                  const optIndex = prev.findIndex(
                    (m: any) => m.status === 'sending' && m.content === normalized.content
                  );
                  if (optIndex !== -1) {
                    const next = [...prev];
                    next[optIndex] = { ...normalized, status: 'sent' };
                    return next;
                  }
                }
              }

              return [...prev, normalized];
            });
            scrollToLatestMessage();
            markBookingChatRead(currentBookingId!).catch(() => {});
          }
        };

        connection.on('ReceiveMessage', handleNewMessage);
        connection.on('ReceiveChatMessage', handleNewMessage);

        await connection.start();
        setIsConnected(true);
        await connection.invoke('JoinChatGroup', currentBookingId);
      } catch (err: any) {
        console.error('SignalR start failed:', err);
        if (err?.message?.includes('401') || String(err).includes('401')) {
          console.log('[chat] SignalR 401 detected. Triggering token refresh...');
          getBookingDetails(currentBookingId!).catch(() => {});
        }
      }
    }

    startSignalR();

    return () => {
      const activeConn = connection;
      if (activeConn) {
        activeConn
          .invoke('LeaveChatGroup', currentBookingId)
          .then(() => activeConn.stop())
          .catch((err) => {
            console.warn('Error during SignalR cleanup:', err);
            activeConn.stop().catch(() => {});
          });
      }
      setIsConnected(false);
    };
  }, [currentBookingId, chatHubUrl, accessToken, scrollToLatestMessage, currentUserId]);

  // Partner display name and details
  const partnerInfo = React.useMemo(() => {
    if (!booking) return { name: 'Kỹ thuật viên', phone: '', avatar: null };

    const isWorker =
      (booking.worker?.id && currentUserId?.toLowerCase() === booking.worker.id.toLowerCase()) ||
      (booking.workerId && currentUserId?.toLowerCase() === booking.workerId.toLowerCase()) ||
      (booking.workerProfileId && currentUserId?.toLowerCase() === booking.workerProfileId.toLowerCase());

    if (!isWorker) {
      return {
        name: booking.worker?.fullName || booking.workerName || 'Kỹ thuật viên',
        phone: booking.worker?.phone || booking.workerPhone || '',
        avatar: booking.worker?.avatarUrl || booking.workerAvatarUrl || null,
      };
    } else {
      return {
        name: booking.customerName || 'Khách hàng',
        phone: booking.customerPhone || '',
        avatar: booking.customerAvatarUrl || null,
      };
    }
  }, [booking, currentUserId]);

  const sendTextMessage = async (text: string) => {
    if (!currentBookingId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      bookingId: currentBookingId,
      senderId: currentUserId || '',
      senderName: 'Me',
      type: 0,
      content: text,
      createdDate: new Date().toISOString(),
      isRead: false,
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToLatestMessage();

    try {
      const sentMsg = await sendBookingChatMessage(currentBookingId, {
        type: 0,
        content: text,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...sentMsg, status: 'sent' } : m))
      );
    } catch (err) {
      console.warn('Failed to send text message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    }
  };

  const sendImageMessage = async (localUri: string, fileObj: any) => {
    if (!currentBookingId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      bookingId: currentBookingId,
      senderId: currentUserId || '',
      senderName: 'Me',
      type: 1,
      content: '',
      mediaUrl: localUri,
      createdDate: new Date().toISOString(),
      isRead: false,
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToLatestMessage();

    try {
      const sentMsg = await sendBookingChatMessage(currentBookingId, {
        type: 1,
        file: fileObj,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...sentMsg, status: 'sent' } : m))
      );
    } catch (err) {
      console.warn('Failed to send image message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    }
  };
  const handleRetry = async (failedMsg: ChatMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== failedMsg.id));

    if (failedMsg.type === 1 && failedMsg.mediaUrl) {
      const localUri = failedMsg.mediaUrl;
      const filename = localUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      const fileObj = {
        uri: localUri,
        name: filename,
        type,
      };
      await sendImageMessage(localUri, fileObj);
    } else if (failedMsg.content) {
      await sendTextMessage(failedMsg.content);
    }
  };

  const handleSendText = async () => {
    const text = inputText.trim();
    if (!text || !currentBookingId) return;

    setInputText('');
    await sendTextMessage(text);
  };

  const handleSendImage = async () => {
    if (!currentBookingId) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const localUri = result.assets[0].uri;
      const filename = localUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const fileObj = {
        uri: localUri,
        name: filename,
        type,
      };

      await sendImageMessage(localUri, fileObj);
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    }
  };

  const handleCall = () => {
    if (partnerInfo.phone) {
      Linking.openURL(`tel:${partnerInfo.phone}`).catch(() => {
        Alert.alert('Lỗi', 'Không thể khởi chạy ứng dụng gọi điện.');
      });
    } else {
      Alert.alert('Thông tin cuộc gọi', 'Số điện thoại của đối phương chưa được cập nhật.');
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId?.toLowerCase() === currentUserId?.toLowerCase();
    const isImage = item.type === 1 || !!item.mediaUrl;
    const status = item.status;

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
        {!isMe && (
          <View style={styles.partnerAvatarContainer}>
            {partnerInfo.avatar ? (
              <Image source={{ uri: partnerInfo.avatar }} style={styles.partnerAvatar} />
            ) : (
              <View style={styles.partnerAvatarPlaceholder}>
                <MaterialIcons name="person" size={18} color="#818A91" />
              </View>
            )}
          </View>
        )}

        <View
          style={[
            styles.bubbleWrapper,
            isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft,
          ]}>
          <View style={styles.bubbleRow}>
            {isMe && status === 'failed' && (
              <Pressable style={styles.retryButton} onPress={() => handleRetry(item)}>
                <MaterialIcons name="error-outline" size={18} color="#BA1A1A" />
                <Text style={styles.retryText}>Thử lại</Text>
              </Pressable>
            )}
            {isMe && status === 'sending' && (
              <ActivityIndicator size="small" color="#0F382C" style={styles.sendingSpinner} />
            )}

            <View
              style={[
                styles.bubble,
                isMe ? styles.bubbleRight : styles.bubbleLeft,
                isImage && styles.bubbleImageFrame,
                isMe && status === 'failed' && styles.bubbleRightFailed,
                status === 'sending' && styles.bubbleSending,
              ]}>
              {isImage ? (
                <Pressable onPress={() => setPreviewImage(item.mediaUrl || null)} disabled={status === 'sending'}>
                  <Image
                    source={{ uri: item.mediaUrl }}
                    style={styles.messageImage}
                    resizeMode="cover"
                  />
                </Pressable>
              ) : (
                <Text
                  style={[
                    styles.messageText,
                    isMe ? styles.messageTextRight : styles.messageTextLeft,
                    isMe && status === 'failed' && styles.messageTextRightFailed,
                  ]}>
                  {item.content}
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.timestampText}>{formatTime(item.createdDate)}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0F382C" />
        <Text style={styles.loadingText}>Đang kết nối hội thoại...</Text>
      </View>
    );
  }

  if (!currentBookingId && !isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#0F382C" />
          </Pressable>
          <Text style={styles.headerTitle}>Hội thoại</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialIcons name="chat-bubble-outline" size={56} color="#818A91" />
          <Text style={{ fontFamily: 'Montserrat_700Bold', fontSize: 16, color: '#1C2526', marginTop: 12 }}>
            Chưa có cuộc trò chuyện nào
          </Text>
          <Text style={{ fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#818A91', textAlign: 'center', marginHorizontal: 32, marginTop: 6, lineHeight: 18 }}>
            Bạn chưa có đơn dịch vụ nào cần trao đổi. Hãy đặt lịch dịch vụ để trò chuyện trực tiếp với KTV!
          </Text>
          <Pressable
            style={{
              backgroundColor: '#0F382C',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              marginTop: 20,
            }}
            onPress={() => router.replace('/home' as any)}>
            <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#ffffff', fontSize: 14 }}>
              Trở về Trang chủ
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#1b1c1c" />
        </Pressable>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {partnerInfo.name}
          </Text>
          <View style={styles.statusRowHeader}>
            <View style={[styles.statusDot, isConnected && styles.statusDotActive]} />
            <Text style={styles.statusTextHeader}>
              {isConnected ? 'Trực tuyến' : 'Đang kết nối...'}
            </Text>
          </View>
        </View>

        <Pressable style={styles.headerBtn} onPress={handleCall}>
          <MaterialIcons name="phone" size={22} color="#0F382C" />
        </Pressable>
      </View>

      {/* Messages */}
      <View style={styles.chatArea}>
        <FlatList
          ref={flatListRef}
          style={styles.chatList}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: inputPanelHeight + keyboardHeight + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToLatestMessage(false)}
          onLayout={() => scrollToLatestMessage(false)}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="forum" size={48} color="#DDDDDD" />
              <Text style={styles.emptyText}>Chưa có tin nhắn nào. Bắt đầu trò chuyện ngay!</Text>
            </View>
          }
        />
      </View>

      {/* Input panel */}
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={styles.inputDock}>
        <View
          style={[styles.inputPanel, { paddingBottom: Math.max(insets.bottom, 12) }]}
          onLayout={(event) => {
            setInputPanelHeight(event.nativeEvent.layout.height);
          }}>
          <Pressable style={styles.attachBtn} onPress={handleSendImage}>
            <MaterialIcons name="image" size={24} color="#0F382C" />
          </Pressable>

          <TextInput
            style={styles.textInput}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#9A9A9A"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            onFocus={handleInputFocus}
          />

          <Pressable
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendText}
            disabled={!inputText.trim()}>
            <MaterialIcons name="send" size={20} color="#ffffff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.previewOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPreviewImage(null)} />
          <Pressable style={styles.closePreviewBtn} onPress={() => setPreviewImage(null)}>
            <MaterialIcons name="close" size={28} color="#ffffff" />
          </Pressable>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FBF9F5',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBF9F5',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 14,
    color: '#818A91',
  },
  header: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
    elevation: 2,
    shadowColor: '#0F382C',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#0F382C',
  },
  statusRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#818A91',
  },
  statusDotActive: {
    backgroundColor: '#059669',
  },
  statusTextHeader: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#818A91',
  },
  chatArea: {
    flex: 1,
  },
  chatList: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
    gap: 8,
  },
  messageRowRight: {
    alignSelf: 'flex-end',
  },
  partnerAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  partnerAvatar: {
    width: '100%',
    height: '100%',
  },
  partnerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F4F1EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleWrapper: {
    flexDirection: 'column',
    gap: 4,
  },
  bubbleWrapperLeft: {
    alignItems: 'flex-start',
  },
  bubbleWrapperRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0F382C',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleLeft: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  bubbleRight: {
    backgroundColor: '#0F382C',
    borderBottomRightRadius: 2,
  },
  bubbleImageFrame: {
    padding: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: '#1C2526',
  },
  messageTextRight: {
    color: '#ffffff',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#EFECE6',
  },
  timestampText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 10,
    color: '#818A91',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#818A91',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  inputDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
    justifyContent: 'flex-end',
  },
  inputPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#EFECE6',
    gap: 12,
  },
  attachBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F4F1EA',
    borderWidth: 1,
    borderColor: '#EFECE6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: '#1C2526',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#EAE5E3',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePreviewBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendingSpinner: {
    marginRight: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEAEA',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 4,
  },
  retryText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#BA1A1A',
  },
  bubbleRightFailed: {
    backgroundColor: '#FFE5E5',
    borderWidth: 1,
    borderColor: '#BA1A1A',
  },
  messageTextRightFailed: {
    color: '#BA1A1A',
  },
  bubbleSending: {
    opacity: 0.7,
  },
});

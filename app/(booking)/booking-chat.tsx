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
  getBookingChatMessages,
  getBookingDetails,
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

export default function BookingChatScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const flatListRef = React.useRef<FlatList>(null);

  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [messages, setMessages] = React.useState<BookingChatMessage[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const [inputPanelHeight, setInputPanelHeight] = React.useState(72);

  const accessToken = useAuthStore((state) => state.accessToken);
  const chatHubUrl = Constants.expoConfig?.extra?.chatHubUrl;

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
    if (!bookingId) return;

    async function loadInitialData() {
      try {
        const [details, history] = await Promise.all([
          getBookingDetails(bookingId!),
          getBookingChatMessages(bookingId!),
        ]);
        setBooking(details);
        setMessages(history);
        await markBookingChatRead(bookingId!);
      } catch (err) {
        console.warn('Error loading initial chat data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, [bookingId]);

  // SignalR Hub Connection Setup
  React.useEffect(() => {
    if (!bookingId || !chatHubUrl || !accessToken) return;

    let connection: HubConnection | null = null;

    async function startSignalR() {
      try {
        connection = new HubConnectionBuilder()
          .withUrl(`${chatHubUrl}?bookingId=${bookingId}`, {
            accessTokenFactory: () => accessToken || '',
          })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Information)
          .build();

        // Listeners for message reception
        const handleNewMessage = (msg: any) => {
          const normalized = normalizeChatMessage(msg);
          if (normalized && normalized.bookingId?.toLowerCase() === bookingId?.toLowerCase()) {
            setMessages((prev) => {
              if (prev.some((m) => m.id?.toLowerCase() === normalized.id?.toLowerCase()))
                return prev;
              return [...prev, normalized];
            });
            scrollToLatestMessage();
            // Mark read when receiving message if screen is active
            markBookingChatRead(bookingId!).catch(() => {});
          }
        };

        connection.on('ReceiveMessage', handleNewMessage);
        connection.on('ReceiveChatMessage', handleNewMessage);

        await connection.start();
        setIsConnected(true);
        await connection.invoke('JoinChatGroup', bookingId);
      } catch (err) {
        console.error('SignalR start failed:', err);
      }
    }

    startSignalR();

    return () => {
      const activeConnection = connection;
      if (activeConnection) {
        activeConnection
          .invoke('LeaveChatGroup', bookingId)
          .then(() => activeConnection.stop())
          .catch((err) => {
            console.warn('Error during SignalR cleanup:', err);
            activeConnection.stop().catch(() => {});
          });
      }
      setIsConnected(false);
    };
  }, [bookingId, chatHubUrl, accessToken, scrollToLatestMessage]);

  // Partner display name and details
  const partnerInfo = React.useMemo(() => {
    if (!booking) return { name: 'Kỹ thuật viên', phone: '', avatar: null };

    // If current user matches customer ID, partner is worker
    const isCustomer = currentUserId === booking.worker?.id ? false : true;

    if (isCustomer) {
      return {
        name: booking.worker?.fullName || booking.workerName || 'Kỹ thuật viên',
        phone: booking.worker?.phone || booking.workerPhone || '',
        avatar: booking.worker?.avatarUrl || booking.workerAvatarUrl || null,
      };
    } else {
      return {
        name: 'Khách hàng',
        phone: booking.workerPhone || '0987654321',
        avatar: null,
      };
    }
  }, [booking, currentUserId]);

  const handleSendText = async () => {
    const text = inputText.trim();
    if (!text || !bookingId) return;

    setInputText('');
    setIsSending(true);
    try {
      const sentMsg = await sendBookingChatMessage(bookingId, {
        type: 0,
        content: text,
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendImage = async () => {
    if (!bookingId) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsSending(true);
      const localUri = result.assets[0].uri;
      const filename = localUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const fileObj = {
        uri: localUri,
        name: filename,
        type,
      };

      const sentMsg = await sendBookingChatMessage(bookingId, {
        type: 1,
        file: fileObj,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
    } catch (err) {
      Alert.alert('Lỗi', getApiErrorMessage(err));
    } finally {
      setIsSending(false);
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

  const renderMessageItem = ({ item }: { item: BookingChatMessage }) => {
    const isMe = item.senderId?.toLowerCase() === currentUserId?.toLowerCase();
    const isImage = item.type === 1 || !!item.mediaUrl;

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
          <View
            style={[
              styles.bubble,
              isMe ? styles.bubbleRight : styles.bubbleLeft,
              isImage && styles.bubbleImageFrame,
            ]}>
            {isImage ? (
              <Pressable onPress={() => setPreviewImage(item.mediaUrl || null)}>
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
                ]}>
                {item.content}
              </Text>
            )}
          </View>
          <Text style={styles.timestampText}>{formatTime(item.createdDate)}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF8228" />
        <Text style={styles.loadingText}>Đang kết nối hội thoại...</Text>
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
          <MaterialIcons name="phone" size={22} color="#FF8228" />
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
          <Pressable style={styles.attachBtn} onPress={handleSendImage} disabled={isSending}>
            <MaterialIcons name="image" size={24} color="#FF8228" />
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
            style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={handleSendText}
            disabled={!inputText.trim() || isSending}>
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <MaterialIcons name="send" size={20} color="#ffffff" />
            )}
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
    backgroundColor: '#FBF9F8',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBF9F8',
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
    borderBottomColor: '#DDDDDD',
    elevation: 2,
    shadowColor: '#000',
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
    color: '#1b1c1c',
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
    backgroundColor: '#39B54A',
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
    backgroundColor: '#FFE6D5',
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
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleLeft: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  bubbleRight: {
    backgroundColor: '#FF8228',
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
    color: '#1b1c1c',
  },
  messageTextRight: {
    color: '#ffffff',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#EAE5E3',
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
    borderTopColor: '#DDDDDD',
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
    backgroundColor: '#FBF9F8',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
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
});

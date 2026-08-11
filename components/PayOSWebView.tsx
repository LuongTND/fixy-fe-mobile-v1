import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface PayOSWebViewProps {
  visible: boolean;
  paymentUrl: string;
  onClose: () => void;
  onSuccess: (transactionId: string, params: Record<string, string>) => void;
  onError: (error: string) => void;
}

const PayOSWebView: React.FC<PayOSWebViewProps> = ({
  visible,
  paymentUrl,
  onClose,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [hasProcessed, setHasProcessed] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setLoading(true);
      setHasProcessed(false);
    }
  }, [visible]);

  const checkAndHandleCallback = (url: string): boolean => {
    if (hasProcessed) {
      return true;
    }

    // Detect PayOS return/cancel URLs
    const isReturnUrl =
      url.includes('/payment/payos-return') ||
      url.includes('/payment/payos-cancel') ||
      url.includes('fixy.vn/payment/');

    if (!isReturnUrl) {
      return false;
    }

    try {
      // Parse URL parameters
      const urlParts = url.split('?');
      const params: Record<string, string> = {};

      if (urlParts.length >= 2) {
        const queryStr = urlParts[1];
        queryStr.split('&').forEach((pair: string) => {
          const [key, val] = pair.split('=');
          if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(val || '');
          }
        });
      }

      // Mark as processed to prevent duplicate handling
      setHasProcessed(true);
      setLoading(false);

      const status = params['status'] || params['code'] || '';
      const orderCode = params['orderCode'] || '';
      const isCancelled = url.includes('payos-cancel') || status === 'CANCELLED';

      if (isCancelled) {
        onError('Giao dịch đã bị hủy bởi người dùng.');
      } else if (status === 'PAID' || status === '00' || url.includes('payos-return')) {
        // PayOS redirects to returnUrl on successful payment
        onSuccess(orderCode, params);
      } else {
        onError('Thanh toán không thành công. Vui lòng thử lại.');
      }

      // Close the WebView
      onClose();
      return true;
    } catch {
      setLoading(false);
      onError('Có lỗi xảy ra khi xử lý kết quả thanh toán.');
      onClose();
      return true;
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    checkAndHandleCallback(navState.url);
  };

  const handleClose = () => {
    Alert.alert('Hủy thanh toán', 'Bạn có chắc chắn muốn hủy thanh toán?', [
      { text: 'Tiếp tục', style: 'cancel' },
      {
        text: 'Hủy',
        style: 'destructive',
        onPress: () => {
          onError('Người dùng hủy thanh toán');
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕ Đóng</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thanh toán PayOS</Text>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F382C" />
            <Text style={styles.loadingText}>Đang tải trang thanh toán...</Text>
          </View>
        )}

        <WebView
          source={{ uri: paymentUrl }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={(request) => {
            // Intercept return/cancel URLs before WebView tries to load them
            if (checkAndHandleCallback(request.url)) {
              return false; // Prevent WebView from loading the URL
            }
            return true;
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('[PayOSWebView] error:', nativeEvent);

            // Try to intercept from the failed URL
            if (nativeEvent.url && checkAndHandleCallback(nativeEvent.url)) {
              return;
            }

            // If PayOS page itself has a connectivity issue
            const isGatewayError =
              nativeEvent.url &&
              (nativeEvent.url.includes('pay.payos.vn') ||
                nativeEvent.url.includes('payos.vn'));
            if (isGatewayError) {
              Alert.alert(
                'Sự cố kết nối PayOS',
                'Không thể kết nối đến máy chủ thanh toán PayOS. Nếu bạn đã hoàn tất thanh toán, hệ thống sẽ tự động cập nhật trạng thái qua thông báo.',
                [
                  {
                    text: 'Kiểm tra trạng thái',
                    onPress: () => {
                      onError('Sự cố kết nối PayOS. Đang kiểm tra trạng thái.');
                      onClose();
                    },
                  },
                  {
                    text: 'Thử lại',
                    style: 'cancel',
                  },
                ]
              );
              return;
            }

            onError(nativeEvent.description || 'Không thể kết nối đến máy chủ thanh toán.');
            onClose();
          }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          scalesPageToFit
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6ECF2',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#6B7A90',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F382C',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7A90',
  },
});

export default PayOSWebView;

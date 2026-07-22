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

interface VNPayWebViewProps {
  visible: boolean;
  paymentUrl: string;
  onClose: () => void;
  onSuccess: (transactionId: string, params: Record<string, string>) => void;
  onError: (error: string) => void;
}

const VNPayWebView: React.FC<VNPayWebViewProps> = ({
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

    const isCallbackUrl =
      url.includes('/payment/callback/vnpay') ||
      url.includes('/api/payment/callback/vnpay') ||
      url.includes('/payment/vnpay-return') ||
      url.includes('vnpay-return');

    const hasResponseCode = url.includes('vnp_ResponseCode');

    if (isCallbackUrl && hasResponseCode) {
      try {
        // Parse URL parameters
        const urlParts = url.split('?');
        if (urlParts.length < 2) {
          return false;
        }

        // Custom query params parsing (to handle react-native URLSearchParams support)
        const queryStr = urlParts[1];
        const params: Record<string, string> = {};
        queryStr.split('&').forEach((pair: string) => {
          const [key, val] = pair.split('=');
          if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(val || '');
          }
        });

        const responseCode = params['vnp_ResponseCode'];
        const transactionId = params['vnp_TxnRef'];

        // Mark as processed to prevent duplicate handling
        setHasProcessed(true);
        setLoading(false);

        if (responseCode === '00') {
          // Payment successful
          onSuccess(transactionId || '', params);
        } else {
          // Payment failed or cancelled
          const errorMessage = getErrorMessage(responseCode || '');
          onError(errorMessage);
        }

        // Close the WebView
        onClose();
        return true;
      } catch {
        setLoading(false);
        onError('Có lỗi xảy ra khi xử lý kết quả thanh toán');
        onClose();
        return true;
      }
    }
    return false;
  };

  const handleNavigationStateChange = (navState: any) => {
    checkAndHandleCallback(navState.url);
  };

  const getErrorMessage = (responseCode: string): string => {
    const errorMessages: { [key: string]: string } = {
      '07': 'Giao dịch đang được xử lý. Vui lòng kiểm tra lại sau.',
      '09': 'Giao dịch không thành công do thẻ/tài khoản chưa đăng ký Internet Banking.',
      '10': 'Giao dịch không thành công do xác thực thông tin thẻ/tài khoản không đúng.',
      '11': 'Giao dịch đã hết hạn thanh toán. Vui lòng thực hiện lại.',
      '12': 'Thẻ/Tài khoản bị khóa. Vui lòng liên hệ ngân hàng.',
      '13': 'Sai mật khẩu xác thực giao dịch (OTP). Vui lòng thử lại.',
      '24': 'Giao dịch bị hủy bởi người dùng.',
      '51': 'Tài khoản không đủ số dư để thực hiện giao dịch.',
      '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì. Vui lòng thử lại sau.',
      '79': 'Số tiền giao dịch không hợp lệ.',
      '99': 'Lỗi không xác định. Vui lòng thử lại sau.',
      unknown_error: 'Đã xảy ra lỗi trong quá trình thanh toán.',
    };

    return errorMessages[responseCode] || 'Giao dịch thất bại. Vui lòng thử lại.';
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
          <Text style={styles.headerTitle}>Thanh toán VNPay</Text>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF8228" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        )}

        <WebView
          source={{ uri: paymentUrl }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('[VNPayWebView] error:', nativeEvent);

            // Try to intercept from the failed URL (e.g. localhost connection failure on redirect)
            if (nativeEvent.url && checkAndHandleCallback(nativeEvent.url)) {
              return;
            }

            // If the error occurred on VNPAY's domain, show a helpful alert with a balance check option
            const isGatewayError =
              nativeEvent.url &&
              (nativeEvent.url.includes('sandbox.vnpayment.vn') ||
                nativeEvent.url.includes('vnpayment.vn'));
            if (isGatewayError) {
              Alert.alert(
                'Sự cố kết nối VNPAY',
                'Không thể kết nối đến máy chủ xác thực của VNPAY. Nếu bạn đã nhập OTP và bấm xác nhận, số dư ví của bạn có thể đã được cập nhật thành công.',
                [
                  {
                    text: 'Kiểm tra số dư',
                    onPress: () => {
                      onError('Sự cố kết nối VNPAY. Đang cập nhật số dư.');
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
    color: '#0F1D2D',
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

export default VNPayWebView;

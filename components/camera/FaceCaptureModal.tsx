import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import * as React from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Kích thước khung Oval tối ưu theo nhân trắc học tỷ lệ mặt người (1:1.32)
const OVAL_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 300);
const OVAL_HEIGHT = OVAL_WIDTH * 1.32;

interface FaceCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (photoUri: string) => void;
}

export function FaceCaptureModal({ visible, onClose, onCapture }: FaceCaptureModalProps) {
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const [facing, setFacing] = React.useState<'front' | 'back'>('front');
  const [capturedUri, setCapturedUri] = React.useState<string | null>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const cameraRef = React.useRef<CameraView | null>(null);

  // Animations: Laser Scan & Pulse Glow
  const scanAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Tip index rotator
  const [tipIndex, setTipIndex] = React.useState(0);
  const tips = [
    { icon: 'face', title: 'Căn chỉnh khuôn mặt vào giữa khung tròn', sub: 'Giữ điện thoại ngang tầm mắt, thẳng mặt' },
    { icon: 'straighten', title: 'Giữ cự ly vừa vặn', sub: 'Không đưa máy quá xa hoặc dí sát mặt' },
    { icon: 'wb-sunny', title: 'Đảm bảo đủ ánh sáng', sub: 'Tránh ngược sáng, không đeo kính râm hoặc khẩu trang' },
  ];

  const requestPermission = React.useCallback(async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (err) {
      console.warn('[FaceCaptureModal] Camera permission error:', err);
      setHasPermission(false);
    }
  }, []);

  React.useEffect(() => {
    if (visible) {
      setCapturedUri(null);
      setIsCapturing(false);
      (async () => {
        try {
          const { status } = await Camera.getCameraPermissionsAsync();
          if (status === 'granted') {
            setHasPermission(true);
          } else {
            const req = await Camera.requestCameraPermissionsAsync();
            setHasPermission(req.status === 'granted');
          }
        } catch {
          requestPermission();
        }
      })();

      // Start Laser Scan Animation
      const scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      scanLoop.start();

      // Start Pulse Glow Animation
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      // Rotate tips every 3.5s
      const tipTimer = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % tips.length);
      }, 3500);

      return () => {
        scanLoop.stop();
        pulseLoop.stop();
        clearInterval(tipTimer);
      };
    }
  }, [visible, requestPermission]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: Platform.OS === 'android',
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
      }
    } catch (err) {
      console.warn('[FaceCaptureModal] Take photo error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleConfirmPhoto = () => {
    if (capturedUri) {
      onCapture(capturedUri);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedUri(null);
  };

  if (!visible) return null;

  const laserTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, OVAL_HEIGHT - 20],
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {!hasPermission ? (
          <View style={styles.permissionContainer}>
            <View style={styles.permissionIconCircle}>
              <MaterialIcons name="camera-alt" size={48} color="#0F382C" />
            </View>
            <Text style={styles.permissionTitle}>Cần quyền truy cập Camera</Text>
            <Text style={styles.permissionDesc}>
              Ứng dụng cần quyền mở camera để chụp ảnh chân dung xác thực khuôn mặt định danh cho kỹ thuật viên.
            </Text>
            <Pressable style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Cấp quyền Camera</Text>
            </Pressable>
            <Pressable style={styles.cancelLinkBtn} onPress={onClose}>
              <Text style={styles.cancelLinkText}>Quay lại</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            {capturedUri ? (
              // PREVIEW SCREEN
              <View style={styles.previewContainer}>
                <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />

                {/* Oval Guide Overlay on Preview */}
                <View style={styles.overlayContainer} pointerEvents="none">
                  <View style={styles.maskTop} />
                  <View style={styles.maskMiddleRow}>
                    <View style={styles.maskSide} />
                    <View style={styles.ovalMaskPreview} />
                    <View style={styles.maskSide} />
                  </View>
                  <View style={styles.maskBottom} />
                </View>

                {/* Preview Header */}
                <View style={styles.topBar}>
                  <Text style={styles.topBarTitle}>Kiểm tra ảnh chân dung</Text>
                  <Pressable style={styles.closeBtn} onPress={onClose}>
                    <MaterialIcons name="close" size={24} color="#ffffff" />
                  </Pressable>
                </View>

                {/* Preview Bottom Action Buttons */}
                <View style={styles.previewBottomBar}>
                  <View style={styles.previewTipBox}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#4ADE80" />
                    <Text style={styles.previewHint}>
                      Đảm bảo khuôn mặt rõ nét, đủ ánh sáng và không bị che khuất.
                    </Text>
                  </View>
                  <View style={styles.previewBtnRow}>
                    <Pressable style={styles.retakeBtn} onPress={handleRetake}>
                      <MaterialIcons name="replay" size={20} color="#383838" />
                      <Text style={styles.retakeBtnText}>Chụp lại</Text>
                    </Pressable>

                    <Pressable style={styles.confirmBtn} onPress={handleConfirmPhoto}>
                      <MaterialIcons name="check" size={20} color="#ffffff" />
                      <Text style={styles.confirmBtnText}>Sử dụng ảnh này</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              // LIVE CAMERA SCREEN
              <View style={styles.cameraInner}>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFillObject}
                  facing={facing}
                  mirror={facing === 'front'}
                  enableTorch={false}
                />

                {/* Dark Mask with Oval Cutout */}
                <View style={styles.overlayContainer} pointerEvents="none">
                  <View style={styles.maskTop} />

                  <View style={styles.maskMiddleRow}>
                    <View style={styles.maskSide} />

                    {/* Animated Oval Target */}
                    <Animated.View
                      style={[
                        styles.ovalFrame,
                        {
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}>
                      {/* Laser Scanning Line */}
                      <Animated.View
                        style={[
                          styles.laserLine,
                          {
                            transform: [{ translateY: laserTranslateY }],
                          },
                        ]}
                      />

                      {/* Corner Target Markers */}
                      <View style={styles.cornerTopLeft} />
                      <View style={styles.cornerTopRight} />
                      <View style={styles.cornerBottomLeft} />
                      <View style={styles.cornerBottomRight} />

                      {/* Center Crosshair Tick Marks */}
                      <View style={styles.tickTop} />
                      <View style={styles.tickBottom} />
                    </Animated.View>

                    <View style={styles.maskSide} />
                  </View>

                  <View style={styles.maskBottom} />
                </View>

                {/* Top Controls Bar */}
                <View style={styles.topBar}>
                  <Pressable style={styles.closeBtn} onPress={onClose}>
                    <MaterialIcons name="close" size={24} color="#ffffff" />
                  </Pressable>
                  <View style={styles.stepBadge}>
                    <View style={styles.liveIndicatorDot} />
                    <Text style={styles.stepBadgeText}>eKYC AI Face Match</Text>
                  </View>
                  <Pressable
                    style={styles.switchCamBtn}
                    onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}>
                    <MaterialIcons name="flip-camera-ios" size={24} color="#ffffff" />
                  </Pressable>
                </View>

                {/* Dynamic Smart Guidance Banner */}
                <View style={styles.smartTipContainer}>
                  <View style={styles.smartTipCard}>
                    <MaterialIcons name={tips[tipIndex].icon as any} size={20} color="#4ADE80" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.smartTipTitle}>{tips[tipIndex].title}</Text>
                      <Text style={styles.smartTipSub}>{tips[tipIndex].sub}</Text>
                    </View>
                  </View>
                </View>

                {/* Bottom Capture Controls */}
                <View style={styles.bottomBar}>
                  <Pressable
                    style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
                    onPress={handleTakePhoto}
                    disabled={isCapturing}>
                    {isCapturing ? (
                      <ActivityIndicator size="small" color="#0F382C" />
                    ) : (
                      <View style={styles.captureBtnInner} />
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  cameraInner: {
    flex: 1,
    position: 'relative',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskTop: {
    flex: 0.85, // Tỷ lệ đặt khung oval tự nhiên ở khoảng 38% chiều cao màn hình
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  maskMiddleRow: {
    flexDirection: 'row',
    height: OVAL_HEIGHT,
    alignItems: 'center',
  },
  maskSide: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  ovalFrame: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 3,
    borderColor: '#4ADE80',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  ovalMaskPreview: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 3,
    borderColor: '#4ADE80',
    backgroundColor: 'transparent',
  },
  laserLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 3,
    backgroundColor: '#4ADE80',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    borderRadius: 2,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 25,
    left: 25,
    width: 18,
    height: 18,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#ffffff',
    borderTopLeftRadius: 6,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 25,
    right: 25,
    width: 18,
    height: 18,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#ffffff',
    borderTopRightRadius: 6,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 25,
    left: 25,
    width: 18,
    height: 18,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#ffffff',
    borderBottomLeftRadius: 6,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    width: 18,
    height: 18,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#ffffff',
    borderBottomRightRadius: 6,
  },
  tickTop: {
    position: 'absolute',
    top: 14,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 2,
  },
  tickBottom: {
    position: 'absolute',
    bottom: 14,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 2,
  },
  maskBottom: {
    flex: 1.15,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchCamBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 56, 44, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  stepBadgeText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  topBarTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  smartTipContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 68 : 78,
    left: 20,
    right: 20,
    zIndex: 20,
    alignItems: 'center',
  },
  smartTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    maxWidth: 360,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  smartTipTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  smartTipSub: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  captureBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  captureBtnDisabled: {
    opacity: 0.6,
  },
  captureBtnInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#ffffff',
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  previewBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    gap: 14,
    zIndex: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewHint: {
    flex: 1,
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#E5E7EB',
  },
  previewBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  retakeBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#383838',
  },
  confirmBtn: {
    flex: 1.4,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0F382C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#4ADE80',
  },
  confirmBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#fbf9f8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  permissionIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#1b1c1c',
    textAlign: 'center',
  },
  permissionDesc: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    height: 48,
    width: '100%',
    backgroundColor: '#0F382C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  permissionBtnText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  cancelLinkBtn: {
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#6B7280',
  },
});

import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/nativewindui/Text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 items-center justify-center bg-background p-5">
        <Text variant="largeTitle">{"Không tìm thấy trang."}</Text>

        <Link href="/" className="m-4 py-4">
          <Text>Trở về trang chủ!</Text>
        </Link>
      </View>
    </>
  );
}

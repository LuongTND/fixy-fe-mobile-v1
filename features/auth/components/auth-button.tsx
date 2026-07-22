import * as React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

export function AuthButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: AuthButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      className={
        isPrimary
          ? 'elevation-3 h-14 w-full items-center justify-center rounded-2xl bg-[#ff8228] shadow-md shadow-[#ff8228]/20 active:scale-[0.98] active:opacity-90 disabled:opacity-60'
          : 'h-14 w-full items-center justify-center rounded-2xl border-2 border-[#ff8228] bg-white active:bg-[#f5f3f2] disabled:opacity-60'
      }>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : '#FF8228'} />
      ) : (
        <Text
          style={{ fontFamily: 'Montserrat_600SemiBold' }}
          className={
            isPrimary
              ? 'text-center text-[16px] text-white'
              : 'text-center text-[16px] text-[#ff8228]'
          }>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

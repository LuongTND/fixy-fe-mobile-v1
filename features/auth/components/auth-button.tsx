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
          ? 'elevation-3 h-14 w-full items-center justify-center rounded-2xl bg-[#0F382C] shadow-md shadow-[#0F382C]/20 active:scale-[0.98] active:opacity-90 disabled:opacity-60'
          : 'h-14 w-full items-center justify-center rounded-2xl border-2 border-[#0F382C] bg-white active:bg-[#F4F1EA] disabled:opacity-60'
      }>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : '#0F382C'} />
      ) : (
        <Text
          style={{ fontFamily: 'Montserrat_700Bold' }}
          className={
            isPrimary
              ? 'text-center text-[16px] text-white'
              : 'text-center text-[16px] text-[#0F382C]'
          }>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

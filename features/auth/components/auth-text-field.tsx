import { MaterialIcons } from '@expo/vector-icons';
import * as React from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

type AuthTextFieldProps = TextInputProps & {
  icon: keyof typeof MaterialIcons.glyphMap;
  error?: string;
};

export function AuthTextField({ icon, error, secureTextEntry, ...props }: AuthTextFieldProps) {
  const [hidePassword, setHidePassword] = React.useState(true);

  const isPassword = secureTextEntry === true;

  return (
    <View style={styles.container}>
      <View
        style={{
          ...styles.field,
          ...(error ? styles.fieldError : {}),
        }}>
        <MaterialIcons name={icon} size={20} color="#0F382C" />
        <TextInput
          {...props}
          secureTextEntry={isPassword && hidePassword}
          placeholderTextColor="#818A91"
          style={styles.input}
        />
        {isPassword ? (
          <Pressable onPress={() => setHidePassword((prev) => !prev)} style={styles.eyeIcon}>
            <MaterialIcons
              name={hidePassword ? 'visibility-off' : 'visibility'}
              size={20}
              color="#818A91"
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    width: '100%',
  },
  field: {
    height: 56,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
  },
  fieldError: {
    borderColor: '#BA1A1A',
  },
  input: {
    marginLeft: 10,
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: '#1C2526',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 12,
    color: '#BA1A1A',
  },
});

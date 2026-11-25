// src/shared/components/Button.tsx
import { useAppTheme } from '@/shared/hooks';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { AppText } from './AppText';

interface BtnProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export default function Button({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  className,
  style,
  accessibilityLabel,
  accessibilityHint,
}: BtnProps) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || isLoading;

  // The name stays the same while loading, so a screen reader keeps finding
  // the same control; "busy" and "disabled" are reported as state instead.
  const resolvedAccessibilityLabel = accessibilityLabel || title;

  return (
    <Pressable
      style={[
        styles.button,
        { backgroundColor: colors.primary },
        style,
        isDisabled && styles.disabled,
      ]}
      className={className}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: isDisabled,
        busy: isLoading,
      }}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
    >
      {isLoading ? (
        // Decorative: the button itself already announces "busy".
        <ActivityIndicator
          color={colors.primaryText}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : (
        <AppText
          variant="bold"
          style={[styles.buttonText, { color: colors.primaryText }]}
        >
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'SFPRODISPLAYBOLD',
  },
});

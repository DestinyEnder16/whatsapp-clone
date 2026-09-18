import { useAppTheme } from "@/shared/hooks";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";

interface BtnProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  className,
  style,
}: BtnProps) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || isLoading;

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
    >
      {isLoading ? (
        <ActivityIndicator color={colors.primaryText} />
      ) : (
        <Text style={[styles.buttonText, { color: colors.primaryText }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: "SFPRODISPLAYBOLD",
  },
});
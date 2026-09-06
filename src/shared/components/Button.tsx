import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import colors from "../theme/colors";

interface BtnProps {
    title: string;
    onPress: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    className?: string;
}

export default function Button({
    title,
    onPress,
    isLoading = false,
    disabled = false,
    className,
}: BtnProps) {
    const isDisabled = disabled || isLoading;

    return (
        <Pressable
            style={[styles.button, isDisabled && styles.disabled]}
            className={className}
            onPress={onPress}
            disabled={isDisabled}
        >
            {isLoading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.buttonText}>{title}</Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.primary[400],
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
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
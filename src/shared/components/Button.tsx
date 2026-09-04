import { Pressable, StyleSheet, Text } from "react-native";
import colors from "../theme/colors";

interface BtnProps {
    title: string,
    onPress: () => void,

}

export default function Button({ title, onPress }: BtnProps) {
    return (
        <Pressable
            style={styles.button}
            onPress={onPress}
        >
            <Text style={styles.buttonText}>{title}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.primary[400],
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
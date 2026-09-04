import Button from "@/shared/components/Button";
import Heading from "@/shared/components/Heading";
import Screen from "@/shared/components/Screen";
import colors from "@/shared/theme/colors";
import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";

export function PhoneScreen() {
    return (
        <Screen>
            <View className="gap-y-[12px]">
                <Heading title="What's your phone number?" />
                <Text className="text-neutral-300">We will send you the verification code.</Text>
            </View>

            <View className="gap-y-[10px] my-10">
                <Text className="text-neutral-600 text-[14px] font-medium">Phone Number</Text>
                <TextInput
                    keyboardType="numeric"
                    placeholder="Phone number"
                    placeholderTextColor={colors.neutral[300]}
                    className="text-neutral-900 border border-neutral-200 rounded-lg px-5 py-5 focus:border-primary-300"
                />
            </View>

            <View className="mt-auto pb-4">
                <Button title="Next" onPress={() => router.push('/verify-otp')} />
            </View>
        </Screen>
    );
}
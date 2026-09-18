import { BackButton, Button } from "@/shared/components";
import Heading from "@/shared/components/Heading";
import Screen from "@/shared/components/Screen";
import { useAppTheme } from "@/shared/hooks";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import { useRequestOtp } from "../api/useRequestOtp";

export function PhoneScreen() {
    const { colors } = useAppTheme();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const requestOtpMutation = useRequestOtp();

    function handleSendOtp() {
        if (!phoneNumber.trim() || !phoneNumber.startsWith('+234')) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter a valid phone number starting with +234'
            });
            return;
        }

        // triggering the mutation
        requestOtpMutation.mutate(
            { phoneNumber: phoneNumber.trim() },
            {
                onSuccess: (challenge) => {
                    router.push({
                        pathname: '/verify-otp',
                        params: {
                            challengeId: challenge.challengeId,
                            phoneNumberMasked: challenge.phoneNumberMasked,
                            time: challenge.resendInSeconds.toString()
                        }
                    });
                },
                onError: (error: Error) => {
                    Alert.alert("Error", error.message);
                }
            }
        );
    }

    return (
        <Screen>
            <View className="mb-6">
                <BackButton />
            </View>

            <View className="gap-y-[12px]">
                <Heading title="What's your phone number?" />
                <Text
                    className="text-[14px] leading-5"
                    style={{ color: colors.textSecondary }}
                >
                    We will send you the verification code.
                </Text>
            </View>

            <View className="gap-y-[10px] my-10">
                <Text
                    className="text-[14px] font-semibold"
                    style={{ color: colors.text }}
                >
                    Phone Number
                </Text>
                <TextInput
                    keyboardType="phone-pad"
                    placeholder="e.g. +234..."
                    placeholderTextColor={colors.textMuted}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="rounded-2xl px-5 py-4 text-[16px] font-medium border"
                    style={{
                        backgroundColor: colors.card,
                        borderColor: isFocused ? colors.primary : colors.border,
                        color: colors.text,
                    }}
                    cursorColor={colors.primary}
                    selectionColor={colors.primaryLight}
                />
            </View>

            <View className="mt-auto pb-4">
                <Button
                    title="Continue"
                    onPress={handleSendOtp}
                    isLoading={requestOtpMutation.isPending}
                />
            </View>
        </Screen>
    );
}
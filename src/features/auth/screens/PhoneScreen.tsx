import Heading from "@/shared/components/Heading";
import Screen from "@/shared/components/Screen";
import colors from "@/shared/theme/colors";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import Toast from 'react-native-toast-message';
import { useRequestOtp } from "../api/useRequestOtp";

export function PhoneScreen() {
    const [phoneNumber, setPhoneNumber] = useState('')
    const requestOtpMutation = useRequestOtp();

    function handleSendOtp() {
        if (!phoneNumber.trim() || !phoneNumber.startsWith('+234')) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter a valid phone number starting with +234'
            })
            return;
        }

        // triggering the mutation
        requestOtpMutation.mutate(
            { phoneNumber: phoneNumber.trim() },
            {
                onSuccess: (challenge) => {
                    // challenge contains: challengeId, phoneNumberMasked, expiresInSeconds

                    // Navigate to OtpScreen, passing the challengeId and masked number


                    router.push({
                        pathname: '/verify-otp',
                        params: {
                            challengeId: challenge.challengeId,
                            phoneNumberMasked: challenge.phoneNumberMasked,
                            time: challenge.expiresInSeconds.toString()
                        }
                    })
                },
                onError: (error: Error) => {
                    Alert.alert("Error", error.message);
                }
            }
        )
    }
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
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                />
            </View>


            <View className="mt-auto pb-4">

                <Pressable

                    onPress={handleSendOtp}

                    disabled={requestOtpMutation.isPending}

                    className="bg-emerald-600 p-4 rounded-xl mt-6 items-center"

                >

                    {requestOtpMutation.isPending ? (

                        <ActivityIndicator color="#fff" />

                    ) : (

                        <Text className="text-white font-semibold text-base">Continue</Text>

                    )}

                </Pressable>
            </View>



        </Screen>
    );
}
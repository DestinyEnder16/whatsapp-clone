import { BackButton, Button } from "@/shared/components";
import Heading from "@/shared/components/Heading";
import Screen from "@/shared/components/Screen";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { OtpInput } from 'react-native-otp-entry';

export function OtpScreen() {
    const [timer, setTimer] = useState(25)


    useEffect(function () {
        const id = setInterval(function () {

            timer > 0 && setTimer(timer - 1)

        }, 1000)

        return function () {
            clearInterval(id)
        }

    }, [timer])

    return (
        <Screen>

            <View className="mb-8">

                <BackButton />

            </View>



            <Heading title="Verification Code" />
            <Text className="text-neutral-300 mt-2 text-[14px]">
                Enter the code number we sent to <Text className="text-neutral-900 font-medium">[PHONE_NUMBER]</Text>
            </Text>

            <View className="mt-[40px]">
                <OtpInput numberOfDigits={4} />
                <Text className="text-neutral-400 text-[14px] mt-6 text-center">
                    If you didn't get the code, resend it in <Text className="text-neutral-600 font-medium">{timer}</Text> seconds.
                </Text>
                {timer === 0 && <Pressable onPress={() => setTimer(25)}>

                    <Text className="text-primary-400 text-[14px] mt-6 text-center">Resend Code</Text>
                </Pressable>}
            </View>

            <View className="mt-auto pb-4">
                <Button title="Next" onPress={() => router.push('/profile')} />
            </View>
        </Screen>
    );
}
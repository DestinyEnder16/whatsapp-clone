import { useAuthStore } from "@/core/store/useAuthStore";
import { useVerifyOtp } from "@/features/auth/api/useVerifyOtp";
import { BackButton, Button } from "@/shared/components";
import Heading from "@/shared/components/Heading";
import Screen from "@/shared/components/Screen";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { OtpInput } from "react-native-otp-entry";
import Toast from "react-native-toast-message";

export function OtpScreen() {
  const { challengeId, phoneNumberMasked, time } = useLocalSearchParams();
  const [timer, setTimer] = useState(+(time as string));
  const verifyOtpMutation = useVerifyOtp();
  const [otp, setOtp] = useState("");
  const setAuth = useAuthStore((state) => state.setAuth);

  function handleOtpVerify(code: string) {
    if (code.length < 4) return;
    verifyOtpMutation.mutate(
      {
        challengeId: challengeId as string,
        code: code,
      },
      {
        onSuccess: (authData) => {
          // authData contains: { accessToken, refreshToken, user: { profileComplete, ... } }

          // Store tokens and initial user object in Zustand!

          setAuth(authData.accessToken, authData.refreshToken, authData.user);

          // If user has not finished setup -> route to profile setup
          // If user is already registered -> route to (tabs)/chats
          if (!authData.user.profileComplete) {
            router.replace("/profile");
          }
          /*
                    else {

                        router.replace('/(tabs)');

                    }


                    */
        },
        onError: (err) => {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: err.message,
          });
        },
      },
    );
  }

  useEffect(
    function () {
      const id = setInterval(function () {
        timer > 0 && setTimer(timer - 1);
      }, 1000);

      return function () {
        clearInterval(id);
      };
    },
    [timer],
  );

  return (
    <Screen>
      <View className="mb-8">
        <BackButton />
      </View>

      <Heading title="Verification Code" />
      <Text className="text-neutral-300 mt-2 text-[14px]">
        Enter the code number we sent to{" "}
        <Text className="text-neutral-900 font-medium">
          {phoneNumberMasked}
        </Text>
      </Text>

      <View className="mt-[40px]">
        <OtpInput
          numberOfDigits={4}
          onTextChange={(code) => setOtp(code)}
          placeholder="****"
          onFilled={(code) => handleOtpVerify(code)}
        />
        <Text className="text-neutral-400 text-[14px] mt-6 text-center">
          If you didn't get the code, resend it in{" "}
          <Text className="text-neutral-600 font-medium">{timer}</Text> seconds.
        </Text>
        {timer === 0 && (
          <Pressable onPress={() => setTimer(25)}>
            <Text className="text-primary-400 text-[14px] mt-6 text-center">
              Resend Code
            </Text>
          </Pressable>
        )}
      </View>

      <View className="mt-auto pb-4">
        <Button
          title="Next"
          onPress={() => handleOtpVerify(otp)}
          isLoading={verifyOtpMutation.isPending}
          disabled={otp.length < 4}
        />
      </View>
    </Screen>
  );
}

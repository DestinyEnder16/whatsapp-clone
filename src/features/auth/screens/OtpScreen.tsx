import { useAuthStore } from "@/core/store/useAuthStore";
import { useVerifyOtp } from "@/features/auth/api/useVerifyOtp";
import { BackButton, Button } from "@/shared/components";
import Heading from "@/shared/components/Heading";
import Screen from "@/shared/components/Screen";
import { useAppTheme } from "@/shared/hooks";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { OtpInput } from "react-native-otp-entry";
import Toast from "react-native-toast-message";

export function OtpScreen() {
  const { colors } = useAppTheme();
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
          setAuth(authData.accessToken, authData.refreshToken, authData.user);

          if (!authData.user.profileComplete) {
            router.replace("/profile");
          } else {
            router.replace("/(tabs)");
          }
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
      <Text
        className="mt-2 text-[14px] leading-5"
        style={{ color: colors.textSecondary }}
      >
        Enter the code number we sent to{" "}
        <Text className="font-semibold" style={{ color: colors.text }}>
          {phoneNumberMasked}
        </Text>
      </Text>

      <View className="mt-[40px]">
        <OtpInput
          numberOfDigits={4}
          onTextChange={(code) => setOtp(code)}
          placeholder="****"
          onFilled={(code) => handleOtpVerify(code)}
          theme={{
            pinCodeContainerStyle: {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: 16,
              width: 60,
              height: 64,
            },
            pinCodeTextStyle: {
              color: colors.text,
              fontSize: 22,
              fontWeight: "700",
            },
            focusedPinCodeContainerStyle: {
              borderColor: colors.primary,
              borderWidth: 2,
            },
            filledPinCodeContainerStyle: {
              borderColor: colors.primary,
            },
            placeholderTextStyle: {
              color: colors.textMuted,
            },
          }}
        />
        <Text
          className="text-[14px] mt-8 text-center"
          style={{ color: colors.textSecondary }}
        >
          If you didn't get the code, resend it in{" "}
          <Text className="font-bold" style={{ color: colors.primary }}>
            {timer}
          </Text>{" "}
          seconds.
        </Text>
        {timer === 0 && (
          <Pressable onPress={() => setTimer(25)} className="mt-4 active:opacity-75">
            <Text
              className="text-[15px] font-bold text-center"
              style={{ color: colors.primary }}
            >
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


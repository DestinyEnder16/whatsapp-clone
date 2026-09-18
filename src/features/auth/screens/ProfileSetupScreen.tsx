import { useAuthStore } from "@/core/store/useAuthStore";
import { BackButton, Button } from "@/shared/components";
import Heading from "@/shared/components/Heading";
import Screen from "@/shared/components/Screen";
import { useAppTheme } from "@/shared/hooks";
import { toast } from "@/shared/utils/toast";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useUpdateProfile } from "../api/useUpdateProfile";

export function ProfileSetupScreen() {
    const { colors } = useAppTheme();
    const [name, setName] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const setUser = useAuthStore((state) => state.setUser);
    const updateProfileMutation = useUpdateProfile();

    function handleSaveName() {
        if (!name.trim()) return;

        updateProfileMutation.mutate(
            { displayName: name.trim() },
            {
                onSuccess: (updatedUser) => {
                    setUser(updatedUser);

                    toast.success(
                        "Profile Created",
                        `Welcome, ${updatedUser.displayName || name.trim()}!`
                    );

                    router.push("/upload-photo");
                },
                onError: (err: Error) => {
                    toast.error("Error", err.message);
                },
            }
        );
    }

    return (
        <Screen>
            <View className="mb-8">
                <BackButton />
            </View>

            <View className="gap-y-[12px]">
                <Heading title="What's your name?" />
                <Text
                    className="text-[14px] leading-5"
                    style={{ color: colors.textSecondary }}
                >
                    Write your name. You can change it back in settings.
                </Text>
            </View>

            <View className="mt-8">
                <Text
                    className="text-[14px] font-semibold mb-2.5"
                    style={{ color: colors.text }}
                >
                    Name
                </Text>

                <View
                    className="flex-row items-center px-4 h-[56px] rounded-2xl border"
                    style={{
                        backgroundColor: colors.card,
                        borderColor:
                            isFocused || name.length > 0
                                ? colors.primary
                                : colors.border,
                    }}
                >
                    <Image
                        source={require("@/assets/icons/solid/user.svg")}
                        style={{ width: 20, height: 20 }}
                        contentFit="contain"
                        tintColor={
                            isFocused || name.length > 0
                                ? colors.primary
                                : colors.textMuted
                        }
                    />
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Name"
                        placeholderTextColor={colors.textMuted}
                        className="flex-1 ml-3 text-[16px] font-medium h-full"
                        style={{ color: colors.text }}
                        cursorColor={colors.primary}
                        selectionColor={colors.primaryLight}
                        autoCapitalize="words"
                        autoCorrect={false}
                    />
                </View>
            </View>

            <View className="mt-auto pb-4">
                <Button
                    title="Next"
                    onPress={handleSaveName}
                    isLoading={updateProfileMutation.isPending}
                    disabled={!name.trim() || updateProfileMutation.isPending}
                />
            </View>
        </Screen>
    );
}



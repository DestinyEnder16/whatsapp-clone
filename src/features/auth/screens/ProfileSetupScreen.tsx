import { useAuthStore } from "@/core/store/useAuthStore";
import { BackButton, Button } from "@/shared/components";
import Heading from "@/shared/components/Heading";
import Screen from "@/shared/components/Screen";
import colors from "@/shared/theme/colors";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { toast } from "@/shared/utils/toast";
import { useUpdateProfile } from "../api/useUpdateProfile";

export function ProfileSetupScreen() {
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
                    // Update user in Zustand global store
                    setUser(updatedUser);

                    toast.success(
                        "Profile Created",
                        `Welcome, ${updatedUser.displayName || name.trim()}!`
                    );

                    // Navigate to profile photo upload
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
                <Text className="text-neutral-300 text-[14px]">
                    Write your name. You can change it back in settings.
                </Text>
            </View>

            <View className="mt-8">
                <Text className="text-neutral-600 text-[14px] font-medium mb-2.5">
                    Name
                </Text>

                <View
                    className={`flex-row items-center px-4 h-[56px] rounded-2xl border ${isFocused || name.length > 0
                        ? "border-primary-400 bg-primary-50/20"
                        : "border-neutral-100 bg-white"
                        }`}
                >
                    <Image
                        source={require("@/assets/icons/solid/user.svg")}
                        style={{ width: 20, height: 20 }}
                        contentFit="contain"
                        tintColor={
                            isFocused || name.length > 0
                                ? colors.primary[400]
                                : colors.neutral[300]
                        }
                    />
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Name"
                        placeholderTextColor={colors.neutral[300]}
                        className="flex-1 ml-3 text-[16px] text-neutral-900 font-medium h-full"
                        cursorColor={colors.primary[400]}
                        selectionColor={colors.primary[200]}
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


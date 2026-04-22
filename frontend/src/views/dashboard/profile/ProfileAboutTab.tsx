"use client";

import { Chip, Button } from "@heroui/react";
import { User, Code2, PenLine } from "lucide-react";
import type { Profile } from "@/shared/api/endpoints/profile";

type Props = {
    profile: Profile | null;
    role: string | null;
    isEditing: boolean;
    onStartEdit: () => void;
};

export const ProfileAboutTab = ({ profile, role, isEditing, onStartEdit }: Props) => {
    return (
        <div className="mt-4 space-y-6">
            {/* Bio */}
            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                            <User size={18} />
                        </div>
                        <h3 className="text-lg font-semibold text-white">О себе</h3>
                    </div>
                </div>
                {profile?.bio ? (
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                ) : (
                    <div className="py-6 text-center border border-dashed border-zinc-800 rounded-xl">
                        <PenLine size={24} className="mx-auto mb-2 text-zinc-600" />
                        <p className="text-sm text-zinc-500">Напишите пару слов о себе, чтобы выделиться</p>
                        {!isEditing && (
                            <Button size="sm" variant="flat" className="mt-3 bg-purple-500/10 text-purple-400" onPress={onStartEdit}>
                                Добавить описание
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Skills (freelancer) */}
            {role === "freelancer" && (
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <Code2 size={18} />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Навыки и технологии</h3>
                        </div>
                    </div>
                    {profile?.skills && profile.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {profile.skills.map((s) => (
                                <Chip
                                    key={s}
                                    size="sm"
                                    variant="flat"
                                    classNames={{
                                        base: "bg-purple-500/10 border border-purple-500/20",
                                        content: "text-purple-300 text-xs font-medium",
                                    }}
                                >
                                    {s}
                                </Chip>
                            ))}
                        </div>
                    ) : (
                        <div className="py-6 text-center border border-dashed border-zinc-800 rounded-xl">
                            <Code2 size={24} className="mx-auto mb-2 text-zinc-600" />
                            <p className="text-sm text-zinc-500">Добавьте навыки, чтобы заказчики находили вас быстрее</p>
                            {!isEditing && (
                                <Button size="sm" variant="flat" className="mt-3 bg-purple-500/10 text-purple-400" onPress={onStartEdit}>
                                    Указать навыки
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

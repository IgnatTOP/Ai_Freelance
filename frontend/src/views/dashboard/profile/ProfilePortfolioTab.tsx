"use client";

import { Card, CardBody, Button } from "@heroui/react";
import { Briefcase, ExternalLink, FileText, Plus } from "lucide-react";
import type { PortfolioItem } from "@/shared/api/endpoints/profile";

type Props = {
    portfolio: PortfolioItem[];
    onStartEdit: () => void;
};

export const ProfilePortfolioTab = ({ portfolio, onStartEdit }: Props) => {
    if (!portfolio || portfolio.length === 0) {
        return (
            <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl mt-4">
                <FileText size={28} className="mx-auto mb-3 text-zinc-600" />
                <p className="text-sm text-zinc-500 mb-1">Портфолио пока пусто</p>
                <p className="text-xs text-zinc-600">Добавьте примеры работ, чтобы заказчики оценили ваш уровень</p>
                <Button size="sm" variant="flat" className="mt-3 bg-purple-500/10 text-purple-400" onPress={onStartEdit}>
                    Добавить работу
                </Button>
            </div>
        );
    }

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                        <Briefcase size={18} />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Портфолио</h3>
                </div>
                <Button size="sm" variant="flat" className="bg-purple-500/10 text-purple-400" startContent={<Plus size={14} />}>
                    Добавить
                </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {portfolio.map((item) => (
                    <Card key={item.id} className="glass-card hover:border-purple-500/20 transition-colors">
                        <CardBody className="p-4">
                            <h4 className="text-sm font-medium text-zinc-200 mb-1">{item.title}</h4>
                            <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{item.description}</p>
                            {item.link && (
                                <a href={item.link} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                    <ExternalLink size={12} /> Открыть проект
                                </a>
                            )}
                        </CardBody>
                    </Card>
                ))}
            </div>
        </div>
    );
};

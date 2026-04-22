import { ReactNode } from "react";

interface PageHeaderProps {
    readonly title: string;
    readonly description?: string;
    readonly action?: ReactNode;
}

export const PageHeader = ({ title, description, action }: PageHeaderProps) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-1">{title}</h1>
                {description && (
                    <p className="text-sm text-zinc-400">{description}</p>
                )}
            </div>
            {action && (
                <div className="shrink-0">
                    {action}
                </div>
            )}
        </div>
    );
};

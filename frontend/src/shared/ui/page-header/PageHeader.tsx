import { ReactNode } from "react";

interface PageHeaderProps {
    readonly title: string;
    readonly description?: string;
    readonly action?: ReactNode;
}

export const PageHeader = ({ title, description, action }: PageHeaderProps) => {
    return (
        <div className="filka-page-header">
            <div>
                <h1 className="t-h2 m-0">{title}</h1>
                {description && (
                    <p className="t-body-sm mt-2 max-w-2xl text-[var(--fg-1)]">{description}</p>
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

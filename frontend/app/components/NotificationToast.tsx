import { AlertCircle, CheckCircle, X } from "lucide-react";
import { type FC } from "react";

export interface NotificationToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export const NotificationToast: FC<NotificationToastProps> = ({
  message,
  type,
  onClose,
}) => {
  const bgColor = type === "success" ? "bg-green-50" : "bg-red-50";
  const borderColor = type === "success" ? "border-green-200" : "border-red-200";
  const iconColor = type === "success" ? "text-green-600" : "text-red-600";
  const textColor = type === "success" ? "text-green-900" : "text-red-900";
  const Icon = type === "success" ? CheckCircle : AlertCircle;

  return (
    <div
      className={`fixed top-4 right-4 flex items-center gap-3 px-4 py-3 rounded-lg border ${bgColor} ${borderColor} shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <Icon size={20} className={iconColor} />
      <span className={`text-sm font-medium ${textColor}`}>{message}</span>
      <button
        onClick={onClose}
        className={`ml-2 p-1 hover:bg-white/50 rounded transition-colors ${textColor}`}
      >
        <X size={16} />
      </button>
    </div>
  );
};

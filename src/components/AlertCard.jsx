import { AlertTriangle, Info, CheckCircle } from "lucide-react";

const icons = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const colors = {
  warning: "border-l-yellow-500 bg-yellow-50",
  info: "border-l-blue-500 bg-blue-50",
  success: "border-l-green-500 bg-green-50",
};

const iconColors = {
  warning: "text-yellow-600",
  info: "text-blue-600",
  success: "text-green-600",
};

export default function AlertCard({ type = "info", title, message }) {
  const Icon = icons[type];
  return (
    <div className={`border-l-4 rounded-r-lg p-4 ${colors[type]}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColors[type]}`} />
        <div>
          <p className="font-semibold text-sm text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
        </div>
      </div>
    </div>
  );
}
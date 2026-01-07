import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info';
    confirmLabel?: string;
    cancelLabel?: string;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    variant = 'danger',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar'
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-gray-900 border-gray-800">
                <CardHeader>
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-300 mb-6">{message}</p>
                    <div className="flex justify-end space-x-3">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                        >
                            {cancelLabel}
                        </Button>
                        <Button
                            onClick={onConfirm}
                            variant={variant === 'danger' ? 'danger' : 'primary'}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

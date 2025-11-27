import { Injectable, signal } from '@angular/core';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
    id: string;
    type: AlertType;
    message: string;
    title?: string;
    duration?: number; // in milliseconds, 0 = no auto-dismiss
}

@Injectable({
    providedIn: 'root'
})
export class AlertService {
    alerts = signal<Alert[]>([]);
    private alertIdCounter = 0;

    show(message: string, type: AlertType = 'info', title?: string, duration: number = 5000) {
        const alert: Alert = {
            id: `alert-${++this.alertIdCounter}`,
            type,
            message,
            title,
            duration
        };

        this.alerts.update(alerts => [...alerts, alert]);

        // Auto-dismiss if duration is set
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(alert.id);
            }, duration);
        }

        return alert.id;
    }

    success(message: string, title: string = 'Success', duration: number = 5000) {
        return this.show(message, 'success', title, duration);
    }

    error(message: string, title: string = 'Error', duration: number = 5000) {
        return this.show(message, 'error', title, duration);
    }

    warning(message: string, title: string = 'Warning', duration: number = 5000) {
        return this.show(message, 'warning', title, duration);
    }

    info(message: string, title: string = 'Info', duration: number = 5000) {
        return this.show(message, 'info', title, duration);
    }

    dismiss(alertId: string) {
        this.alerts.update(alerts => alerts.filter(a => a.id !== alertId));
    }

    dismissAll() {
        this.alerts.set([]);
    }
}

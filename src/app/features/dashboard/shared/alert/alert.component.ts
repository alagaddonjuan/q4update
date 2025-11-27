import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AlertService } from '../../../../core/services/alert.service';

@Component({
    selector: 'app-alert',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './alert.component.html',
    styleUrl: './alert.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent {
    alertService = inject(AlertService);
    alerts = this.alertService.alerts;

    dismiss(alertId: string) {
        this.alertService.dismiss(alertId);
    }

    getIcon(type: string): string {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'info':
                return 'ℹ';
            default:
                return '●';
        }
    }
}

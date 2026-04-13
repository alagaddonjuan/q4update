import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationService } from '../../../core/services/pagination.service';
import { AdminApi, } from '../../../core/services/admin-api';
import { AlertService } from '../../../core/services/alert.service';
import { ClientsResponse } from '../../../core/models/api.model';

/**
 * Example table component demonstrating pagination service usage
 * This can be adapted for any table in the dashboard
 */
@Component({
    selector: 'app-paginated-table-example',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="paginated-table-container">
      <!-- Header with controls -->
      <div class="table-header">
        <div class="controls">
          <!-- Search/Filter -->
          <input 
            type="text" 
            placeholder="Search..." 
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch()">
          
          <!-- Page size selector -->
          <select (change)="onPageSizeChange($event)" [value]="pagination.pageSize()">
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading()" class="loading">
        Loading data...
      </div>

      <!-- Table -->
      <div *ngIf="!loading()" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th (click)="onSort('name')" class="sortable">
                Name
                <span *ngIf="pagination.sortBy() === 'name'" class="sort-indicator">
                  {{ pagination.sortOrder() === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th (click)="onSort('email')" class="sortable">
                Email
                <span *ngIf="pagination.sortBy() === 'email'" class="sort-indicator">
                  {{ pagination.sortOrder() === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th>Status</th>
              <th (click)="onSort('created_at')" class="sortable">
                Created
                <span *ngIf="pagination.sortBy() === 'created_at'" class="sort-indicator">
                  {{ pagination.sortOrder() === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of items()">
              <td>{{ item.name }}</td>
              <td>{{ item.email }}</td>
              <td>
                <span [class]="'status-badge status-' + item.status.toLowerCase()">
                  {{ item.status }}
                </span>
              </td>
              <td>{{ item.created_at | date: 'short' }}</td>
            </tr>
            <tr *ngIf="items().length === 0" class="empty-state">
              <td [attr.colspan]="4">No data available</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination controls -->
      <div *ngIf="!loading()" class="pagination-section">
        <div class="pagination-info">
          Showing {{ pagination.getStartIndex() }} to {{ pagination.getEndIndex() }}
          of {{ pagination.totalItems() }} items
        </div>

        <div class="pagination-controls">
          <button 
            class="btn btn-pagination"
            [disabled]="pagination.isFirstPage()" 
            (click)="pagination.previousPage(); loadData()">
            ← Previous
          </button>

          <div class="page-numbers">
            <button 
              *ngFor="let page of pagination.getPageNumbers(7)"
              [class.active]="page === pagination.currentPage()"
              class="btn btn-page-number"
              (click)="pagination.goToPage(page); loadData()">
              {{ page }}
            </button>
          </div>

          <button 
            class="btn btn-pagination"
            [disabled]="pagination.isLastPage()" 
            (click)="pagination.nextPage(); loadData()">
            Next →
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .paginated-table-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    input[type="text"],
    select {
      padding: 8px 12px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 14px;
    }

    input[type="text"]:focus,
    select:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .loading {
      text-align: center;
      padding: 32px;
      color: #666;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table thead {
      background-color: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
    }

    .data-table th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
    }

    .data-table th.sortable {
      cursor: pointer;
      user-select: none;
      transition: background-color 0.2s;
    }

    .data-table th.sortable:hover {
      background-color: #f3f4f6;
    }

    .sort-indicator {
      margin-left: 4px;
      font-size: 12px;
    }

    .data-table tbody tr {
      border-bottom: 1px solid #e5e7eb;
      transition: background-color 0.2s;
    }

    .data-table tbody tr:hover {
      background-color: #f9fafb;
    }

    .data-table td {
      padding: 12px;
      color: #374151;
    }

    .empty-state {
      text-align: center;
      color: #9ca3af;
      font-style: italic;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-active {
      background-color: #dcfce7;
      color: #166534;
    }

    .status-inactive {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .status-pending {
      background-color: #fef3c7;
      color: #92400e;
    }

    .pagination-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
    }

    .pagination-info {
      font-size: 14px;
      color: #6b7280;
    }

    .pagination-controls {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn {
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      background-color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn:hover:not(:disabled) {
      background-color: #f3f4f6;
      border-color: #9ca3af;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-pagination {
      padding: 8px 16px;
      font-weight: 500;
    }

    .btn-page-number {
      min-width: 36px;
      text-align: center;
    }

    .btn-page-number.active {
      background-color: #2563eb;
      color: white;
      border-color: #2563eb;
    }

    .page-numbers {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      justify-content: center;
    }
  `]
})
export class PaginatedTableExampleComponent implements OnInit {
    items = signal<ClientsResponse[]>([]);
    loading = signal(false);
    searchQuery = '';

    constructor(
        public pagination: PaginationService,
        private adminApi: AdminApi,
        private alertService: AlertService,
    ) { }

    ngOnInit() {
        // Initialize pagination with custom settings
        this.pagination.initialize({
            pageSize: 25,
            initialPage: 1,
            sortBy: 'name',
            sortOrder: 'asc'
        });

        this.loadData();
    }

    loadData() {
        this.loading.set(true);

        const params = {
            ...this.pagination.getPaginationParams(),
            ...(this.searchQuery && { search: this.searchQuery })
        };

        this.adminApi.getClients().subscribe({
            next: (response: any) => {
                this.items.set(response.data);

                // Update pagination state from API response
                if (response.pagination) {
                    this.pagination.updateFromResponse(response.pagination);
                }

                this.loading.set(false);
            },
            error: (error) => {
                this.loading.set(false);
                this.alertService.error('Failed to load data: ' + error.message);
            }
        });
    }

    onSort(column: string) {
        this.pagination.toggleSortOrder(column);
        this.loadData();
    }

    onSearch() {
        this.pagination.goToPage(1); // Reset to first page on search
        this.loadData();
    }

    onPageSizeChange(event: Event) {
        const pageSize = parseInt((event.target as HTMLSelectElement).value, 10);
        this.pagination.setPageSize(pageSize);
        this.loadData();
    }
}

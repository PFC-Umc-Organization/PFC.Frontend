import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Announcement } from '../../../core/models';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { loadable } from '../../../core/state/loadable';

const RECENT = 3;

// Componente
@Component({
  selector: 'app-announcements-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink],
  templateUrl: './announcements-board.component.html',
  styleUrl: './announcements-board.component.scss',
})
export class AnnouncementsBoardComponent {
  private readonly announcementService = inject(AnnouncementService);

  private readonly list = loadable({ source: () => this.announcementService.list(), initial: [] as Announcement[] });
  readonly recent = computed(() => this.list.value().slice(0, RECENT));
  readonly more = computed(() => Math.max(this.list.value().length - RECENT, 0));
}

import type { ContentCalendar } from '../types';
import { mockOrganicStrategy } from './organicStrategy';

export const mockCalendar: ContentCalendar = {
  month: 'May',
  year: 2026,
  items: mockOrganicStrategy.content_items,
};

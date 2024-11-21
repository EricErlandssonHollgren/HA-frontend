import { fireEvent } from "../../common/dom/fire_event";
import type { Calendar, CalendarEvent } from "../../data/calendar";

export interface CalendarTemplateCreateDialogParams {
  events: CalendarEvent[];
  calendars: Calendar[];
  calendarId?: string;
  canDelete?: boolean;
  canEdit?: boolean;
  updated: () => void;
  color?: string;
}

export const loadCalendarTemplateCreateDialog = () =>
  import("./ha-template-calendar");

export const showCalendarTemplateCreateDialog = (
  element: HTMLElement,
  detailParams: CalendarTemplateCreateDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-template-calendar",
    dialogImport: loadCalendarTemplateCreateDialog,
    dialogParams: detailParams,
  });
};

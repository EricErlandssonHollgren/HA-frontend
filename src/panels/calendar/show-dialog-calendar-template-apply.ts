import { fireEvent } from "../../common/dom/fire_event";
import type { Calendar } from "../../data/calendar";

export interface CalendarTemplateApplyDialogParams {
  calendars: Calendar[];
  onSave: (
    selectedCalendars: string[],
    templateName: string,
    week: number,
    rrule?: string
  ) => void;
}

export const loadCalendarTemplateApplyDialog = () =>
  import("./dialog-calendar-template-apply");

export const showCalendarTemplateApplyDialog = (
  element: HTMLElement,
  detailParams: CalendarTemplateApplyDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-calendar-template-apply",
    dialogImport: loadCalendarTemplateApplyDialog,
    dialogParams: detailParams,
  });
};

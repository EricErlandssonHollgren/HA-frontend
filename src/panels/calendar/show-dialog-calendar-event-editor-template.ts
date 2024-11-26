import { fireEvent } from "../../common/dom/fire_event";
import type { CalendarTemplateViewEventItem } from "../../data/calendar";

export interface CalendarEventEditTemplateDialogParams {
  //   calendarId?: string;
  selectedDate?: Date; // When provided is used as the pre-filled date for the event creation dialog
  entry?: CalendarTemplateViewEventItem;
  canDelete?: boolean;
  updated: (events: CalendarTemplateViewEventItem[]) => void;
  day: string;
}

export const loadCalendarEventEditTemplateDialog = () =>
  // console.log("Loading dialog-calendar-template-event...");
  import("./dialog-calendar-template-event-editor");

export const showCalendarEventEditTemplateDialog = (
  element: HTMLElement,
  detailParams: CalendarEventEditTemplateDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-calendar-template-event-editor",
    dialogImport: loadCalendarEventEditTemplateDialog,
    dialogParams: detailParams,
  });
};

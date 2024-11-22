import { fireEvent } from "../../common/dom/fire_event";
import type { CalendarEventData, CalendarTemplateViewEventItem } from "../../data/calendar";

export interface CalendarEventEditTemplateDialogParams {
//   calendarId?: string;
  selectedDate?: Date; // When provided is used as the pre-filled date for the event creation dialog
  entry?: CalendarEventData;
  canDelete?: boolean;
  updated: (events: CalendarTemplateViewEventItem[]) => void;
  day: string;
}

export const loadCalendarEventEditTemplateDialog = () => {
  console.log("Loading dialog-calendar-template-create...");
  return import("./dialog-calendar-template-create");
};


export const showCalendarEventEditTemplateDialog = (
  element: HTMLElement,
  detailParams: CalendarEventEditTemplateDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-calendar-template-create",
    dialogImport: loadCalendarEventEditTemplateDialog,
    dialogParams: detailParams,
  });
};

import { fireEvent } from "../../common/dom/fire_event";
import type { Calendar, CalendarEvent } from "../../data/calendar";

/**
 * This module provides functionality to display a dialog for creating a calendar template.
 * The interface defines the parameters required to open the create template dialog.
 * It used fireEvent to pass the required parameters and handle what dialog to show.
 */

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
  import("./dialog-calendar-template-create");

export const showCalendarTemplateCreateDialog = (
  element: HTMLElement,
  detailParams: CalendarTemplateCreateDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-calendar-template-create",
    dialogImport: loadCalendarTemplateCreateDialog,
    dialogParams: detailParams,
  });
};

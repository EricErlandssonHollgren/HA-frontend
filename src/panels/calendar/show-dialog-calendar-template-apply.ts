import { fireEvent } from "../../common/dom/fire_event";
import type { Calendar } from "../../data/calendar";

/**
 * This module provides functionality to display a dialog for applying a calendar template.
 *
 * It includes the parameters needed to properly display the template. It also includes a callback-function "onSave"
 * that handles the information about the saved template.
 *
 * Also included is the fireEvent utility functionality which dynamically switches between currently active modals.
 *
 */

export interface CalendarTemplateApplyDialogParams {
  calendars: Calendar[];
  onSave: (
    selectedCalendars: string[],
    templateName: string,
    week: number,
    year: number,
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

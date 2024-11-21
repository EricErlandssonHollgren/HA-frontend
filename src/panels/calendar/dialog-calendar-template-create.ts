import "@material/mwc-button";

import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
import type { CalendarTemplateCreateDialogParams } from "./show-dialog-calendar-template-create";
import { fireEvent, type HASSDomEvent } from "../../common/dom/fire_event";
import "../../components/entity/state-info";
import "../../components/ha-alert";
import "../../components/ha-date-input";
import "../../components/ha-time-input";
import { haStyleDialog } from "../../resources/styles";
import type { CalendarViewChanged, HomeAssistant } from "../../types";
import "../lovelace/components/hui-generic-entity-row";
import { createCloseHeading } from "../../components/ha-dialog";
import "./ha-template-calendar";
import type { CalendarEventMutableParams, CalendarTemplateEvents } from "../../data/calendar";

class DialogCalendarTemplateCreate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CalendarTemplateCreateDialogParams;

  @state() private _isModalOpen = false; // To track if the modal is open

  @state() private _modalDay: string | null = null; // To track the day being edited

  @state() private _modalInterval = ""; // Temporary input for the time interval

  @state() private _modalSummary = ""; // Temporary input for the summary

  @state() private _selectedWeek: number | null = null; // Stores selected week

  @state() private _weekDays: { label: string; date: string }[] = []; // Dynamically calculated days for the selected week

  @state()private _modalStartTime: string = ''; 

  @state()private _modalEndTime: string = '';


  // @state() private _calendarId?: string;

  @state() private _calendarEvents: CalendarTemplateEvents = {template_events:[]};

  private _saveModalData(): void {
    const summary = (this.shadowRoot!.querySelector("#summary") as HTMLInputElement).value;
    const startTime = (this.shadowRoot!.querySelector("#start-time") as HTMLInputElement).value;
    const endTime = (this.shadowRoot!.querySelector("#end-time") as HTMLInputElement).value;
    const rrule = (this.shadowRoot!.querySelector("#rrule") as HTMLInputElement).value;
    const description = (this.shadowRoot!.querySelector("#description") as HTMLTextAreaElement).value;
  
    if (!startTime || !endTime) {
      alert("Please enter a valid start and end time.");
      return;
    }
  
    if (!this._selectedWeek || !this._modalDay) {
      alert("Please select a week and day.");
      return;
    }
  
    // Automatically calculate the date for the selected week and day
    const selectedDate = this._calculateDateFromWeekAndDay(this._selectedWeek, this._modalDay);
    if (!selectedDate) {
      alert("Error calculating the selected date.");
      return;
    }
  
    // Combine date and time for dtstart and dtend
    const dtstart = `${selectedDate}T${startTime}`;
    const dtend = `${selectedDate}T${endTime}`;
  
    // Validate inputs and save event
    if (summary && dtstart && dtend) {
      this._calendarEvents.template_events = [
        ...this._calendarEvents.template_events,
        {
          summary,
          dtstart,
          dtend,
          rrule: rrule || undefined,
          description: description || undefined,
        },
      ];
  
      console.log("Event saved:", {
        summary,
        dtstart,
        dtend,
        rrule: rrule || "none",
        description: description || "none",
      });

      console.log("Updated _calendarEvents state:", this._calendarEvents);
  
      // Close modal and reset
      this._isModalOpen = false;
      this._modalDay = null;
      this.requestUpdate(); // Trigger re-render
    } else {
      alert("Please fill in the required fields (Summary, Start Time, and End Time).");
    }
  }
  
  /**
   * Helper method to calculate the date based on the selected week and day.
   * @param weekNumber - The selected ISO week number (e.g., 47).
   * @param dayLabel - The day label (e.g., "MON", "TUE").
   * @returns A string date in the format "YYYY-MM-DD".
   */
  private _calculateDateFromWeekAndDay(weekNumber: number, dayLabel: string): string | null {
    const dayOffsets = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
  
    // Ensure the day label is valid
    const dayOffset = dayOffsets[dayLabel.toUpperCase()];
    if (dayOffset === undefined) {
      console.error("Invalid day label:", dayLabel);
      return null;
    }
  
    // Get the first day of the year
    const year = new Date().getFullYear();
    const jan4 = new Date(year, 0, 4); // Jan 4 is always in Week 1 of ISO week date
    const firstWeekMonday = new Date(jan4.getTime() - ((jan4.getDay() || 7) - 1) * 86400000);
  
    // Calculate the start of the selected week (Monday)
    const weekStart = new Date(firstWeekMonday.getTime() + (weekNumber - 1) * 7 * 86400000);
  
    // Add the day offset to get the selected date
    const selectedDate = new Date(weekStart.getTime() + dayOffset * 86400000);
  
    // Format the date as "YYYY-MM-DD"
    return selectedDate.toISOString().split("T")[0];
  }
  

private _openModal(day: string): void {
  this._modalDay = day; // Set the day
  this._isModalOpen = true; // Open the modal
  console.log("Modal opened for day:", this._modalDay); // Debug log


  // Get the date for the selected day (e.g., Thursday)
  const selectedDay = this._weekDays.find(d => d.label.toLowerCase() === day);

  if (selectedDay) {
      const selectedDate = new Date(selectedDay.date);
      const formattedDate = selectedDate.toISOString().split("T")[0]; // YYYY-MM-DD format

      // We only need the date in the background (but not editable)
      // Set the start time and end time to a default time for the modal (e.g., 12:00)
      this._modalStartTime = formattedDate;
      this._modalEndTime = formattedDate;
  }

  this._isModalOpen = true;
  this.requestUpdate();
}


  

  public async showDialog(
    params: CalendarTemplateCreateDialogParams
  ): Promise<void> {
    this._params = params;
  }
  
  private _updateSelectedWeek(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this._selectedWeek = parseInt(target.value, 10); // Store the selected week number
    console.log("Selected week:", this._selectedWeek); // Debug log
  }
  
  


  private closeDialog(): void {
    // this._calendarId = undefined;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }


  /* TODO:
   * Add list of already created templates (sidebar thing from design)
   */

  protected render() {
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        style="--dialog-content-padding: 24px; width: 1000px; max-width: 90%;"
      >
        <!-- Calendar Container -->
        <div id="calendar-container">
          <table class="custom-calendar">
            <thead>
              <tr>
                <th>MON</th>
                <th>TUE</th>
                <th>WED</th>
                <th>THU</th>
                <th>FRI</th>
                <th>SAT</th>
                <th>SUN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                ${["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
                  const dayEvents = this._calendarEvents.template_events.filter((event) =>
                    event.dtstart.startsWith(day)
                  );
  
                  return html`
                    <td>
                      ${dayEvents.length > 0
                        ? dayEvents.map(
                            (event) => html`
                              <div class="event">
                                <strong>${event.summary}</strong><br />
                                ${new Date(event.dtstart).toLocaleTimeString()} -
                                ${new Date(event.dtend).toLocaleTimeString()}<br />
                                ${event.description || ""}
                              </div>
                            `
                          )
                        : html`
                            <button
                              class="calendar-button"
                              @click=${() => this._openModal(day)}
                            >
                              Add Event
                            </button>
                          `}
                    </td>
                  `;
                })}
              </tr>
            </tbody>
          </table>
        </div>
  
        <!-- Modal -->
${this._isModalOpen
  ? html`
      <div class="modal">
              <div class="modal-content">
                <h3>Add Event for ${this._modalDay?.toUpperCase()}</h3>

                <!-- Week Selection Dropdown -->
                <label for="week-select">Select Week:</label>
                <select id="week-select" @change="${this._updateSelectedWeek}">
                  ${[...Array(52)].map((_, i) => html`
                    <option value="${i + 1}" ?selected="${this._selectedWeek === i + 1}">
                      Week ${i + 1}
                    </option>
                  `)}
                </select>

                <!-- Event Details Form -->
                <label>
                  Summary: <input id="summary" type="text" />
                </label>
                <br />
                <label for="start-time">
                Start Time: 
                <input id="start-time" type="time" placeholder="Start Time" />
                </label>

                <label for="end-time">
                 End Time: 
                 <input id="end-time" type="time" placeholder="End Time" />
                </label>

                <br />
                <label>
                  Recurrence Rule (Optional): <input id="rrule" type="text" />
                </label>
                <br />
                <label>
                  Description (Optional): <textarea id="description"></textarea>
                </label>
                <br />
                <button @click=${this._saveModalData}>Save</button>
                <button @click=${this._closeModal}>Cancel</button>
              </div>
            </div>
    `
  : nothing}

      </ha-dialog>
    `;
  }
  
  
  

  private async _handleViewChanged(
    ev: HASSDomEvent<CalendarViewChanged>
  ): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(ev);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
         /* General Styles for the Calendar Container */
#calendar-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Calendar Table Styles */
.custom-calendar {
  border-collapse: collapse;
  width: 90%;
  table-layout: fixed;
  text-align: center;
  font-family: Arial, sans-serif;
}

.custom-calendar th {
  background-color: #f9f9f9;
  color: #333;
  font-size: 14px;
  font-weight: bold;
  border-bottom: 2px solid #ddd;
  padding: 10px;
}

.custom-calendar td {
  height: 100px;
  border: 1px solid #ddd;
  position: relative;
}

/* Event Indicator */
.event-dot {
  width: 6px;
  height: 6px;
  background-color: red;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* Add Event Button */
.calendar-button {
  margin-top: 10px;
  padding: 5px 10px;
  font-size: 12px;
  border: 1px solid #ccc;
  background-color: #f0f0f0;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.calendar-button:hover {
  background-color: #ddd;
}

/* Individual Event Styles */
.event {
  margin-bottom: 10px;
  font-size: 14px;
  text-align: left;
}

.modal {
  position: fixed; /* Keeps the modal in the same position relative to the viewport */
  top: 50%; /* Vertically centers the modal */
  left: 50%; /* Horizontally centers the modal */
  transform: translate(-50%, -50%); /* Adjusts for the modal's own width/height */
  background-color: white; /* Sets the background color */
  padding: 20px; /* Adds some space inside the modal */
  border: 1px solid black; /* Adds a simple border for visibility */
  z-index: 1000; /* Ensures it's above most other elements */
}

 
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-calendar-template-create": DialogCalendarTemplateCreate;
  }
}

customElements.define(
  "dialog-calendar-template-create",
  DialogCalendarTemplateCreate
);

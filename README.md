# Home Assistant Frontend

This is the repository for the official [Home Assistant](https://home-assistant.io) frontend.

[![Screenshot of the frontend](https://raw.githubusercontent.com/home-assistant/frontend/master/docs/screenshot.png)](https://demo.home-assistant.io/)

- [View demo of Home Assistant](https://demo.home-assistant.io/)
- [More information about Home Assistant](https://home-assistant.io)
- [Frontend development instructions](https://developers.home-assistant.io/docs/frontend/development/)

## Development

- Initial setup: `script/setup`
- Development: [Instructions](https://developers.home-assistant.io/docs/frontend/development/)
- Production build: `script/build_frontend`
- Gallery: `cd gallery && script/develop_gallery`
- Supervisor: [Instructions](https://developers.home-assistant.io/docs/supervisor/developing)

## Frontend development

### Classic environment

A complete guide can be found at the following [link](https://www.home-assistant.io/developers/frontend/). It describes a short guide for the build of project.

## Using new Google Calendar features

### Setup

To use the new features implemented in the Google Calendar integration, Google Calendar needs to be added to your local HomeAssistant.

- Settings --> Devices & Services --> Add integration --> Search for Google --> Google Calendar --> Follow the presented instructions.

### Purpose

#### Template

The purpose of the template feature is for the user to be able to create a collection of calendar events that belong together and that are saved for future use. Examples are if you have specific workout schedules that belogn to different seasons or have rare plants with unique watering schedules.

#### Edit

The purpose of the event feature is for users to be able to edit their existing events.
Instead of deleting and recreating a faulty event,
the user can now directly edit existing events.

#### Invite

The purpose of the invite feature is for the user to be able to invite other people to their events.
An email with the invitation will be sent to the attendees mail. There is support for the attendees to see which
attendees have accepted the invitation. However, each user needs to contact Google to get the permissions for this.

#### Location

The purpose of this feature is for the user to be able to add a location of the event.
In the event, a map will appear that shows the location. The user will be able to click on the map and
be taken to Google Maps.

### Usage

#### Template feature

- To open the Create Template modal, click the button "Create template" in the left bottom corner.
- Add wanted events to corresponding days, at least one is needed.
- Click "Specify template" when satisfied with the template.
- In Enter template details more details are added:

  - Give the template a name
  - The week and year the template should start at
  - How often the template should be repeated
  - How much time there should be between the repetitions, in the unit chosen above e.g. weekly, montly or yearly.
  - After how many repetitions it should stop, in the unit chosen above as well.
  - Which calendars the template should be applied to.

- On the left of the Create template modal, the already created templates will appear and it is possible to apply them again.

## License

Home Assistant is open-source and Apache 2 licensed. Feel free to browse the repository, learn and reuse parts in your own projects.

We use [BrowserStack](https://www.browserstack.com) to test Home Assistant on a large variety of devices.

[![Home Assistant - A project from the Open Home Foundation](https://www.openhomefoundation.org/badges/home-assistant.png)](https://www.openhomefoundation.org/)

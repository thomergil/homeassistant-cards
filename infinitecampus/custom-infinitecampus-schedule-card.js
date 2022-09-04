import { LitElement, html } from "https://unpkg.com/lit?module";
//import { mdiCalendar } from "https://unpkg.com/@mdi/js@7.0.96/commonjs/mdi.js";

// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'infinite-campus-schedule',
  name: 'Infinite Campus - Schedule Card',
  preview: false,
  description: 'A card used to display Infinite Campus Schedules.',
});

class InfiniteCampusStudent extends LitElement {
  // Whenever the state changes, a new `hass` object is set. Use this to
  // update your content.
  set hass(hass) {
    // Initialize the content if it's not there yet.

    this._hass = hass;

    this.students = new Array();
    this.coursesToday = new Array();
    this.coursesTomorrow = new Array();
    this.todaySchedule = new Array();
    this.tomorrowSchedule = new Array();
    this.currentTerm = new String();
    this.dayType = new String();

    this.date = new Date().toLocaleDateString('en-CA');
    this.tomorrow = new Date();
    this.tomorrow.setDate(this.tomorrow.getDate() + 1)
    this.tomorrow = this.tomorrow.toLocaleDateString('en-CA')
    
    if(Array.isArray(this.config.entities))
    {
      var configStudents = this.config.entities.find(a => a.entity == "sensor.infinite_campus_students")
      var configCourses = this.config.entities.find(a => a.entity == "sensor.infinite_campus_courses")
      var configTerms = this.config.entities.find(a => a.entity == "sensor.infinite_campus_terms")

      var eStudents = configStudents.entity in this._hass.states ? this._hass.states[configStudents.entity] : null
      var eCourses = configCourses.entity in this._hass.states ? this._hass.states[configCourses.entity] : null
      var eTerms = configTerms.entity in this._hass.states ? this._hass.states[configTerms.entity] : null

      this.term = eTerms.attributes.terms.find(t => (this.date >= t.startdate && this.date <= t.enddate)).id

      eStudents.attributes.students.forEach(student => {
        this.students.push(student)
      })

      eCourses.attributes.courses.forEach(course => {
        this.students.forEach(student => {
          var todayScheduleID = student.scheduledays.length > 0 ? student.scheduledays.find(d => d.date == this.date) : ""
          var tomorrowScheduleID = student.scheduledays.length > 0 ? student.scheduledays.find(d => d.date == this.tomorrow) : ""
          course.sectionplacements.forEach(section => {
            if (todayScheduleID) {
              if(section.periodscheduleid == todayScheduleID.periodscheduleid 
                  && !this.coursesToday.find(c => c.courseid == section.courseid)
                  && section.termid == this.term
                  && section.starttime) {
                section.personid = student.personid
                this.dayType = section.periodschedulename
                this.coursesToday.push(section)
              }
            }

            if (tomorrowScheduleID) {
              if(section.periodscheduleid == tomorrowScheduleID.periodscheduleid 
                  && !this.coursesTomorrow.find(c => c.courseid == section.courseid)
                  && section.termid == this.term) {
                section.personid = student.personid
                this.coursesTomorrow.push(section)
              }
            }
          })
        })
      })
    }
    this.coursesToday.sort((a, b) => a.starttime.localeCompare(b.starttime))
    this.coursesTomorrow.sort((a, b) => a.starttime.localeCompare(b.starttime))
  }

  render(){
    return html
    `
    ${this._renderStyle()}
    ${html
      `
      <ha-card>
      <h1 class="card-header flex">
        <div class="name">
          Infinite Campus - Schedule (<span style="color:#5a66f2">Day ${this.dayType}</span>)
        </div>
      </h1>
        <div class="card-content">
        ${this.students.map(student => 
          html
          `
            <div class="info flex">
              <div>
                <ha-icon icon="mdi:account-school"></ha-icon>
                ${student.firstname} ${student.lastname} (${student.studentnumber})
                ${this.coursesToday.map(course => 
                  html
                  `
                  ${course.personid == student.personid ? html
                    `
                    <div class="secondary">
                      &ensp;${course.coursename}
                    </div>
                    <div class="tertiary">
                    &ensp;${this._formatTime(course.starttime)} -- ${this._formatTime(course.endtime)}
                    </div>
                    `
                  :""}
                  `
                )}
              </div>
              <div>
                &nbsp;Tomorrow
                ${this.coursesTomorrow.map(course => 
                  html
                  `
                  ${course.personid == student.personid ? html
                    `
                    <div class="secondary">
                      &ensp;${course.coursename}
                    </div>
                    <div class="tertiary">
                      &ensp;${this._formatTime(course.starttime)} -- ${this._formatTime(course.endtime)}
                    </div>
                    `
                  :""}
                  `
                )}
              </div>
            </div>
          `
        )}
        </div>
      </ha-card>
      `
    }
    `
  }

  _renderStyle() {
    return html
    `
      <style>
        .info {
          padding-bottom: 1em;
        }
        .flex {
          display: flex;
          justify-content: space-between;
        }
        .overdue {
          color: red !important;
        }
        .due-today {
          color: orange !important;
        }
        .not-showing {
          margin-top: -16px;
          margin-left: 16px;
          padding-bottom: 16px;
        }
        .secondary {
          display: block;
          color: #8c96a5;
        }
        .tertiary {
          display: block;
          color: #dbdbdb;
        }
        .add-row {
          margin-top: -16px;
          padding-bottom: 16px;
          display: flex;
          flex-direction: row;
          align-items: center;
          width: 100%;
        }
        .add-input {
          padding-right: 16px;
          width: 100%;
        }
        .hide-button {
          padding: 0 0 16px 16px;
        }
      </style>
    `;
  }
  _formatTime(thisTime){
    var fixTime = new Date(Date.parse("2001-01-01 " + thisTime))
    return fixTime.toLocaleString('en-US',{hour12:true,hour:'numeric',minute:'numeric'})
  }
  // The user supplied configuration. Throw an exception and Home Assistant
  // will render an error card.
  setConfig(config) {
    if (!config.entities) {
      throw new Error('You need to define entities');
    }
    this.config = config;
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize() {
    return 3;
  }

  static getConfigElement() {
    return document.createElement("content-card-editor");
  }

  static getStubConfig() {
    return { 
      entities: [
        {entity:'sensor.infinite_campus_students'},
        {entity:'sensor.infinite_campus_courses'},
        {entity:'sensor.infinite_campus_terms'}
      ] 
    }
  }


}

customElements.define('infinite-campus-schedule', InfiniteCampusStudent);

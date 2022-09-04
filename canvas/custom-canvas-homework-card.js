import { LitElement, html } from "https://unpkg.com/lit?module";

// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'canvas-homework',
  name: 'Canvas - Homework Card',
  preview: false,
  description: 'A card used to display Canvas Homework.',
});

class CanvasStudent extends LitElement {
  // Whenever the state changes, a new `hass` object is set. Use this to
  // update your content.
  set hass(hass) {
    // Initialize the content if it's not there yet.
    this._hass = hass;

    this.students = new Array();
    this.courses = new Array();
    this.assignments = new Array();
    this.courseAssignments = new Array();
    this.date = new Date();

    if(Array.isArray(this.config.entities))
    {
      var configStudents = this.config.entities.find(a => a.entity == "sensor.canvas_students")
      var configCourses = this.config.entities.find(a => a.entity == "sensor.canvas_courses")
      var configAssignments = this.config.entities.find(a => a.entity == "sensor.canvas_assignments")
      
      var eStudents = configStudents.entity in this._hass.states ? this._hass.states[configStudents.entity] : null
      var eCourses = configCourses.entity in this._hass.states ? this._hass.states[configCourses.entity] : null
      var eAssignments = configAssignments.entity in this._hass.states ? this._hass.states[configAssignments.entity] : null

      eAssignments.attributes.assignments.forEach(assignment => {
        if (!assignment.has_submitted_submissions && assignment.due_at) {
          this.courseAssignments.push(assignment.course_id)
          this.assignments.push(assignment)
        }
      })

      eCourses.attributes.courses.forEach(course => {
        if (!this.courses.some(c => c.name == course.name) && this.courseAssignments.some(ca => ca == course.id) && (Date.parse(course.term.start_at) <= this.date && Date.parse(course.term.end_at) >= this.date)) {
          this.courses.push(course)
        }
      })
      
      eStudents.attributes.students.forEach(student => {
        this.students.push(student)
      })
    }

    //this.courses.map(course => console.warn(course.name))
  }

  render(){
    return html
    `
    ${this._renderStyle()}
    ${html
      `
      <ha-card header="Canvas - Homework">
        <div class="card-content">
        ${this.students.map(student => 
          html
          `
            <div class="info flex">
              <div>
                ${student.name} (${student.id})
                ${this.courses.map(course =>
                  html
                  `
                  ${course.enrollments[0].user_id == student.id ? html
                    `
                    <div class="secondary">
                      &ensp;${course.name}
                      ${this.assignments.map(assignment =>
                        html
                        `
                        ${assignment.course_id == course.id ? html
                          `
                          <div class="thirdary">
                            &emsp;- ${assignment.name} ${assignment.missing ? "<span style='color:#a3262c'>missing</span>" : ""}
                          </div>
                          <div class="thirdary">
                            &emsp;&nbsp;&nbsp;Due: ${assignment.due_at}
                          </div>
                          <div class="thirdary">
                            &emsp;&nbsp;&nbsp;Points: ${assignment.points_possible}
                          </div>
                          `
                        :""}
                        `
                        )}
                    </div>
                    `
                  : ""}
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
        .thirdary {
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
        {entity:'sensor.canvas_students'},
        {entity:'sensor.canvas_courses'},
        {entity:'sensor.canvas_assignments'}
      ] 
    }
  }


}

customElements.define('canvas-homework', CanvasStudent);

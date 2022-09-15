"use strict";
///////////// Variables /////////////////////////////
// Elements
const cadenceInput = document.querySelector(".sidebar__input--cadence");
const distanceInput = document.querySelector(".sidebar__input--distance");
const durationInput = document.querySelector(".sidebar__input--duration");
const delAllBtn = document.querySelector(".btn__del");
const elevGainInput = document.querySelector(".sidebar__input--elev");
const form = document.querySelector(".sidebar__form");
const inputs = document.querySelectorAll(".sidebar__input");
const sidebarSelect = document.querySelector(".sidebar__select");
const sidebarList = document.querySelector(".sidebar__list");

/////////////////// Classes /////////////////////////////////
//Parent class

class Workout {
  // class filed
  options = { month: "long", day: "numeric" };
  date = new Intl.DateTimeFormat("en-US", this.options).format();
  // creating uniq id (we should use a library to do that later)
  id = (Date.now() + "").slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; // [latitude , longitude]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
}
// child classes

// running class
class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// cycling class
class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevGain) {
    super(coords, distance, duration);
    this.elevGain = elevGain;
    this.clacSpeed();
  }
  clacSpeed() {
    // km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/////////////////////////// Application architecture ////////////////////////////////////

class App {
  // private field
  #map;
  #mapEvent;
  #mapZoomLevel = 12;
  #workOuts = [];
  #marker;
  #markers = [];
  #workoutEl;
  constructor() {
    // get user's position
    this._getPosition();

    //get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener("submit", this._newWorkout.bind(this));
    sidebarSelect.addEventListener(
      "change",
      this._toggleElevationField.bind(this)
    );
    sidebarList.addEventListener("click", this._moveToPopup.bind(this));
    sidebarList.addEventListener("click", this._delete.bind(this));
    sidebarList.addEventListener("click", this._edit.bind(this));
    delAllBtn.addEventListener("click", this._delAll.bind(this));
  }
  // Getting User Location method
  _getPosition() {
    // Reading Json file
    fetch(
      "https://api.maptiler.com/geolocation/ip.json?key=TV2zJP6kmJ36E6GrFusB"
    )
      .then((res) => res.json())
      .then((response) => {
        const latitude = response.latitude;
        const longitude = response.longitude;
        const coords = [latitude, longitude];
        // loading map
        this._loadMap(coords);
      })
      .catch((data, status) => {
        console.log("Request failed");
      });
  }
  // load map method
  _loadMap(position) {
    this.#map = L.map("map").setView(position, this.#mapZoomLevel);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    // Show form by clicking on map
    this.#map.on("click", this._showForm.bind(this));

    // show marker on map from local storage
    this.#workOuts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  // show form method
  _showForm(mapEv) {
    this.#mapEvent = mapEv;
    form.classList.remove("hidden");
    distanceInput.focus();
  }
  // hide form method
  _hideForm() {
    // clear inputs
    inputs.forEach((input) => {
      input.value = "";
    });
    // set input focus
    distanceInput.focus();
    // hide form
    form.classList.add("deactive");
    form.classList.add("hidden");
    setTimeout(() => {
      form.classList.remove("deactive");
    }, 700);
  }
  // changing type method
  _toggleElevationField() {
    elevGainInput
      .closest(".sidebar__form-item")
      .classList.toggle("sidebar__form-item--hidden");
    cadenceInput
      .closest(".sidebar__form-item")
      .classList.toggle("sidebar__form-item--hidden");
  }
  //creating new workout method
  _newWorkout(e) {
    e.preventDefault();
    // get data from form
    const distance = +distanceInput.value;
    const duration = +durationInput.value;
    const type = sidebarSelect.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // input validation funcitons
    const inputValidation = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);
    // Instanciation
    if (type === "running") {
      const cadence = +cadenceInput.value;
      if (
        !inputValidation(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Please compelete all filed with only posetive numbers");
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    if (type === "cycling") {
      const elevation = +elevGainInput.value;
      if (
        !inputValidation(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Please compelete all filed with only posetive numbers");
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    this.#workOuts.push(workout);

    // add marker on map
    this._renderWorkoutMarker(workout);

    // clear inputs and hidden form
    this._hideForm();

    // add workout to list
    this._renderWorkoutList(workout);

    // set local storage to all workouts
    this._setLocalStorage();
  }

  // adding marker method
  _renderWorkoutMarker(workout) {
    this.#marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "Running" : "Cycling"} on ${
          workout.date
        }`
      )
      .openPopup();
    this.#markers.push(this.#marker);
  }

  // adding workout to list method
  _renderWorkoutList(workout) {
    let html = `
    <li class="sidebar__workout sidebar__workout--${workout.type}" data-id="${
      workout.id
    }">
      <div class="sidebar__workout-icons flex-row">
        <svg class="sidebar__workout-icons--edit" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
        <svg class="sidebar__workout-icons--del" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </div>
      <h2 class="sidebar__workout-title">${
        workout.type === "running" ? "Running" : "Cycling"
      } on ${workout.date}</h2>
      <div class="sidebar__workout-details flex-row">
        <span class="sidebar__workout-icon">${
          workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
        }</span>
        <span class="sidebar__workout-value sidebar__workout-value--distance">${
          workout.distance
        }</span>
        <span class="sidebar__workout-unit">Km</span>
      </div>
      <div class="sidebar__workout-details flex-row">
        <span class="sidebar__workout-icon">⏱</span>
        <span class="sidebar__workout-value sidebar__workout-value--duration">${
          workout.duration
        }</span>
        <span class="sidebar__workout-unit">Min</span>
      </div>  

      <div class="sidebar__workout-details flex-row">
        <span class="sidebar__workout-icon">⚡️</span>
        <span class="sidebar__workout-value sidebar__workout-value--pace-speed">${
          workout.type === "running"
            ? workout.pace.toFixed(1)
            : workout.speed.toFixed(1)
        }</span>
        <span class="sidebar__workout-unit">${
          workout.type === "running" ? "Min/Km" : "Km/h"
        }</span>
      </div>
      <div class="sidebar__workout-details flex-row">
        <span class="sidebar__workout-icon">${
          workout.type === "running" ? "🦶🏼" : "⛰"
        }</span>
        <span class="sidebar__workout-value sidebar__workout-value--cad-elev">${
          workout.type === "running" ? workout.cadence : workout.elevGain
        }</span>
        <span class="sidebar__workout-unit">${
          workout.type === "running" ? "Spm" : "M"
        }</span>
        </div>
    </li> 
    <div class="sidebar__workout-edit">
      <label>Distance</label>
      <input class="input-edit distance-edit"></input>
      <label>Duration</label>
      <input class="input-edit duration-edit"></input>
      <label>${workout.type === "running" ? "Cadence" : "Elev Gain"}</label>
      <input class="input-edit cad-elev-edit"></input>
      <button button class="btn btn__edit">Submit</button>
    </div>
    `;
    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    this.#workoutEl = e.target.closest(".sidebar__workout");
    if (!this.#workoutEl) return;
    const workout = this.#workOuts.find(
      (work) => work.id === this.#workoutEl.dataset.id
    );
    this.#map.panTo(workout.coords, {
      animate: true,
      duration: 0.6,
      easeLinearity: 0.5,
    });
  }
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workOuts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;
    this.#workOuts = data;
    // show workouts on list from local storage
    this.#workOuts.forEach((work) => {
      this._renderWorkoutList(work);
    });
  }
  // empty all local storage
  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
  // delete workout item
  _delete(e) {
    if (e.target.classList.value === "sidebar__workout-icons--del") {
      const workoutItem = this.#workOuts.find(
        (work) => work.id === this.#workoutEl.dataset.id
      );
      const index = this.#workOuts.indexOf(workoutItem);
      // remove from workout list
      this.#workoutEl.remove();
      // delete from workOuts array (local storage)
      this.#workOuts.splice(index, 1);
      this._setLocalStorage();
      // delete marker
      this.#map.removeLayer(this.#markers[index]);
      this.#markers.splice(index, 1);
    } else {
      return;
    }
  }
  _delAll() {
    const confirmation = confirm("Do you want to delete all workouts?");
    if (confirmation)
      // delete all markers
      for (let marker of this.#markers) {
        this.#map.removeLayer(marker);
      }
    // delete all workouts from list
    const workouts = document.querySelectorAll(".sidebar__workout");
    for (let work of workouts) {
      work.classList.add("delete");
    }
    // empty local storage
    this.#workOuts = [];
    this._setLocalStorage();

    // solution 2
    // this.#map.remove();
    // this.reset();
  }
  _edit(e) {
    if (e.target.classList.value === "sidebar__workout-icons--edit") {
      const editInput = document.querySelectorAll(".sidebar__workout-edit");
      const editInputs = document.querySelectorAll(".input-edit");
      const workoutEl = e.target.closest(".sidebar__workout");
      const editBtn = document.querySelectorAll(".btn__edit");
      // reveal edit box
      const workoutObj = this.#workOuts.find(
        (work) => work.id === this.#workoutEl.dataset.id
      );
      let selectedItem, listItem;
      editInput.forEach((item) => {
        if (item.previousElementSibling.dataset.id === workoutObj.id) {
          selectedItem = item;
          listItem = item.previousElementSibling;
          item.classList.add("reveal");
        }
      });

      const distanceEdit = selectedItem.querySelector(".distance-edit");
      const durationEdit = selectedItem.querySelector(".duration-edit");
      const cadElevEdit = selectedItem.querySelector(".cad-elev-edit");
      const distanceValue = listItem.querySelector(
        ".sidebar__workout-value--distance"
      );
      const durationValue = listItem.querySelector(
        ".sidebar__workout-value--duration"
      );
      const cadElevValue = listItem.querySelector(
        ".sidebar__workout-value--cad-elev"
      );
      const paceSpeedValue = listItem.querySelector(
        ".sidebar__workout-value--pace-speed"
      );
      // submit changes
      editBtn.forEach((btn) =>
        btn.addEventListener("click", function () {
          if (distanceEdit.value !== "")
            distanceValue.textContent = distanceEdit.value;
          if (durationEdit.value !== "")
            durationValue.textContent = durationEdit.value;
          if (cadElevEdit.value !== "")
            cadElevValue.textContent = cadElevEdit.value;
          // calculating pace or speed
          paceSpeedValue.textContent =
            workoutObj.type === "running"
              ? (
                  +durationValue.textContent / +distanceValue.textContent
                ).toFixed(1)
              : (
                  +distanceValue.textContent /
                  (+durationValue.textContent / 60)
                ).toFixed(1);
          //hide edit form after submit
          editInput.forEach((item) => {
            if (
              item.previousElementSibling.dataset.id === workoutEl.dataset.id
            ) {
              item.classList.remove("reveal");
            }
          });
          editInputs.forEach((inp) => (inp.value = ""));
        })
      );
    }
  }
}
const app = new App();
